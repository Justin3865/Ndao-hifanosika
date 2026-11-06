"""Baseline à règles vs modèles ML sur les VRAIS labels de la plateforme (GET /api/journey/labels).

Complète `compare_baseline.py` (qui reste inchangé) : celui-ci attend un CSV déjà prêt avec des colonnes
« taux de présence… » que la base des bénéficiaires ne contient pas. Ici, tout vient de la plateforme :

  LABELS     GET /api/journey/labels          (JWT ADMIN/DIRECTION)   -> beneficiaryId, dropout (1 = abandon, 0 = terminé)
  VARIABLES  GET /api/service/dropout-features (clé de service)       -> variables SANS nom, contact, CIN ni GPS précis
  JOINTURE   par beneficiaryId. Les parcours « actifs » n'ont pas de label : ils sont exclus (censure à droite).

BASELINE = réplique exacte du score à règles actuellement affiché par la plateforme
(insights.controller.ts / ai_service insights.py : projet suspendu +30, non lancé +10, jalons en retard jusqu'à +25,
évaluations faibles +20 / moyennes +10, vulnérable +15, âge < 14 ans +5 ; « risque élevé » si score ≥ 60).

VALIDATION : validation croisée stratifiée répétée, GROUPÉE PAR PROJET quand il y a assez de projets. Pourquoi : certaines
variables (statut du projet, jalons en retard, note moyenne) sont les mêmes pour tous les bénéficiaires d'un projet ; avec un
découpage au hasard, le modèle « reconnaîtrait » le projet et le résultat serait trop optimiste.

`days_since_seen` est EXCLUE par défaut : on ne revoit plus quelqu'un qui a abandonné, donc la variable est une conséquence
du label et non une cause (fuite temporelle). `--with-last-seen` la réintègre, à titre d'illustration seulement.

Usage
  # en ligne (jeton copié depuis une session ADMIN, ou NDAO_EMAIL / NDAO_PASSWORD [/ NDAO_2FA_CODE])
  set BACKEND_URL=http://localhost:4000 & set AI_SERVICE_KEY=<clé> & set NDAO_API_TOKEN=<jeton>
  python compare_live.py --out rapport_live
  # hors ligne (deux CSV exportés)
  python compare_live.py --labels-csv labels.csv --features-csv features.csv --out rapport_live

Les chiffres ne valent que ce que valent les données : en dessous d'environ 100 parcours clos, le rapport le signale.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import compare_baseline as cb  # réutilisé tel quel : metrics(), top_k_precision(), seuils MIN_ROWS / MIN_PER_CLASS

LABEL = "dropout"
ID = "beneficiaryId"
GROUP = "projectId"
RULE_THRESHOLD = 60  # « risque élevé » dans la plateforme

BASE_FEATURES = [
    "project_suspended", "project_draft", "overdue_ratio", "eval_avg", "vulnerable", "age",  # = ce que voit la règle actuelle
    "female", "household_size", "monthly_income_kar", "children_under5", "has_disability",
    "meals_per_day", "out_of_school_children", "health_issues", "no_water", "no_electricity",
    "altitude", "distance_km",
]
LEAKY_FEATURES = ["days_since_seen"]
SMALL_SAMPLE = 100


# ------------------------------------------------------------------ accès à l'API
def _http_json(url: str, headers: dict[str, str] | None = None, body: dict | None = None, timeout: int = 60) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 (URL fournie par l'administrateur)
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:300]
        raise SystemExit(f"Erreur HTTP {exc.code} sur {url} : {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Impossible de joindre {url} : {exc.reason}") from exc


def get_token(base: str) -> str:
    token = os.getenv("NDAO_API_TOKEN", "").strip()
    if token:
        return token
    email, password = os.getenv("NDAO_EMAIL", ""), os.getenv("NDAO_PASSWORD", "")
    if not email or not password:
        raise SystemExit("Définissez NDAO_API_TOKEN (jeton ADMIN/DIRECTION) ou NDAO_EMAIL + NDAO_PASSWORD.")
    payload = {"email": email, "password": password}
    if os.getenv("NDAO_2FA_CODE"):
        payload["twoFactorCode"] = os.environ["NDAO_2FA_CODE"]
    res = _http_json(f"{base}/api/auth/login", body=payload)
    if res.get("requiresTwoFactor"):
        raise SystemExit("Ce compte exige un code à 6 chiffres : définissez NDAO_2FA_CODE, ou utilisez NDAO_API_TOKEN.")
    try:
        return res["data"]["accessToken"]
    except KeyError as exc:
        raise SystemExit("Connexion refusée : réponse sans accessToken.") from exc


def fetch_labels(base: str, token: str) -> pd.DataFrame:
    res = _http_json(f"{base}/api/journey/labels", headers={"Authorization": f"Bearer {token}"})
    return pd.DataFrame(res.get("data", []))


def fetch_features(base: str, key: str) -> pd.DataFrame:
    if not key:
        raise SystemExit("AI_SERVICE_KEY manquante (même valeur que dans le .env du backend).")
    res = _http_json(f"{base}/api/service/dropout-features", headers={"x-service-key": key})
    return pd.DataFrame(res.get("data", []))


# ------------------------------------------------------------------ données
def build_dataset(labels: pd.DataFrame, feats: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Jointure labels × variables. Retourne (jeu, statistiques de provenance)."""
    for name, df, cols in (("labels", labels, [ID, LABEL]), ("variables", feats, [ID])):
        missing = [c for c in cols if c not in df.columns]
        if missing:
            raise SystemExit(f"Colonnes manquantes dans les {name} : {missing}")
    lab = labels[[ID, LABEL]].dropna().drop_duplicates(ID)
    lab[LABEL] = lab[LABEL].astype(int)
    joined = lab.merge(feats.drop_duplicates(ID), on=ID, how="inner")
    stats = {
        "labels": int(len(lab)),
        "features": int(len(feats)),
        "joined": int(len(joined)),
        "labels_without_features": int(len(lab) - len(joined)),
        "dropouts": int(joined[LABEL].sum()) if len(joined) else 0,
    }
    return joined, stats


