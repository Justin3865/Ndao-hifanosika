"""
Modèle de RISQUE D'ABANDON (cahier des charges §5.7 et §9.3) — module AJOUTÉ, indépendant de main.py.

Principes
  * Entraîné sur les VRAIS labels du parcours (BeneficiaryJourney : 1 = abandon, 0 = terminé ; les actifs sont exclus).
  * Méthodes du cahier : régression logistique + arbre de décision. Les deux sont comparés à la BASELINE à règles
    (réplique de `legacy_rule_score` de compare_live.py) par validation croisée.
  * Garde-fous : minimum MIN_ROWS lignes et MIN_PER_CLASS par classe ; sinon l'entraînement est REFUSÉ.
  * Décision (4.4 n°4) : le modèle n'est PROMU que si PR-AUC(modèle) > PR-AUC(baseline) + σ ET rappel non dégradé.
    Sinon le verdict est « non concluant » : /predict-dropout répond 503 et le backend garde les règles.
  * Traçabilité (4.4 n°3) : version, date, métriques, empreinte (hash) des données, effectif.

Ce module n'importe ni FastAPI ni httpx : il se teste seul.
"""
from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_curve, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

MIN_ROWS = 30          # même plancher que compare_baseline.py / /train
MIN_PER_CLASS = 5
SMALL_SAMPLE = 100     # en dessous : verdict toujours accompagné d'un avertissement
LABEL = "dropout"
RULE_THRESHOLD = 60    # « risque élevé » dans la plateforme

# Variables du modèle. Noms = ceux de GET /api/service/dropout-features (et de compare_baseline.py).
FEATURES = ["age", "attendance_rate", "eval_avg", "activities_completed", "missed_activities"]

# Correspondance entrée de POST /predict-dropout (camelCase, envoyée par le backend) -> variable du modèle.
INPUT_TO_FEATURE = {
    "age": "age",
    "attendanceRate": "attendance_rate",
    "evaluationAverage": "eval_avg",
    "activitiesCompleted": "activities_completed",
    "missedActivities": "missed_activities",
}

MODEL_NAME = "ml-logreg-tree-v1"


# --------------------------------------------------------------------------- baseline
def rule_score(row: dict[str, Any] | pd.Series) -> float:
    """Réplique de `scoreWithRules` (backend dropoutScoring.ts) : 0-100."""
    def f(key: str, default: float = 0.0) -> float:
        v = row.get(key) if hasattr(row, "get") else None
        try:
            v = float(v)
        except (TypeError, ValueError):
            return default
        return default if math.isnan(v) else v

    risk = 0.0
    att = min(100.0, max(0.0, f("attendance_rate", 100.0)))
    risk += 40 if att < 50 else 25 if att < 70 else 10 if att < 85 else 0
    ev = min(100.0, max(0.0, f("eval_avg", 100.0)))
    risk += 30 if ev < 50 else 20 if ev < 60 else 10 if ev < 70 else 0
    missed, done = max(0.0, f("missed_activities")), max(0.0, f("activities_completed"))
    if missed > 0:
        risk += math.floor((missed / (missed + done) if missed + done > 0 else 1.0) * 20 + 0.5)
    age = row.get("age") if hasattr(row, "get") else None
    try:
        age_f = float(age)
        if not math.isnan(age_f):
            risk += 5 if age_f < 14 or age_f >= 18 else 0
    except (TypeError, ValueError):
        pass
    return float(min(100.0, max(0.0, risk)))


def rule_scores(df: pd.DataFrame) -> np.ndarray:
    return np.array([rule_score(r) for _, r in df.iterrows()], dtype=float)


# --------------------------------------------------------------------------- données
def data_hash(df: pd.DataFrame) -> str:
    """Empreinte stable du jeu d'entraînement (ordre des lignes et des colonnes indifférent)."""
    cols = sorted(c for c in [*FEATURES, LABEL, "beneficiaryId"] if c in df.columns)
    ordered = df[cols].sort_values(cols, kind="mergesort").reset_index(drop=True)
    return hashlib.sha256(ordered.to_csv(index=False).encode("utf-8")).hexdigest()


