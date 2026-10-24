from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["ml_ready"] is False

def test_summary():
    response = client.post("/v1/summary", json={"values": [1, 2, 6]})
    assert response.status_code == 200
    assert response.json()["count"] == 3
    assert response.json()["mean"] == 3

def test_summary_rejects_empty_values():
    assert client.post("/v1/summary", json={"values": []}).status_code == 422

def test_catalog_lists_every_anomaly_type():
    body = client.get("/v1/anomalies/catalog").json()
    codes = {item["code"] for item in body["types"]}
    assert body["count"] == len(codes) >= 25
    assert {"BUDGET_EXCEEDED", "OVERDUE_MILESTONE", "BENEFICIARY_DUPLICATE", "DROPOUT_HIGH"} <= codes

def test_insights_routes_anomalies_to_owner_and_project():
    payload = {
        "now": "2026-10-23T00:00:00Z",
        "projects": [{"id": 1, "name": "Alpha", "status": "ACTIVE", "budget": "1000", "startDate": "2026-01-01T00:00:00Z",
                      "endDate": "2026-09-01T00:00:00Z", "departmentId": 5, "createdById": 10}],
        "milestones": [{"id": 1, "projectId": 1, "title": "M1", "progress": 20, "dueDate": "2026-08-01T00:00:00Z", "completedAt": None}],
    }
    body = client.post("/v1/insights", json=payload).json()
    overdue = next(a for a in body["anomalies"] if a["type"] == "OVERDUE_MILESTONE")
    assert overdue["projectId"] == 1 and overdue["ownerIds"] == [10] and overdue["severity"] == "HIGH"
    assert any(a["type"] == "PROJECT_OVERDUE" for a in body["anomalies"])
    assert body["engine"] == "python"

def test_insights_empty_dataset_is_fine():
    body = client.post("/v1/insights", json={}).json()
    assert body["anomalies"] == [] and body["summary"]["counters"]["projects"] == 0

def test_insights_requires_key_when_configured(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_KEY", "secret")
    assert client.post("/v1/insights", json={}).status_code == 401
    assert client.post("/v1/insights", json={}, headers={"x-service-key": "secret"}).status_code == 200


def test_catalog_has_rule_for_every_case():
    body = client.get("/v1/anomalies/catalog").json()
    assert all(item["rule"] for item in body["types"])


def test_dashboard_payload_mode_has_all_chart_data():
    payload = {
        "now": "2026-10-23T00:00:00Z",
        "projects": [{"id": 1, "name": "Alpha", "code": "AL", "status": "ACTIVE", "budget": "1000", "startDate": "2026-01-01T00:00:00Z",
                      "endDate": "2026-09-01T00:00:00Z", "createdById": 10}],
        "milestones": [{"id": 1, "projectId": 1, "title": "M1", "progress": 20, "dueDate": "2026-08-01T00:00:00Z", "completedAt": None}],
        "evaluations": [{"id": 1, "projectId": 1, "title": "E", "score": 55, "status": "VALIDATED", "createdAt": "2026-09-01T00:00:00Z"}],
        "history": [{"firstSeenAt": "2026-10-20T00:00:00Z", "resolvedAt": None, "severity": "HIGH"}],
    }
    body = client.post("/v1/dashboard", json=payload).json()
    assert body["engine"] == "python"
    assert sum(item["value"] for item in body["anomaliesBySeverity"]) == body["totals"]["anomalies"]
    assert len(body["performanceHistogram"]) == 10 and len(body["anomalyTrend"]["labels"]) == 30
    assert body["anomalyTrend"]["hasHistory"] is True and body["evaluationTrend"][0]["label"] == "2026-09"


def test_live_endpoints_read_the_database(monkeypatch):
    from app import db

    dataset = {name: [] for name in ["projects", "milestones", "evaluations", "activities", "beneficiaries", "internships", "pendingUsers"]}
    monkeypatch.setattr(db, "fetch_dataset", lambda: dataset)
    monkeypatch.setattr(db, "fetch_alert_history", lambda days=90: [])

    assert client.get("/v1/live/insights").json()["engine"] == "python-db"
    assert client.get("/v1/live/dashboard").json()["engine"] == "python-db"


def test_live_endpoints_answer_503_without_database(monkeypatch):
    from app import db

    def unavailable():
        raise db.DatabaseUnavailable("pas de base")

    monkeypatch.setattr(db, "fetch_dataset", unavailable)
    assert client.get("/v1/live/insights").status_code == 503
