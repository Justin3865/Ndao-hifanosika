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


def test_health_reports_anomaly_detector():
    body = client.get("/health").json()
    assert body["anomaly_ready"] is True
    assert "IsolationForest" in body["anomaly_model"]


def test_anomalies_endpoint_flags_outlier_and_counts_calls():
    rows = [{"id": i, "values": [50 + (i % 5), 10]} for i in range(30)]
    rows.append({"id": "x", "values": [900, 10]})
    before = client.get("/health").json()["anomaly_calls"]

    response = client.post("/v1/anomalies", json={"kind": "test", "features": ["a", "b"], "rows": rows, "contamination": 0.05})

    assert response.status_code == 200
    body = response.json()
    assert body["ready"] is True
    assert {r["id"]: r for r in body["results"]}["x"]["anomaly"] is True
    assert client.get("/health").json()["anomaly_calls"] == before + 1


def test_anomalies_rejects_wrong_width():
    r = client.post("/v1/anomalies", json={"features": ["a", "b"], "rows": [{"id": 1, "values": [1]}]})
    assert r.status_code == 422
