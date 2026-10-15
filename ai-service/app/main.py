from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Ndao Hifanosika AI Service", version="0.1.0", description="API initiale de santé et d'analyse; les modèles ML restent à entraîner et valider.")

class HealthResponse(BaseModel):
    status: str
    service: str
    ml_ready: bool

class NumericRecord(BaseModel):
    values: list[float] = Field(min_length=1, max_length=500)

@app.get("/health", response_model=HealthResponse, tags=["health"])
def health():
    return {"status": "ok", "service": "ndao-hifanosika-ai", "ml_ready": False}

@app.post("/v1/summary", tags=["analysis"])
def summarize(record: NumericRecord):
    values = record.values
    return {"count": len(values), "minimum": min(values), "maximum": max(values), "mean": sum(values) / len(values), "note": "Statistiques descriptives uniquement; aucun modèle prédictif entraîné n'est encore configuré."}
