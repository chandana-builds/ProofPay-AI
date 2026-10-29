from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vendor, Investigation, ReviewAction, VendorAuditLog
from app.schemas import SystemStatusResponse
from app.config import settings
from app.services.nemotron_service import test_nebius_connection

router = APIRouter(prefix="/api/settings", tags=["Settings & System Status"])

@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    """
    Returns system health, database record counts, and Nebius Token Factory configuration status.
    Never exposes API keys or secrets.
    """
    is_configured = bool(settings.NEBIUS_API_KEY and settings.NEBIUS_API_KEY.strip() != "")
    
    status_str = "CONFIGURED" if is_configured else "NOT_CONFIGURED"
    diagnostic_msg = (
        f"API Key configured. Ready to run inference against '{settings.NEBIUS_MODEL}' on Nebius Token Factory."
        if is_configured else
        "NEBIUS_API_KEY is not configured. System is currently operating in High-Fidelity Heuristic Fallback mode."
    )

    counts = {
        "vendors": db.query(Vendor).count(),
        "investigations": db.query(Investigation).count(),
        "review_actions": db.query(ReviewAction).count(),
        "vendor_audit_logs": db.query(VendorAuditLog).count()
    }

    return SystemStatusResponse(
        backend_status="HEALTHY",
        database_status="CONNECTED",
        nebius_connection_status=status_str,
        nebius_model=settings.NEBIUS_MODEL,
        nebius_base_url=settings.NEBIUS_BASE_URL,
        ai_inference_available=is_configured,
        diagnostic_message=diagnostic_msg,
        total_db_records=counts
    )

@router.post("/test-connection")
def trigger_test_connection():
    """
    Initiates an active network test to Nebius Token Factory API.
    """
    is_available, message = test_nebius_connection()
    return {
        "available": is_available,
        "message": message,
        "model": settings.NEBIUS_MODEL,
        "base_url": settings.NEBIUS_BASE_URL
    }
