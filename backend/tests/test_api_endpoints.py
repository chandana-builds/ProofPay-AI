import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.services.seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ProofPay AI Backend API"
    assert data["status"] == "OPERATIONAL"

def test_dashboard_stats_endpoint(client):
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_investigations" in data
    assert "on_hold_count" in data
    assert "discrepancy_categories" in data
    assert data["total_vendors"] >= 1

def test_list_vendors(client):
    response = client.get("/api/vendors")
    assert response.status_code == 200
    vendors = response.json()
    assert len(vendors) >= 1
    # Check account is masked in read model
    assert "****" in vendors[0]["masked_account_number"]

def test_create_and_query_investigation(client):
    payload = {
        "vendor_id": "VND-1001",
        "email_text": "From: billing@acmecloud.com\nSubject: Invoice INV-9901 for $12,450.00\nPlease wire to JPMorgan Chase Acct: 48291049281 PO: PO-8820",
        "raw_text": "INVOICE INV-9901 Amount: $12,450.00 Bank: JPMorgan Chase Account: 48291049281 PO: PO-8820",
        "source_type": "TEXT"
    }
    response = client.post("/api/investigations", json=payload)
    assert response.status_code == 200
    inv = response.json()
    assert inv["id"].startswith("INV-2026-")
    assert inv["final_decision"] == "ELIGIBLE_FOR_REVIEW"
    assert len(inv["findings"]) >= 1

    # Verify query by ID
    get_res = client.get(f"/api/investigations/{inv['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == inv["id"]

def test_bec_attack_investigation_triggers_hold(client):
    payload = {
        "vendor_id": "VND-1001",
        "email_text": "From: controller@acme-cloud-billing.com\nSubject: URGENT: Frozen Chase account, wire to new Wells Fargo account 987654321098 within 2 hours or services terminated!",
        "raw_text": "INVOICE #9042 Amount: $48,500.00 Bank: Wells Fargo Account: 987654321098",
        "source_type": "TEXT"
    }
    response = client.post("/api/investigations", json=payload)
    assert response.status_code == 200
    inv = response.json()
    assert inv["final_decision"] == "PAYMENT_ON_HOLD"
    assert inv["severity"] == "CRITICAL"

def test_human_review_workflow_and_verification_method(client):
    # 1. Create an investigation that gets put on hold
    payload = {
        "vendor_id": "VND-1001",
        "email_text": "From: controller@acme-cloud-billing.com\nBank: Wells Fargo Account: 987654321098",
        "raw_text": "INVOICE 999 Amount: $5,000 Bank: Wells Fargo Account: 987654321098",
        "source_type": "TEXT"
    }
    res = client.post("/api/investigations", json=payload)
    inv_id = res.json()["id"]

    # 2. Auditor applies hold confirmation
    hold_res = client.post(
        f"/api/investigations/{inv_id}/reviews",
        json={
            "action_type": "APPLY_HOLD",
            "performed_by": "Compliance Lead",
            "notes": "Bank mismatch confirmed suspicious. Payment halted."
        }
    )
    assert hold_res.status_code == 200
    assert hold_res.json()["human_review_status"] == "HOLD_CONFIRMED"

    # 3. Auditor certifies out-of-band phone call verification
    verify_res = client.post(
        f"/api/investigations/{inv_id}/reviews",
        json={
            "action_type": "CONFIRM_INDEPENDENT_VERIFICATION",
            "verification_method": "OUT_OF_BAND_PHONE_CALL",
            "performed_by": "Senior Treasurer",
            "notes": "Spoke directly with Acme CFO via known phone number on file. Re-routed to verified Chase account."
        }
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["human_review_status"] == "INDEPENDENTLY_VERIFIED"
    assert verify_res.json()["final_decision"] == "ELIGIBLE_FOR_REVIEW"

def test_vendor_update_logs_audit_trail(client):
    update_payload = {
        "verified_bank_name": "JPMorgan Chase Commercial",
        "reason_for_change": "Annual corporate banking refresh confirmed by treasurer."
    }
    res = client.put("/api/vendors/VND-1001", json=update_payload)
    assert res.status_code == 200
    assert res.json()["verified_bank_name"] == "JPMorgan Chase Commercial"

    # Check audit logs
    audit_res = client.get("/api/vendors/VND-1001/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any(log["action"] == "MANUAL_PROFILE_UPDATE" for log in logs)

def test_settings_status_endpoint(client):
    res = client.get("/api/settings/status")
    assert res.status_code == 200
    status_data = res.json()
    assert status_data["backend_status"] == "HEALTHY"
    assert status_data["database_status"] == "CONNECTED"
    assert "nebius_model" in status_data
