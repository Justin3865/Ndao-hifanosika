"""Tests de POST /v1/anomalies (logique pure : app/anomaly_service.py). Données fictives."""
import pytest

from app import anomaly_service as svc


def payload(n=30, outlier=True):
    rows = [{"id": f"p{i}", "values": [50 + (i % 5), 10 + (i % 3)]} for i in range(n)]
    if outlier:
        rows.append({"id": "extreme", "values": [900, 400]})
    return {"kind": "projects", "features": ["budget", "delay"], "rows": rows, "contamination": 0.1}


def test_flags_the_obvious_outlier_with_reasons():
    out = svc.run(payload())
    assert out["ready"] is True
    by_id = {r["id"]: r for r in out["results"]}
    assert by_id["extreme"]["anomaly"] is True
    assert by_id["extreme"]["reasons"], "une anomalie doit être expliquée"
    assert out["meta"]["kind"] == "projects"
    assert out["meta"]["model"] == "IsolationForest"


def test_not_ready_below_minimum_samples():
    out = svc.run(payload(n=3, outlier=False))
    assert out["ready"] is False
    assert out["results"] == []


def test_missing_values_are_accepted():
    p = payload()
    p["rows"][0]["values"] = [None, 12]
    assert svc.run(p)["ready"] is True


@pytest.mark.parametrize("mutate,fragment", [
    (lambda p: p.update(features=[]), "features"),
    (lambda p: p.update(rows="x"), "rows"),
    (lambda p: p["rows"].append({"id": 1, "values": [1]}), "valeurs"),
    (lambda p: p["rows"].append({"id": 1, "values": ["a", 2]}), "numérique"),
    (lambda p: p["rows"].append({"values": [1, 2]}), "invalide"),
    (lambda p: p.update(contamination="abc"), "contamination"),
])
def test_malformed_requests_raise_value_error(mutate, fragment):
    p = payload()
    mutate(p)
    with pytest.raises(ValueError) as exc:
        svc.run(p)
    assert fragment in str(exc.value)
