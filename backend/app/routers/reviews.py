from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Investigation, ReviewAction
from app.schemas import ReviewActionCreate, InvestigationDetailRead
from app.routers.investigations import build_investigation_detail

router = APIRouter(prefix="/api/investigations", tags=["Human Review Workflow"])

@router.post("/{investigation_id}/reviews", response_model=InvestigationDetailRead)
def submit_human_review_action(
    investigation_id: str,
    payload: ReviewActionCreate,
    db: Session = Depends(get_db)
):
    """
    Executes a formal human auditor review action on an investigation.
    Actions:
      - APPLY_HOLD: Keeps/confirms mandatory hold
      - RECORD_NOTE: Appends audit review note
      - REQUEST_EVIDENCE: Changes review status to AWAITING_EVIDENCE
      - CONFIRM_INDEPENDENT_VERIFICATION: Formally records that out-of-band verification was conducted
    """
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation '{investigation_id}' not found.")

    valid_actions = ["APPLY_HOLD", "RECORD_NOTE", "REQUEST_EVIDENCE", "CONFIRM_INDEPENDENT_VERIFICATION", "MARK_REVIEWED"]
    if payload.action_type not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action_type. Must be one of {valid_actions}")

    # Record the Review Action in audit history
    review_record = ReviewAction(
        investigation_id=inv.id,
        action_type=payload.action_type,
        verification_method=payload.verification_method,
        performed_by=payload.performed_by or "Finance Auditor",
        notes=payload.notes,
        timestamp=datetime.utcnow()
    )
    db.add(review_record)

    # State transitions
    if payload.action_type == "APPLY_HOLD":
        inv.human_review_status = "HOLD_CONFIRMED"
        inv.final_decision = "PAYMENT_ON_HOLD"
    elif payload.action_type == "REQUEST_EVIDENCE":
        inv.human_review_status = "EVIDENCE_REQUESTED"
    elif payload.action_type == "RECORD_NOTE":
        # Keep existing status, just append note
        pass
    elif payload.action_type == "CONFIRM_INDEPENDENT_VERIFICATION":
        if not payload.verification_method:
            raise HTTPException(
                status_code=400,
                detail="Independent verification method (e.g. OUT_OF_BAND_PHONE, PRE_ESTABLISHED_PORTAL) is required to certify verification."
            )
        inv.human_review_status = "INDEPENDENTLY_VERIFIED"
        # If all other checks allow, status updates to ELIGIBLE_FOR_REVIEW
        inv.final_decision = "ELIGIBLE_FOR_REVIEW"
        inv.decision_rationale += f" [VERIFIED OUT-OF-BAND: {payload.verification_method} by {payload.performed_by}]"
    elif payload.action_type == "MARK_REVIEWED":
        inv.human_review_status = "REVIEWED"

    inv.human_reviewer = payload.performed_by
    inv.human_review_notes = (f"{inv.human_review_notes or ''}\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {payload.performed_by}: {payload.notes}").strip()
    inv.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(inv)

    return build_investigation_detail(inv)
