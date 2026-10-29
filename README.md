# ProofPay AI — Evidence-Driven Payment Fraud Prevention Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![NVIDIA Nemotron](https://img.shields.io/badge/AI%20Inference-NVIDIA%20Nemotron-76B900?style=flat&logo=nvidia&logoColor=white)](https://build.nvidia.com/)
[![Nebius Token Factory](https://img.shields.io/badge/Inference%20Cloud-Nebius%20Token%20Factory-8A2BE2?style=flat)](https://tokenfactory.nebius.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**ProofPay AI** is an enterprise-grade financial security platform that protects corporate treasury and accounts payable teams from **Business Email Compromise (BEC)**, invoice diversion schemes, and unauthorized depository account modification attacks before payments are disbursed.

---

## 1. Executive Summary & Problem Space

Business Email Compromise (BEC) and vendor impersonation scams account for billions in corporate losses annually. Traditional accounts payable workflows rely heavily on manual human verification or surface-level OCR that merely transcribes text without validating authenticity against trusted institutional records.

**ProofPay AI** introduces an **evidence-gated payment verification architecture**:
- **Generative AI Inference:** Extracts structured remittance instructions, depository account numbers, invoice metadata, and social engineering urgency indicators from untrusted documents.
- **Deterministic Security Policy Engine:** Automatically cross-checks extracted claims against verified vendor profiles, enforces immutable corporate security policies, and produces an auditable, explainable decision.
- **Dual-Control Human Review:** Prohibits automated authorization of suspicious wire changes, requiring certified out-of-band verification before critical holds can be cleared.

---

## 2. Architecture & Evidence-Gated Workflow

```
 [Untrusted Invoice (PDF / Text) & Associated Cover Email]
                           │
                           ▼
        [NVIDIA Nemotron via Nebius Token Factory]
   (Structured data extraction, bank account normalization, 
    and behavioral social engineering / pressure detection)
                           │
                           ▼
          [Deterministic Security Policy Engine]
    (Evaluates claims against trusted vendor database profiles;
     applies strict non-bypassable fraud detection rules)
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   PAYMENT ON HOLD   VERIFICATION REQ.  ELIGIBLE FOR REVIEW
  (Unauthorized Bank   (Missing PO or    (All Deterministic
   Account Change or  Currency Mismatch)  Checks Certified)
   Domain Spoofing)        │                 │
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
      [Dual-Control Human Review & Immutable Audit Trail]
     (Certifies out-of-band verification method & compliance notes)
```

---

## 3. Core Features

### A. Non-Bypassable Deterministic Security Policy
AI model inferences are treated as untrusted and advisory. **The AI model can never override a mandatory security rule or directly authorize a payment.** If an unauthorized bank account change is detected, the transaction is automatically placed on an administrative hold regardless of model hypotheses.

### B. Three-Tier Policy Outcomes
1. **Eligible for Review:** All deterministic checks passed. The transaction meets baseline security requirements, but standard dual-control human authorization is still mandatory.
2. **Payment on Hold:** A critical security violation was detected (e.g., unauthorized depository account change, lookalike/typosquatted sender domain).
3. **Verification Required:** Required operational evidence is missing (e.g., no pre-approved internal Purchase Order, currency denomination discrepancy).

### C. Epistemological Classification
Every finding in an investigation report is explicitly tagged to avoid hallucination confusion:
- `VERIFIED_FACT`: Grounded directly in registered vendor master records.
- `RULE_BASED_DISCREPANCY`: Deterministic mismatch flagged by policy rules with expected vs. observed values.
- `AI_HYPOTHESIS`: Model-generated inference or behavioral social engineering indicator.

### D. Side-by-Side Evidence Inspection
Presents an immediate comparison between **Claimed Untrusted Request Details** and **Trusted Vendor Profiles on File**, complete with verbatim source text excerpts and citation quotes.

### E. Vendor Verification Database with Sensitive Account Protection
- Certified directory of verified vendor records with authorized sender domains, depository institutions, and masked account identifiers (`****9281`).
- Sensitive operations: Any update to vendor depository accounts requires a mandatory audit justification reason and automatically places the record in `PENDING_AUDIT` status until re-certified.

### F. Dual-Control Human Review Workflow
Auditors can inspect investigations, request additional documentation, append compliance notes, or certify independent verification using formal methods (`OUT_OF_BAND_PHONE_CALL`, `PRE_ESTABLISHED_PORTAL`, `BANK_DIRECT_CONFIRMATION`).

---

## 4. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend:** Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy
- **Database:** SQLite with persistent tables (`vendors`, `vendor_audit_logs`, `investigations`, `investigation_findings`, `review_actions`)
- **AI Inference Engine:** NVIDIA Nemotron (`nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` or `nvidia/nemotron-4-340b-instruct`) through Nebius Token Factory
- **Document Processing:** PyPDF text extraction and fallback heuristic pattern analyzer
- **Testing:** Comprehensive pytest automated unit & integration test suite

---

## 5. Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

#### Environment Variables (`backend/.env`)

```env
# Nebius Token Factory & NVIDIA Nemotron Configuration
NEBIUS_API_KEY=""
NEBIUS_BASE_URL="https://api.tokenfactory.nebius.com/v1/"
NEBIUS_MODEL="nvidia/Llama-3.1-Nemotron-70B-Instruct-HF"

# Application Settings
ENVIRONMENT="development"
DATABASE_URL="sqlite:///./proofpay.db"
CORS_ORIGINS="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
MAX_UPLOAD_SIZE_MB=10
```

> **Note:** If `NEBIUS_API_KEY` is not provided, ProofPay AI operates in a high-fidelity local deterministic heuristic fallback mode. Real API calls are never fabricated.

#### Start Backend Server

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The FastAPI REST API will be available at `http://127.0.0.1:8000` (Swagger docs: `http://127.0.0.1:8000/docs`).

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The application interface will open at **`http://127.0.0.1:5173`**.

---

## 6. Preloaded Test Scenarios

The workspace includes 4 realistic test scenarios that can be loaded with **1 click** in the **New Investigation** view:

1. **BEC Attack: Urgent Wire Redirection (`PAYMENT_ON_HOLD`)**
   - *Attack Vector:* Phishing email claiming an emergency regulatory audit froze primary accounts; demands wiring $48,500 to a new Wells Fargo account within 2 hours.
   - *Policy Trigger:* Unauthorized bank account modification and behavioral urgency pressure.
2. **Typosquatted Domain Attack (`PAYMENT_ON_HOLD`)**
   - *Attack Vector:* Lookalike domain `invoices@apexloglstics.com` (`l` instead of `i`) targeting Apex Logistics.
   - *Policy Trigger:* Unauthorized sender domain discrepancy.
3. **Legitimate Scheduled Payment (`ELIGIBLE_FOR_REVIEW`)**
   - *Scenario:* Standard recurring cloud invoice from `billing@acmecloud.com` matching depository account on file and approved Purchase Order.
   - *Policy Trigger:* All deterministic evidence gates passed.
4. **Currency Discrepancy & Missing PO (`VERIFICATION_REQUIRED`)**
   - *Scenario:* Euro-denominated invoice submitted for a USD-contracted vendor without an internal Purchase Order.
   - *Policy Trigger:* Financial terms mismatch requiring procurement reconciliation.

---

## 7. Running Tests

Run the complete test suite covering deterministic policy rules, bank change detection, domain spoofing, and audit logging:

```bash
cd backend
.\.venv\Scripts\pytest backend\tests -v
```

All 14 tests run against SQLite and validate:
- Correct vendor and bank-detail matches.
- Bank-account modifications triggering mandatory holds.
- Sender-domain typosquatting detection.
- Currency and missing PO handling.
- Protection against AI hypotheses overriding mandatory holds.
- Human review state transitions and audit logging.

---

## 8. License

Distributed under the MIT License. See `LICENSE` for more information.
