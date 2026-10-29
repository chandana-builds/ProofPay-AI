import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Vendor, VendorAuditLog, Investigation, InvestigationFinding, ReviewAction
from app.services.nemotron_service import extract_with_heuristic_engine
from app.services.policy_engine import evaluate_payment_policy

SAMPLE_SCENARIOS = [
    {
        "id": "scenario-bec-bank-switch",
        "title": "BEC Attack: Urgent Wire Redirection (Critical Hold)",
        "badge": "Critical Fraud Attack",
        "vendor_id": "VND-1001",
        "claimed_vendor_name": "Acme Cloud Services, Inc.",
        "description": "Sophisticated Business Email Compromise impersonating Acme's CFO. Claims an emergency banking audit requires wiring $48,500 to a brand new Wells Fargo account within 2 hours.",
        "email_text": """From: David Miller <cfo-audits@acme-cloud-billing.com>
To: accounts-payable@ourcompany.com
Date: Today, 8:45 AM
Subject: URGENT: Updated Wire Instructions for Invoice INV-2026-9042 - AUDIT REQUIREMENT

Dear Finance Team,

Please note our accounting department is currently undergoing our annual regulatory audit. 
Our primary Chase depository account is temporarily frozen for routine reconciliation.

For invoice INV-2026-9042 ($48,500.00), you MUST wire payment immediately to our temporary reserve account at Wells Fargo:
Bank: Wells Fargo NA
Account Number: 987654321098
Routing Number: 121000248
Account Name: Acme Cloud Special Hold

This payment is due today. Failure to wire within 2 hours will result in automatic cloud service interruption. Do NOT call the office desk as our phone lines are being migrated today.

Sincerely,
David Miller, Chief Financial Officer
Acme Cloud Services, Inc.""",
        "raw_text": """INVOICE
Acme Cloud Services, Inc.
Invoice Number: INV-2026-9042
Date: Current Month
Due Date: Immediately upon receipt
Total Amount: $48,500.00 USD

Description: Enterprise GPU Cloud Clusters & Data Lake compute tier
PO: PO-9942-A

Remittance Instructions:
Bank: Wells Fargo NA
Account #: 987654321098
Routing #: 121000248"""
    },
    {
        "id": "scenario-typosquatting",
        "title": "Typosquatted Domain Attack (Critical Hold)",
        "badge": "Impersonation Vector",
        "vendor_id": "VND-1002",
        "claimed_vendor_name": "Apex Logistics Global",
        "description": "Attacker registers lookalike domain 'apexloglstics.com' (letter 'l' replaces 'i') attempting invoice diversion of $24,150.00.",
        "email_text": """From: Billing Department <invoices@apexloglstics.com>
To: dispatch-payables@ourcompany.com
Subject: Overdue Freight Settlement INV-8821

Please find attached monthly freight and container handling statement. 
Please remit payment of $24,150.00 USD to our standard operating account:
Bank: Citibank NA
Account Number: 112233445566
Routing Number: 021000089

Thank you for your prompt payment.""",
        "raw_text": """APEX LOGISTICS GLOBAL
Invoice: INV-8821
PO Reference: PO-FREIGHT-401
Amount Due: $24,150.00 USD
Terms: Net 15
Bank: Citibank NA
Account: 112233445566
Routing: 021000089"""
    },
    {
        "id": "scenario-legitimate-match",
        "title": "Legitimate Scheduled Payment (Eligible for Review)",
        "badge": "Standard Clean Invoice",
        "vendor_id": "VND-1001",
        "claimed_vendor_name": "Acme Cloud Services, Inc.",
        "description": "Legitimate recurring software subscription. Domain matches 'billing.acmecloud.com', account number matches verified Chase profile, valid PO reference.",
        "email_text": """From: Acme Automated Billing <billing@acmecloud.com>
To: accounts-payable@ourcompany.com
Subject: Acme Cloud Monthly Invoice #INV-2026-1184 (PO-8820)

Hello,

Your monthly invoice for enterprise cloud infrastructure is now available.
Invoice: INV-2026-1184
Amount: $12,450.00 USD
Due Date: Net 30

Standard Remittance Account on file:
Bank: JPMorgan Chase Bank
Account #: 48291049281
Routing #: 021000021

Thank you for choosing Acme Cloud Services.""",
        "raw_text": """INVOICE
Acme Cloud Services, Inc.
Invoice: INV-2026-1184
PO Number: PO-8820
Amount: $12,450.00 USD
Payment Terms: Net 30
Depository Bank: JPMorgan Chase Bank
Account Number: 48291049281
Routing Number: 021000021"""
    },
    {
        "id": "scenario-currency-po-discrepancy",
        "title": "Currency Discrepancy & Missing PO (Verification Required)",
        "badge": "Policy Verification Needed",
        "vendor_id": "VND-1003",
        "claimed_vendor_name": "CyberShield InfoSec Ltd",
        "description": "Invoice submitted in Euros (€35,000.00) when vendor agreement is in USD, and internal Purchase Order is missing.",
        "email_text": """From: Accounts Receivable <billing@cybershield.io>
To: accounts-payable@ourcompany.com
Subject: European Penetration Testing Engagement Invoice

Please find the invoice for the Q3 red-team audit across Frankfurt datacenter.
Amount: €35,000.00 EUR
Due in 30 days.
Bank: Citibank Europe
Account #: 37461928374""",
        "raw_text": """CyberShield InfoSec Ltd
Invoice Ref: CS-9923
Total Due: €35,000.00 EUR
Bank: Citibank
Account: 37461928374
Description: European Datacenter Red Team Assessment"""
    }
]

