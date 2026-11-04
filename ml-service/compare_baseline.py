"""Baseline à règles  vs  modèles ML — risque de décrochage des bénéficiaires.

Répond à la critique « pas de vrai label / règles seulement » avec un protocole reproductible :
  * LABEL : `dropped_out` = 1 si statut_parcours = ABANDON (sinon 0). Jamais calculé à partir du score à comparer.
  * BASELINE : score à règles pondérées FIXES (aucun apprentissage), seuil 50.
  * MODÈLES : régression logistique, forêt aléatoire, gradient boosting (scikit-learn), standardisation DANS
    le pipeline (aucune fuite entre train et test).
  * VALIDATION : validation croisée stratifiée 5 plis × 3 répétitions ; mêmes plis pour tous les modèles.
  * MÉTRIQUES : AUC-ROC, PR-AUC, rappel, précision, F1 (± écart-type), précision@top-10 %.

Usage
  python compare_baseline.py --synthetic 600 --out rapport_baseline        # démonstration du protocole
  python compare_baseline.py --csv dataset-decrochage.csv --out rapport    # données réelles (colonne dropped_out)

AVERTISSEMENT : le mode --synthetic génère des données FICTIVES pour démontrer et tester le protocole.
Ses chiffres ne sont pas des résultats sur les bénéficiaires de l'ONG et ne doivent pas être présentés comme tels.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

LABEL = "dropped_out"
FEATURES = [
    "attendance_rate",      # % de présence aux sessions (0-100)
    "missed_streak",        # nombre de sessions manquées d'affilée
    "progress_pct",         # % d'avancement dans le parcours (0-100)
    "last_eval_score",      # dernière note d'évaluation (0-100)
    "days_since_activity",  # jours depuis la dernière participation
    "age",
    "household_size",
    "monthly_income_kar",   # revenu mensuel du ménage, milliers d'Ar
]
MIN_ROWS, MIN_PER_CLASS = 30, 5  # mêmes seuils que le service ML (main.py)


def synthetic_dataset(n: int, seed: int = 42) -> pd.DataFrame:
    """Données FICTIVES : le label dépend de plusieurs facteurs + du bruit (donc jamais parfaitement prévisible)."""
    rng = np.random.default_rng(seed)
    attendance = np.clip(rng.normal(72, 22, n), 0, 100)
    missed = np.clip(np.round(rng.gamma(1.5, 1.4, n) * (1.3 - attendance / 100)), 0, 12)
    progress = np.clip(attendance * 0.6 + rng.normal(25, 18, n), 0, 100)
    score = np.clip(progress * 0.5 + rng.normal(35, 15, n), 0, 100)
    days = np.clip(rng.exponential(12, n) + missed * 3, 0, 120)
    age = rng.integers(8, 46, n)
    household = rng.integers(1, 10, n)
    income = np.clip(rng.lognormal(5.1, 0.55, n), 20, 2000)
    latent = (-0.045 * attendance - 0.9 * 0 + 0.30 * missed - 0.025 * progress - 0.012 * score
              + 0.030 * days + 0.12 * household - 0.0012 * income + rng.normal(0, 0.9, n) + 1.6)
    p = 1 / (1 + np.exp(-latent))
    y = (rng.random(n) < p).astype(int)
    return pd.DataFrame({
        "attendance_rate": attendance.round(1), "missed_streak": missed, "progress_pct": progress.round(1),
        "last_eval_score": score.round(1), "days_since_activity": days.round(0), "age": age,
        "household_size": household, "monthly_income_kar": income.round(0), LABEL: y,
    })


def rule_score(df: pd.DataFrame) -> np.ndarray:
    """Baseline : pondérations fixées À LA MAIN (0-100), sans apprentissage — esprit du scoring actuel de la plateforme."""
    s = (0.35 * (100 - df["attendance_rate"])
         + 0.25 * (100 - df["progress_pct"])
         + 0.20 * np.minimum(df["missed_streak"] * 12.5, 100)
         + 0.20 * np.minimum(df["days_since_activity"] / 60 * 100, 100))
    return np.clip(s, 0, 100).to_numpy()


def top_k_precision(y: np.ndarray, score: np.ndarray, frac: float = 0.10) -> float:
    k = max(1, int(round(len(y) * frac)))
    return float(y[np.argsort(-score)[:k]].mean())


def metrics(y, score, pred) -> dict[str, float]:
    return {
        "auc": roc_auc_score(y, score), "pr_auc": average_precision_score(y, score),
        "recall": recall_score(y, pred, zero_division=0), "precision": precision_score(y, pred, zero_division=0),
        "f1": f1_score(y, pred, zero_division=0), "p_at_10pct": top_k_precision(y, score),
    }


def evaluate(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    n, pos = len(df), int(df[LABEL].sum())
    if n < MIN_ROWS or min(pos, n - pos) < MIN_PER_CLASS:
        raise SystemExit(f"Données insuffisantes : {n} lignes, classes {pos}/{n - pos} (minimum {MIN_ROWS} lignes, {MIN_PER_CLASS} par classe).")
    X, y = df[FEATURES], df[LABEL].to_numpy()
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=seed)
    models = {
        "Régression logistique": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, class_weight="balanced")),
        "Forêt aléatoire": RandomForestClassifier(n_estimators=300, min_samples_leaf=3, class_weight="balanced", random_state=seed, n_jobs=-1),
        "Gradient boosting": GradientBoostingClassifier(random_state=seed),
    }
    rows: dict[str, list[dict[str, float]]] = {"Baseline à règles (seuil 50)": [], **{k: [] for k in models}}
    for tr, te in cv.split(X, y):
        yt = y[te]
        base = rule_score(X.iloc[te])
        rows["Baseline à règles (seuil 50)"].append(metrics(yt, base, (base >= 50).astype(int)))
        for name, model in models.items():
            model.fit(X.iloc[tr], y[tr])
            proba = model.predict_proba(X.iloc[te])[:, 1]
            rows[name].append(metrics(yt, proba, (proba >= 0.5).astype(int)))
    out = []
    for name, folds in rows.items():
        f = pd.DataFrame(folds)
        rec = {"modele": name}
        for c in f.columns:
            rec[c] = round(f[c].mean(), 3)
            rec[c + "_std"] = round(f[c].std(), 3)
        out.append(rec)
    return pd.DataFrame(out)


def write_report(df: pd.DataFrame, res: pd.DataFrame, out: Path, synthetic: bool) -> None:
    out.mkdir(parents=True, exist_ok=True)
    res.to_csv(out / "comparaison_baseline_vs_ml.csv", index=False)
    pos = int(df[LABEL].sum())
    lines = [
        "# Risque de décrochage : baseline à règles vs modèles ML", "",
        f"- Lignes : **{len(df)}** — décrochages : **{pos}** ({pos / len(df):.0%}) — variables : {', '.join(FEATURES)}",
        "- Validation : stratifiée 5 plis × 3 répétitions (mêmes plis pour tous), standardisation dans le pipeline.", "",
    ]
    if synthetic:
        lines += ["> **DONNÉES FICTIVES** : démonstration du protocole. Ne pas présenter ces chiffres comme des résultats sur les bénéficiaires réels.", ""]
    lines += ["| Modèle | AUC | PR-AUC | Rappel | Précision | F1 | Préc.@10 % |", "|---|---|---|---|---|---|---|"]
    for _, r in res.iterrows():
        lines.append(f"| {r['modele']} | {r['auc']:.3f} ± {r['auc_std']:.3f} | {r['pr_auc']:.3f} | {r['recall']:.3f} | {r['precision']:.3f} | {r['f1']:.3f} | {r['p_at_10pct']:.3f} |")
    best = res.sort_values("pr_auc", ascending=False).iloc[0]
    lines += ["", f"Meilleur modèle (PR-AUC) : **{best['modele']}**.", "",
              "Lecture : la baseline sert de point de comparaison ; un modèle n'est retenu que s'il la dépasse de façon stable "
              "(écart supérieur à l'écart-type entre plis) sur PR-AUC et rappel. Les alertes restent une aide à la décision."]
    (out / "rapport.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out / "resultats.json").write_text(json.dumps(res.to_dict(orient="records"), ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(7, 4))
        x = np.arange(len(res))
        for i, (m, lab) in enumerate([("auc", "AUC"), ("pr_auc", "PR-AUC"), ("recall", "Rappel"), ("f1", "F1")]):
            ax.bar(x + i * 0.2 - 0.3, res[m], 0.2, yerr=res[m + "_std"], label=lab, capsize=2)
        ax.set_xticks(x, [n.replace(" (seuil 50)", "") for n in res["modele"]], rotation=12, fontsize=8)
        ax.set_ylim(0, 1); ax.set_title("Baseline à règles vs ML" + (" (données fictives)" if synthetic else "")); ax.legend(fontsize=8)
        fig.tight_layout(); fig.savefig(out / "comparaison_baseline_vs_ml.png", dpi=150); plt.close(fig)
    except Exception as exc:  # figure facultative
        print("Figure non générée :", exc, file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", help="CSV réel contenant les variables + la colonne dropped_out (0/1)")
    src.add_argument("--synthetic", type=int, metavar="N", help="génère N lignes FICTIVES")
    ap.add_argument("--out", default="rapport_baseline")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    if a.csv:
        df = pd.read_csv(a.csv)
        missing = [c for c in FEATURES + [LABEL] if c not in df.columns]
        if missing:
            raise SystemExit(f"Colonnes manquantes : {missing}")
        df = df[FEATURES + [LABEL]].dropna()
    else:
        df = synthetic_dataset(a.synthetic, a.seed)
    res = evaluate(df, a.seed)
    write_report(df, res, Path(a.out), synthetic=bool(a.synthetic))
    print(res[["modele", "auc", "pr_auc", "recall", "precision", "f1", "p_at_10pct"]].to_string(index=False))


if __name__ == "__main__":
    main()
