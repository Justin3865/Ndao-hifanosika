from fastapi import FastAPI
from pydantic import BaseModel, Field

from . import config  # noqa: F401  (charge DATABASE_URL / AI_SERVICE_KEY depuis backend/.env si besoin)
from . import db
from .routes_insights import router as insights_router
from .routes_monitoring import router as monitoring_router

app = FastAPI(
    title="Ndao Hifanosika AI Service",
    version="0.4.0",
    description="Santé, statistiques et analyses de pilotage (anomalies, performance, risque d'abandon, synthèse, tableau de bord).",
)

# Anomalies, insights, tableau de bord, lecture directe de la base
app.include_router(insights_router)
# Suivi & Évaluation : avancement, risque, prévision, anomalies par projet
app.include_router(monitoring_router)


class HealthResponse(BaseModel):
    status: str
    service: str
    ml_ready: bool
    features: list[str] = []
    database: str = "unknown"


class NumericRecord(BaseModel):
    values: list[float] = Field(min_length=1, max_length=500)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health():
    state = db.status()
    database = "connected" if state["connected"] else ("driver_missing" if not state["driver"] else "unavailable")

    return {
        "status": "ok",
        "service": "ndao-hifanosika-ai",
        "ml_ready": False,
        "features": ["insights", "anomalies", "dashboard", "live-database", "monitoring"],
        "database": database,
    }


@app.post("/v1/summary", tags=["analysis"])
def summarize(record: NumericRecord):
    values = record.values
    return {
        "count": len(values),
        "minimum": min(values),
        "maximum": max(values),
        "mean": sum(values) / len(values),
        "note": "Statistiques descriptives uniquement; aucun modèle prédictif entraîné n'est encore configuré.",
    }
