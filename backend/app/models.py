from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(50), primary_key=True, index=True)  # e.g., "VND-1001"
    name = Column(String(200), nullable=False, index=True)
    sender_domains = Column(Text, nullable=False)  # JSON list of allowed domains, e.g. '["acmecloud.com", "billing.acmecloud.com"]'
    verified_bank_name = Column(String(200), nullable=False)
    verified_account_number = Column(String(100), nullable=False)
    verified_routing_number = Column(String(100), nullable=True)
    verified_iban = Column(String(100), nullable=True)
    expected_currency = Column(String(10), default="USD")
    expected_payment_terms = Column(String(50), default="Net 30")
    verification_status = Column(String(50), default="VERIFIED")  # VERIFIED, FLAGGED, PENDING_AUDIT
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit_logs = relationship("VendorAuditLog", back_populates="vendor", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="vendor")

class VendorAuditLog(Base):
    __tablename__ = "vendor_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vendor_id = Column(String(50), ForeignKey("vendors.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)  # CREATED, ACCOUNT_UPDATE_ATTEMPT, VERIFIED_MANUALLY, STATUS_CHANGED
    changed_fields = Column(Text, nullable=True)  # JSON representation of changed fields
    performed_by = Column(String(100), default="System")
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="audit_logs")

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String(50), primary_key=True, index=True)  # e.g., "INV-2026-001"
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Document / Request Details
    invoice_number = Column(String(100), nullable=True)
    vendor_id = Column(String(50), ForeignKey("vendors.id"), nullable=True, index=True)
    vendor_name_claimed = Column(String(200), nullable=True)
    sender_email = Column(String(200), nullable=True)
    sender_domain = Column(String(200), nullable=True)
    invoice_amount = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    due_date = Column(String(50), nullable=True)
    po_number = Column(String(100), nullable=True)
    payment_instructions_raw = Column(Text, nullable=True)
    
    # Claimed Payment / Bank Details
    claimed_bank_name = Column(String(200), nullable=True)
    claimed_account_number = Column(String(100), nullable=True)
    claimed_routing_number = Column(String(100), nullable=True)
    claimed_iban = Column(String(100), nullable=True)
    
    # Fraud Signals
    urgency_detected = Column(Boolean, default=False)
    urgency_notes = Column(Text, nullable=True)

    # Source & Execution Details
    source_type = Column(String(50), default="TEXT")  # TEXT, EMAIL, PDF, SYNTHETIC
    source_filename = Column(String(255), nullable=True)
    source_text_excerpt = Column(Text, nullable=True)
    
    # AI Engine Details
    ai_model_used = Column(String(100), default="nvidia/Llama-3.1-Nemotron-70B-Instruct-HF")
    ai_inference_status = Column(String(50), default="OFFLINE_FALLBACK")  # SUCCESS_NEMOTRON, OFFLINE_FALLBACK, ERROR_FALLBACK
    ai_extracted_raw_json = Column(Text, nullable=True)

    # Deterministic Policy Engine Outcome
    final_decision = Column(String(50), nullable=False)  # ELIGIBLE_FOR_REVIEW, PAYMENT_ON_HOLD, VERIFICATION_REQUIRED
    severity = Column(String(50), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, CLEAN
    decision_rationale = Column(Text, nullable=False)
    
    # Human Review Workflow
    human_review_status = Column(String(50), default="PENDING")  # PENDING, HOLD_CONFIRMED, INDEPENDENTLY_VERIFIED, REJECTED
    human_reviewer = Column(String(100), nullable=True)
    human_review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    vendor = relationship("Vendor", back_populates="investigations")
    findings = relationship("InvestigationFinding", back_populates="investigation", cascade="all, delete-orphan")
    review_actions = relationship("ReviewAction", back_populates="investigation", cascade="all, delete-orphan")

class InvestigationFinding(Base):
    __tablename__ = "investigation_findings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    investigation_id = Column(String(50), ForeignKey("investigations.id"), nullable=False, index=True)
    
    finding_code = Column(String(100), nullable=False)  # e.g., BANK_ACCOUNT_CHANGED, DOMAIN_MISMATCH
    category = Column(String(100), nullable=False)  # BANKING_SECURITY, SENDER_AUTHENTICITY, FINANCIAL_TERMS, BEHAVIORAL_URGENCY
    severity = Column(String(50), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    expected_value = Column(Text, nullable=True)
    observed_value = Column(Text, nullable=True)
    evidence_excerpt = Column(Text, nullable=True)
    
    # Epistemological category as specified in requirements:
    # "Whether the finding is a verified fact, a rule-based discrepancy, or an AI-generated hypothesis."
    finding_nature = Column(String(50), nullable=False)  # VERIFIED_FACT, RULE_BASED_DISCREPANCY, AI_HYPOTHESIS
    passed = Column(Boolean, default=False)

    investigation = relationship("Investigation", back_populates="findings")

class ReviewAction(Base):
    __tablename__ = "review_actions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    investigation_id = Column(String(50), ForeignKey("investigations.id"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False)  # APPLY_HOLD, RECORD_NOTE, REQUEST_EVIDENCE, CONFIRM_INDEPENDENT_VERIFICATION
    verification_method = Column(String(100), nullable=True)  # OUT_OF_BAND_PHONE, PRE_ESTABLISHED_PORTAL, BANK_DIRECT_CONFIRMATION
    performed_by = Column(String(100), default="Finance Auditor")
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    investigation = relationship("Investigation", back_populates="review_actions")
