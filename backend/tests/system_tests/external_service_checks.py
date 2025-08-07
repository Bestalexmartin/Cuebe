# backend/tests/system_tests/external_service_checks.py

from fastapi import Request, Depends

from . import router, rate_limit, RateLimitConfig, logger, get_current_user, models
import time
import os


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.get("/external-services")
def test_external_services(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Test connectivity to external services required by Cuebe"""
    import requests

    results = []
    overall_success = True
    try:
        clerk_publishable_key = os.getenv('VITE_CLERK_PUBLISHABLE_KEY')
        clerk_secret_key = os.getenv('CLERK_SECRET_KEY')
        if not clerk_publishable_key or not clerk_secret_key:
            results.append({
                "service": "Clerk Authentication",
                "status": "misconfigured",
                "error": "Missing Clerk API keys in environment",
                "details": {
                    "configurationStatus": "Missing VITE_CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY",
                    "endpoint": "clerk.com API",
                },
            })
            overall_success = False
        else:
            start_time = time.time()
            try:
                response = requests.get(
                    "https://api.clerk.com/v1/jwks",
                    headers={"Authorization": f"Bearer {clerk_secret_key}"},
                    timeout=10,
                )
                end_time = time.time()
                if response.status_code in [200, 401]:
                    results.append({
                        "service": "Clerk Authentication",
                        "status": "connected",
                        "responseTime": round((end_time - start_time) * 1000, 2),
                        "details": {
                            "configurationStatus": "API keys configured",
                            "endpoint": "https://api.clerk.com/v1/jwks",
                        },
                    })
                else:
                    results.append({
                        "service": "Clerk Authentication",
                        "status": "failed",
                        "responseTime": round((end_time - start_time) * 1000, 2),
                        "error": f"HTTP {response.status_code}",
                        "details": {
                            "configurationStatus": "API keys configured",
                            "endpoint": "https://api.clerk.com/v1/jwks",
                        },
                    })
                    overall_success = False
            except requests.exceptions.RequestException as e:
                results.append({
                    "service": "Clerk Authentication",
                    "status": "failed",
                    "error": f"Connection failed: {str(e)}",
                    "details": {
                        "configurationStatus": "API keys configured",
                        "endpoint": "https://api.clerk.com/v1/jwks",
                    },
                })
                overall_success = False
    except Exception as e:
        results.append({
            "service": "Clerk Authentication",
            "status": "failed",
            "error": f"Configuration error: {str(e)}",
            "details": {
                "configurationStatus": "Error checking configuration",
                "endpoint": "clerk.com API",
            },
        })
        overall_success = False
    try:
        start_time = time.time()
        response = requests.get(
            "https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css",
            timeout=10,
        )
        end_time = time.time()
        if response.status_code == 200:
            results.append({
                "service": "unpkg.com CDN",
                "status": "connected",
                "responseTime": round((end_time - start_time) * 1000, 2),
                "details": {"configurationStatus": "Available", "endpoint": "https://unpkg.com"},
            })
        else:
            results.append({
                "service": "unpkg.com CDN",
                "status": "failed",
                "responseTime": round((end_time - start_time) * 1000, 2),
                "error": f"HTTP {response.status_code}",
                "details": {"configurationStatus": "Service error", "endpoint": "https://unpkg.com"},
            })
            overall_success = False
    except requests.exceptions.RequestException as e:
        results.append({
            "service": "unpkg.com CDN",
            "status": "failed",
            "error": f"Connection failed: {str(e)}",
            "details": {"configurationStatus": "Network error", "endpoint": "https://unpkg.com"},
        })
        overall_success = False
    try:
        start_time = time.time()
        response = requests.get(
            "https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js",
            timeout=10,
        )
        end_time = time.time()
        if response.status_code == 200:
            results.append({
                "service": "jsDelivr CDN",
                "status": "connected",
                "responseTime": round((end_time - start_time) * 1000, 2),
                "details": {"configurationStatus": "Available", "endpoint": "https://cdn.jsdelivr.net"},
            })
        else:
            results.append({
                "service": "jsDelivr CDN",
                "status": "failed",
                "responseTime": round((end_time - start_time) * 1000, 2),
                "error": f"HTTP {response.status_code}",
                "details": {"configurationStatus": "Service error", "endpoint": "https://cdn.jsdelivr.net"},
            })
            overall_success = False
    except requests.exceptions.RequestException as e:
        results.append({
            "service": "jsDelivr CDN",
            "status": "failed",
            "error": f"Connection failed: {str(e)}",
            "details": {"configurationStatus": "Network error", "endpoint": "https://cdn.jsdelivr.net"},
        })
        overall_success = False
    connected_count = len([r for r in results if r["status"] == "connected"])
    total_count = len(results)
    if overall_success:
        summary = f"All {total_count} external services are accessible and properly configured."
    else:
        failed_count = total_count - connected_count
        summary = f"{connected_count}/{total_count} external services accessible. {failed_count} service(s) have issues."
    return {"testType": "external-services", "success": overall_success, "summary": summary, "results": results}
