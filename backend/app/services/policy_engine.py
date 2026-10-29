import json
from typing import List, Optional, Tuple, Dict, Any
from app.models import Vendor
from app.schemas import AIExtractedInvoice, FindingRead

class PolicyEvaluationResult:
    def __init__(
        self,
        final_decision: str,  # ELIGIBLE_FOR_REVIEW, PAYMENT_ON_HOLD, VERIFICATION_REQUIRED
        severity: str,        # CRITICAL, HIGH, MEDIUM, LOW, CLEAN
        rationale: str,
        findings: List[FindingRead]
    ):
        self.final_decision = final_decision
        self.severity = severity
        self.rationale = rationale
        self.findings = findings

def normalize_domain(domain: Optional[str]) -> Optional[str]:
    if not domain:
        return None
    return domain.strip().lower().lstrip("@")

def normalize_account_num(acc: Optional[str]) -> Optional[str]:
    if not acc:
        return None
    # Strip spaces, hyphens, and leading zeros for safe comparison
    cleaned = "".join(c for c in acc if c.isalnum()).upper()
    return cleaned

def evaluate_payment_policy(
    extracted: AIExtractedInvoice,
    vendor: Optional[Vendor]
) -> PolicyEvaluationResult:
    """
    Deterministic Security Policy Engine.
    Evaluates untrusted invoice and communication signals against verified vendor records.
    AI findings are advisory; deterministic rules strictly govern the final decision.
    """
    findings: List[FindingRead] = []
    has_critical_failure = False
    has_high_failure = False
    has_medium_failure = False

    # -------------------------------------------------------------
    # Rule 1: Vendor Record Existence & Identification
    # -------------------------------------------------------------
    if not vendor:
        findings.append(FindingRead(
            finding_code="UNREGISTERED_VENDOR",
            category="IDENTITY_VERIFICATION",
            severity="CRITICAL",
            title="Unregistered Vendor Record",
            description="The claimed vendor is not registered in the trusted Vendor Verification Database.",
            expected_value="Pre-verified registered vendor ID",
            observed_value=f"Claimed: '{extracted.vendor_name or 'Unknown'}'",
            evidence_excerpt=extracted.evidence_snippets.get("vendor", "No verified vendor match"),
            finding_nature="RULE_BASED_DISCREPANCY",
            passed=False
        ))
        has_critical_failure = True
    else:
        # Check vendor name alignment
        claimed_name = (extracted.vendor_name or "").strip().lower()
        verified_name = vendor.name.strip().lower()
        if claimed_name and claimed_name not in verified_name and verified_name not in claimed_name:
            findings.append(FindingRead(
                finding_code="VENDOR_NAME_MISMATCH",
                category="IDENTITY_VERIFICATION",
                severity="HIGH",
                title="Vendor Name Inconsistency",
                description="The legal name on the invoice differs significantly from the registered vendor name.",
                expected_value=vendor.name,
                observed_value=extracted.vendor_name,
                evidence_excerpt=extracted.evidence_snippets.get("vendor", f"Invoice: {extracted.vendor_name}"),
                finding_nature="RULE_BASED_DISCREPANCY",
                passed=False
            ))
            has_high_failure = True
        else:
            findings.append(FindingRead(
                finding_code="VENDOR_IDENTITY_VERIFIED",
                category="IDENTITY_VERIFICATION",
                severity="LOW",
                title="Vendor Identity Match",
                description="Claimed vendor matches registered vendor profile in trusted database.",
                expected_value=vendor.name,
                observed_value=vendor.name,
                evidence_excerpt=f"Vendor ID: {vendor.id} ({vendor.name})",
                finding_nature="VERIFIED_FACT",
                passed=True
            ))

    # -------------------------------------------------------------
    # Rule 2: Sender Domain & BEC Spoofing Analysis
    # -------------------------------------------------------------
    if vendor:
        try:
            trusted_domains: List[str] = json.loads(vendor.sender_domains) if isinstance(vendor.sender_domains, str) else vendor.sender_domains
        except Exception:
            trusted_domains = [vendor.sender_domains] if vendor.sender_domains else []

        trusted_domains_norm = [normalize_domain(d) for d in trusted_domains if d]
        observed_domain_norm = normalize_domain(extracted.sender_domain)

        if not observed_domain_norm:
            findings.append(FindingRead(
                finding_code="SENDER_DOMAIN_MISSING",
                category="SENDER_AUTHENTICITY",
                severity="HIGH",
                title="Unverified Sender Channel",
                description="No verified email sender domain was provided with the payment request.",
                expected_value=f"One of: {', '.join(trusted_domains_norm)}",
                observed_value="None provided",
                evidence_excerpt="Sender email header or domain missing in request",
                finding_nature="RULE_BASED_DISCREPANCY",
                passed=False
            ))
            has_high_failure = True
        elif observed_domain_norm not in trusted_domains_norm:
            # Check for possible typosquatting (e.g. acme-cloud vs acmecloud, apexloglstics vs apexlogistics)
            typosquat_risk = False
            for td in trusted_domains_norm:
                if td and (td in observed_domain_norm or observed_domain_norm in td or len(set(observed_domain_norm) ^ set(td)) <= 2):
                    typosquat_risk = True
                    break

            severity_level = "CRITICAL" if typosquat_risk else "HIGH"
            title_text = "Domain Lookalike / BEC Typosquatting Risk" if typosquat_risk else "Sender Domain Discrepancy"
            desc_text = (
                f"The sender domain '@{observed_domain_norm}' closely resembles authorized domain '{trusted_domains_norm[0]}' but is not authorized. High risk of Business Email Compromise."
                if typosquat_risk else
                f"Sender domain '@{observed_domain_norm}' is not registered under authorized domains for {vendor.name}."
            )
            
            findings.append(FindingRead(
                finding_code="SENDER_DOMAIN_MISMATCH",
                category="SENDER_AUTHENTICITY",
                severity=severity_level,
                title=title_text,
                description=desc_text,
                expected_value=f"Authorized domains: {', '.join(trusted_domains_norm)}",
                observed_value=f"Observed: @{observed_domain_norm} (Email: {extracted.sender_email})",
                evidence_excerpt=f"Sender header: {extracted.sender_email}",
                finding_nature="RULE_BASED_DISCREPANCY",
                passed=False
            ))
            if severity_level == "CRITICAL":
                has_critical_failure = True
            else:
                has_high_failure = True
        else:
            findings.append(FindingRead(
                finding_code="SENDER_DOMAIN_MATCH",
                category="SENDER_AUTHENTICITY",
                severity="LOW",
                title="Sender Domain Authorized",
                description=f"Sender email domain '@{observed_domain_norm}' is registered on trusted whitelist.",
                expected_value=f"Authorized domain: @{observed_domain_norm}",
                observed_value=f"@{observed_domain_norm}",
                evidence_excerpt=f"Verified sender email: {extracted.sender_email}",
                finding_nature="VERIFIED_FACT",
                passed=True
            ))

    # -------------------------------------------------------------
    # Rule 3: Depository Bank & Account Number Verification (MANDATORY HOLD ON MISMATCH)
    # -------------------------------------------------------------
    if vendor:
        norm_expected_acct = normalize_account_num(vendor.verified_account_number)
        norm_claimed_acct = normalize_account_num(extracted.account_number)

        if not norm_claimed_acct:
            findings.append(FindingRead(
                finding_code="PAYMENT_DETAILS_UNSPECIFIED",
                category="BANKING_SECURITY",
                severity="HIGH",
                title="Missing Remittance Account Details",
                description="The invoice or request does not include explicit depository account or routing details.",
                expected_value=f"Ending in ...{norm_expected_acct[-4:] if norm_expected_acct else 'XXXX'}",
                observed_value="No account number extracted",
                evidence_excerpt="Payment remittance section missing or incomplete",
                finding_nature="RULE_BASED_DISCREPANCY",
                passed=False
            ))
            has_high_failure = True
        elif norm_claimed_acct != norm_expected_acct:
            # SENSITIVE FRAUD VECTOR: Bank account change
            findings.append(FindingRead(
                finding_code="UNAUTHORIZED_BANK_ACCOUNT_CHANGE",
                category="BANKING_SECURITY",
                severity="CRITICAL",
                title="Critical Bank Account Mismatch / Unauthorized Change Request",
                description=(
                    f"Requested remittance account (...{norm_claimed_acct[-4:]}) does NOT match verified vendor account (...{norm_expected_acct[-4:] if norm_expected_acct else 'XXXX'}). "
                    "This is the primary vector for wire redirection fraud and invoice diversion scams."
                ),
                expected_value=f"{vendor.verified_bank_name} (Acc: ...{norm_expected_acct[-4:] if norm_expected_acct else 'XXXX'})",
                observed_value=f"{extracted.bank_name or 'Unspecified Bank'} (Acc: ...{norm_claimed_acct[-4:]})",
                evidence_excerpt=extracted.evidence_snippets.get("bank_details", f"Claimed Account: {extracted.account_number} at {extracted.bank_name}"),
                finding_nature="RULE_BASED_DISCREPANCY",
                passed=False
            ))
            has_critical_failure = True
        else:
            findings.append(FindingRead(
                finding_code="BANK_ACCOUNT_VERIFIED",
                category="BANKING_SECURITY",
                severity="LOW",
                title="Bank Account Matches Verified Records",
                description="Remittance bank account number precisely matches trusted vendor database profile.",
                expected_value=f"...{norm_expected_acct[-4:]}",
                observed_value=f"...{norm_claimed_acct[-4:]}",
                evidence_excerpt=f"Matched institution: {vendor.verified_bank_name}",
                finding_nature="VERIFIED_FACT",
                passed=True
            ))

    # -------------------------------------------------------------
    # Rule 4: Currency & Financial Terms Consistency
    # -------------------------------------------------------------
    if vendor:
        expected_curr = (vendor.expected_currency or "USD").upper()
        observed_curr = (extracted.currency or "USD").upper()
        if observed_curr != expected_curr:
            findings.append(FindingRead(
                finding_code="CURRENCY_MISMATCH",
                category="FINANCIAL_TERMS",
                severity="MEDIUM",
                title="Payment Currency Discrepancy",
                description=f"Invoice requested in {observed_curr}, but vendor agreement specifies {expected_curr}.",
                expected_value=expected_curr,
                observed_value=observed_curr,
                evidence_excerpt=f"Extracted amount & currency: {observed_curr} {extracted.amount}",
                finding_nature="RULE_BASED_DISCREPANCY",
                passed=False
            ))
            has_medium_failure = True
        else:
            findings.append(FindingRead(
                finding_code="CURRENCY_VERIFIED",
                category="FINANCIAL_TERMS",
                severity="LOW",
                title="Currency Conforms to Vendor Profile",
                description=f"Invoice currency matches expected {expected_curr} denomination.",
                expected_value=expected_curr,
                observed_value=observed_curr,
                evidence_excerpt=f"Currency: {observed_curr}",
                finding_nature="VERIFIED_FACT",
                passed=True
            ))

    # -------------------------------------------------------------
    # Rule 5: Purchase Order (PO) & Supporting Documentation Check
    # -------------------------------------------------------------
    if not extracted.po_number or extracted.po_number.strip() == "":
        findings.append(FindingRead(
            finding_code="MISSING_PURCHASE_ORDER",
            category="FINANCIAL_TERMS",
            severity="MEDIUM",
            title="Missing Purchase Order (PO) Reference",
            description="Payment request does not reference an approved internal PO number.",
            expected_value="Valid internal PO reference (e.g. PO-XXXX)",
            observed_value="None referenced",
            evidence_excerpt="No PO number found in invoice text",
            finding_nature="RULE_BASED_DISCREPANCY",
            passed=False
        ))
        has_medium_failure = True
    else:
        findings.append(FindingRead(
            finding_code="PURCHASE_ORDER_PRESENT",
            category="FINANCIAL_TERMS",
            severity="LOW",
            title="Purchase Order Referenced",
            description=f"Invoice explicitly references Purchase Order {extracted.po_number}.",
            expected_value="PO Reference",
            observed_value=extracted.po_number,
            evidence_excerpt=f"PO: {extracted.po_number}",
            finding_nature="VERIFIED_FACT",
            passed=True
        ))

    # -------------------------------------------------------------
    # Rule 6: Behavioral Urgency & Social Engineering Signals (AI Hypothesis)
    # -------------------------------------------------------------
    if extracted.pressure_language_detected or extracted.urgency_signals:
        findings.append(FindingRead(
            finding_code="BEHAVIORAL_PRESSURE_TACTICS",
            category="BEHAVIORAL_URGENCY",
            severity="HIGH",
            title="Social Engineering Pressure Language Detected",
            description="Communication contains artificial urgency or threat language characteristic of Business Email Compromise.",
            expected_value="Standard commercial payment terms without artificial urgency",
            observed_value="Urgency / Pressure signals detected",
            evidence_excerpt=extracted.evidence_snippets.get("urgency", "; ".join(extracted.urgency_signals)),
            finding_nature="AI_HYPOTHESIS",
            passed=False
        ))
        has_high_failure = True
    else:
        findings.append(FindingRead(
            finding_code="COMMUNICATION_TONE_STANDARD",
            category="BEHAVIORAL_URGENCY",
            severity="LOW",
            title="Communication Tone Normal",
            description="No anomalous pressure language or artificial urgency flags detected.",
            expected_value="Professional commercial tone",
            observed_value="Normal business tone",
            evidence_excerpt="Clean communication style",
            finding_nature="AI_HYPOTHESIS",
            passed=True
        ))

    # -------------------------------------------------------------
    # Final Decision Formulation (DETERMINISTIC LOGIC)
    # -------------------------------------------------------------
    # Never let AI hypothesis override mandatory policy rules.
    if has_critical_failure:
        final_decision = "PAYMENT_ON_HOLD"
        severity = "CRITICAL"
        rationale = (
            "CRITICAL SECURITY ALERT: Deterministic policy rules detected unauthorized bank account modification "
            "or severe sender domain impersonation. Payment has been placed on mandatory administrative hold. "
            "Disbursement is blocked pending independent out-of-band verification."
        )
    elif has_high_failure:
        final_decision = "VERIFICATION_REQUIRED"
        severity = "HIGH"
        rationale = (
            "POLICY ALERT: Unverified communication channels, missing depository details, or behavioral urgency tactics "
            "were detected. Secondary verification is mandatory before invoice can be submitted for financial approval."
        )
    elif has_medium_failure:
        final_decision = "VERIFICATION_REQUIRED"
        severity = "MEDIUM"
        rationale = (
            "PROCEDURAL ALERT: Discrepancies detected in payment currency or missing internal Purchase Order. "
            "Vendor reconciliation or procurement confirmation required."
        )
    else:
        final_decision = "ELIGIBLE_FOR_REVIEW"
        severity = "CLEAN"
        rationale = (
            "EVIDENCE GATES PASSED: All deterministic vendor identity, sender domain, depository account, and financial policy checks passed. "
            "Eligible for standard dual-control human finance approval."
        )

    return PolicyEvaluationResult(
        final_decision=final_decision,
        severity=severity,
        rationale=rationale,
        findings=findings
    )
