import pytest
from fastapi import HTTPException

import main

def test_health_is_available_without_service_key():
    result = main.health()
    assert result["status"] == "ok"
    assert "trained" in result

def test_service_key_is_required(monkeypatch):
    monkeypatch.setattr(main, "SERVICE_KEY", "secret")
    with pytest.raises(HTTPException) as exc:
        main.check_key(None)
    assert exc.value.status_code == 401

def test_service_key_must_match(monkeypatch):
    monkeypatch.setattr(main, "SERVICE_KEY", "secret")
    with pytest.raises(HTTPException) as exc:
        main.check_key("wrong")
    assert exc.value.status_code == 401
    main.check_key("secret")

def test_candidate_models_are_defined():
    models = main.candidates()
    assert {"sgd_log_loss", "random_forest", "gradient_boosting", "mlp_deep"} <= set(models)


def test_dropout_endpoint_requires_key_and_falls_back_to_rules(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "SERVICE_KEY", "secret")
    monkeypatch.setattr(main.dropout_ref, "DROPOUT_MODEL_PATH", tmp_path / "none.joblib")
    body = main.DropoutInput(age=19, attendance_rate=40, eval_avg=7, activities_completed=0, missed_activities=6)
    with pytest.raises(HTTPException):
        main.score_dropout_risk(body, "wrong")
    out = main.score_dropout_risk(body, "secret")
    assert out["model"] == "rules-v1" and out["risk_level"] == "HIGH" and out["risk_score"] == 100


def test_dropout_endpoint_uses_trained_model(monkeypatch, tmp_path):
    import numpy as np
    import pandas as pd

    monkeypatch.setattr(main, "SERVICE_KEY", "secret")
    monkeypatch.setattr(main.dropout_ref, "DROPOUT_MODEL_PATH", tmp_path / "m.joblib")
    rng = np.random.default_rng(0)
    n = 120
    y = rng.integers(0, 2, n)
    df = pd.DataFrame({
        "age": rng.integers(15, 30, n), "attendance_rate": np.where(y == 1, rng.normal(40, 15, n), rng.normal(80, 10, n)),
        "eval_avg": rng.normal(11, 2, n), "activities_completed": rng.integers(0, 10, n),
        "missed_activities": np.where(y == 1, rng.integers(3, 9, n), rng.integers(0, 3, n)),
        "projectId": rng.integers(1, 15, n), "dropout": y,
    })
    main.dropout_ref.train_dropout(df)
    out = main.score_dropout_risk(main.DropoutInput(attendance_rate=30, eval_avg=9, activities_completed=1, missed_activities=7), "secret")
    assert out["model"].startswith("logistic_regression") and out["probability"] is not None
