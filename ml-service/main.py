"""
Service ML — Ndao Hifanosika (FastAPI).
Entraîné sur les données RÉELLES du backend (GET /api/service/dataset).

Trois familles de méthodes sont comparées par validation croisée :
  1. Descente de gradient stochastique : SGDClassifier(loss="log_loss")
  2. Machine learning classique       : RandomForest + GradientBoosting
  3. Réseau de neurones (deep)        : MLPClassifier à 3 couches cachées
Le meilleur modèle (AUC ROC en CV) est conservé et sert à scorer chaque ménage,
puis à agréger un score de vulnérabilité par zone.

Variables d'environnement : BACKEND_URL (ex. http://localhost:4000), AI_SERVICE_KEY
"""
import os
from pathlib import Path

import httpx
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import SGDClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

import dropout as dropout_ref

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000").rstrip("/")
SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "")
MODEL_PATH = Path(os.getenv("MODEL_PATH", "model.joblib"))
FEATURES = ["age", "altitude", "distanceKm", "daysSinceSeen"]

app = FastAPI(title="Ndao Hifanosika — ML")
state: dict = {"model": None, "report": None}


def check_key(key: str | None):
    if not SERVICE_KEY or key != SERVICE_KEY:
        raise HTTPException(401, "Clé de service invalide.")


def fetch_dataset() -> pd.DataFrame:
    r = httpx.get(f"{BACKEND_URL}/api/service/dataset", headers={"x-service-key": SERVICE_KEY}, timeout=30)
    r.raise_for_status()
    return pd.DataFrame(r.json()["data"])


def candidates() -> dict:
    prep = lambda clf: Pipeline([("imp", SimpleImputer(strategy="median", keep_empty_features=True)), ("sc", StandardScaler()), ("clf", clf)])
    return {
        "sgd_log_loss": prep(SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-3, max_iter=2000, random_state=42)),
        "random_forest": Pipeline([("imp", SimpleImputer(strategy="median", keep_empty_features=True)),
                                   ("clf", RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=42))]),
        "gradient_boosting": Pipeline([("imp", SimpleImputer(strategy="median", keep_empty_features=True)),
                                       ("clf", GradientBoostingClassifier(random_state=42))]),
        "mlp_deep": prep(MLPClassifier(hidden_layer_sizes=(64, 32, 16), early_stopping=True, max_iter=800, random_state=42)),
    }


@app.get("/health")
def health():
    return {"status": "ok", "trained": state["model"] is not None}


@app.post("/train")
def train(x_service_key: str | None = Header(default=None)):
    check_key(x_service_key)
    df = fetch_dataset()
    if len(df) < 30 or df["vulnerable"].nunique() < 2 or df["vulnerable"].value_counts().min() < 5:
        raise HTTPException(422, "Données insuffisantes : il faut au moins 30 bénéficiaires dont 5 de chaque classe.")
    X, y = df[FEATURES].astype(float), df["vulnerable"].astype(int)
    folds = StratifiedKFold(n_splits=min(5, int(y.value_counts().min())), shuffle=True, random_state=42)
    report = {}
    for name, pipe in candidates().items():
        scores = cross_val_score(pipe, X, y, cv=folds, scoring="roc_auc")
        report[name] = {"auc_mean": round(float(scores.mean()), 4), "auc_std": round(float(scores.std()), 4)}
    best = max(report, key=lambda k: report[k]["auc_mean"])
    model = candidates()[best].fit(X, y)
    joblib.dump(model, MODEL_PATH)
    state.update(model=model, report={"best": best, "samples": len(df), "models": report})
    return state["report"]


def load_model():
    if state["model"] is None and MODEL_PATH.exists():
        state["model"] = joblib.load(MODEL_PATH)
    return state["model"]


@app.get("/report")
def report(x_service_key: str | None = Header(default=None)):
    check_key(x_service_key)
    return state["report"] or {"message": "Aucun entraînement effectué."}


@app.post("/predict-zones")
def predict_zones(x_service_key: str | None = Header(default=None)):
    check_key(x_service_key)
    model = load_model()
    if model is None:
        train(x_service_key)
        model = state["model"]
    df = fetch_dataset()
    proba = model.predict_proba(df[FEATURES].astype(float))[:, 1] if hasattr(model, "predict_proba") else model.decision_function(df[FEATURES].astype(float))
    df["p"] = proba
    zones = (df.dropna(subset=["zoneId"]).groupby("zoneId")["p"].mean() * 100).round().astype(int)
    return {"zones": [{"zoneId": int(z), "mlScore": int(s)} for z, s in zones.items()]}


# ---------------------------------------------------------------------------------------------
# Risque d'abandon — MODÈLE DE RÉFÉRENCE (méthode R : régression logistique, cf. dropout.py)
# Express (/api/ai/score/dropout-risk) est la passerelle publique ; ces routes /v1 sont internes.
# ---------------------------------------------------------------------------------------------
class DropoutInput(BaseModel):
    age: float | None = None
    attendance_rate: float | None = None
    eval_avg: float | None = None
    activities_completed: float | None = 0
    missed_activities: float | None = 0


@app.post("/v1/score/dropout-risk")
def score_dropout_risk(body: DropoutInput, x_service_key: str | None = Header(default=None)):
    """Score 0-100. Modèle appris si disponible, sinon règle pondérée (champ `model` = rules-v1)."""
    check_key(x_service_key)
    return dropout_ref.score_dropout(body.model_dump())


@app.post("/v1/train/dropout")
def train_dropout_route(x_service_key: str | None = Header(default=None)):
    """Entraîne sur les parcours clos (label BeneficiaryJourney) joints aux variables du backend."""
    check_key(x_service_key)
    r = httpx.get(f"{BACKEND_URL}/api/service/dropout-training", headers={"x-service-key": SERVICE_KEY}, timeout=60)
    r.raise_for_status()
    try:
        return dropout_ref.train_dropout(pd.DataFrame(r.json()["data"]))
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.get("/v1/dropout/report")
def dropout_report(x_service_key: str | None = Header(default=None)):
    check_key(x_service_key)
    bundle = dropout_ref.load_dropout()
    return bundle["report"] if bundle else {"message": "Aucun modèle d'abandon entraîné : la règle de repli est utilisée."}
