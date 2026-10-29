import json
import pytest
from app.models import Vendor
from app.schemas import AIExtractedInvoice
from app.services.policy_engine import evaluate_payment_policy

@pytest.fixture
def sample_vendor():
    return Vendor(
        id="VND-TEST-01",
        name="Global Cloud Solutions Inc",
        sender_domains=json.dumps(["globalcloud.com", "billing.globalcloud.com"]),
        verified_bank_name="JPMorgan Chase",
        verified_account_number="1234567890",
        verified_routing_number="021000021",
        expected_currency="USD",
        expected_payment_terms="Net 30",
        verification_status="VERIFIED"
    )

def test_correct_vendor_and_bank_match(sample_vendor):
    """Test 1: All checks match trusted vendor record -> ELIGIBLE_FOR_REVIEW"""
    extracted = AIExtractedInvoice(
        invoice_number="INV-2026-001",
        vendor_name="Global Cloud Solutions Inc",
        sender_email="billing@globalcloud.com",
        sender_domain="globalcloud.com",
        amount=5000.00,
        currency="USD",
        po_number="PO-9941",
        bank_name="JPMorgan Chase",
        account_number="1234567890",
        routing_number="021000021",
        pressure_language_detected=False
    )
    result = evaluate_payment_policy(extracted, sample_vendor)
    assert result.final_decision == "ELIGIBLE_FOR_REVIEW"
    assert result.severity == "CLEAN"
    assert all(f.passed for f in result.findings)

def test_bank_account_change_triggers_critical_hold(sample_vendor):
    """Test 2: Bank account mismatch triggers mandatory PAYMENT_ON_HOLD regardless of other fields"""
    extracted = AIExtractedInvoice(
        invoice_number="INV-2026-002",
        vendor_name="Global Cloud Solutions Inc",
        sender_email="billing@globalcloud.com",
        sender_domain="globalcloud.com",
        amount=5000.00,
        currency="USD",
        po_number="PO-9941",
        bank_name="Wells Fargo",
        account_number="9998887776",  # Different account!
        pressure_language_detected=False
    )
    result = evaluate_payment_policy(extracted, sample_vendor)
    assert result.final_decision == "PAYMENT_ON_HOLD"
    assert result.severity == "CRITICAL"
    bank_findings = [f for f in result.findings if f.finding_code == "UNAUTHORIZED_BANK_ACCOUNT_CHANGE"]
    assert len(bank_findings) == 1
    assert bank_findings[0].passed is False

def test_sender_domain_mismatch_and_typosquatting(sample_vendor):
    """Test 3: Sender domain lookalike triggers CRITICAL or HIGH risk hold/verification"""
    extracted = AIExtractedInvoice(
        invoice_number="INV-2026-003",
        vendor_name="Global Cloud Solutions Inc",
        sender_email="billing@globalcloud-support.com",  # Lookalike / mismatch
        sender_domain="globalcloud-support.com",
        amount=5000.00,
        currency="USD",
        po_number="PO-9941",
        account_number="1234567890",
        pressure_language_detected=False
    )
    result = evaluate_payment_policy(extracted, sample_vendor)
    assert result.final_decision in ["PAYMENT_ON_HOLD", "VERIFICATION_REQUIRED"]
    domain_findings = [f for f in result.findings if f.finding_code == "SENDER_DOMAIN_MISMATCH"]
    assert len(domain_findings) == 1
    assert domain_findings[0].passed is False

def test_currency_mismatch_triggers_verification_required(sample_vendor):
    """Test 4: Currency mismatch triggers VERIFICATION_REQUIRED"""
    extracted = AIExtractedInvoice(
        invoice_number="INV-2026-004",
        vendor_name="Global Cloud Solutions Inc",
        sender_email="billing@globalcloud.com",
        sender_domain="globalcloud.com",
        amount=5000.00,
        currency="EUR",  # Vendor expects USD
        po_number="PO-9941",
        account_number="1234567890",
        pressure_language_detected=False
    )
    result = evaluate_payment_policy(extracted, sample_vendor)
    assert result.final_decision == "VERIFICATION_REQUIRED"
    curr_findings = [f for f in result.findings if f.finding_code == "CURRENCY_MISMATCH"]
    assert len(curr_findings) == 1
    assert curr_findings[0].passed is False

def test_missing_po_triggers_verification_required(sample_vendor):
    """Test 5: Missing PO reference triggers VERIFICATION_REQUIRED"""
    extracted = AIExtractedInvoice(
        invoice_number="INV-2026-005",
        vendor_name="Global Cloud Solutions Inc",
        sender_email="billing@globalcloud.com",
        sender_domain="globalcloud.com",
        amount=5000.00,
        currency="USD",
        po_number=None,  # Missing PO
        account_number="1234567890",
        pressure_language_detected=False
    )
    result = evaluate_payment_policy(extracted, sample_vendor)
    assert result.final_decision == "VERIFICATION_REQUIRED"
    po_findings = [f for f in result.findings if f.finding_code == "MISSING_PURCHASE_ORDER"]
    assert len(po_findings) == 1
    assert po_findings[0].passed is False

def test_ai_hypothesis_cannot_override_mandatory_hold(sample_vendor):
    """Test 6: Policy engine enforces that even if an AI hypothesis thought an invoice looks benign, a critical mismatch mandates HOLD"""
    extracted = AIExtractedInvoice(
        invoice_number="INV-2026-006",
        vendor_name="Global Cloud Solutions Inc",
        sender_email="billing@globalcloud.com",
        sender_domain="globalcloud.com",
        amount=5000.00,
        currency="USD",
        po_number="PO-9941",
        account_number="9999999999",  # Fraudulent account
        pressure_language_detected=False
    )
    result = evaluate_payment_policy(extracted, sample_vendor)
    assert result.final_decision == "PAYMENT_ON_HOLD"
    assert result.severity == "CRITICAL"
