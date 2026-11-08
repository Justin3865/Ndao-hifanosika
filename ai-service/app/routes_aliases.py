"""Endpoints nommés comme au cahier des charges §9.2 (alias) + scoring individuel (§5.7).

AJOUT : aucune route existante n'est modifiée. Les alias réutilisent les handlers existants quand ils existent
(résumé narratif, anomalies) ; seuls les deux scores individuels s'appuient sur scoring.py.

    POST /ai/score/dropout-risk   (alias /v1/score/dropout-risk)
    POST /ai/score/performance    (alias /v1/score/performance)
    POST /ai/report/summary       -> même logique que POST /v1/narrative
    POST /ai/anomaly/detect       -> anomalies de POST /v1/insights
    GET  /ai/health               -> même réponse que GET /health (déclaré dans main.py)
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from . import scoring
from .routes_insights import InsightsRequest, NarrativeRequest, check_key, insights as _insights, narrative as _narrative

router = APIRouter()


class DropoutRiskRequest(BaseModel):
    """Mêmes noms que l'entrée envoyée par le backend à ml_service (DropoutRiskInput)."""
    age: float | None = None
    attendanceRate: float | None = Field(default=None, description="0-100")
    evaluationAverage: float | None = Field(default=None, description="0-100")
    activitiesCompleted: float | None = 0
    missedActivities: float | None = 0


class PerformanceRequest(BaseModel):
    evaluations: list[dict[str, Any]] = Field(default_factory=list, max_length=500)


def dropout_risk(payload: DropoutRiskRequest, x_service_key: str | None = Header(default=None)):
    """Risque d'abandon d'un bénéficiaire (règles rules-v1). Aide à la décision."""
    check_key(x_service_key)
    return scoring.score_dropout(payload.age, payload.attendanceRate, payload.evaluationAverage,
                                 payload.activitiesCompleted, payload.missedActivities)


def performance(payload: PerformanceRequest, x_service_key: str | None = Header(default=None)):
    """Score de performance 0-100 d'un membre/stagiaire, tendance, points forts, axes d'amélioration."""
    check_key(x_service_key)
    return scoring.score_performance(payload.evaluations)


def anomaly_detect(payload: InsightsRequest, x_service_key: str | None = Header(default=None)):
    """Incohérences et doublons potentiels dans les données envoyées (même moteur que /v1/insights)."""
    result = _insights(payload, x_service_key)
    anomalies = result.get("anomalies", [])
    return {"count": len(anomalies), "anomalies": anomalies, "engine": result.get("engine", "python")}


def report_summary(payload: NarrativeRequest, x_service_key: str | None = Header(default=None)):
    """Synthèse narrative d'une analyse (même logique que /v1/narrative)."""
    return _narrative(payload, x_service_key)


for _path in ("/ai/score/dropout-risk", "/v1/score/dropout-risk"):
    router.add_api_route(_path, dropout_risk, methods=["POST"], tags=["scoring"])
for _path in ("/ai/score/performance", "/v1/score/performance"):
    router.add_api_route(_path, performance, methods=["POST"], tags=["scoring"])
router.add_api_route("/ai/anomaly/detect", anomaly_detect, methods=["POST"], tags=["analysis"])
router.add_api_route("/ai/report/summary", report_summary, methods=["POST"], tags=["analysis"])
