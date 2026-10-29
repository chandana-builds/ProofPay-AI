import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Investigation, InvestigationFinding, Vendor, ReviewAction
from app.schemas import (
    InvestigationCreateRequest,
    InvestigationDetailRead,
    InvestigationSummaryRead,
    VendorRead,
    FindingRead,
    ReviewActionRead,
)
from app.services.nemotron_service import extract_invoice_evidence
from app.services.policy_engine import evaluate_payment_policy
from app.services.pdf_parser import extract_text_from_pdf
from app.services.seed_data import SAMPLE_SCENARIOS
from app.config import settings

router = APIRouter(prefix="/api/investigations", tags=["Investigations"])

def mask_account(acc: Optional[str]) -> Optional[str]:
    if not acc:
        return None
    clean = acc.strip()
    if len(clean) <= 4:
        return "****"
    return f"****{clean[-4:]}"

def build_investigation_detail(inv: Investigation) -> InvestigationDetailRead:
    vendor_read = None
    if inv.vendor:
        import json
        try:
            domains = json.loads(inv.vendor.sender_domains) if isinstance(inv.vendor.sender_domains, str) else [inv.vendor.sender_domains]
        except Exception:
            domains = [inv.vendor.sender_domains] if inv.vendor.sender_domains else []

        vendor_read = VendorRead(
            id=inv.vendor.id,
            name=inv.vendor.name,
            sender_domains=domains,
            verified_bank_name=inv.vendor.verified_bank_name,
            verified_account_number=inv.vendor.verified_account_number,
            masked_account_number=mask_account(inv.vendor.verified_account_number) or "",
            verified_routing_number=inv.vendor.verified_routing_number,
            verified_iban=inv.vendor.verified_iban,
            expected_currency=inv.vendor.expected_currency or "USD",
            expected_payment_terms=inv.vendor.expected_payment_terms or "Net 30",
            verification_status=inv.vendor.verification_status,
            last_verified_at=inv.vendor.last_verified_at,
            created_at=inv.vendor.created_at,
            updated_at=inv.vendor.updated_at,
        )

    findings_read = [
        FindingRead(
            id=f.id,
            finding_code=f.finding_code,
            category=f.category,
            severity=f.severity,
            title=f.title,
            description=f.description,
            expected_value=f.expected_value,
            observed_value=f.observed_value,
            evidence_excerpt=f.evidence_excerpt,
            finding_nature=f.finding_nature,
            passed=f.passed,
        )
        for f in inv.findings
    ]

    review_actions_read = [
        ReviewActionRead(
            id=ra.id,
            investigation_id=ra.investigation_id,
            action_type=ra.action_type,
            verification_method=ra.verification_method,
            performed_by=ra.performed_by,
            notes=ra.notes,
            timestamp=ra.timestamp,
        )
        for ra in inv.review_actions
    ]

    return InvestigationDetailRead(
        id=inv.id,
        created_at=inv.created_at,
        invoice_number=inv.invoice_number,
        vendor_id=inv.vendor_id,
        vendor_name_claimed=inv.vendor_name_claimed,
        sender_email=inv.sender_email,
        sender_domain=inv.sender_domain,
        invoice_amount=inv.invoice_amount,
        currency=inv.currency,
        due_date=inv.due_date,
        po_number=inv.po_number,
        payment_instructions_raw=inv.payment_instructions_raw,
        claimed_bank_name=inv.claimed_bank_name,
        claimed_account_number=inv.claimed_account_number,
        masked_claimed_account_number=mask_account(inv.claimed_account_number),
        claimed_routing_number=inv.claimed_routing_number,
        claimed_iban=inv.claimed_iban,
        urgency_detected=inv.urgency_detected,
        urgency_notes=inv.urgency_notes,
        source_type=inv.source_type,
        source_filename=inv.source_filename,
        source_text_excerpt=inv.source_text_excerpt,
        ai_model_used=inv.ai_model_used,
        ai_inference_status=inv.ai_inference_status,
        ai_extracted_raw_json=inv.ai_extracted_raw_json,
        final_decision=inv.final_decision,
        severity=inv.severity,
        decision_rationale=inv.decision_rationale,
        human_review_status=inv.human_review_status,
        human_reviewer=inv.human_reviewer,
        human_review_notes=inv.human_review_notes,
        reviewed_at=inv.reviewed_at,
        vendor=vendor_read,
        findings=findings_read,
        review_actions=review_actions_read,
    )

@router.get("/scenarios")
def get_sample_scenarios():
    """
    Returns curated realistic test scenarios (BEC attack, typosquatting, clean invoice, etc.)
    for quick 1-click loading into the investigation workspace.
    """
    return SAMPLE_SCENARIOS

