"""Scores individuels + alias §9.2. Les valeurs attendues du risque d'abandon proviennent de l'exécution de la vraie
fonction TypeScript `scoreWithRules` (backend) : le port Python doit donner EXACTEMENT les mêmes résultats."""
import pytest

from app import scoring


@pytest.mark.parametrize("inp,score,level", [
    (dict(age=20, attendance_rate=40, evaluation_average=45, activities_completed=2, missed_activities=2), 85, "HIGH"),
    (dict(age=None, attendance_rate=100, evaluation_average=100, activities_completed=5, missed_activities=0), 0, "LOW"),
    (dict(age=13, attendance_rate=69.99, evaluation_average=59.5, activities_completed=0, missed_activities=3), 70, "HIGH"),
    (dict(age=30, attendance_rate=84.5, evaluation_average=69.5, activities_completed=9, missed_activities=1), 27, "LOW"),
    (dict(age=30, attendance_rate=60, evaluation_average=100, activities_completed=0, missed_activities=0), 30, "MEDIUM"),
])
def test_dropout_rules_known_cases(inp, score, level):
    r = scoring.score_dropout(**inp)
    assert (r["riskScore"], r["riskLevel"]) == (score, level)
    assert r["model"] == "rules-v1" and "Aide à la décision" in r["disclaimer"]


def test_dropout_missing_data_adds_no_risk():
    assert scoring.score_dropout()["riskScore"] == 0


def test_dropout_rounding_is_javascript_like():
    # 1 manquée sur 8 = 0.125 * 20 = 2.5 -> JS Math.round = 3 (Python round() donnerait 2)
    r = scoring.score_dropout(attendance_rate=100, evaluation_average=100, activities_completed=7, missed_activities=1)
    assert r["riskScore"] == 3


def ev(score, when, criteria=None, mx=20):
    return {"score": score, "maxScore": mx, "evaluatedAt": when, "criteria": criteria or []}


def test_performance_without_data():
    r = scoring.score_performance([])
    assert r["score"] is None and r["count"] == 0 and r["strengths"] == []


def test_performance_strengths_and_improvements():
    crit = lambda a, b: [{"name": "Ponctualité", "score": a, "maxScore": 20}, {"name": "Communication", "score": b, "maxScore": 20}]
    r = scoring.score_performance([ev(15, "2026-01-10", crit(19, 8)), ev(14, "2026-02-10", crit(18, 9))])
    assert r["strengths"][0]["criterion"] == "Ponctualité"
    assert r["improvements"][0]["criterion"] == "Communication"
    assert 0 <= r["score"] <= 100


def test_performance_trend_up_down_stable():
    up = scoring.score_performance([ev(8, "2026-01-01"), ev(10, "2026-02-01"), ev(16, "2026-03-01"), ev(18, "2026-04-01")])
    down = scoring.score_performance([ev(18, "2026-01-01"), ev(16, "2026-02-01"), ev(10, "2026-03-01"), ev(8, "2026-04-01")])
    flat = scoring.score_performance([ev(14, "2026-01-01"), ev(14, "2026-02-01"), ev(14, "2026-03-01")])
    assert (up["trend"], down["trend"], flat["trend"]) == ("UP", "DOWN", "STABLE")


def test_performance_order_follows_dates_not_input_order():
    a = scoring.score_performance([ev(8, "2026-01-01"), ev(18, "2026-04-01")])
    b = scoring.score_performance([ev(18, "2026-04-01"), ev(8, "2026-01-01")])
    assert a["score"] == b["score"] and a["trend"] == b["trend"] == "UP"


def test_performance_single_evaluation_is_flagged():
    r = scoring.score_performance([ev(15, "2026-01-01")])
    assert r["score"] == 75 and "tendance" in r["message"]


def test_performance_ignores_unscored_items():
    r = scoring.score_performance([{"score": None}, ev(10, "2026-01-01"), {"foo": 1}])
    assert r["count"] == 1 and r["score"] == 50


# --- alias HTTP (exécutés seulement si FastAPI est installé : CI / poste de développement) ---
def _client():
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


def test_alias_routes(monkeypatch):
    monkeypatch.delenv("AI_SERVICE_KEY", raising=False)
    c = _client()
    assert c.get("/ai/health").json() == c.get("/health").json()
    r = c.post("/ai/score/dropout-risk", json={"age": 20, "attendanceRate": 40, "evaluationAverage": 45, "activitiesCompleted": 2, "missedActivities": 2})
    assert r.status_code == 200 and r.json()["riskScore"] == 85
    assert c.post("/v1/score/dropout-risk", json={}).json()["riskScore"] == 0
    p = c.post("/ai/score/performance", json={"evaluations": [{"score": 15, "maxScore": 20, "evaluatedAt": "2026-01-01"}]})
    assert p.status_code == 200 and p.json()["score"] == 75
    a = c.post("/ai/anomaly/detect", json={})
    assert a.status_code == 200 and a.json()["count"] == len(a.json()["anomalies"])


def test_alias_routes_require_service_key_when_configured(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_KEY", "secret")
    c = _client()
    for path, body in [("/ai/score/dropout-risk", {}), ("/ai/score/performance", {"evaluations": []}), ("/ai/anomaly/detect", {})]:
        assert c.post(path, json=body).status_code == 401
        assert c.post(path, json=body, headers={"x-service-key": "secret"}).status_code == 200
