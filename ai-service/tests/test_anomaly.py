from app.anomaly import MIN_SAMPLES, detect


def _normal_rows(n=30):
    return [[50 + (i % 5), 10 + (i % 3)] for i in range(n)]


def test_obvious_outlier_is_flagged_and_explained():
    rows = _normal_rows() + [[500, 10]]
    ids = list(range(len(rows)))
    out = detect(ids, ["avancement", "retard"], rows, contamination=0.05)

    assert out["ready"] is True
    by_id = {r["id"]: r for r in out["results"]}
    assert by_id[len(rows) - 1]["anomaly"] is True
    assert by_id[len(rows) - 1]["reasons"][0]["feature"] == "avancement"
    assert by_id[len(rows) - 1]["score"] > by_id[0]["score"]


def test_not_enough_samples():
    out = detect([1, 2], ["a"], [[1], [2]])
    assert out["ready"] is False
    assert str(MIN_SAMPLES) in out["reason"]


def test_missing_values_are_accepted():
    rows = _normal_rows(12)
    rows[3][1] = None
    out = detect(list(range(12)), ["a", "b"], rows)
    assert out["ready"] is True


def test_is_deterministic():
    rows = _normal_rows() + [[500, 10]]
    ids = list(range(len(rows)))
    assert detect(ids, ["a", "b"], rows)["results"] == detect(ids, ["a", "b"], rows)["results"]
