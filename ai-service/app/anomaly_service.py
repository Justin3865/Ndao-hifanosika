"""Préparation et validation de la requête POST /v1/anomalies (appelée par le backend : detectWithAiService).

AJOUT : le backend (srcb/src/services/pyservices.service.ts) appelait déjà cette route, qui n'existait pas côté
service IA. Ce module est pur (sans FastAPI) pour être testé seul ; il réutilise `anomaly.detect` sans le modifier.

Entrée  : {kind, features: [str], rows: [{id, values: [number|null]}], contamination}
Sortie  : {ready, reason?, results: [{id, score, anomaly, reasons}], meta}   (même forme que `anomaly.detect`)
"""
from __future__ import annotations

from typing import Any

from . import anomaly

MAX_FEATURES = 40
MAX_ROWS = 20_000


def run(payload: dict[str, Any]) -> dict[str, Any]:
    """Valide l'entrée et lance la détection. Lève ValueError(message) si la requête est mal formée."""
    features = payload.get("features")
    rows = payload.get("rows")

    if not isinstance(features, list) or not features or not all(isinstance(f, str) and f for f in features):
        raise ValueError("`features` doit être une liste non vide de noms de variables.")
    if len(features) > MAX_FEATURES:
        raise ValueError(f"Trop de variables (maximum {MAX_FEATURES}).")
    if not isinstance(rows, list):
        raise ValueError("`rows` doit être une liste.")
    if len(rows) > MAX_ROWS:
        raise ValueError(f"Trop de lignes (maximum {MAX_ROWS}).")

    ids: list[Any] = []
    matrix: list[list[float | None]] = []
    for position, row in enumerate(rows):
        if not isinstance(row, dict) or "id" not in row or not isinstance(row.get("values"), list):
            raise ValueError(f"Ligne {position} invalide : attendu {{id, values}}.")
        values = row["values"]
        if len(values) != len(features):
            raise ValueError(f"Ligne {position} : {len(values)} valeurs pour {len(features)} variables.")
        cleaned: list[float | None] = []
        for v in values:
            if v is None:
                cleaned.append(None)
            elif isinstance(v, bool) or not isinstance(v, (int, float)):
                raise ValueError(f"Ligne {position} : valeur non numérique.")
            else:
                cleaned.append(float(v))
        ids.append(row["id"])
        matrix.append(cleaned)

    try:
        contamination = float(payload.get("contamination", 0.1))
    except (TypeError, ValueError) as exc:
        raise ValueError("`contamination` doit être un nombre.") from exc

    result = anomaly.detect(ids, list(features), matrix, contamination)
    result.setdefault("meta", {})["kind"] = str(payload.get("kind", ""))
    return result
