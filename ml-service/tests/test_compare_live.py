import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import compare_live as cl


def fake_platform(n_projects=12, per_project=25, seed=0, active=10):
    """Données FICTIVES au format des deux endpoints (labels + variables), avec un vrai signal et des projets distincts."""
    rng = np.random.default_rng(seed)
    rows, labels = [], []
    bid = 1
    for p in range(1, n_projects + 1):
        susp = int(rng.random() < 0.2)
        overdue = round(float(rng.random() * 0.6), 2)
        ev = float(rng.normal(65, 12))
        for _ in range(per_project):
            vuln = int(rng.random() < 0.4)
            age = int(rng.integers(6, 50))
            income = float(rng.lognormal(4.5, 0.5))
            latent = -1.2 + 1.3 * susp + 2 * overdue + 0.9 * vuln - 0.02 * (ev - 65) - 0.004 * income + rng.normal(0, 0.8)
            drop = int(rng.random() < 1 / (1 + np.exp(-latent)))
            rows.append({"beneficiaryId": bid, "projectId": p, "project_suspended": susp, "project_draft": 0, "overdue_ratio": overdue,
                         "eval_avg": ev, "vulnerable": vuln, "age": age, "female": int(rng.random() < 0.5), "household_size": int(rng.integers(1, 9)),
                         "monthly_income_kar": income, "children_under5": int(rng.integers(0, 3)), "has_disability": 0,
                         "meals_per_day": int(rng.integers(1, 4)), "out_of_school_children": 0, "health_issues": 0, "no_water": 0,
                         "no_electricity": 0, "altitude": 1000.0, "distance_km": 20.0, "days_since_seen": 5})
            labels.append({"beneficiaryId": bid, "dropout": drop, "statusDate": "2026-10-01"})
            bid += 1
    for k in range(active):  # parcours actifs : présents dans les variables, absents des labels
        rows.append({**rows[0], "beneficiaryId": bid + k})
    return pd.DataFrame(labels), pd.DataFrame(rows)


def test_build_dataset_joins_and_excludes_active():
    labels, feats = fake_platform(active=10)
    df, stats = cl.build_dataset(labels, feats)
    assert stats["labels"] == len(labels) == stats["joined"] == len(df)
    assert stats["features"] == len(feats) == len(labels) + 10
    assert stats["labels_without_features"] == 0
    assert set(df["beneficiaryId"]) == set(labels["beneficiaryId"])


def test_build_dataset_reports_labels_without_features():
    labels, feats = fake_platform()
    df, stats = cl.build_dataset(labels, feats.iloc[10:])
    assert stats["labels_without_features"] == 10 and len(df) == len(labels) - 10


def test_build_dataset_rejects_missing_columns():
    with pytest.raises(SystemExit):
        cl.build_dataset(pd.DataFrame({"x": [1]}), pd.DataFrame({"beneficiaryId": [1]}))


def test_legacy_rule_matches_platform_rule():
    df = pd.DataFrame([
        {"project_suspended": 1, "project_draft": 0, "overdue_ratio": 0.5, "eval_avg": 55.0, "vulnerable": 1, "age": 10},   # 30+13+20+15+5 = 83
        {"project_suspended": 0, "project_draft": 1, "overdue_ratio": 0.0, "eval_avg": 65.0, "vulnerable": 0, "age": 30},   # 10+0+10 = 20
        {"project_suspended": 0, "project_draft": 0, "overdue_ratio": 0.0, "eval_avg": np.nan, "vulnerable": 0, "age": np.nan},  # 0
        {"project_suspended": 1, "project_draft": 0, "overdue_ratio": 1.0, "eval_avg": 10.0, "vulnerable": 1, "age": 5},    # 30+25+20+15+5 = 95
    ])
    assert list(cl.legacy_rule_score(df)) == [83, 20, 0, 95]
    assert cl.legacy_rule_score(df).max() <= 100


def test_evaluate_live_grouped_by_project_has_valid_metrics():
    labels, feats = fake_platform()
    df, _ = cl.build_dataset(labels, feats)
    res, meta = cl.evaluate_live(df, [f for f in cl.BASE_FEATURES if f in df.columns])
    assert meta["grouped_by_project"] is True and meta["n_projects"] == 12 and meta["folds_used"] > 0
    assert len(res) == 4 and res["modele"].iloc[0].startswith("Baseline")
    assert res[["auc", "pr_auc", "recall", "f1"]].apply(lambda c: c.between(0, 1).all()).all()
    assert res[res["modele"] != res["modele"].iloc[0]]["auc"].max() > 0.55  # il y a un signal à apprendre


def test_grouped_folds_never_split_a_project():
    labels, feats = fake_platform()
    df, _ = cl.build_dataset(labels, feats)
    g, y = df["projectId"].to_numpy(), df["dropout"].to_numpy()
    for tr, te in cl.splits(y, g, 5, 2, 1):
        assert not (set(g[tr]) & set(g[te]))


def test_falls_back_when_too_few_projects():
    labels, feats = fake_platform(n_projects=3, per_project=60)
    df, _ = cl.build_dataset(labels, feats)
    _, meta = cl.evaluate_live(df, [f for f in cl.BASE_FEATURES if f in df.columns])
    assert meta["grouped_by_project"] is False


def test_refuses_insufficient_data():
    labels, feats = fake_platform(n_projects=1, per_project=15, active=0)
    df, _ = cl.build_dataset(labels, feats)
    with pytest.raises(SystemExit):
        cl.evaluate_live(df, cl.BASE_FEATURES)


def test_leaky_feature_excluded_by_default_and_report_written():
    assert "days_since_seen" not in cl.BASE_FEATURES
    labels, feats = fake_platform()
    with tempfile.TemporaryDirectory() as d:
        lp, fp, out = Path(d) / "l.csv", Path(d) / "f.csv", Path(d) / "out"
        labels.to_csv(lp, index=False)
        feats.to_csv(fp, index=False)
        cl.main(["--labels-csv", str(lp), "--features-csv", str(fp), "--out", str(out)])
        md = (out / "rapport.md").read_text(encoding="utf-8")
        assert "groupée par projet" in md and "Conclusion" in md and "days_since_seen" not in md.split("Variables")[1].split("\n")[0]
        assert (out / "resultats.json").exists() and (out / "comparaison_live.csv").exists()


def test_verdict_is_cautious_when_gap_within_noise():
    res = pd.DataFrame([
        {"modele": "Baseline", "pr_auc": 0.50, "pr_auc_std": 0.08, "recall": 0.5},
        {"modele": "ML", "pr_auc": 0.53, "pr_auc_std": 0.07, "recall": 0.55},
    ])
    assert "non concluant" in cl.verdict(res)
    res.loc[1, "pr_auc"] = 0.80
    assert "dépasse la baseline" in cl.verdict(res)
    res.loc[1, "pr_auc"] = 0.40
    assert "conserver le score à règles" in cl.verdict(res)
