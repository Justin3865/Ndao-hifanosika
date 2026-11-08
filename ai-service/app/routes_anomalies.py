"""POST /v1/anomalies — Isolation Forest sur un lot de lignes numériques envoyé par le backend (AJOUT)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Header, HTTPException

from . import anomaly_service
from .routes_insights import check_key

router = APIRouter()


@router.post("/v1/anomalies", tags=["analysis"])
def anomalies(payload: dict[str, Any] = Body(...), x_service_key: str | None = Header(default=None)):
    """Détecte les lignes atypiques (aide à la décision, jamais une décision automatique)."""
    check_key(x_service_key)
    try:
        return anomaly_service.run(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
