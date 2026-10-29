from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Vendor Schemas -----------------
class VendorBase(BaseModel):
    id: str = Field(..., description="Unique Vendor Identifier, e.g. VND-1001")
    name: str = Field(..., description="Legal Company Name")
    sender_domains: List[str] = Field(default_factory=list, description="Verified sender domains")
    verified_bank_name: str = Field(..., description="Verified depository institution")
    verified_account_number: str = Field(..., description="Verified account number")
    verified_routing_number: Optional[str] = None
    verified_iban: Optional[str] = None
    expected_currency: str = "USD"
    expected_payment_terms: str = "Net 30"
    verification_status: str = "VERIFIED"

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    sender_domains: Optional[List[str]] = None
    verified_bank_name: Optional[str] = None
    verified_account_number: Optional[str] = None
    verified_routing_number: Optional[str] = None
    verified_iban: Optional[str] = None
    expected_currency: Optional[str] = None
    expected_payment_terms: Optional[str] = None
    verification_status: Optional[str] = None
    reason_for_change: str = Field(..., description="Mandatory audit trail reason for modifying vendor banking record")

class VendorAuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: str
    action: str
    changed_fields: Optional[str] = None
    performed_by: str
    notes: Optional[str] = None
    timestamp: datetime

class VendorRead(VendorBase):
    model_config = ConfigDict(from_attributes=True)

    last_verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    masked_account_number: str = ""

# ----------------- AI Extraction & Evidence Schemas -----------------
class AIExtractedField(BaseModel):
    value: Optional[str] = None
    confidence: float = 1.0
    evidence_quote: Optional[str] = None

class AIExtractedInvoice(BaseModel):
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    sender_email: Optional[str] = None
    sender_domain: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    due_date: Optional[str] = None
    po_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    iban: Optional[str] = None
    payment_instructions: Optional[str] = None
    urgency_signals: List[str] = Field(default_factory=list)
    pressure_language_detected: bool = False
    evidence_snippets: Dict[str, str] = Field(default_factory=dict)
    unresolved_uncertainties: List[str] = Field(default_factory=list)

# ----------------- Investigation Finding & Review Schemas -----------------
class FindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    finding_code: str
    category: str
    severity: str
    title: str
    description: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    evidence_excerpt: Optional[str] = None
    finding_nature: str  # VERIFIED_FACT, RULE_BASED_DISCREPANCY, AI_HYPOTHESIS
    passed: bool

class ReviewActionCreate(BaseModel):
    action_type: str = Field(..., description="APPLY_HOLD, RECORD_NOTE, REQUEST_EVIDENCE, CONFIRM_INDEPENDENT_VERIFICATION")
    verification_method: Optional[str] = Field(None, description="e.g. OUT_OF_BAND_PHONE, PRE_ESTABLISHED_PORTAL, BANK_DIRECT_CONFIRMATION")
    performed_by: str = "Finance Auditor"
    notes: str = Field(..., description="Audit justification note")

class ReviewActionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    investigation_id: str
    action_type: str
    verification_method: Optional[str] = None
    performed_by: str
    notes: Optional[str] = None
    timestamp: datetime

# ----------------- Investigation Creation & Detail Schemas -----------------
class InvestigationCreateRequest(BaseModel):
    vendor_id: Optional[str] = None
    raw_text: Optional[str] = None
    email_text: Optional[str] = None
    source_type: str = "TEXT"  # TEXT, EMAIL, PDF, SYNTHETIC
    claimed_vendor_name: Optional[str] = None
    claimed_amount: Optional[float] = None
    claimed_currency: Optional[str] = None
    claimed_bank_name: Optional[str] = None
    claimed_account_number: Optional[str] = None

class InvestigationSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    invoice_number: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name_claimed: Optional[str] = None
    sender_email: Optional[str] = None
    invoice_amount: Optional[float] = None
    currency: Optional[str] = "USD"
    final_decision: str  # ELIGIBLE_FOR_REVIEW, PAYMENT_ON_HOLD, VERIFICATION_REQUIRED
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, CLEAN
    human_review_status: str
    ai_inference_status: str

class InvestigationDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    invoice_number: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name_claimed: Optional[str] = None
    sender_email: Optional[str] = None
    sender_domain: Optional[str] = None
    invoice_amount: Optional[float] = None
    currency: Optional[str] = "USD"
    due_date: Optional[str] = None
    po_number: Optional[str] = None
    payment_instructions_raw: Optional[str] = None
    claimed_bank_name: Optional[str] = None
    claimed_account_number: Optional[str] = None
    masked_claimed_account_number: Optional[str] = None
    claimed_routing_number: Optional[str] = None
    claimed_iban: Optional[str] = None
    urgency_detected: bool = False
    urgency_notes: Optional[str] = None
    source_type: str
    source_filename: Optional[str] = None
    source_text_excerpt: Optional[str] = None
    ai_model_used: str
    ai_inference_status: str
    ai_extracted_raw_json: Optional[str] = None
    final_decision: str
    severity: str
    decision_rationale: str
    human_review_status: str
    human_reviewer: Optional[str] = None
    human_review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    vendor: Optional[VendorRead] = None
    findings: List[FindingRead] = Field(default_factory=list)
    review_actions: List[ReviewActionRead] = Field(default_factory=list)

# ----------------- Dashboard & Diagnostics Schemas -----------------
class DashboardStats(BaseModel):
    total_investigations: int
    on_hold_count: int
    verification_required_count: int
    eligible_for_review_count: int
    critical_risk_count: int
    total_vendors: int
    recent_investigations: List[InvestigationSummaryRead]
    discrepancy_categories: Dict[str, int]
    decisions_breakdown: Dict[str, int]

class SystemStatusResponse(BaseModel):
    backend_status: str = "HEALTHY"
    database_status: str = "CONNECTED"
    nebius_connection_status: str = "CONFIGURED"  # CONFIGURED, NOT_CONFIGURED, CONNECTED, ERROR
    nebius_model: str
    nebius_base_url: str
    ai_inference_available: bool
    diagnostic_message: str
    total_db_records: Dict[str, int]