def legacy_rule_score(df: pd.DataFrame) -> np.ndarray:
    """Réplique du score à règles de la plateforme (0-100). Arrondi « demi vers le haut » comme Math.round côté TS."""
    def col(name: str, default: float = 0.0) -> pd.Series:
        return df[name].fillna(default) if name in df else pd.Series(default, index=df.index)

    ev = df["eval_avg"] if "eval_avg" in df else pd.Series(np.nan, index=df.index)
    risk = (
        30 * col("project_suspended") + 10 * col("project_draft")
        + np.floor(col("overdue_ratio") * 25 + 0.5)
        + np.where(ev < 60, 20, np.where(ev < 70, 10, 0))  # NaN < 60 est faux : pas d'évaluation = 0 point, comme la règle d'origine
        + 15 * col("vulnerable") + 5 * (df["age"].fillna(99) < 14).astype(int)
    )
    return np.clip(np.asarray(risk, dtype=float), 0, 100)


def model_zoo(seed: int) -> dict:
    imp = lambda: SimpleImputer(strategy="median", keep_empty_features=True)  # noqa: E731 — DANS le pipeline : aucune fuite
    return {
        "Régression logistique": make_pipeline(imp(), StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")),
        "Forêt aléatoire": make_pipeline(imp(), RandomForestClassifier(n_estimators=300, min_samples_leaf=3, class_weight="balanced", random_state=seed, n_jobs=-1)),
        "Gradient boosting": make_pipeline(imp(), GradientBoostingClassifier(random_state=seed)),
    }


def splits(y: np.ndarray, groups: np.ndarray | None, n_splits: int, repeats: int, seed: int):
    """Plis identiques pour tous les modèles. Groupés par projet si possible."""
    use_groups = groups is not None and len(set(groups)) >= n_splits
    for r in range(repeats):
        if use_groups:
            cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed + r)
            yield from cv.split(np.zeros(len(y)), y, groups)
        else:
            cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed + r)
            yield from cv.split(np.zeros(len(y)), y)


