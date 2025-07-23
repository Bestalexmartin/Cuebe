# backend/routers/webhooks.py

import os
import subprocess
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError
import logging

import models
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["webhooks", "development"])


# =============================================================================
# CLERK WEBHOOK
# =============================================================================

@router.post("/webhooks/clerk")
async def handle_clerk_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Clerk authentication webhooks for user lifecycle management."""
    headers = request.headers
    payload = await request.body()
    webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        wh = Webhook(webhook_secret)
        event = wh.verify(payload, dict(headers))
    except WebhookVerificationError as e:
        logger.error(f"Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    event_type = event['type']
    user_data = event['data']
    
    logger.info(f"Received webhook for event: {event_type}")

    if event_type == 'user.created':
        email = user_data.get('email_addresses', [{}])[0].get('email_address')
        new_clerk_id = user_data.get('id')
        
        existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()

        if existing_user:
            # Update existing user (whether active guest or inactive user)
            existing_user.isActive = True # type: ignore
            existing_user.clerk_user_id = new_clerk_id
            existing_user.userName = user_data.get('username')
            existing_user.userStatus = models.UserStatus.VERIFIED # type: ignore
            # Update name and profile if provided by Clerk and not already set
            if user_data.get('first_name') and not existing_user.fullnameFirst:
                existing_user.fullnameFirst = user_data.get('first_name')
            if user_data.get('last_name') and not existing_user.fullnameLast:
                existing_user.fullnameLast = user_data.get('last_name')
            if user_data.get('image_url'):
                existing_user.profileImgURL = user_data.get('image_url')
        else:
            logger.info(f"Creating new user for email: {email}")
            new_user = models.User(
                clerk_user_id=new_clerk_id,
                emailAddress=email,
                userName=user_data.get('username'),
                fullnameFirst=user_data.get('first_name'),
                fullnameLast=user_data.get('last_name'),
                profileImgURL=user_data.get('image_url'),
                userStatus=models.UserStatus.VERIFIED,
                isActive=True
            )
            db.add(new_user)
        
        db.commit()

    elif event_type == 'user.updated':
        user_to_update = db.query(models.User).filter(models.User.clerk_user_id == user_data['id']).first()
        if user_to_update:
            user_to_update.emailAddress = user_data['email_addresses'][0]['email_address']
            user_to_update.userName = user_data.get('username')
            user_to_update.fullnameFirst = user_data.get('first_name')
            user_to_update.fullnameLast = user_data.get('last_name')
            user_to_update.profileImgURL = user_data.get('image_url')
            db.commit()
            logger.info(f"User {user_data['id']} updated.")

    elif event_type == 'user.deleted':
        clerk_id_to_delete = user_data.get('id')
        if clerk_id_to_delete:
            user_to_deactivate = db.query(models.User).filter(models.User.clerk_user_id == clerk_id_to_delete).first()
            if user_to_deactivate:
                user_to_deactivate.isActive = False # type: ignore
                db.commit()
                logger.info(f"User {clerk_id_to_delete} deactivated.")
    
    return {"status": "ok"}


# =============================================================================
# DEVELOPMENT ENDPOINTS
# =============================================================================

@router.get("/dev/diagnostics")
async def test_diagnostics():
    """
    Diagnostic endpoint to check the testing environment
    """
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
async def run_tests(
    test_suite: str = "all"
    # TODO: Re-enable authentication: user: models.User = Depends(get_current_user)
):
    """
    Run test suites and return results for TestToolsPage integration.
    Only available in development mode.
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        # Use container's Python - pytest is pre-installed in Docker image
        python_exec = "python3"
        
        test_commands = {
            "setup": [python_exec, "-m", "pip", "install", "-r", "requirements.txt", "--no-warn-script-location", "--root-user-action=ignore"],
            "diagnostics": [python_exec, "-c", "import sys, pytest; print(f'Python: {sys.executable}'); print(f'Pytest: {pytest.__version__}')"],
            "all": [python_exec, "-m", "pytest", "tests/", "-v", "--tb=short"],
            "auth": [python_exec, "-m", "pytest", "tests/test_auth.py", "-v", "--tb=short"],  
            "critical": [python_exec, "-m", "pytest", "tests/test_api_critical.py", "-v", "--tb=short"],
            "quick": [python_exec, "-m", "pytest", "tests/test_simple.py", "-v", "--tb=short"]
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


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/health")
async def read_root():
    return {"status": "ok"}