def seed_database(db: Session):
    """
    Seeds trusted vendors, audit trail, and initial historical investigations if database is empty.
    """
    existing_vendors = db.query(Vendor).count()
    if existing_vendors > 0:
        return

    # 1. Create Trusted Vendors
    v1 = Vendor(
        id="VND-1001",
        name="Acme Cloud Services, Inc.",
        sender_domains=json.dumps(["acmecloud.com", "billing.acmecloud.com"]),
        verified_bank_name="JPMorgan Chase Bank",
        verified_account_number="48291049281",
        verified_routing_number="021000021",
        verified_iban=None,
        expected_currency="USD",
        expected_payment_terms="Net 30",
        verification_status="VERIFIED",
        last_verified_at=datetime.utcnow() - timedelta(days=45),
    )
    v2 = Vendor(
        id="VND-1002",
        name="Apex Logistics Global",
        sender_domains=json.dumps(["apexlogistics.com", "freight.apexlogistics.com"]),
        verified_bank_name="Wells Fargo NA",
        verified_account_number="91028374619",
        verified_routing_number="121000248",
        verified_iban=None,
        expected_currency="USD",
        expected_payment_terms="Net 15",
        verification_status="VERIFIED",
        last_verified_at=datetime.utcnow() - timedelta(days=60),
    )
    v3 = Vendor(
        id="VND-1003",
        name="CyberShield InfoSec Ltd",
        sender_domains=json.dumps(["cybershield.io", "secure.cybershield.io"]),
        verified_bank_name="Citibank NA",
        verified_account_number="37461928374",
        verified_routing_number="021000089",
        verified_iban=None,
        expected_currency="USD",
        expected_payment_terms="Net 30",
        verification_status="VERIFIED",
        last_verified_at=datetime.utcnow() - timedelta(days=15),
    )
    v4 = Vendor(
        id="VND-1004",
        name="Horizon Data Analytics",
        sender_domains=json.dumps(["horizondata.ai"]),
        verified_bank_name="First Citizens Bank",
        verified_account_number="55102938472",
        verified_routing_number="321171184",
        verified_iban=None,
        expected_currency="USD",
        expected_payment_terms="Net 45",
        verification_status="VERIFIED",
        last_verified_at=datetime.utcnow() - timedelta(days=90),
    )

    db.add_all([v1, v2, v3, v4])
    db.flush()

    # 2. Add Initial Vendor Audit Logs
    audit1 = VendorAuditLog(
        vendor_id="VND-1001",
        action="VERIFIED_MANUALLY",
        changed_fields=json.dumps({"verified_bank_name": "JPMorgan Chase Bank", "account": "...9281"}),
        performed_by="Compliance Officer (Sarah Jenkins)",
        notes="Confirmed with corporate counsel via signed master services agreement and direct bank confirmation.",
        timestamp=datetime.utcnow() - timedelta(days=45)
    )
    audit2 = VendorAuditLog(
        vendor_id="VND-1002",
        action="CREATED",
        changed_fields=json.dumps({"initial_onboarding": "Complete"}),
        performed_by="Procurement Lead (Michael Chang)",
        notes="New vendor onboarding completed with verified W-9 and voided check.",
        timestamp=datetime.utcnow() - timedelta(days=60)
    )
    db.add_all([audit1, audit2])
    db.commit()

    # 3. Create realistic initial investigations representing each outcome category
    scenarios_to_seed = [
        SAMPLE_SCENARIOS[0],  # BEC attack (HOLD)
        SAMPLE_SCENARIOS[2],  # Legitimate invoice (ELIGIBLE)
        SAMPLE_SCENARIOS[3],  # Currency discrepancy (VERIFICATION_REQUIRED)
    ]

    for idx, sc in enumerate(scenarios_to_seed):
        inv_id = f"INV-2026-00{idx + 1}"
        vendor_obj = db.query(Vendor).filter(Vendor.id == sc["vendor_id"]).first()
        
        extracted = extract_with_heuristic_engine(sc["raw_text"], sc["email_text"])
        policy_res = evaluate_payment_policy(extracted, vendor_obj)

        inv = Investigation(
            id=inv_id,
            created_at=datetime.utcnow() - timedelta(hours=(idx * 12 + 3)),
            invoice_number=extracted.invoice_number or f"INV-2026-SAMPLE-{idx+1}",
            vendor_id=vendor_obj.id if vendor_obj else None,
            vendor_name_claimed=extracted.vendor_name or (vendor_obj.name if vendor_obj else "Unknown"),
            sender_email=extracted.sender_email,
            sender_domain=extracted.sender_domain,
            invoice_amount=extracted.amount or 15000.0,
            currency=extracted.currency or "USD",
            due_date=extracted.due_date,
            po_number=extracted.po_number,
            payment_instructions_raw=extracted.payment_instructions,
            claimed_bank_name=extracted.bank_name,
            claimed_account_number=extracted.account_number,
            claimed_routing_number=extracted.routing_number,
            claimed_iban=extracted.iban,
            urgency_detected=extracted.pressure_language_detected,
            urgency_notes="; ".join(extracted.urgency_signals) if extracted.urgency_signals else None,
            source_type="SYNTHETIC",
            source_text_excerpt=sc["raw_text"][:300],
            ai_model_used="nvidia/Llama-3.1-Nemotron-70B-Instruct-HF (Demo Baseline)",
            ai_inference_status="OFFLINE_FALLBACK",
            ai_extracted_raw_json=extracted.model_dump_json(),
            final_decision=policy_res.final_decision,
            severity=policy_res.severity,
            decision_rationale=policy_res.rationale,
            human_review_status="PENDING",
        )
        db.add(inv)
        db.flush()

        for f in policy_res.findings:
            finding_row = InvestigationFinding(
                investigation_id=inv.id,
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
