"""Démonstration de bout en bout du modèle de risque d'abandon — DONNÉES FICTIVES (AJOUT, n'altère rien).

Montre la chaîne complète : jeu de données -> garde-fous -> validation croisée (baseline à règles vs régression
logistique vs arbre) -> règle de décision -> modèle retenu ou « non concluant » -> prédiction expliquée.

AVERTISSEMENT : les résultats sont calculés sur des données SIMULÉES. Ils prouvent que la chaîne fonctionne ;
ils ne mesurent PAS la performance sur les vrais bénéficiaires et ne doivent jamais être cités comme tels.
Le script écrit uniquement dans --out (par défaut demo_dropout_out/) et ne touche jamais au modèle de production
(dropout_model.joblib / dropout_report.json).

Usage :
  python demo_dropout_train.py                     # 300 parcours fictifs
  python demo_dropout_train.py --n 600 --seed 7 --out rapport_demo
Sur les vraies données : POST /v1/train/dropout (service ml) une fois >= 30 parcours clos (>= 100 recommandé).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

import dropout as dp


def fictitious_dataset(n: int = 300, seed: int = 42) -> pd.DataFrame:
    """Parcours clos simulés : l'abandon dépend de la présence, des évaluations et des absences, avec du bruit."""
    rng = np.random.default_rng(seed)
    att = rng.uniform(20, 100, n)
    ev = rng.uniform(30, 95, n)
    missed = rng.integers(0, 8, n)
    done = rng.integers(0, 20, n)
    age = rng.integers(8, 50, n)
    latent = -0.07 * (att - 60) - 0.05 * (ev - 60) + 0.3 * missed - 0.05 * done + rng.normal(0, 0.7, n)
    y = (rng.random(n) < 1 / (1 + np.exp(-latent))).astype(int)
    return pd.DataFrame({"beneficiaryId": np.arange(1, n + 1), "dropout": y, "age": age, "attendance_rate": att,
                         "eval_avg": ev, "activities_completed": done, "missed_activities": missed})


def run(n: int, seed: int, out: Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    result = dp.train(fictitious_dataset(n, seed), seed=seed)
    report = {**result["report"], "SIMULATION": "Données fictives — ne pas citer comme résultat réel."}
    (out / "rapport_demo.json").write_text(dp.to_json(report), encoding="utf-8")
    summary = {"verdict": report["decision"]["verdict"], "message": report["decision"]["message"], "rows": report["stats"]["rows"]}
    if result["artifact"] is not None:
        joblib.dump(result["artifact"], out / "modele_demo.joblib")
        example = {"age": 15, "attendanceRate": 35, "evaluationAverage": 42, "activitiesCompleted": 2, "missedActivities": 6}
        summary["example_input"] = example
        summary["example_prediction"] = dp.predict(result["artifact"], example)
    return summary


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="demo_dropout_out")
    a = ap.parse_args()
    print(json.dumps(run(a.n, a.seed, Path(a.out)), ensure_ascii=False, indent=2))
    print("\n[DONNÉES FICTIVES] Chaîne validée ; ce n'est pas une mesure sur les vrais bénéficiaires.")


if __name__ == "__main__":
    main()
