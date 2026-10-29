"""Routes Suivi & Évaluation : analyse d'un projet (données envoyées ou lues en base)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from . import db
from .monitoring import analyze_project
from .routes_insights import check_key

router = APIRouter()

MAX_ROWS = 20_000


class MonitoringRequest(BaseModel):
    """Données S&E d'un projet, au format renvoyé par le backend."""

    project: dict[str, Any]
    activities: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    milestones: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    beneficiaries: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    evaluations: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    objectives: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    snapshots: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    now: str | None = None


@router.post("/v1/monitoring/analyze", tags=["monitoring"])
def monitoring_analyze(payload: MonitoringRequest, x_service_key: str | None = Header(default=None)):
    """Avancement, risque, prévision, anomalies et recommandations d'un projet."""
    check_key(x_service_key)
    return {**analyze_project(payload.model_dump()), "engine": "python"}


@router.get("/v1/live/monitoring/{project_id}", tags=["live"])
def live_monitoring(project_id: int, x_service_key: str | None = Header(default=None)):
    """Même analyse, sur les données lues DIRECTEMENT dans PostgreSQL."""
    check_key(x_service_key)

    try:
        data = db.fetch_project_dataset(project_id)
    except db.DatabaseUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    if data is None:
        raise HTTPException(status_code=404, detail="Projet introuvable.")

    return {**analyze_project(data), "engine": "python-db"}
