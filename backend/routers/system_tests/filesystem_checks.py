# backend/routers/system_tests/filesystem_checks.py

from fastapi import Request, Depends

from . import router, rate_limit, RateLimitConfig, logger, get_current_user, models
import time
from pathlib import Path
import os


@rate_limit(RateLimitConfig.SYSTEM_TESTS if RateLimitConfig else None)
@router.get("/filesystem-permissions")
def test_filesystem_permissions(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Test filesystem permissions for paths critical to CallMaster operation"""
    results = []
    paths_to_test = [
        {"path": "/app", "description": "Application root directory", "required": ["read"]},
        {"path": "/app/logs", "description": "Application logs directory", "required": ["read", "write"], "create_if_missing": True},
        {"path": "/app/uploads", "description": "File uploads directory", "required": ["read", "write"], "create_if_missing": True},
        {"path": "/app/backups", "description": "Database backups directory", "required": ["read", "write"], "create_if_missing": True},
        {"path": "/app/exports", "description": "Data exports directory", "required": ["read", "write"], "create_if_missing": True},
        {"path": "/tmp", "description": "Temporary files directory", "required": ["read", "write"]},
        {"path": "/var/log", "description": "System logs directory", "required": ["read"]},
        {"path": "/app/main.py", "description": "Main application file", "required": ["read"]},
        {"path": "/app/requirements.txt", "description": "Python dependencies", "required": ["read"]},
    ]
    for path_config in paths_to_test:
        path_str = path_config["path"]
        path = Path(path_str)
        description = path_config["description"]
        required_perms = path_config["required"]
        create_if_missing = path_config.get("create_if_missing", False)
        result = {
            "path": path_str,
            "description": description,
            "exists": False,
            "readable": False,
            "writable": False,
            "is_directory": False,
            "is_file": False,
            "size_bytes": 0,
            "permissions": None,
            "owner": None,
            "group": None,
            "status": "unknown",
            "error": None,
            "required_permissions": required_perms,
            "created": False,
        }
        try:
            if path.exists():
                result["exists"] = True
                result["is_directory"] = path.is_dir()
                result["is_file"] = path.is_file()
                if result["is_file"]:
                    result["size_bytes"] = path.stat().st_size
                stat_info = path.stat()
                result["permissions"] = oct(stat_info.st_mode)[-3:]
                result["owner"] = stat_info.st_uid
                result["group"] = stat_info.st_gid
                try:
                    if result["is_file"]:
                        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                            f.read(1)
                        result["readable"] = True
                    elif result["is_directory"]:
                        list(path.iterdir())
                        result["readable"] = True
                except (PermissionError, OSError):
                    result["readable"] = False
                try:
                    if result["is_file"]:
                        with open(path, 'a'):
                            pass
                        result["writable"] = True
                    elif result["is_directory"]:
                        test_file = path / f".test_write_{int(time.time())}"
                        test_file.write_text("test")
                        test_file.unlink()
                        result["writable"] = True
                except (PermissionError, OSError):
                    result["writable"] = False
            else:
                if create_if_missing:
                    try:
                        path.mkdir(parents=True, exist_ok=True)
                        result["exists"] = True
                        result["is_directory"] = True
                        result["readable"] = True
                        result["writable"] = True
                        result["created"] = True
                        result["permissions"] = "755"
                        logger.info(f"Created directory: {path_str}")
                    except (PermissionError, OSError) as e:
                        result["error"] = f"Failed to create directory: {str(e)}"
                        result["status"] = "create_failed"
                else:
                    result["error"] = "Path does not exist"
                    result["status"] = "missing"
            if result["exists"] and not result["error"]:
                missing_perms = []
                if "read" in required_perms and not result["readable"]:
                    missing_perms.append("read")
                if "write" in required_perms and not result["writable"]:
                    missing_perms.append("write")
                if missing_perms:
                    result["status"] = "permission_denied"
                    result["error"] = f"Missing required permissions: {', '.join(missing_perms)}"
                else:
                    result["status"] = "accessible"
        except Exception as e:
            result["error"] = f"Test failed: {str(e)}"
            result["status"] = "error"
            logger.error(f"Filesystem test failed for {path_str}: {e}")
        results.append(result)
    accessible_count = len([r for r in results if r["status"] == "accessible"])
    created_count = len([r for r in results if r["created"]])
    missing_count = len([r for r in results if r["status"] == "missing"])
    permission_denied_count = len([r for r in results if r["status"] == "permission_denied"])
    error_count = len([r for r in results if r["status"] == "error"])
    success = accessible_count == len(results)
    summary_parts = [f"Tested {len(results)} paths"]
    if accessible_count > 0:
        summary_parts.append(f"{accessible_count} accessible")
    if created_count > 0:
        summary_parts.append(f"{created_count} created")
    if missing_count > 0:
        summary_parts.append(f"{missing_count} missing")
    if permission_denied_count > 0:
        summary_parts.append(f"{permission_denied_count} permission denied")
    if error_count > 0:
        summary_parts.append(f"{error_count} errors")
    return {
        "testType": "filesystem",
        "success": success,
        "results": results,
        "summary": ". ".join(summary_parts) + ".",
    }
