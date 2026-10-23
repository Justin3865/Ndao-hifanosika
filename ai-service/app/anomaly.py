"""Détection d'anomalies par Isolation Forest (scikit-learn).

Fonctions pures (sans FastAPI) pour pouvoir les tester facilement.
Aucune donnée n'est stockée : le modèle est entraîné à chaque appel sur le lot reçu,
ce qui convient à des volumes modestes (quelques centaines de lignes).
"""
from __future__ import annotations

import math
import time
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

MIN_SAMPLES = 8
N_ESTIMATORS = 200
SEED = 42


def _clean(rows: list[list[float | None]]) -> np.ndarray:
    """Matrice float ; les valeurs manquantes (None/NaN) sont remplacées par la médiane de la colonne."""
    x = np.array([[np.nan if (v is None or (isinstance(v, float) and math.isnan(v))) else float(v) for v in r] for r in rows])
    for j in range(x.shape[1]):
        col = x[:, j]
        mask = np.isnan(col)
        if mask.all():
            x[:, j] = 0.0
        elif mask.any():
            x[mask, j] = np.nanmedian(col)
    return x


def _robust_scale(x: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Centre sur la médiane, échelle par MAD (repli : écart-type, puis 1)."""
    med = np.median(x, axis=0)
    mad = np.median(np.abs(x - med), axis=0) * 1.4826
    std = x.std(axis=0)
    scale = np.where(mad > 1e-9, mad, np.where(std > 1e-9, std, 1.0))
    return (x - med) / scale, med, scale


def detect(
    ids: list[Any],
    feature_names: list[str],
    rows: list[list[float | None]],
    contamination: float = 0.1,
) -> dict[str, Any]:
    started = time.perf_counter()
    n = len(rows)

    if n != len(ids):
        raise ValueError("ids et rows doivent avoir la même longueur")

    if n < MIN_SAMPLES:
        return {
            "ready": False,
            "reason": f"Au moins {MIN_SAMPLES} éléments sont nécessaires pour comparer (reçu : {n}).",
            "results": [],
            "meta": {"model": "IsolationForest", "n_samples": n},
        }

    x = _clean(rows)
    z, med, _ = _robust_scale(x)
    contamination = float(min(max(contamination, 0.01), 0.5))

    model = IsolationForest(n_estimators=N_ESTIMATORS, contamination=contamination, random_state=SEED)
    model.fit(z)

    # score_samples : plus il est bas, plus l'élément est isolé (anormal). On l'inverse (0 = normal ... 100 = très anormal).
    anomaly_score = -model.score_samples(z)
    flagged = model.predict(z) == -1

    results = []
    for i in range(n):
        # Explication : variables les plus éloignées de la médiane du lot (score robuste |z|)
        order = np.argsort(-np.abs(z[i]))
        reasons = [
            {
                "feature": feature_names[j],
                "value": round(float(x[i, j]), 2),
                "median": round(float(med[j]), 2),
                "z": round(float(z[i, j]), 2),
            }
            for j in order[:3]
            if abs(z[i, j]) >= 1.5
        ]

        results.append(
            {
                "id": ids[i],
                "score": round(float(anomaly_score[i]) * 100, 1),
                "anomaly": bool(flagged[i]),
                "reasons": reasons,
            }
        )

    return {
        "ready": True,
        "results": results,
        "meta": {
            "model": "IsolationForest",
            "n_samples": n,
            "n_features": len(feature_names),
            "n_estimators": N_ESTIMATORS,
            "contamination": contamination,
            "flagged": int(flagged.sum()),
            "elapsed_ms": round((time.perf_counter() - started) * 1000, 1),
        },
    }
