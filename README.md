# ProofPay AI — Evidence-Driven Payment Fraud Prevention Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-proofpay--ai.netlify.app-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://proofpay-ai.netlify.app/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![NVIDIA Nemotron](https://img.shields.io/badge/AI%20Inference-NVIDIA%20Nemotron-76B900?style=flat&logo=nvidia&logoColor=white)](https://build.nvidia.com/)
[![Nebius Token Factory](https://img.shields.io/badge/Inference%20Cloud-Nebius%20Token%20Factory-8A2BE2?style=flat)](https://tokenfactory.nebius.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> ### 🌐 **Live Web Application:** [https://proofpay-ai.netlify.app/](https://proofpay-ai.netlify.app/)
> Test live interactive scenarios including Business Email Compromise (BEC) wire redirection, lookalike typosquatting domains, and legitimate scheduled invoices directly in your browser.

---

## Overview

**ProofPay AI** is an enterprise-grade financial security platform that protects corporate finance and accounts payable teams from **Business Email Compromise (BEC)**, invoice diversion schemes, and fraudulent depository bank account change requests before payments are approved or disbursed.

Traditional accounts payable workflows rely heavily on manual human verification or surface-level OCR tools that merely transcribe invoice text without validating institutional truth. ProofPay AI introduces an **evidence-gated payment verification architecture**:

1. **Generative Extraction:** Leverages **NVIDIA Nemotron** through **Nebius Token Factory** to extract structured remittance instructions, depository account numbers, invoice metadata, and social engineering urgency indicators from untrusted documents.
2. **Deterministic Security Policy Engine:** Compares extracted claims against verified vendor profiles, enforces non-bypassable corporate security rules, and produces an auditable, deterministic decision.
3. **Dual-Control Human Review:** Prohibits automated authorization of suspicious wire changes, requiring certified out-of-band verification before critical holds can be cleared.

---

## Architecture & Verification Pipeline

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

## Key Capabilities

### 1. Non-Bypassable Deterministic Security Policy
AI model inferences are treated as untrusted and advisory. **The AI model can never override a mandatory security rule or directly authorize a payment.** If an unauthorized bank account change is detected, the transaction is automatically placed on an administrative hold regardless of model hypotheses.

### 2. Three-Tier Policy Outcomes
- **`ELIGIBLE_FOR_REVIEW`:** All deterministic vendor identity, sender domain, depository account, and financial policy checks passed. Eligible for standard dual-control human authorization.
- **`PAYMENT_ON_HOLD`:** A critical security violation was detected (e.g., unauthorized bank account switch, BEC typosquatted sender domain). Disbursement is blocked pending independent verification.
- **`VERIFICATION_REQUIRED`:** Operational evidence is missing (e.g., unverified communication channel, missing internal Purchase Order, currency denomination discrepancy).

### 3. Epistemological Classification
Every finding in an investigation report is explicitly tagged to maintain clear evidentiary rigor:
- **`VERIFIED_FACT`:** Grounded directly in registered vendor master records on file.
- **`RULE_BASED_DISCREPANCY`:** Deterministic mismatch flagged by policy rules with expected vs. observed values.
- **`AI_HYPOTHESIS`:** Model-generated inference or behavioral social engineering indicator.

### 4. Side-by-Side Evidence Inspection
Presents an immediate contrast between **Claimed Untrusted Request Details** and **Trusted Vendor Profiles on File**, complete with verbatim source text excerpts and citation quotes.

### 5. Vendor Verification Database with Sensitive Account Protection
- Certified directory of verified vendor records with authorized sender domains, depository institutions, and masked account identifiers (`****9281`).
- **Sensitive Operations:** Any update to vendor depository accounts requires a mandatory audit justification reason and automatically places the record in `PENDING_AUDIT` status until re-certified.

### 6. Dual-Control Human Review Workflow
Auditors can inspect investigations, request additional documentation, append compliance notes, or certify independent verification using formal methods (`OUT_OF_BAND_PHONE_CALL`, `PRE_ESTABLISHED_PORTAL`, `BANK_DIRECT_CONFIRMATION`).

---

## Preloaded Test Scenarios

The workspace includes 4 realistic test scenarios that can be loaded with **1 click** in the **New Investigation** view:

| Scenario | Vector / Description | Deterministic Policy Outcome |
| :--- | :--- | :--- |
| **BEC Attack: Urgent Wire Redirection** | Phishing email claiming an emergency audit froze primary accounts; demands wiring $48,500 to a new Wells Fargo account within 2 hours. | 🛑 **Payment on Hold** (Critical) |
| **Typosquatted Lookalike Domain** | Lookalike domain `invoices@apexloglstics.com` (`l` replaces `i`) attempting invoice diversion. | 🛑 **Payment on Hold** (Critical) |
| **Legitimate Scheduled Invoice** | Recurring monthly cloud invoice matching verified depository account, authorized domain whitelist, and valid PO. | 🟢 **Eligible for Review** (Clean) |
| **Currency & Missing PO Discrepancy** | Euro-denominated invoice submitted for a USD-contracted vendor without an internal Purchase Order. | 🟡 **Verification Required** (Medium) |

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **Database** | SQLite with parameterized queries & immutable audit trail tables |
| **AI Inference** | NVIDIA Nemotron (`nvidia/Llama-3.1-Nemotron-70B-Instruct-HF`) via Nebius Token Factory |
| **Document Processing** | PyPDF text extraction & deterministic regex heuristic engine |
| **Testing** | pytest unit & integration test suite (14/14 passing tests) |
| **Hosting** | Netlify (Frontend SPA), Render / Railway / Local (FastAPI Backend) |

---

## Local Setup & Development

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
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
NEBIUS_API_KEY=""
NEBIUS_BASE_URL="https://api.tokenfactory.nebius.com/v1/"
NEBIUS_MODEL="nvidia/Llama-3.1-Nemotron-70B-Instruct-HF"
ENVIRONMENT="development"
DATABASE_URL="sqlite:///./proofpay.db"
CORS_ORIGINS="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
MAX_UPLOAD_SIZE_MB=10
```

> **Note:** If `NEBIUS_API_KEY` is not provided, ProofPay AI automatically operates in an offline deterministic heuristic fallback mode. Real API calls are never fabricated.

#### Launch Backend Server

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The application interface will open at **`http://127.0.0.1:5173`**.

---

## Running the Automated Test Suite

To run the complete test suite covering deterministic policy rules, bank change detection, domain spoofing, and audit logging:

```bash
cd backend
.\.venv\Scripts\pytest backend\tests -v
```

All 14 tests run against SQLite and validate:
- Correct vendor and bank-detail matches (`ELIGIBLE_FOR_REVIEW`).
- Bank-account modifications triggering mandatory holds (`PAYMENT_ON_HOLD`).
- Sender-domain typosquatting detection.
- Currency and missing PO handling (`VERIFICATION_REQUIRED`).
- Protection against AI hypotheses overriding mandatory holds.
- Human review state transitions and audit logging.

---

## Deployment Configuration

### Netlify (Frontend)
The repository includes a ready-to-use [`netlify.toml`](./netlify.toml) and [`frontend/public/_redirects`](./frontend/public/_redirects):
- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Live Demo:** [https://proofpay-ai.netlify.app/](https://proofpay-ai.netlify.app/)

---

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
