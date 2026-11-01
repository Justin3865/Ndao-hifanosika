#!/usr/bin/env python3
"""
Rapport d'apprentissage (scikit-learn) — Ndao Hifanosika.

Reprend la démarche du mémoire (§ « Développement et entraînement du module IA ») sur un jeu de
données exporté par l'application (page Modèles d'apprentissage → « Exporter en CSV (Python) ») :

  1. description du jeu de données et prétraitement (imputation + normalisation),
  2. découpage stratifié 80 % / 20 % avec graine fixée (42),
  3. recherche sur grille du Gradient Boosting (validation croisée à 3 plis),
  4. comparaison des modèles sur le jeu de test (référence « classe majoritaire » incluse),
  5. validation croisée à 5 plis, courbe d'apprentissage (AUC selon le nombre d'arbres),
  6. matrice de confusion et courbe ROC,
  7. notation des lignes sans résultat connu (predictions.csv) et sauvegarde du meilleur modèle.

Usage :
    python train_report.py dataset-stage_progress.csv --out rapport_stage --test-size 0.2 --seed 42

Colonnes attendues : id, name, context, label (1 / 0 / vide = inconnu), puis une colonne par variable.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.dummy import DummyClassifier  # noqa: E402
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier  # noqa: E402
from sklearn.impute import SimpleImputer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    ConfusionMatrixDisplay,
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split  # noqa: E402
from sklearn.naive_bayes import GaussianNB  # noqa: E402
from sklearn.neighbors import KNeighborsClassifier  # noqa: E402
from sklearn.neural_network import MLPClassifier  # noqa: E402
from sklearn.pipeline import Pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

META = ["id", "name", "context", "label"]


def pipe(model) -> Pipeline:
    """Imputation (moyenne de l'entraînement) + normalisation, apprises sur l'entraînement seul."""
    return Pipeline([("imp", SimpleImputer(strategy="mean")), ("sc", StandardScaler()), ("model", model)])


def metrics(y_true, proba) -> dict:
    pred = (proba >= 0.5).astype(int)
    return {
        "accuracy": round(accuracy_score(y_true, pred), 3),
        "precision": round(precision_score(y_true, pred, zero_division=0), 3),
        "recall": round(recall_score(y_true, pred, zero_division=0), 3),
        "f1": round(f1_score(y_true, pred, zero_division=0), 3),
        "auc": round(roc_auc_score(y_true, proba), 3) if len(set(y_true)) > 1 else 0.5,
    }


def md_table(df: pd.DataFrame) -> str:
    try:
        return df.to_markdown(index=False)  # nécessite « tabulate »
    except ImportError:
        return "```\n" + df.to_string(index=False) + "\n```"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", type=Path)
    ap.add_argument("--out", type=Path, default=Path("rapport"))
    ap.add_argument("--test-size", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(args.csv, encoding="utf-8-sig")
    features = [c for c in df.columns if c not in META]

    labeled = df[df["label"].notna()].copy()
    unlabeled = df[df["label"].isna()].copy()
    X, y = labeled[features].astype(float), labeled["label"].astype(int)

    pos = int(y.sum())
    if len(labeled) < 10 or pos < 3 or len(labeled) - pos < 3:
        raise SystemExit(
            f"Données insuffisantes : {len(labeled)} lignes avec résultat dont {pos} positives "
            "(minimum : 10 lignes, 3 de chaque classe)."
        )

    report: dict = {"source": args.csv.name, "features": features, "seed": args.seed}

    # 1. Description du jeu de données ------------------------------------------------------
    desc = X.describe().T[["mean", "std", "min", "max"]].round(2)
    desc["manquant_%"] = (X.isna().mean() * 100).round(1)
    desc["moy_positifs"] = X[y == 1].mean().round(2)
    desc["moy_negatifs"] = X[y == 0].mean().round(2)
    report["dataset"] = {
        "lignes_connues": int(len(labeled)),
        "positives": pos,
        "part_positives": round(pos / len(labeled), 3),
        "a_tester": int(len(unlabeled)),
    }
    desc.to_csv(args.out / "description_variables.csv")

    # 2. Découpage stratifié ---------------------------------------------------------------
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=args.test_size, random_state=args.seed, stratify=y)
    report["split"] = {"train": int(len(Xtr)), "test": int(len(Xte)), "test_size": args.test_size}

    # 3. Recherche sur grille du Gradient Boosting (cv=3, comme le mémoire) -------------------
    cv_grid = max(2, min(3, int(ytr.sum()), int(len(ytr) - ytr.sum())))
    grid = {
        "model__n_estimators": [100, 200, 400],
        "model__learning_rate": [0.03, 0.05, 0.1],
        "model__max_depth": [2, 3, 4],
    }
    gs = GridSearchCV(
        pipe(GradientBoostingClassifier(random_state=args.seed)),
        grid,
        cv=StratifiedKFold(cv_grid, shuffle=True, random_state=args.seed),
        scoring="roc_auc",
        n_jobs=-1,
    ).fit(Xtr, ytr)
    top = pd.DataFrame(gs.cv_results_).sort_values("rank_test_score").head(5)
    best_table = [
        {
            "arbres": int(r["param_model__n_estimators"]),
            "taux_apprentissage": float(r["param_model__learning_rate"]),
            "profondeur": int(r["param_model__max_depth"]),
            "auc_validation": round(float(r["mean_test_score"]), 3),
        }
        for _, r in top.iterrows()
    ]
    report["grid_search"] = {"best_params": {k.replace("model__", ""): v for k, v in gs.best_params_.items()}, "top5": best_table}

    # 4. Comparaison des modèles sur le jeu de test ------------------------------------------
    candidates = {
        "Référence (classe majoritaire)": pipe(DummyClassifier(strategy="prior")),
        "Régression logistique": pipe(LogisticRegression(max_iter=1000, random_state=args.seed)),
        "Réseau de neurones (MLP)": pipe(MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=800, random_state=args.seed)),
        "Bayes naïf": pipe(GaussianNB()),
        "k plus proches voisins": pipe(KNeighborsClassifier(n_neighbors=min(7, max(1, len(Xtr) // 4)))),
        "Forêt aléatoire": pipe(RandomForestClassifier(n_estimators=300, random_state=args.seed)),
        "Gradient Boosting (défaut)": pipe(GradientBoostingClassifier(random_state=args.seed)),
        "Gradient Boosting (optimisé)": gs.best_estimator_,
    }

    rows, fitted = [], {}
    for name, model in candidates.items():
        if name != "Gradient Boosting (optimisé)":
            model.fit(Xtr, ytr)
        fitted[name] = model
        proba = model.predict_proba(Xte)[:, 1]
        rows.append({"modele": name, **metrics(yte, proba), "auc_train": metrics(ytr, model.predict_proba(Xtr)[:, 1])["auc"]})
    table = pd.DataFrame(rows)
    table.to_csv(args.out / "comparaison_modeles.csv", index=False)
    report["comparison"] = rows

    ranked = table[table["modele"] != "Référence (classe majoritaire)"].sort_values(["auc", "f1"], ascending=False)
    best_name = ranked.iloc[0]["modele"]
    best = fitted[best_name]
    report["best_model"] = best_name

    # 5. Validation croisée (5 plis) -----------------------------------------------------------
    k = max(2, min(5, pos, len(labeled) - pos))
    skf = StratifiedKFold(k, shuffle=True, random_state=args.seed)
    cv_rows = []
    for name in ("Régression logistique", "Réseau de neurones (MLP)", "Bayes naïf", "k plus proches voisins", "Forêt aléatoire", best_name):
        scores = cross_val_score(candidates[name] if name in candidates else best, X, y, cv=skf, scoring="roc_auc", n_jobs=-1)
        cv_rows.append({"modele": name, "auc_moyenne": round(scores.mean(), 3), "ecart_type": round(scores.std(), 3), "plis": [round(s, 3) for s in scores]})
    report["cross_validation"] = {"k": k, "results": cv_rows}

    # 6. Figures --------------------------------------------------------------------------------
    # Fig. A — comparaison des AUC (cf. figure « erreur par modèle » du mémoire)
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.barh(table["modele"][::-1], table["auc"][::-1], color="#2563eb")
    ax.axvline(0.5, color="#9ca3af", ls="--", lw=1)
    ax.set_xlim(0, 1)
    ax.set_xlabel("AUC sur le jeu de test")
    ax.set_title("Comparaison des modèles")
    fig.tight_layout()
    fig.savefig(args.out / "fig_comparaison.png", dpi=150)
    plt.close(fig)

    # Fig. B — courbe d'apprentissage du Gradient Boosting selon le nombre d'arbres
    gb = best if "Gradient Boosting" in best_name else gs.best_estimator_
    gbm = gb.named_steps["model"]
    pre = Pipeline(gb.steps[:-1])
    Ztr, Zte = pre.transform(Xtr), pre.transform(Xte)
    trees = np.arange(1, gbm.n_estimators + 1)
    tr_auc = [roc_auc_score(ytr, p[:, 1]) for p in gbm.staged_predict_proba(Ztr)]
    te_auc = [roc_auc_score(yte, p[:, 1]) for p in gbm.staged_predict_proba(Zte)]
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(trees, tr_auc, label="Apprentissage", color="#2563eb")
    ax.plot(trees, te_auc, label="Test", color="#059669", ls="--")
    ax.set_xlabel("Nombre d'arbres")
    ax.set_ylabel("AUC")
    ax.set_title("Courbe d'apprentissage du Gradient Boosting")
    ax.legend()
    fig.tight_layout()
    fig.savefig(args.out / "fig_courbe_apprentissage.png", dpi=150)
    plt.close(fig)

    # Fig. C — matrice de confusion + ROC du meilleur modèle
    proba_te = best.predict_proba(Xte)[:, 1]
    pred_te = (proba_te >= 0.5).astype(int)
    cm = confusion_matrix(yte, pred_te, labels=[1, 0])
    report["confusion_matrix"] = {"tp": int(cm[0, 0]), "fn": int(cm[0, 1]), "fp": int(cm[1, 0]), "tn": int(cm[1, 1])}
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    ConfusionMatrixDisplay(cm, display_labels=["Positif", "Négatif"]).plot(ax=axes[0], colorbar=False, cmap="Blues")
    axes[0].set_title(f"Matrice de confusion — {best_name}")
    fpr, tpr, _ = roc_curve(yte, proba_te)
    axes[1].plot(fpr, tpr, color="#2563eb", label=f"AUC = {metrics(yte, proba_te)['auc']}")
    axes[1].plot([0, 1], [0, 1], color="#9ca3af", ls="--")
    axes[1].set_xlabel("Taux de faux positifs")
    axes[1].set_ylabel("Taux de vrais positifs")
    axes[1].set_title("Courbe ROC (test)")
    axes[1].legend()
    fig.tight_layout()
    fig.savefig(args.out / "fig_confusion_roc.png", dpi=150)
    plt.close(fig)

    # Fig. D — variables les plus utiles (importance du Gradient Boosting)
    if hasattr(gbm, "feature_importances_"):
        imp = pd.Series(gbm.feature_importances_, index=features).sort_values()
        report["feature_importance"] = {k: round(float(v), 3) for k, v in imp.sort_values(ascending=False).items()}
        fig, ax = plt.subplots(figsize=(8, max(3, 0.35 * len(features))))
        ax.barh(imp.index, imp.values, color="#2563eb")
        ax.set_xlabel("Importance (Gradient Boosting)")
        fig.tight_layout()
        fig.savefig(args.out / "fig_importance_variables.png", dpi=150)
        plt.close(fig)

    # 7. Notation des lignes inconnues + sauvegarde -------------------------------------------
    if len(unlabeled):
        out = unlabeled[META[:3]].copy()
        out["score"] = (best.predict_proba(unlabeled[features].astype(float))[:, 1] * 100).round(0).astype(int)
        out.sort_values("score", ascending=False).to_csv(args.out / "predictions.csv", index=False)

    joblib.dump({"model": best, "features": features, "name": best_name}, args.out / "modele.joblib")
    (args.out / "rapport.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [
        f"# Rapport d'apprentissage — {args.csv.name}",
        "",
        f"- Lignes avec résultat : {len(labeled)} (positives : {pos}, {report['dataset']['part_positives']:.0%})",
        f"- Entraînement / test : {len(Xtr)} / {len(Xte)} (graine {args.seed})",
        f"- Meilleur modèle : **{best_name}**",
        "",
        "## Comparaison sur le jeu de test",
        md_table(table),
        "",
        "## Validation croisée",
        *[f"- {r['modele']} : AUC {r['auc_moyenne']} ± {r['ecart_type']}" for r in cv_rows],
        "",
        "Figures : fig_comparaison.png, fig_courbe_apprentissage.png, fig_confusion_roc.png, fig_importance_variables.png",
    ]
    (args.out / "rapport.md").write_text("\n".join(md), encoding="utf-8")
    print(f"Meilleur modèle : {best_name}\nRapport écrit dans {args.out}/")


if __name__ == "__main__":
    main()
