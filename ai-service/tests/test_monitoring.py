from app.monitoring import analyze_project, indicator_progress

NOW = "2026-10-28T00:00:00Z"


def project(**over):
    base = {
        "project": {"id": 1, "name": "Maison Digitale", "status": "ACTIVE", "budget": 100_000_000, "budgetSpent": 80_000_000,
                    "startDate": "2026-02-01T00:00:00Z", "endDate": "2026-12-31T00:00:00Z", "beneficiaryTarget": 500},
        "activities": [
            {"id": 1, "title": "A", "status": "COMPLETED", "progress": 100, "startDate": "2026-02-01T00:00:00Z", "endDate": "2026-05-01T00:00:00Z"},
            {"id": 2, "title": "B", "status": "IN_PROGRESS", "progress": 30, "startDate": "2026-05-01T00:00:00Z", "endDate": "2026-09-30T00:00:00Z"},
        ],
        "milestones": [{"id": 1, "title": "M1", "dueDate": "2026-09-01T00:00:00Z", "progress": 40}],
        "now": NOW,
    }
    base.update(over)
    return base


def test_indicator_progress_is_capped_and_uses_baseline():
    assert indicator_progress({"baseline": 0, "target": 500, "currentValue": 325}) == 65
    assert indicator_progress({"baseline": 0, "target": 500, "currentValue": 900}) == 100
    assert indicator_progress({"baseline": 100, "target": 200, "currentValue": 150}) == 50
    assert indicator_progress({"target": 10}) is None


def test_late_project_has_negative_gap_and_risk():
    out = analyze_project(project())
    assert out["progress"]["gap"] < -10
    assert out["risk"]["score"] >= 25
    codes = {a["code"] for a in out["anomalies"]}
    assert {"ACTIVITE_EN_RETARD", "JALON_EN_RETARD", "BUDGET_VS_AVANCEMENT"} <= codes
    assert out["recommendations"]


def test_forecast_uses_regression_with_history():
    snaps = [{"recordedAt": f"2026-{m:02d}-15T00:00:00Z", "actualProgress": p} for m, p in [(6, 20), (7, 28), (8, 36), (9, 44), (10, 52)]]
    out = analyze_project(project(snapshots=snaps))
    assert out["forecast"]["method"] == "linear-regression"
    assert out["forecast"]["projectedCompletionDate"] is not None


def test_forecast_falls_back_to_average_velocity():
    out = analyze_project(project())
    assert out["forecast"]["method"] == "average-velocity"
    assert out["forecast"]["confidence"] == "low"


def test_completed_project_is_on_time():
    data = project()
    data["project"]["status"] = "COMPLETED"
    data["activities"] = [{"id": 1, "title": "A", "status": "COMPLETED", "progress": 100}]
    data["milestones"] = [{"id": 1, "title": "M", "completedAt": "2026-09-01T00:00:00Z", "progress": 100}]
    out = analyze_project(data)
    assert out["progress"]["actual"] == 100
    assert out["forecast"]["delayDays"] == 0


def test_data_quality_anomalies():
    data = project()
    data["project"]["endDate"] = "2026-01-01T00:00:00Z"
    data["evaluations"] = [{"id": 1, "score": 140}]
    data["beneficiaries"] = [
        {"id": 1, "firstName": "A", "lastName": "B", "phone": "1"},
        {"id": 2, "firstName": "a", "lastName": "b", "phone": "1"},
    ]
    codes = {a["code"] for a in analyze_project(data)["anomalies"]}
    assert {"DATES_INCOHERENTES", "SCORE_HORS_INTERVALLE", "BENEFICIAIRE_DOUBLON"} <= codes


def test_empty_project_does_not_crash():
    out = analyze_project({"project": {"id": 2, "status": "DRAFT"}})
    assert out["progress"]["actual"] is None
    assert out["risk"]["level"] == "FAIBLE"
    assert "insuffisantes" in out["summary"]
