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


def _dropout_df(n=120, seed=0):
    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(seed)
    y = rng.integers(0, 2, n)
    return pd.DataFrame({
        "age": rng.integers(15, 30, n),
        "attendance_rate": np.where(y == 1, rng.normal(40, 15, n), rng.normal(80, 10, n)),
        "eval_avg": rng.normal(60, 10, n),
        "activities_completed": rng.integers(0, 10, n),
        "missed_activities": np.where(y == 1, rng.integers(3, 9, n), rng.integers(0, 3, n)),
        "dropout": y,
    })


@pytest.fixture
def isolated_dropout(monkeypatch, tmp_path):
    """Chemins temporaires + état vide : aucun fichier réel n'est lu ni écrit."""
    monkeypatch.setattr(main, "SERVICE_KEY", "secret")
    monkeypatch.setattr(main, "DROPOUT_MODEL_PATH", tmp_path / "dropout_model.joblib")
    monkeypatch.setattr(main, "DROPOUT_REPORT_PATH", tmp_path / "dropout_report.json")
    monkeypatch.setitem(main.dropout_state, "artifact", None)
    monkeypatch.setitem(main.dropout_state, "report", None)


def test_predict_dropout_requires_key_and_returns_503_without_model(isolated_dropout):
    # Sans modèle retenu : 503 -> le backend garde le score à règles (il ne bascule que sur un 404).
    with pytest.raises(HTTPException) as exc:
        main.predict_dropout({}, "wrong")
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        main.predict_dropout({"attendanceRate": 40}, "secret")
    assert exc.value.status_code == 503


def test_predict_dropout_uses_retained_model(isolated_dropout):
    df = _dropout_df()
    pipeline = main.dropout_model.candidates()["logistic_regression"].fit(
        df[main.dropout_model.FEATURES].astype(float), df["dropout"].astype(int))
    main.dropout_state["artifact"] = {"pipeline": pipeline, "name": "ml-logreg-tree-v1:logistic_regression", "report": {}}
    out = main.predict_dropout(
        {"age": 19, "attendanceRate": 30, "evaluationAverage": 50, "activitiesCompleted": 1, "missedActivities": 7}, "secret")
    assert out["model"].startswith("ml-logreg-tree-v1")
    assert 0.0 <= out["probability"] <= 1.0
    assert isinstance(out["factors"], list)


def test_run_dropout_training_persists_model_and_report(isolated_dropout, monkeypatch):
    # On force un verdict « retenu » : ce test vérifie la persistance, pas la performance sur données fictives.
    real_decide = main.dropout_model.decide
    monkeypatch.setattr(main.dropout_model, "decide", lambda m: {**real_decide(m), "conclusive": True, "verdict": "retenu"})
    report = main.run_dropout_training(_dropout_df())
    assert report["decision"]["verdict"] == "retenu"
    assert main.DROPOUT_MODEL_PATH.exists() and main.DROPOUT_REPORT_PATH.exists()
    assert main.dropout_state["artifact"] is not None


def test_run_dropout_training_inconclusive_removes_model(isolated_dropout, monkeypatch):
    main.DROPOUT_MODEL_PATH.write_bytes(b"ancien")
    real_decide = main.dropout_model.decide
    monkeypatch.setattr(main.dropout_model, "decide", lambda m: {**real_decide(m), "conclusive": False, "verdict": "non concluant"})
    report = main.run_dropout_training(_dropout_df())
    assert report["decision"]["verdict"] == "non concluant"
    assert not main.DROPOUT_MODEL_PATH.exists()
    assert main.dropout_state["artifact"] is None