@router.get("", response_model=List[InvestigationSummaryRead])
def list_investigations(
    decision: Optional[str] = Query(None, description="Filter by ELIGIBLE_FOR_REVIEW, PAYMENT_ON_HOLD, VERIFICATION_REQUIRED"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor ID"),
    search: Optional[str] = Query(None, description="Search term in vendor name, invoice #, sender email"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Investigation)

    if decision and decision != "ALL":
        query = query.filter(Investigation.final_decision == decision)
    if vendor_id and vendor_id != "ALL":
        query = query.filter(Investigation.vendor_id == vendor_id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Investigation.id.ilike(term),
                Investigation.invoice_number.ilike(term),
                Investigation.vendor_name_claimed.ilike(term),
                Investigation.sender_email.ilike(term)
            )
        )

    investigations = (
        query.order_by(Investigation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [InvestigationSummaryRead.model_validate(inv) for inv in investigations]

@router.get("/{investigation_id}", response_model=InvestigationDetailRead)
def get_investigation_detail(investigation_id: str, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation '{investigation_id}' not found.")
    return build_investigation_detail(inv)

@router.post("", response_model=InvestigationDetailRead)
def create_investigation(
    payload: InvestigationCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Core investigation endpoint.
    1. Extracts structured evidence using Nemotron (or fallback).
    2. Overrides with any explicit user-entered fields.
    3. Matches trusted vendor record.
    4. Evaluates deterministic security policy rules.
    5. Persists investigation, evidence findings, and audit state.
    """
    raw_text = payload.raw_text or ""
    email_text = payload.email_text or ""

    if not raw_text.strip() and not email_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Investigation requires invoice content, payment instructions, or email communication text."
        )

    # 1. AI Extraction
    extracted, model_used, inference_status = extract_invoice_evidence(raw_text, email_text)

    # Apply any manual overrides provided by user
    if payload.claimed_vendor_name:
        extracted.vendor_name = payload.claimed_vendor_name
    if payload.claimed_amount is not None:
        extracted.amount = payload.claimed_amount
    if payload.claimed_currency:
        extracted.currency = payload.claimed_currency
    if payload.claimed_bank_name:
        extracted.bank_name = payload.claimed_bank_name
    if payload.claimed_account_number:
        extracted.account_number = payload.claimed_account_number

    # 2. Match Vendor Profile
    vendor: Optional[Vendor] = None
    if payload.vendor_id and payload.vendor_id.strip():
        vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id.strip()).first()
    elif extracted.vendor_name:
        # Heuristic search by name
        cand = db.query(Vendor).filter(Vendor.name.ilike(f"%{extracted.vendor_name.strip()}%")).first()
        if cand:
            vendor = cand
    elif extracted.sender_domain:
        # Heuristic search by domain
        all_vendors = db.query(Vendor).all()
        for v in all_vendors:
            if extracted.sender_domain in v.sender_domains:
                vendor = v
                break

    # 3. Deterministic Policy Evaluation
    policy_res = evaluate_payment_policy(extracted, vendor)

    # 4. Generate unique ID
    count = db.query(Investigation).count()
    inv_id = f"INV-2026-{str(count + 101).zfill(4)}"

    # 5. Persist Investigation
    new_inv = Investigation(
        id=inv_id,
        created_at=datetime.utcnow(),
        invoice_number=extracted.invoice_number or f"DRAFT-{uuid.uuid4().hex[:6].upper()}",
        vendor_id=vendor.id if vendor else None,
        vendor_name_claimed=extracted.vendor_name or (vendor.name if vendor else "Unidentified"),
        sender_email=extracted.sender_email,
        sender_domain=extracted.sender_domain,
        invoice_amount=extracted.amount,
        currency=extracted.currency or (vendor.expected_currency if vendor else "USD"),
        due_date=extracted.due_date,
        po_number=extracted.po_number,
        payment_instructions_raw=extracted.payment_instructions,
        claimed_bank_name=extracted.bank_name,
        claimed_account_number=extracted.account_number,
        claimed_routing_number=extracted.routing_number,
        claimed_iban=extracted.iban,
        urgency_detected=extracted.pressure_language_detected,
        urgency_notes="; ".join(extracted.urgency_signals) if extracted.urgency_signals else None,
        source_type=payload.source_type,
        source_text_excerpt=(email_text + "\n" + raw_text).strip()[:400],
        ai_model_used=model_used,
        ai_inference_status=inference_status,
        ai_extracted_raw_json=extracted.model_dump_json(),
        final_decision=policy_res.final_decision,
        severity=policy_res.severity,
        decision_rationale=policy_res.rationale,
        human_review_status="PENDING",
    )
    db.add(new_inv)
    db.flush()

    # 6. Persist Findings
    for f in policy_res.findings:
        finding_row = InvestigationFinding(
            investigation_id=new_inv.id,
            finding_code=f.finding_code,
            category=f.category,
            severity=f.severity,
            title=f.title,
            description=f.description,
            expected_value=f.expected_value,
            observed_value=f.observed_value,
            evidence_excerpt=f.evidence_excerpt,
            finding_nature=f.finding_nature,
            passed=f.passed,
        )
        db.add(finding_row)

    db.commit()
    db.refresh(new_inv)

    return build_investigation_detail(new_inv)

@router.post("/upload-pdf")
async def upload_pdf_investigation(
    file: UploadFile = File(...),
    vendor_id: Optional[str] = Form(None),
    email_text: Optional[str] = Form(""),
    db: Session = Depends(get_db)
):
    """
    Extracts text from PDF invoice document, then runs evidence analysis.
    Enforces file size limit and handles document errors.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported for document upload.")

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowable size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        extracted_text, page_count = extract_text_from_pdf(contents)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF extraction error: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="The uploaded PDF contains no extractable text (it may be a flattened image or scanned document)."
        )

    req = InvestigationCreateRequest(
        vendor_id=vendor_id,
        raw_text=extracted_text,
        email_text=email_text,
        source_type="PDF"
    )
    res = create_investigation(req, db)
    # Update source filename
    inv = db.query(Investigation).filter(Investigation.id == res.id).first()
    if inv:
        inv.source_filename = file.filename
        db.commit()
        db.refresh(inv)
        return build_investigation_detail(inv)

    return res
