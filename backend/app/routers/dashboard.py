from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Investigation, Vendor, InvestigationFinding
from app.schemas import DashboardStats, InvestigationSummaryRead

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes aggregate metrics from persistent database records.
    Never returns hardcoded statistics.
    """
    total_investigations = db.query(Investigation).count()
    on_hold_count = db.query(Investigation).filter(Investigation.final_decision == "PAYMENT_ON_HOLD").count()
    verification_required_count = db.query(Investigation).filter(Investigation.final_decision == "VERIFICATION_REQUIRED").count()
    eligible_for_review_count = db.query(Investigation).filter(Investigation.final_decision == "ELIGIBLE_FOR_REVIEW").count()
    critical_risk_count = db.query(Investigation).filter(Investigation.severity == "CRITICAL").count()
    total_vendors = db.query(Vendor).count()

    # Recent 6 investigations
    recent = (
        db.query(Investigation)
        .order_by(Investigation.created_at.desc())
        .limit(6)
        .all()
    )

    recent_reads = [InvestigationSummaryRead.model_validate(inv) for inv in recent]

    # Discrepancy category breakdown from failed findings
    findings_by_cat = (
        db.query(InvestigationFinding.category, func.count(InvestigationFinding.id))
        .filter(InvestigationFinding.passed == False)
        .group_by(InvestigationFinding.category)
        .all()
    )
    discrepancy_categories = {cat: count for cat, count in findings_by_cat}

    # Decisions breakdown
    decisions_breakdown = {
        "PAYMENT_ON_HOLD": on_hold_count,
        "VERIFICATION_REQUIRED": verification_required_count,
        "ELIGIBLE_FOR_REVIEW": eligible_for_review_count,
    }

    return DashboardStats(
        total_investigations=total_investigations,
        on_hold_count=on_hold_count,
        verification_required_count=verification_required_count,
        eligible_for_review_count=eligible_for_review_count,
        critical_risk_count=critical_risk_count,
        total_vendors=total_vendors,
        recent_investigations=recent_reads,
        discrepancy_categories=discrepancy_categories,
        decisions_breakdown=decisions_breakdown,
    )