def evaluate_live(df: pd.DataFrame, features: list[str], seed: int = 42, n_splits: int = 5, repeats: int = 3,
                  group_by_project: bool = True) -> tuple[pd.DataFrame, dict]:
    n, pos = len(df), int(df[LABEL].sum())
    if n < cb.MIN_ROWS or min(pos, n - pos) < cb.MIN_PER_CLASS:
        raise SystemExit(f"Données insuffisantes : {n} parcours clos, classes {pos}/{n - pos} (minimum {cb.MIN_ROWS} lignes, {cb.MIN_PER_CLASS} par classe).")
    X, y = df[features].astype(float), df[LABEL].to_numpy()
    groups = df[GROUP].to_numpy() if group_by_project and GROUP in df and df[GROUP].notna().all() else None
    grouped = groups is not None and len(set(groups)) >= n_splits
    models = model_zoo(seed)
    name_rule = f"Baseline actuelle (règles, seuil {RULE_THRESHOLD})"
    rows: dict[str, list[dict[str, float]]] = {name_rule: [], **{k: [] for k in models}}
    used = skipped = 0
    for tr, te in splits(y, groups, n_splits, repeats, seed):
        yt = y[te]
        if len(set(yt)) < 2 or len(set(y[tr])) < 2:  # AUC indéfinie sur un pli à une seule classe
            skipped += 1
            continue
        used += 1
        base = legacy_rule_score(df.iloc[te])
        rows[name_rule].append(cb.metrics(yt, base, (base >= RULE_THRESHOLD).astype(int)))
        for name, model in models.items():
            model.fit(X.iloc[tr], y[tr])
            proba = model.predict_proba(X.iloc[te])[:, 1]
            rows[name].append(cb.metrics(yt, proba, (proba >= 0.5).astype(int)))
    if used == 0:
        raise SystemExit("Aucun pli exploitable (une seule classe par pli) : trop peu de parcours clos ou trop peu de projets.")
    out = []
    for name, folds in rows.items():
        f = pd.DataFrame(folds)
        rec = {"modele": name}
        for c in f.columns:
            rec[c] = round(float(f[c].mean()), 3)
            rec[c + "_std"] = round(float(f[c].std(ddof=1)) if len(f) > 1 else 0.0, 3)
        out.append(rec)
    meta = {"grouped_by_project": bool(grouped), "n_projects": int(len(set(groups))) if groups is not None else None,
            "folds_used": used, "folds_skipped": skipped, "n_splits": n_splits, "repeats": repeats}
    return pd.DataFrame(out), meta


def verdict(res: pd.DataFrame) -> str:
    base, ml = res.iloc[0], res.iloc[1:].sort_values("pr_auc", ascending=False).iloc[0]
    gap = ml["pr_auc"] - base["pr_auc"]
    margin = max(ml["pr_auc_std"], base["pr_auc_std"])
    rec_gap = ml["recall"] - base["recall"]
    if gap > margin and rec_gap >= 0:
        return (f"**{ml['modele']}** dépasse la baseline de façon stable (PR-AUC +{gap:.3f} > écart-type {margin:.3f}, "
                f"rappel {rec_gap:+.3f}) : il peut être proposé en complément des règles, toujours comme aide à la décision.")
    if gap > 0:
        return (f"**{ml['modele']}** fait mieux en moyenne (PR-AUC +{gap:.3f}) mais l'écart reste dans la variabilité entre plis "
                f"({margin:.3f}) : **non concluant** — conserver les règles et recollecter des données.")
    return "Aucun modèle appris ne dépasse la baseline : **conserver le score à règles**, qui est plus simple et explicable."


