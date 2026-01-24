"""System tests router - runtime API tests."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/system-tests", tags=["system-tests"])


@router.get("/")
def get_system_tests():
    """List available system tests."""
    return {"tests": [], "message": "System tests module - placeholder"}


@router.get("/health")
def system_health():
    """System test health check."""
    return {"status": "ok", "module": "system_tests"}
