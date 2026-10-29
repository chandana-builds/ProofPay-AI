import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vendor, VendorAuditLog
from app.schemas import VendorCreate, VendorUpdate, VendorRead, VendorAuditLogRead

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])

def mask_account(acc: Optional[str]) -> str:
    if not acc:
        return ""
    clean = acc.strip()
    if len(clean) <= 4:
        return "****"
    return f"****{clean[-4:]}"

def vendor_to_read(v: Vendor) -> VendorRead:
    try:
        domains = json.loads(v.sender_domains) if isinstance(v.sender_domains, str) else [v.sender_domains]
    except Exception:
        domains = [v.sender_domains] if v.sender_domains else []

    return VendorRead(
        id=v.id,
        name=v.name,
        sender_domains=domains,
        verified_bank_name=v.verified_bank_name,
        verified_account_number=v.verified_account_number,
        masked_account_number=mask_account(v.verified_account_number),
        verified_routing_number=v.verified_routing_number,
        verified_iban=v.verified_iban,
        expected_currency=v.expected_currency or "USD",
        expected_payment_terms=v.expected_payment_terms or "Net 30",
        verification_status=v.verification_status,
        last_verified_at=v.last_verified_at,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )

@router.get("", response_model=List[VendorRead])
def list_vendors(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).order_by(Vendor.id.asc()).all()
    return [vendor_to_read(v) for v in vendors]

@router.get("/{vendor_id}", response_model=VendorRead)
def get_vendor(vendor_id: str, db: Session = Depends(get_db)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found.")
    return vendor_to_read(v)

@router.get("/{vendor_id}/audit-logs", response_model=List[VendorAuditLogRead])
def get_vendor_audit_logs(vendor_id: str, db: Session = Depends(get_db)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found.")
    logs = (
        db.query(VendorAuditLog)
        .filter(VendorAuditLog.vendor_id == vendor_id)
        .order_by(VendorAuditLog.timestamp.desc())
        .all()
    )
    return logs

@router.post("", response_model=VendorRead)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    existing = db.query(Vendor).filter(Vendor.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Vendor ID '{payload.id}' already exists.")

    new_vendor = Vendor(
        id=payload.id,
        name=payload.name,
        sender_domains=json.dumps(payload.sender_domains),
        verified_bank_name=payload.verified_bank_name,
        verified_account_number=payload.verified_account_number,
        verified_routing_number=payload.verified_routing_number,
        verified_iban=payload.verified_iban,
        expected_currency=payload.expected_currency,
        expected_payment_terms=payload.expected_payment_terms,
        verification_status=payload.verification_status,
        last_verified_at=datetime.utcnow(),
    )
    db.add(new_vendor)
    db.flush()

    audit = VendorAuditLog(
        vendor_id=new_vendor.id,
        action="CREATED",
        changed_fields=json.dumps({
            "name": payload.name,
            "bank": payload.verified_bank_name,
            "account": mask_account(payload.verified_account_number)
        }),
        performed_by="Compliance Auditor",
        notes="New test vendor onboarded into verification database."
    )
    db.add(audit)
    db.commit()
    db.refresh(new_vendor)

    return vendor_to_read(new_vendor)

@router.put("/{vendor_id}", response_model=VendorRead)
def update_vendor(vendor_id: str, payload: VendorUpdate, db: Session = Depends(get_db)):
    """
    Updates vendor record and logs an immutable audit trail entry.
    Treats bank account changes as sensitive operations.
    """
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found.")

    changes = {}

    if payload.name and payload.name != v.name:
        changes["name"] = {"old": v.name, "new": payload.name}
        v.name = payload.name

    if payload.sender_domains is not None:
        new_domains_json = json.dumps(payload.sender_domains)
        if new_domains_json != v.sender_domains:
            changes["sender_domains"] = {"old": v.sender_domains, "new": payload.sender_domains}
            v.sender_domains = new_domains_json

    if payload.verified_bank_name and payload.verified_bank_name != v.verified_bank_name:
        changes["verified_bank_name"] = {"old": v.verified_bank_name, "new": payload.verified_bank_name}
        v.verified_bank_name = payload.verified_bank_name

    # Sensitive: Bank Account Modification
    if payload.verified_account_number and payload.verified_account_number != v.verified_account_number:
        changes["verified_account_number"] = {
            "old": mask_account(v.verified_account_number),
            "new": mask_account(payload.verified_account_number),
            "is_sensitive_change": True
        }
        v.verified_account_number = payload.verified_account_number
        # Setting status to PENDING_AUDIT upon critical banking change
        v.verification_status = "PENDING_AUDIT"
        v.last_verified_at = datetime.utcnow()

    if payload.verified_routing_number is not None and payload.verified_routing_number != v.verified_routing_number:
        changes["verified_routing_number"] = {"old": v.verified_routing_number, "new": payload.verified_routing_number}
        v.verified_routing_number = payload.verified_routing_number

    if payload.expected_currency and payload.expected_currency != v.expected_currency:
        changes["expected_currency"] = {"old": v.expected_currency, "new": payload.expected_currency}
        v.expected_currency = payload.expected_currency

    if payload.expected_payment_terms and payload.expected_payment_terms != v.expected_payment_terms:
        changes["expected_payment_terms"] = {"old": v.expected_payment_terms, "new": payload.expected_payment_terms}
        v.expected_payment_terms = payload.expected_payment_terms

    if payload.verification_status and payload.verification_status != v.verification_status:
        changes["verification_status"] = {"old": v.verification_status, "new": payload.verification_status}
        v.verification_status = payload.verification_status

    if changes:
        audit = VendorAuditLog(
            vendor_id=v.id,
            action="MANUAL_PROFILE_UPDATE",
            changed_fields=json.dumps(changes),
            performed_by="Finance Administrator",
            notes=f"Audit reason: {payload.reason_for_change}"
        )
        db.add(audit)

    db.commit()
    db.refresh(v)
    return vendor_to_read(v)
