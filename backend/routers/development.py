# backend/routers/development.py

import ipaddress
import os
import subprocess
from pathlib import Path
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
import logging

_BACKEND_DIR = str(Path(__file__).resolve().parent.parent)

import models
from database import get_db
from routers.auth import get_current_user

# Optional rate limiting import
try:
    from utils.rate_limiter import limiter, RateLimitConfig
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    limiter = None
    RateLimitConfig = None
    RATE_LIMITING_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["development"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


def _require_local_dev_access(request: Request) -> None:
    """Restrict command-capable dev routes to explicit opt-in and loopback clients."""
    if os.getenv("ENABLE_DEV_ROUTES") not in {"1", "true", "True"}:
        raise HTTPException(status_code=404, detail="Development routes are disabled")

    client = request.client
    if client is None or not client.host:
        raise HTTPException(status_code=403, detail="Development routes require a local client")

    try:
        client_ip = ipaddress.ip_address(client.host)
    except ValueError:
        if client.host != "localhost":
            raise HTTPException(status_code=403, detail="Development routes require a loopback client")
        return

    if not client_ip.is_loopback:
        raise HTTPException(status_code=403, detail="Development routes require a loopback client")


# =============================================================================
# DEVELOPMENT ENDPOINTS
# =============================================================================

@router.get("/dev/diagnostics")
@rate_limit(RateLimitConfig.SYSTEM_TESTS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def test_diagnostics(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """
    Diagnostic endpoint to check the testing environment
    """
    _require_local_dev_access(request)

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Check what's available
    diagnostics = {
        "working_directory": backend_dir,
        "python_executable": None,
        "pytest_available": False,
        "tests_directory_exists": os.path.exists(os.path.join(backend_dir, "tests")),
        "requirements_file_exists": os.path.exists(os.path.join(backend_dir, "requirements.txt")),
        "available_pythons": []
    }
    
    # Check available Python executables
    possible_pythons = [
        "/usr/local/bin/python3",
        "/usr/bin/python3", 
        "python3",
        "python"
    ]
    
    for py_path in possible_pythons:
        try:
            result = subprocess.run([py_path, "--version"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                diagnostics["available_pythons"].append({
                    "path": py_path,
                    "version": result.stdout.strip(),
                    "exists": os.path.exists(py_path) if not py_path.startswith("python") else True
                })
                if not diagnostics["python_executable"]:
                    diagnostics["python_executable"] = py_path
        except:
            continue
    
    # Check if pytest is available
    if diagnostics["python_executable"]:
        try:
            result = subprocess.run([diagnostics["python_executable"], "-m", "pytest", "--version"], 
                                  capture_output=True, text=True, timeout=5)
            diagnostics["pytest_available"] = result.returncode == 0
            diagnostics["pytest_version"] = result.stdout.strip() if result.returncode == 0 else result.stderr.strip()
        except:
            diagnostics["pytest_available"] = False
    
    return diagnostics


@router.post("/dev/run-tests")
@rate_limit(RateLimitConfig.SYSTEM_TESTS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def run_tests(
    request: Request,
    test_suite: str = "all",
    current_user: models.User = Depends(get_current_user)
):
    _require_local_dev_access(request)

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        # Use container's Python - pytest is pre-installed in Docker image
        python_exec = "python3"
        
        test_commands = {
            "diagnostics": [python_exec, "-c", "import sys, pytest; print(f'Python: {sys.executable}'); print(f'Pytest: {pytest.__version__}')"],
            "all": [python_exec, "-m", "pytest", "tests/", "-v", "--tb=short"],
            "auth": [python_exec, "-m", "pytest", "tests/test_auth.py", "-v", "--tb=short"],  
            "critical": [python_exec, "-m", "pytest", "tests/test_api_critical.py", "-v", "--tb=short"],
            "health": [python_exec, "-m", "pytest", "tests/test_api.py", "-v", "--tb=short"]
        }
        
        if test_suite not in test_commands:
            available_suites = list(test_commands.keys())
            raise HTTPException(status_code=400, detail=f"Unknown test suite: {test_suite}. Available: {available_suites}")
        
        # Run the command
        cmd = test_commands[test_suite]
        result = subprocess.run(
            cmd,
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        return {
            "test_suite": test_suite,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0,
            "command": " ".join(cmd),
            "working_dir": backend_dir,
            "summary": {
                "total": "unknown",
                "passed": "unknown", 
                "failed": "unknown",
                "errors": "unknown"
            }
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command timed out after 2 minutes")
    except Exception as e:
        logger.error(f"Error running command: {e}")
        raise HTTPException(status_code=500, detail=f"Command execution failed: {str(e)}")


@router.post("/migrate")
@rate_limit(RateLimitConfig.WEBHOOKS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def run_database_migrations(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Run database migrations using Alembic"""
    _require_local_dev_access(request)

    try:
        logger.info("Starting database migration...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=_BACKEND_DIR,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode == 0:
            logger.info("Database migration completed successfully")
            return {
                "status": "success",
                "message": "Database migrations completed successfully",
                "output": result.stdout
            }
        else:
            logger.error(f"Migration failed: {result.stderr}")
            return {
                "status": "error",
                "message": "Database migration failed",
                "error": result.stderr,
                "output": result.stdout
            }

    except subprocess.TimeoutExpired:
        logger.error("Migration command timed out")
        raise HTTPException(status_code=408, detail="Migration timed out after 5 minutes")
    except Exception as e:
        logger.error(f"Error running migration: {e}")
        raise HTTPException(status_code=500, detail=f"Migration execution failed: {str(e)}")

@router.post("/migrate/reset")
@rate_limit(RateLimitConfig.WEBHOOKS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def reset_migration_state(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Reset migration state and recreate from scratch"""
    _require_local_dev_access(request)

    try:
        logger.info("Resetting migration state...")

        # First, stamp the database to the latest revision without running migrations
        stamp_result = subprocess.run(
            ["alembic", "stamp", "head"],
            cwd=_BACKEND_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )

        if stamp_result.returncode != 0:
            logger.error(f"Stamp failed: {stamp_result.stderr}")
            return {
                "status": "error",
                "message": "Failed to stamp migration state",
                "error": stamp_result.stderr,
                "output": stamp_result.stdout
            }

        logger.info("Migration state reset successfully")
        return {
            "status": "success",
            "message": "Migration state reset to head",
            "output": stamp_result.stdout
        }

    except subprocess.TimeoutExpired:
        logger.error("Reset command timed out")
        raise HTTPException(status_code=408, detail="Reset timed out after 1 minute")
    except Exception as e:
        logger.error(f"Error resetting migration state: {e}")
        raise HTTPException(status_code=500, detail=f"Reset execution failed: {str(e)}")

@router.post("/migrate/create-tables")
@rate_limit(RateLimitConfig.WEBHOOKS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def create_all_tables(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create all tables using SQLAlchemy metadata (bypass migrations)"""
    _require_local_dev_access(request)

    try:
        logger.info("Creating all tables from SQLAlchemy metadata...")

        # Import models to ensure all tables are registered
        import models

        # Create all tables
        models.Base.metadata.create_all(bind=db.bind)

        logger.info("All tables created successfully")
        return {
            "status": "success",
            "message": "All tables created from SQLAlchemy metadata"
        }

    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise HTTPException(status_code=500, detail=f"Table creation failed: {str(e)}")
