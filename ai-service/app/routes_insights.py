"""Routes d'analyse : catalogue des anomalies, insights, tableau de bord.

Deux modes de données :
  - payload : le backend envoie les lignes (POST /v1/insights, POST /v1/dashboard) ;
  - live    : le service lit lui-même la base PostgreSQL (GET /v1/live/*).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from . import db
from .config import service_key
from .dashboard import build_dashboard
from .insights import CATALOG, LISTS, analyze, to_ts

router = APIRouter()

MAX_ROWS = 50_000


class InsightsRequest(BaseModel):
    """Jeu de données envoyé par le backend (lignes brutes, noms de champs de la base)."""

    projects: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    milestones: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    evaluations: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    activities: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    beneficiaries: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    internships: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    pendingUsers: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    # Historique des alertes (firstSeenAt, resolvedAt, severity) pour la courbe d'évolution
    history: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_ROWS)
    # Date de référence ISO (tests / rejeu) ; maintenant par défaut
    now: str | None = None


def check_key(key: str | None) -> None:
    expected = service_key()
    if expected and key != expected:
        raise HTTPException(status_code=401, detail="Clé de service invalide.")


def _moment(raw: str | None) -> float:
    return to_ts(raw) or datetime.now(timezone.utc).timestamp()


def _data(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    return {name: list(payload.get(name) or []) for name in LISTS}


def _database_error(error: db.DatabaseUnavailable) -> HTTPException:
    return HTTPException(status_code=503, detail=str(error))


@router.get("/v1/anomalies/catalog", tags=["analysis"])
def anomalies_catalog():
    """Tous les types d'anomalies détectables, avec la règle qui les définit."""
    return {"count": len(CATALOG), "types": CATALOG}


@router.post("/v1/insights", tags=["analysis"])
def insights(payload: InsightsRequest, x_service_key: str | None = Header(default=None)):
    """Anomalies + performance + risque d'abandon + synthèse (données envoyées)."""
    check_key(x_service_key)
    body = payload.model_dump()
    return analyze(body, _moment(body.get("now")) if body.get("now") else None)


@router.post("/v1/dashboard", tags=["analysis"])
def dashboard(payload: InsightsRequest, x_service_key: str | None = Header(default=None)):
    """Données de graphiques (données envoyées)."""
    check_key(x_service_key)
    body = payload.model_dump()
    now = _moment(body.get("now"))
    data = _data(body)
    analysis = analyze(data, now)
    return {**build_dashboard(analysis, data, body.get("history") or [], now), "engine": "python"}


@router.get("/v1/live/status", tags=["live"])
def live_status(x_service_key: str | None = Header(default=None)):
    """État de la liaison à la base de données."""
    check_key(x_service_key)
    return db.status(force=True)


@router.get("/v1/live/insights", tags=["live"])
def live_insights(x_service_key: str | None = Header(default=None)):
    """Analyses calculées sur les données lues DIRECTEMENT dans PostgreSQL."""
    check_key(x_service_key)

    try:
        data = db.fetch_dataset()
    except db.DatabaseUnavailable as error:
        raise _database_error(error) from error

    return {**analyze(data), "engine": "python-db"}


@router.get("/v1/live/dashboard", tags=["live"])
def live_dashboard(x_service_key: str | None = Header(default=None)):
    """Données de graphiques calculées sur la base (inclut l'historique des alertes)."""
    check_key(x_service_key)

    try:
        data = db.fetch_dataset()
        history = db.fetch_alert_history()
    except db.DatabaseUnavailable as error:
        raise _database_error(error) from error

    now = datetime.now(timezone.utc).timestamp()
    analysis = analyze(data, now)

    return {**build_dashboard(analysis, data, history, now), "engine": "python-db"}
