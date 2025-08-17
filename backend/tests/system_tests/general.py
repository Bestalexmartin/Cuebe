# backend/tests/system_tests/general.py

from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

from . import (
    router,
    rate_limit,
    RateLimitConfig,
    HAS_PSUTIL,
    psutil,
    HAS_REDIS,
    redis,
    RedisConnectionError,
    logger,
)
from routers.auth import get_current_user
import models

import time
import os
import subprocess


@rate_limit(RateLimitConfig.WEBHOOKS if RateLimitConfig else None)
@router.get("/health")
def system_tests_health(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Health check for system tests API"""
    network_test = "unknown"
    try:
        import requests
        response = requests.get("https://www.google.com", timeout=5)
        network_test = f"success - HTTP {response.status_code}"
    except Exception as e:
        network_test = f"failed - {str(e)}"

    return {
        "status": "healthy",
        "message": "System tests API is working",
        "dependencies": {
            "psutil": HAS_PSUTIL,
            "redis": HAS_REDIS,
            "requests": True,
        },
        "network_connectivity": network_test,
    }


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.get("/database-connectivity")
def test_database_connectivity(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Test connectivity to various database services"""
    results = []

    postgres_result = {
        "database": "PostgreSQL (Primary)",
        "status": "unknown",
        "responseTime": 0,
        "error": None,
        "details": {"host": "db", "port": 5432, "database": "Cuebe", "ssl": False},
    }

    try:
        start_time = time.time()
        result = db.execute(text("SELECT 1"))
        result.fetchone()
        end_time = time.time()

        postgres_result["status"] = "connected"
        postgres_result["responseTime"] = int((end_time - start_time) * 1000)
    except Exception as e:
        postgres_result["status"] = "failed"
        postgres_result["error"] = str(e)
        logger.error(f"PostgreSQL connection test failed: {e}")

    results.append(postgres_result)

    redis_result = {
        "database": "Redis Cache",
        "status": "failed",
        "responseTime": 0,
        "error": "Redis service not available",
        "details": {"host": "redis", "port": 6379, "database": "cache", "ssl": False},
    }

    if HAS_REDIS and redis is not None:
        try:
            start_time = time.time()
            redis_client = redis.Redis(host="redis", port=6379, decode_responses=True, socket_connect_timeout=2)
            redis_client.ping()
            end_time = time.time()

            redis_result["status"] = "connected"
            redis_result["responseTime"] = int((end_time - start_time) * 1000)
            redis_result["error"] = None
        except (RedisConnectionError, ConnectionRefusedError, Exception) as e:
            redis_result["status"] = "failed"
            redis_result["error"] = "Connection refused - Redis service not available"
            logger.info(f"Redis connection test failed as expected: {e}")
    else:
        redis_result["error"] = "Redis package not installed"

    results.append(redis_result)

    connected_count = len([r for r in results if r["status"] == "connected"])
    failed_count = len([r for r in results if r["status"] == "failed"])

    return {
        "testType": "database",
        "results": results,
        "summary": f"Tested {len(results)} databases. {connected_count} connected, {failed_count} failed.",
    }


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.get("/api-endpoints")
def test_api_endpoints(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Test connectivity to API endpoints"""
    results = []

    endpoints_to_test = [
        {"name": "Health Check", "url": "http://localhost:8000/api/health", "method": "GET"},
        {"name": "External API (Google)", "url": "https://www.google.com", "method": "GET"},
    ]

    import requests

    for endpoint in endpoints_to_test:
        result = {
            "endpoint": endpoint["name"],
            "status": "failed",
            "responseTime": 0,
            "statusCode": 0,
            "error": None,
            "details": {"url": endpoint["url"], "method": endpoint["method"]},
        }

        try:
            start_time = time.time()
            response = requests.request(endpoint["method"], endpoint["url"], timeout=5)
            end_time = time.time()

            result["status"] = "connected" if response.status_code < 400 else "failed"
            result["statusCode"] = response.status_code
            result["responseTime"] = int((end_time - start_time) * 1000)

            if response.status_code >= 400:
                result["error"] = f"HTTP {response.status_code}"
        except requests.RequestException as e:
            result["status"] = "failed"
            result["error"] = str(e)
            logger.error(f"API endpoint test failed for {endpoint['url']}: {e}")
        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)
            logger.error(f"API endpoint test failed for {endpoint['url']}: {e}")

        results.append(result)

    connected_count = len([r for r in results if r["status"] == "connected"])
    return {
        "testType": "api",
        "results": results,
        "summary": f"Tested {len(results)} endpoints. {connected_count} successful, {len(results) - connected_count} failed/skipped.",
    }


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.get("/system-performance")
def test_system_performance(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Get real system performance metrics"""
    if not HAS_PSUTIL or psutil is None:
        return {
            "testType": "system",
            "results": {
                "cpu": {"usage": 0, "cores": 0},
                "memory": {"used": 0, "total": 0, "percentage": 0},
                "disk": {"used": 0, "total": 0, "percentage": 0},
            },
            "summary": "System monitoring unavailable - psutil package not installed",
        }

    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        memory_used = memory.used / (1024 * 1024)
        memory_total = memory.total / (1024 * 1024)
        memory_percent = memory.percent

        disk = psutil.disk_usage('/')
        disk_used = disk.used / (1024 * 1024 * 1024)
        disk_total = disk.total / (1024 * 1024 * 1024)
        disk_percent = (disk.used / disk.total) * 100

        return {
            "testType": "system",
            "results": {
                "cpu": {"usage": round(cpu_percent, 1), "cores": psutil.cpu_count()},
                "memory": {
                    "used": round(memory_used, 1),
                    "total": round(memory_total, 1),
                    "percentage": round(memory_percent, 1),
                },
                "disk": {
                    "used": round(disk_used, 2),
                    "total": round(disk_total, 2),
                    "percentage": round(disk_percent, 1),
                },
            },
            "summary": f"CPU: {round(cpu_percent,1)}%, Memory: {round(memory_percent,1)}%, Disk: {round(disk_percent,1)}%",
        }
    except Exception as e:
        logger.error(f"System performance test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system performance: {str(e)}")


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.post("/prepare-pytest")
def prepare_pytest(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Check for pytest availability and install if necessary for API testing"""
    import shutil

    result = {
        "pytest_available": False,
        "installation_required": False,
        "installation_attempted": False,
        "installation_successful": False,
        "method_used": None,
        "error": None,
    }

    try:
        pytest_locations = [
            shutil.which('pytest'),
            '/usr/local/bin/pytest',
            '/usr/bin/pytest',
            '/opt/homebrew/bin/pytest',
        ]

        for location in pytest_locations:
            if location and os.path.exists(location):
                result["pytest_available"] = True
                result["method_used"] = f"found at {location}"
                logger.info(f"pytest found at {location}")
                return result

        try:
            test_result = subprocess.run(
                ['pytest', '--version'],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if test_result.returncode == 0:
                result["pytest_available"] = True
                result["method_used"] = "available via Python PATH"
                logger.info("pytest available via Python PATH")
                return result
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        import importlib.util
        if importlib.util.find_spec("pytest") is not None:
            result["pytest_available"] = True
            result["method_used"] = "available as Python module"
            logger.info("pytest available as Python module")
            return result

        logger.info("pytest not found, attempting installation for API testing")
        result["installation_required"] = True
        result["installation_attempted"] = True

        installation_methods = [
            ['pip3', 'install', 'pytest'],
            ['pip', 'install', 'pytest'],
            ['pip3', 'install', '--user', 'pytest'],
        ]

        for method in installation_methods:
            try:
                logger.info(f"Trying pytest installation method: {' '.join(method)}")
                install_result = subprocess.run(
                    method,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )

                if install_result.returncode == 0:
                    logger.info(f"pytest installation successful with method: {' '.join(method)}")
                    result["installation_successful"] = True
                    result["method_used"] = f"installed via {' '.join(method)}"

                    verify_result = subprocess.run(
                        ['pytest', '--version'],
                        capture_output=True,
                        text=True,
                        timeout=5,
                    )

                    if verify_result.returncode == 0:
                        result["pytest_available"] = True
                        logger.info("pytest installation verified successfully")
                        return result
                    else:
                        logger.warning("pytest installation appeared successful but verification failed")
                else:
                    continue
            except (subprocess.TimeoutExpired, FileNotFoundError, PermissionError):
                continue

        result["error"] = "All pytest installation methods failed. pytest may need to be installed manually for API testing."
        logger.warning("Failed to install pytest automatically")
    except Exception as e:
        result["error"] = f"pytest preparation failed: {str(e)}"
        logger.error(f"pytest preparation failed: {e}")

    return result


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.post("/run-pytest-suite")
async def run_pytest_suite(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Run pytest test suite and return structured results"""
    import os
    import subprocess
    
    # Extract test suite from request body
    body = await request.json()
    test_suite = body.get("test_suite")
    
    if not test_suite:
        raise HTTPException(status_code=400, detail="test_suite parameter is required")
    
    # Validate test suite parameter
    valid_suites = ["all", "test_api.py", "test_auth.py", "test_api_critical.py", "conftest.py"]
    if test_suite not in valid_suites:
        raise HTTPException(status_code=400, detail=f"Invalid test suite. Valid options: {valid_suites}")
    
    result = {
        "suite_name": test_suite,
        "success": False,
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "errors": 0,
        "duration": 0,
        "tests": [],
        "output": "",
        "error": None
    }
    
    try:
        # Change to tests directory
        tests_dir = os.path.join(os.path.dirname(__file__), "..")
        
        # Build pytest command with detailed output
        if test_suite == "all":
            cmd = ["pytest", "-v", "--tb=short", "--durations=0"]
        elif test_suite == "conftest.py":
            # Special case: test conftest.py fixtures
            cmd = ["python", "-c", "import sys; sys.path.append('.'); from conftest import *; print('Conftest fixtures loaded successfully')"]
        else:
            cmd = ["pytest", "-v", "--tb=short", "--durations=0", test_suite]
        
        # Run pytest
        start_time = time.time()
        test_result = subprocess.run(
            cmd,
            cwd=tests_dir,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes timeout
        )
        end_time = time.time()
        
        result["duration"] = round((end_time - start_time) * 1000)  # in milliseconds
        result["output"] = test_result.stdout
        
        if test_suite == "conftest.py":
            # Handle conftest.py validation specially
            if test_result.returncode == 0:
                result["success"] = True
                result["total_tests"] = 1
                result["passed"] = 1
                result["tests"] = [{
                    "test_file": "conftest.py",
                    "test_function": "fixture_validation",
                    "status": "passed",
                    "duration": result["duration"],
                    "error_message": None
                }]
            else:
                result["failed"] = 1
                result["total_tests"] = 1
                result["tests"] = [{
                    "test_file": "conftest.py", 
                    "test_function": "fixture_validation",
                    "status": "failed",
                    "duration": result["duration"],
                    "error_message": test_result.stderr
                }]
                result["error"] = test_result.stderr
        else:
            # Parse pytest output for basic info
            result["success"] = test_result.returncode == 0
            
            # Parse stdout to extract test counts
            import re
            output_text = test_result.stdout + test_result.stderr
            
            # Look for pytest summary line like "2 passed, 1 failed in 0.12s"
            summary_pattern = r'(\d+)\s+failed.*?(\d+)\s+passed|(\d+)\s+passed.*?(\d+)\s+failed|(\d+)\s+passed|(\d+)\s+failed'
            matches = re.findall(summary_pattern, output_text)
            
            if matches:
                # Extract counts from regex groups
                for match in matches:
                    if match[0] and match[1]:  # failed and passed
                        result["failed"] = int(match[0])
                        result["passed"] = int(match[1])
                    elif match[2] and match[3]:  # passed and failed
                        result["passed"] = int(match[2]) 
                        result["failed"] = int(match[3])
                    elif match[4]:  # only passed
                        result["passed"] = int(match[4])
                    elif match[5]:  # only failed
                        result["failed"] = int(match[5])
                    break
            
            result["total_tests"] = result["passed"] + result["failed"] + result["skipped"]
            
            # Parse individual test results from output with better extraction
            test_lines = [line for line in output_text.split('\n') if '::' in line and ('PASSED' in line or 'FAILED' in line or 'SKIPPED' in line)]
            
            # Also extract duration information from pytest durations output
            duration_info = {}
            duration_section = False
            for line in output_text.split('\n'):
                if 'slowest durations' in line.lower():
                    duration_section = True
                    continue
                elif duration_section and ('durations < ' in line or '=' in line):
                    duration_section = False
                elif duration_section and '::' in line:
                    # Parse duration lines like: "0.01s call     tests/test_api.py::TestBasicFunctionality::test_health_endpoint"
                    parts = line.strip().split()
                    if len(parts) >= 3:
                        duration_str = parts[0]
                        test_path = parts[-1]
                        # Remove 'tests/' prefix if present
                        if test_path.startswith('tests/'):
                            test_path = test_path[6:]
                        try:
                            duration_ms = int(float(duration_str.rstrip('s')) * 1000)
                            duration_info[test_path] = duration_ms
                        except:
                            pass
            
            for line in test_lines:
                if '::' in line:
                    # Parse lines like: "test_api.py::TestBasicFunctionality::test_health_endpoint PASSED"
                    parts = line.split('::')
                    if len(parts) >= 3:  # file::class::function
                        test_file = parts[0].strip()
                        class_name = parts[1].strip()
                        function_and_status = parts[2].strip()
                        function_name = function_and_status.split()[0]
                        status = 'passed' if 'PASSED' in line else 'failed' if 'FAILED' in line else 'skipped'
                        
                        # Create human-readable test name (without class prefix)
                        readable_function = function_name.replace('test_', '').replace('_', ' ').title()
                        
                        # Get duration for this test
                        test_path = f"{test_file}::{class_name}::{function_name}"
                        duration = duration_info.get(test_path, 0)
                        
                        result["tests"].append({
                            "test_file": test_file,
                            "test_class": class_name,
                            "test_function": readable_function,
                            "status": status,
                            "duration": duration,
                            "error_message": None
                        })
                    elif len(parts) >= 2:  # file::function (no class)
                        test_file = parts[0].strip()
                        function_and_status = parts[1].strip()
                        function_name = function_and_status.split()[0]
                        status = 'passed' if 'PASSED' in line else 'failed' if 'FAILED' in line else 'skipped'
                        
                        # Create human-readable test name
                        readable_function = function_name.replace('test_', '').replace('_', ' ').title()
                        
                        # Get duration for this test
                        test_path = f"{test_file}::{function_name}"
                        duration = duration_info.get(test_path, 0)
                        
                        result["tests"].append({
                            "test_file": test_file,
                            "test_class": None,  # No class for standalone functions
                            "test_function": readable_function,
                            "status": status,
                            "duration": duration,
                            "error_message": None
                        })
        
        logger.info(f"pytest suite '{test_suite}' completed with exit code {test_result.returncode}")
        
    except subprocess.TimeoutExpired:
        result["error"] = "Test execution timed out after 5 minutes"
        logger.error(f"pytest suite '{test_suite}' timed out")
    except FileNotFoundError:
        result["error"] = "pytest not found. Please install pytest first using the prepare-pytest endpoint."
        logger.error("pytest command not found")
    except Exception as e:
        result["error"] = f"Test execution failed: {str(e)}"
        logger.error(f"pytest execution failed: {e}")
    
    return result


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.get("/test-fixtures-status")
def test_fixtures_status(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Validate conftest.py fixtures and test data setup"""
    import sys
    import os
    
    result = {
        "fixtures_available": False,
        "database_setup": False,
        "mock_data_working": False,
        "fixtures": {},
        "errors": [],
        "recommendations": []
    }
    
    try:
        # Add tests directory to Python path
        tests_dir = os.path.join(os.path.dirname(__file__), "..")
        if tests_dir not in sys.path:
            sys.path.insert(0, tests_dir)
        
        # Try to import conftest and test fixtures
        try:
            import conftest
            result["fixtures_available"] = True
            
            # Test each fixture
            fixtures_to_test = [
                "mock_user_data",
                "mock_venue_data", 
                "create_test_user",
                "create_test_venue",
                "auth_headers",
                "mock_clerk_user"
            ]
            
            for fixture_name in fixtures_to_test:
                if hasattr(conftest, fixture_name):
                    result["fixtures"][fixture_name] = {
                        "available": True,
                        "status": "valid",
                        "error": None
                    }
                else:
                    result["fixtures"][fixture_name] = {
                        "available": False,
                        "status": "missing",
                        "error": f"Fixture {fixture_name} not found in conftest.py"
                    }
                    result["errors"].append(f"Missing fixture: {fixture_name}")
            
            # Test database setup
            try:
                from conftest import TestingSessionLocal
                db = TestingSessionLocal()
                db.close()
                result["database_setup"] = True
            except Exception as db_error:
                result["errors"].append(f"Database setup error: {str(db_error)}")

            # Test mock data generation
            try:
                conftest.fake.email()  # Test faker instance
                result["mock_data_working"] = True
            except Exception as mock_error:
                result["errors"].append(f"Mock data generation error: {str(mock_error)}")
                
        except ImportError as import_error:
            result["errors"].append(f"Failed to import conftest.py: {str(import_error)}")
            
    except Exception as e:
        result["errors"].append(f"Fixture validation failed: {str(e)}")
        logger.error(f"Test fixtures validation failed: {e}")
    
    # Add recommendations based on findings
    if not result["fixtures_available"]:
        result["recommendations"].append("Check that conftest.py exists in the tests directory")
    
    if not result["database_setup"]:
        result["recommendations"].append("Verify SQLAlchemy test database configuration")
        
    if not result["mock_data_working"]:
        result["recommendations"].append("Check faker library installation and configuration")
    
    if result["errors"]:
        result["recommendations"].append("Review error messages and fix configuration issues")
    else:
        result["recommendations"].append("All test fixtures are properly configured")
    
    return result


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.post("/create-test-data")
async def create_test_data(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Create test data using conftest.py fixtures for validation"""
    import sys
    import os
    import importlib
    
    logger.info(f"Creating test data - request started for user: {current_user.clerk_user_id}")
    
    # Extract data type from request body
    body = await request.json()
    data_type = body.get("data_type")
    
    logger.info(f"Requested data_type: {data_type}")
    
    if not data_type:
        raise HTTPException(status_code=400, detail="data_type parameter is required")
    
    # Validate data type
    valid_types = ["user", "venue", "mock_user", "mock_venue", "clerk_user"]
    if data_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid data type. Valid options: {valid_types}")
    
    result = {
        "data_type": data_type,
        "success": False,
        "data": None,
        "error": None
    }
    
    try:
        # Add tests directory to Python path (only if not already added)
        tests_dir = os.path.join(os.path.dirname(__file__), "..")
        tests_dir = os.path.abspath(tests_dir)  # Normalize path
        
        if tests_dir not in sys.path:
            sys.path.insert(0, tests_dir)
            logger.info(f"Added tests directory to sys.path: {tests_dir}")
        
        # Import conftest safely without affecting main app database
        import importlib
        
        # Store original dependency overrides to restore later
        from main import app
        original_overrides = app.dependency_overrides.copy()
        
        try:
            if 'conftest' in sys.modules:
                logger.info("Reloading conftest module")
                import conftest
                importlib.reload(conftest)
            else:
                logger.info("Importing conftest module for the first time")
                import conftest
            
            # Restore original dependency overrides to prevent database corruption
            app.dependency_overrides.clear()
            app.dependency_overrides.update(original_overrides)
            logger.info("Restored original database dependencies")
            
        except Exception as import_error:
            # Restore dependencies even if import fails
            app.dependency_overrides.clear()
            app.dependency_overrides.update(original_overrides)
            raise import_error
        
        if data_type == "mock_user":
            # Generate mock user data
            try:
                mock_data = {
                    "email_address": conftest.fake.email(),
                    "fullname_first": conftest.fake.first_name(),
                    "fullname_last": conftest.fake.last_name(),
                    "clerk_user_id": conftest.fake.uuid4(),
                    "user_status": "verified"
                }
                result["data"] = mock_data
                result["success"] = True
            except Exception as user_error:
                result["error"] = f"Failed to generate mock user data: {str(user_error)}"
                logger.error(f"Mock user generation failed: {user_error}")
            
        elif data_type == "mock_venue":
            # Generate mock venue data
            try:
                mock_data = {
                    "venue_name": conftest.fake.company(),
                    "city": conftest.fake.city(),
                    "state": conftest.fake.state_abbr(),
                    "address": conftest.fake.address(),
                    "contact_name": conftest.fake.name(),
                    "contact_phone": conftest.fake.phone_number(),
                    "contact_email": conftest.fake.email()
                }
                result["data"] = mock_data
                result["success"] = True
            except Exception as venue_error:
                result["error"] = f"Failed to generate mock venue data: {str(venue_error)}"
                logger.error(f"Mock venue generation failed: {venue_error}")
            
        elif data_type == "clerk_user":
            # Generate mock Clerk user data
            try:
                mock_data = {
                    "id": conftest.fake.uuid4(),
                    "email_addresses": [{"email_address": conftest.fake.email()}],
                    "first_name": conftest.fake.first_name(),
                    "last_name": conftest.fake.last_name(),
                    "created_at": conftest.fake.unix_time(),
                    "updated_at": conftest.fake.unix_time()
                }
                result["data"] = mock_data
                result["success"] = True
            except Exception as clerk_error:
                result["error"] = f"Failed to generate clerk user data: {str(clerk_error)}"
                logger.error(f"Clerk user generation failed: {clerk_error}")
            
        else:
            result["error"] = f"Test data creation for type '{data_type}' not yet implemented"
            
    except ImportError as e:
        result["error"] = f"Failed to import conftest.py: {str(e)}"
        logger.error(f"Import error in create_test_data: {e}")
    except Exception as e:
        result["error"] = f"Test data creation failed: {str(e)}"
        logger.error(f"Test data creation failed for type {data_type}: {e}")
    
    logger.info(f"Test data creation completed - success: {result['success']}, error: {result.get('error', 'None')}")
    return result
