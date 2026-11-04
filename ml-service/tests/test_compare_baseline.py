import numpy as np
import pandas as pd
import pytest

from compare_baseline import FEATURES, LABEL, evaluate, rule_score, synthetic_dataset, top_k_precision


def test_synthetic_dataset_shape_and_reproducible():
    a, b = synthetic_dataset(200, seed=1), synthetic_dataset(200, seed=1)
    assert list(a.columns) == FEATURES + [LABEL]
    assert a.equals(b)
    assert 0.1 < a[LABEL].mean() < 0.9


def test_rule_score_is_bounded_and_monotonic():
    df = synthetic_dataset(100)
    s = rule_score(df)
    assert s.min() >= 0 and s.max() <= 100
    worse = df.copy()
    worse["attendance_rate"] = 0
    assert (rule_score(worse) >= s).all()


def test_top_k_precision():
    y = np.array([1, 1, 0, 0, 0, 0, 0, 0, 0, 0])
    assert top_k_precision(y, np.array([9, 8, 1, 1, 1, 1, 1, 1, 1, 1]), 0.2) == 1.0


def test_evaluate_returns_one_row_per_model_with_valid_metrics():
    res = evaluate(synthetic_dataset(300))
    assert len(res) == 4 and res["modele"].iloc[0].startswith("Baseline")
    assert res[["auc", "pr_auc", "recall", "f1"]].apply(lambda c: c.between(0, 1).all()).all()


def test_refuses_insufficient_data():
    df = synthetic_dataset(20)
    with pytest.raises(SystemExit):
        evaluate(df)