def write_report(df: pd.DataFrame, res: pd.DataFrame, meta: dict, stats: dict, features: list[str], out: Path, source: str) -> None:
    out.mkdir(parents=True, exist_ok=True)
    res.to_csv(out / "comparaison_live.csv", index=False)
    pos = int(df[LABEL].sum())
    lines = [
        "# Risque de décrochage — baseline actuelle vs modèles ML (données réelles)", "",
        f"- Source : {source}",
        f"- Labels reçus : **{stats['labels']}** (parcours clos) ; avec variables : **{stats['joined']}** ; sans variables : {stats['labels_without_features']}",
        f"- Abandons : **{pos}** ({pos / len(df):.0%}) — terminés : {len(df) - pos}. Les parcours « actifs » sont exclus (pas encore de résultat).",
        f"- Variables ({len(features)}) : {', '.join(features)}",
        f"- Validation : {meta['n_splits']} plis × {meta['repeats']} répétitions, "
        + (f"**groupée par projet** ({meta['n_projects']} projets : aucun projet n'est à la fois en entraînement et en test)."
           if meta["grouped_by_project"] else "stratifiée simple (**pas assez de projets pour grouper : résultat potentiellement optimiste**)."),
        f"- Plis exploitables : {meta['folds_used']} (ignorés car une seule classe : {meta['folds_skipped']}).", "",
    ]
    if len(df) < SMALL_SAMPLE:
        lines += [f"> **Échantillon petit ({len(df)} parcours clos < {SMALL_SAMPLE})** : lire ces chiffres comme indicatifs, pas comme une preuve.", ""]
    lines += ["| Modèle | AUC | PR-AUC | Rappel | Précision | F1 | Préc.@10 % |", "|---|---|---|---|---|---|---|"]
    for _, r in res.iterrows():
        lines.append(f"| {r['modele']} | {r['auc']:.3f} ± {r['auc_std']:.3f} | {r['pr_auc']:.3f} ± {r['pr_auc_std']:.3f} | {r['recall']:.3f} | {r['precision']:.3f} | {r['f1']:.3f} | {r['p_at_10pct']:.3f} |")
    lines += ["", "## Conclusion", "", verdict(res), "",
              "Limites : label = statut saisi par les coordinateurs ; variables mesurées au moment de l'export (pas à la date de l'abandon) ; "
              "aucune donnée de présence aux séances n'existe pour les bénéficiaires dans la base actuelle."]
    (out / "rapport.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out / "resultats.json").write_text(json.dumps({"stats": stats, "validation": meta, "features": features,
                                                    "resultats": res.to_dict(orient="records")}, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(7.5, 4))
        x = np.arange(len(res))
        for i, (m, lab) in enumerate([("auc", "AUC"), ("pr_auc", "PR-AUC"), ("recall", "Rappel"), ("f1", "F1")]):
            ax.bar(x + i * 0.2 - 0.3, res[m], 0.2, yerr=res[m + "_std"], label=lab, capsize=2)
        ax.set_xticks(x, [n.split(" (")[0] for n in res["modele"]], rotation=12, fontsize=8)
        ax.set_ylim(0, 1)
        ax.set_title(f"Baseline actuelle vs ML — {len(df)} parcours clos réels")
        ax.legend(fontsize=8)
        fig.tight_layout()
        fig.savefig(out / "comparaison_live.png", dpi=150)
        plt.close(fig)
    except Exception as exc:  # figure facultative
        print("Figure non générée :", exc, file=sys.stderr)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api", default=os.getenv("BACKEND_URL", "http://localhost:4000"))
    ap.add_argument("--labels-csv", help="labels déjà exportés (beneficiaryId, dropout)")
    ap.add_argument("--features-csv", help="variables déjà exportées (dropout-features)")
    ap.add_argument("--out", default="rapport_live")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--no-group", action="store_true", help="validation stratifiée simple (déconseillé)")
    ap.add_argument("--with-last-seen", action="store_true", help="réintègre days_since_seen (fuite temporelle : illustration seulement)")
    ap.add_argument("--save-csv", action="store_true", help="enregistre labels.csv et features.csv (pseudonymisés) à côté du rapport")
    a = ap.parse_args(argv)

    if a.labels_csv and a.features_csv:
        labels, feats, source = pd.read_csv(a.labels_csv), pd.read_csv(a.features_csv), f"{a.labels_csv} + {a.features_csv}"
    else:
        base = a.api.rstrip("/")
        labels = fetch_labels(base, get_token(base))
        feats = fetch_features(base, os.getenv("AI_SERVICE_KEY", ""))
        source = f"{base}/api/journey/labels + {base}/api/service/dropout-features"
    df, stats = build_dataset(labels, feats)
    features = BASE_FEATURES + (LEAKY_FEATURES if a.with_last_seen else [])
    features = [f for f in features if f in df.columns and df[f].notna().any()]
    res, meta = evaluate_live(df, features, a.seed, group_by_project=not a.no_group)
    out = Path(a.out)
    write_report(df, res, meta, stats, features, out, source)
    if a.save_csv:
        labels.to_csv(out / "labels.csv", index=False)
        feats.drop(columns=[c for c in ("name", "firstName", "lastName") if c in feats], errors="ignore").to_csv(out / "features.csv", index=False)
    print(res[["modele", "auc", "pr_auc", "recall", "precision", "f1", "p_at_10pct"]].to_string(index=False))
    print("\n" + verdict(res).replace("**", ""))


if __name__ == "__main__":
    main()
