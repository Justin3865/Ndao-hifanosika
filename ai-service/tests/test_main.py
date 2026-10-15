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