def check_dataset(df: pd.DataFrame) -> dict[str, Any]:
    """Valide le jeu ; lève ValueError(message) s'il est inutilisable. Retourne des statistiques."""
    missing = [c for c in (LABEL, *FEATURES) if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes manquantes : {missing}")
    d = df.dropna(subset=[LABEL])
    n = len(d)
    pos = int(d[LABEL].astype(int).sum())
    neg = n - pos
    if n < MIN_ROWS or min(pos, neg) < MIN_PER_CLASS:
        raise ValueError(
            f"Données insuffisantes : {n} parcours clos, classes {pos}/{neg} "
            f"(minimum {MIN_ROWS} lignes et {MIN_PER_CLASS} par classe)."
        )
    return {"rows": n, "dropouts": pos, "completed": neg, "small_sample": n < SMALL_SAMPLE}


# --------------------------------------------------------------------------- modèles
def _imp() -> SimpleImputer:
    return SimpleImputer(strategy="median", keep_empty_features=True)  # DANS le pipeline : aucune fuite


def candidates(seed: int = 42) -> dict[str, Any]:
    return {
        "logistic_regression": make_pipeline(_imp(), StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")),
        "decision_tree": make_pipeline(_imp(), DecisionTreeClassifier(max_depth=3, min_samples_leaf=5, class_weight="balanced", random_state=seed)),
    }


def _summary(values: list[float]) -> dict[str, float]:
    a = np.asarray(values, dtype=float)
    return {"mean": round(float(a.mean()), 4), "std": round(float(a.std(ddof=1)) if len(a) > 1 else 0.0, 4)}


def _pr_points(y: np.ndarray, score: np.ndarray, step: float = 0.05) -> list[list[float]]:
    """Courbe précision-rappel lissée : précision maximale atteignable pour un rappel >= r (r = 0, 0.05, ..., 1)."""
    prec, rec, _ = precision_recall_curve(y, score)
    pts = []
    for r in np.arange(0.0, 1.0 + 1e-9, step):
        m = prec[rec >= r - 1e-12]
        pts.append([round(float(r), 3), round(float(m.max()) if len(m) else 0.0, 4)])
    return pts


def evaluate(df: pd.DataFrame, seed: int = 42, n_splits: int = 5, repeats: int = 3) -> dict[str, Any]:
    """Validation croisée stratifiée répétée : baseline à règles vs régression logistique vs arbre."""
    d = df.dropna(subset=[LABEL]).reset_index(drop=True)
    y = d[LABEL].astype(int).to_numpy()
    X = d[FEATURES].astype(float)
    k = max(2, min(n_splits, int(min(y.sum(), len(y) - y.sum()))))
    names = ["baseline_rules", *candidates(seed).keys()]
    folds: dict[str, dict[str, list[float]]] = {n: {"pr_auc": [], "auc": [], "recall": []} for n in names}
    used = 0
    oof: dict[str, tuple[list, list]] = {n: ([], []) for n in names}   # prédictions hors-pli (1re répétition) pour la courbe
    for r in range(repeats):
        cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=seed + r)
        for tr, te in cv.split(X, y):
            if len(set(y[te])) < 2 or len(set(y[tr])) < 2:
                continue
            used += 1
            yt = y[te]
            base = rule_scores(d.iloc[te])
            if r == 0:
                oof["baseline_rules"][0].extend(yt); oof["baseline_rules"][1].extend(base)
            for name, score, pred in [("baseline_rules", base, (base >= RULE_THRESHOLD).astype(int))]:
                folds[name]["pr_auc"].append(average_precision_score(yt, score))
                folds[name]["auc"].append(roc_auc_score(yt, score))
                folds[name]["recall"].append(recall_score(yt, pred, zero_division=0))
            for name, model in candidates(seed).items():
                model.fit(X.iloc[tr], y[tr])
                p = model.predict_proba(X.iloc[te])[:, 1]
                if r == 0:
                    oof[name][0].extend(yt); oof[name][1].extend(p)
                folds[name]["pr_auc"].append(average_precision_score(yt, p))
                folds[name]["auc"].append(roc_auc_score(yt, p))
                folds[name]["recall"].append(recall_score(yt, (p >= 0.5).astype(int), zero_division=0))
    if used == 0:
        raise ValueError("Aucun pli exploitable (une seule classe par pli) : trop peu de parcours clos.")
    yo = np.asarray(oof["baseline_rules"][0], dtype=int)
    curves = {"prevalence": round(float(yo.mean()), 4) if len(yo) else None,
              "points": {n: _pr_points(np.asarray(oof[n][0], dtype=int), np.asarray(oof[n][1], dtype=float)) for n in names if len(oof[n][0])}}
    return {"folds_used": used, "n_splits": k, "repeats": repeats,
            "models": {n: {m: _summary(v) for m, v in mv.items()} for n, mv in folds.items()},
            "curves": curves}


def decide(metrics: dict[str, Any]) -> dict[str, Any]:
    """Règle de décision 4.4 n°4 : PR-AUC > baseline + σ ET rappel non dégradé, sinon « non concluant »."""
    models = metrics["models"]
    base = models["baseline_rules"]
    learned = {k: v for k, v in models.items() if k != "baseline_rules"}
    best = max(learned, key=lambda k: learned[k]["pr_auc"]["mean"])
    m = learned[best]
    gap = m["pr_auc"]["mean"] - base["pr_auc"]["mean"]
    sigma = max(m["pr_auc"]["std"], base["pr_auc"]["std"])
    rec_gap = m["recall"]["mean"] - base["recall"]["mean"]
    conclusive = gap > sigma and rec_gap >= 0
    return {
        "best_model": best,
        "pr_auc_gap": round(gap, 4),
        "sigma": round(sigma, 4),
        "recall_gap": round(rec_gap, 4),
        "conclusive": bool(conclusive),
        "verdict": "retenu" if conclusive else "non concluant",
        "message": (
            f"{best} dépasse la baseline (PR-AUC +{gap:.3f} > σ {sigma:.3f}, rappel {rec_gap:+.3f}) : utilisable comme aide à la décision."
            if conclusive else
            f"Non concluant : le meilleur modèle ({best}) ne dépasse pas la baseline de façon stable "
            f"(PR-AUC {gap:+.3f} vs σ {sigma:.3f}, rappel {rec_gap:+.3f}). Les règles sont conservées."
        ),
    }


def train(df: pd.DataFrame, seed: int = 42) -> dict[str, Any]:
    """Entraîne, évalue, décide. Retourne {'artifact': dict|None, 'report': dict}.
    `artifact` n'est renseigné (modèle promu) que si le verdict est concluant."""
    stats = check_dataset(df)
    d = df.dropna(subset=[LABEL]).reset_index(drop=True)
    metrics = evaluate(d, seed=seed)
    decision = decide(metrics)
    report = {
        "model": MODEL_NAME,
        "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data_hash": data_hash(d),
        "features": FEATURES,
        "stats": stats,
        "metrics": metrics,
        "decision": decision,
        "warnings": ([f"Échantillon petit ({stats['rows']} < {SMALL_SAMPLE}) : résultats indicatifs."] if stats["small_sample"] else [])
                    + ["Variables mesurées à la date d'export (circularité partielle) ; label saisi par les coordinateurs."],
    }
    artifact = None
    if decision["conclusive"]:
        final = candidates(seed)[decision["best_model"]].fit(d[FEATURES].astype(float), d[LABEL].astype(int))
        artifact = {"pipeline": final, "name": f"{MODEL_NAME}:{decision['best_model']}", "report": report}
    return {"artifact": artifact, "report": report}


# --------------------------------------------------------------------------- prédiction
def to_row(payload: dict[str, Any]) -> pd.DataFrame:
    """Convertit l'entrée du backend (camelCase) en une ligne de variables ; valeurs absentes -> NaN."""
    row = {}
    for src, dst in INPUT_TO_FEATURE.items():
        v = payload.get(src)
        try:
            v = float(v)
            row[dst] = v if math.isfinite(v) else np.nan
        except (TypeError, ValueError):
            row[dst] = np.nan
    return pd.DataFrame([row], columns=FEATURES)


def predict(artifact: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Réponse attendue par le backend : {probability, model, factors}."""
    row = to_row(payload)
    p = float(artifact["pipeline"].predict_proba(row)[0, 1])
    p = min(1.0, max(0.0, p))
    factors = explain(artifact["pipeline"], row)
    return {"probability": round(p, 4), "model": artifact["name"], "factors": factors}


def explain(pipeline: Any, row: pd.DataFrame) -> list[str]:
    """Facteurs lisibles. Régression logistique : contribution = coefficient × valeur standardisée ; arbre : importances."""
    labels = {"age": "Âge", "attendance_rate": "Taux de présence", "eval_avg": "Moyenne des évaluations",
              "activities_completed": "Activités suivies", "missed_activities": "Activités manquées"}
    try:
        clf = pipeline[-1]
        if hasattr(clf, "coef_"):
            z = pipeline[:-1].transform(row)[0]
            contrib = clf.coef_[0] * z
        else:
            contrib = clf.feature_importances_ * 1.0
        order = np.argsort(-np.abs(contrib))[:3]
        return [f"{labels[FEATURES[i]]} : {'augmente' if contrib[i] > 0 else 'réduit'} le risque" for i in order if abs(contrib[i]) > 1e-9]
    except Exception:  # explication facultative : ne doit jamais faire échouer la prédiction
        return []


def to_json(report: dict[str, Any]) -> str:
    return json.dumps(report, ensure_ascii=False, indent=2)
