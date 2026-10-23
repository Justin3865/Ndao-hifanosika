import os
import time

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.anomaly import detect

app = FastAPI(title="Ndao Hifanosika AI Service", version="0.1.0", description="API initiale de santé et d'analyse; les modèles ML restent à entraîner et valider.")

class HealthResponse(BaseModel):
    status: str
    service: str
    ml_ready: bool
    # AJOUT : preuve que le détecteur d'anomalies est disponible et réellement utilisé
    anomaly_ready: bool = True
    anomaly_model: str = "IsolationForest (scikit-learn)"
    anomaly_calls: int = 0
    anomaly_last_call_at: str | None = None
    anomaly_last_elapsed_ms: float | None = None
    anomaly_last_samples: int | None = None

_stats = {"calls": 0, "last_at": None, "last_ms": None, "last_n": None}

class NumericRecord(BaseModel):
    values: list[float] = Field(min_length=1, max_length=500)

@app.get("/health", response_model=HealthResponse, tags=["health"])
def health():
    return {
        "status": "ok",
        "service": "ndao-hifanosika-ai",
        "ml_ready": False,
        "anomaly_ready": True,
        "anomaly_model": "IsolationForest (scikit-learn)",
        "anomaly_calls": _stats["calls"],
        "anomaly_last_call_at": _stats["last_at"],
        "anomaly_last_elapsed_ms": _stats["last_ms"],
        "anomaly_last_samples": _stats["last_n"],
    }

@app.post("/v1/summary", tags=["analysis"])
def summarize(record: NumericRecord):
    values = record.values
    return {"count": len(values), "minimum": min(values), "maximum": max(values), "mean": sum(values) / len(values), "note": "Statistiques descriptives uniquement; aucun modèle prédictif entraîné n'est encore configuré."}


class AnomalyRow(BaseModel):
    id: str | int
    values: list[float | None] = Field(min_length=1, max_length=50)

class AnomalyRequest(BaseModel):
    kind: str = Field(default="generic", max_length=40)
    features: list[str] = Field(min_length=1, max_length=50)
    rows: list[AnomalyRow] = Field(max_length=5000)
    contamination: float = Field(default=0.1, ge=0.01, le=0.5)

@app.post("/v1/anomalies", tags=["analysis"])
def anomalies(payload: AnomalyRequest, x_service_key: str | None = Header(default=None)):
    """Isolation Forest : repère les éléments qui s'écartent du lot (budget, retards, avancement...).

    Si AI_SERVICE_KEY est défini dans l'environnement du service, l'en-tête x-service-key est obligatoire.
    """
    expected = os.environ.get("AI_SERVICE_KEY")
    if expected and x_service_key != expected:
        raise HTTPException(status_code=401, detail="Clé de service invalide")

    width = len(payload.features)
    if any(len(r.values) != width for r in payload.rows):
        raise HTTPException(status_code=422, detail="Chaque ligne doit avoir autant de valeurs que de features")

    out = detect(
        [r.id for r in payload.rows],
        payload.features,
        [r.values for r in payload.rows],
        payload.contamination,
    )

    _stats["calls"] += 1
    _stats["last_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    _stats["last_ms"] = out["meta"].get("elapsed_ms")
    _stats["last_n"] = out["meta"].get("n_samples")

    out["kind"] = payload.kind
    return out
