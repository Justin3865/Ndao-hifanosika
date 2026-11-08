"""Tests du modèle de risque d'abandon (module dropout.py). Données FICTIVES : elles servent à tester la LOGIQUE
(garde-fous, décision, format de réponse), pas à mesurer la performance sur les bénéficiaires réels."""
import numpy as np
import pandas as pd
import pytest

import dropout as dp


def fake(n=200, signal=True, seed=0):
    rng = np.random.default_rng(seed)
    att = rng.uniform(20, 100, n)
    ev = rng.uniform(30, 95, n)
    missed = rng.integers(0, 8, n)
    done = rng.integers(0, 20, n)
    age = rng.integers(8, 50, n)
    if signal:
        latent = -0.07 * (att - 60) - 0.05 * (ev - 60) + 0.3 * missed - 0.05 * done + rng.normal(0, 0.7, n)
        y = (rng.random(n) < 1 / (1 + np.exp(-latent))).astype(int)
    else:
        y = (rng.random(n) < 0.4).astype(int)
    return pd.DataFrame({"beneficiaryId": np.arange(1, n + 1), "dropout": y, "age": age, "attendance_rate": att,
                         "eval_avg": ev, "activities_completed": done, "missed_activities": missed})


def test_rule_score_matches_backend_rules():
    # présence 40 (+40), éval 45 (+30), 2 manquées / 4 total (+10), âge 20 (+5) = 85
    row = {"attendance_rate": 40, "eval_avg": 45, "missed_activities": 2, "activities_completed": 2, "age": 20}
    assert dp.rule_score(row) == 85
    assert dp.rule_score({"attendance_rate": 95, "eval_avg": 90, "missed_activities": 0, "activities_completed": 5, "age": 15}) == 0
    assert dp.rule_score({}) == 0  # tout manquant : pas de points (comme une règle sans donnée)


def test_refuses_too_few_rows():
    with pytest.raises(ValueError, match="insuffisantes"):
        dp.train(fake(20))


def test_refuses_too_few_in_one_class():
    df = fake(60)
    df["dropout"] = 0
    df.loc[:2, "dropout"] = 1  # 3 positifs < 5
    with pytest.raises(ValueError, match="insuffisantes"):
        dp.train(df)


def test_missing_columns_are_reported():
    with pytest.raises(ValueError, match="Colonnes manquantes"):
        dp.check_dataset(fake(60).drop(columns=["eval_avg"]))


def test_noise_gives_inconclusive_and_no_artifact():
    res = dp.train(fake(150, signal=False, seed=3))
    assert res["artifact"] is None
    assert res["report"]["decision"]["verdict"] == "non concluant"
    assert res["report"]["data_hash"]


def test_report_is_traceable():
    r = dp.train(fake(120, signal=True))["report"]
    for k in ("version", "trained_at", "data_hash", "features", "stats", "metrics", "decision", "warnings"):
        assert k in r
    assert r["features"] == dp.FEATURES
    assert not any("petit" in w for w in r["warnings"])  # 120 >= SMALL_SAMPLE
    assert any("petit" in w for w in dp.train(fake(60))["report"]["warnings"])  # 60 < SMALL_SAMPLE


def test_hash_is_stable_and_order_independent():
    df = fake(80)
    assert dp.data_hash(df) == dp.data_hash(df.sample(frac=1, random_state=1))
    df2 = df.copy()
    df2.loc[0, "attendance_rate"] += 1
    assert dp.data_hash(df) != dp.data_hash(df2)


def test_decide_requires_gap_above_sigma_and_recall():
    def m(base_pr, ml_pr, sd, base_rec, ml_rec):
        s = lambda v, d=sd: {"mean": v, "std": d}
        return {"models": {"baseline_rules": {"pr_auc": s(base_pr), "auc": s(0.5), "recall": s(base_rec)},
                           "logistic_regression": {"pr_auc": s(ml_pr), "auc": s(0.7), "recall": s(ml_rec)}}}
    assert dp.decide(m(0.5, 0.7, 0.05, 0.5, 0.6))["conclusive"] is True
    assert dp.decide(m(0.5, 0.52, 0.05, 0.5, 0.6))["conclusive"] is False   # écart < σ
    assert dp.decide(m(0.5, 0.7, 0.05, 0.6, 0.5))["conclusive"] is False   # rappel dégradé


def test_predict_format_and_missing_values():
    art = {"pipeline": dp.candidates()["logistic_regression"].fit(fake(150)[dp.FEATURES], fake(150)["dropout"]), "name": "ml-logreg-tree-v1:logistic_regression"}
    out = dp.predict(art, {"age": 20, "attendanceRate": 30, "evaluationAverage": 40, "activitiesCompleted": 1, "missedActivities": 6})
    assert 0 <= out["probability"] <= 1 and out["model"].startswith("ml-logreg") and isinstance(out["factors"], list)
    sparse = dp.predict(art, {"age": None, "attendanceRate": None})  # valeurs absentes : imputées, pas d'exception
    assert 0 <= sparse["probability"] <= 1
    risky = dp.predict(art, {"age": 20, "attendanceRate": 20, "evaluationAverage": 30, "activitiesCompleted": 0, "missedActivities": 8})["probability"]
    safe = dp.predict(art, {"age": 20, "attendanceRate": 98, "evaluationAverage": 90, "activitiesCompleted": 18, "missedActivities": 0})["probability"]
    assert risky > safe


def hidden_signal(n=300, seed=0):
    """Le label dépend d'une variable que les règles ne regardent pas (activités suivies) : le modèle doit être retenu."""
    r = np.random.default_rng(seed)
    df = pd.DataFrame({"beneficiaryId": range(n), "age": r.integers(8, 50, n), "attendance_rate": r.uniform(60, 100, n),
                       "eval_avg": r.uniform(60, 100, n), "activities_completed": r.integers(0, 20, n),
                       "missed_activities": r.integers(0, 2, n)})
    z = -0.45 * (df.activities_completed - 10) + r.normal(0, 0.8, n)
    df["dropout"] = (r.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    return df


def test_model_is_promoted_only_when_it_beats_the_rules():
    res = dp.train(hidden_signal())
    assert res["report"]["decision"]["verdict"] == "retenu"
    assert res["artifact"] is not None
    out = dp.predict(res["artifact"], {"age": 20, "attendanceRate": 90, "evaluationAverage": 90, "activitiesCompleted": 0, "missedActivities": 0})
    assert out["probability"] > 0.5
