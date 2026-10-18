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
