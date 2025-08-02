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
    get_current_user,
    models,
)

import time


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
        "details": {"host": "db", "port": 5432, "database": "callmaster", "ssl": False},
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

        try:
            import pytest  # type: ignore
            result["pytest_available"] = True
            result["method_used"] = "available as Python module"
            logger.info("pytest available as Python module")
            return result
        except ImportError:
            pass

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
                    logger.debug(f"pytest installation method failed: {install_result.stderr}")
                    continue
            except (subprocess.TimeoutExpired, FileNotFoundError, PermissionError) as e:
                logger.debug(f"pytest installation method {' '.join(method)} failed: {str(e)}")
                continue

        result["error"] = "All pytest installation methods failed. pytest may need to be installed manually for API testing."
        logger.warning("Failed to install pytest automatically")
    except Exception as e:
        result["error"] = f"pytest preparation failed: {str(e)}"
        logger.error(f"pytest preparation failed: {e}")

    return result
