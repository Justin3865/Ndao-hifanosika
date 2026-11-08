"""Le script de démonstration doit tourner de bout en bout et ne jamais toucher aux fichiers de production."""
import os

import demo_dropout_train as demo


def test_demo_runs_end_to_end_and_stays_in_out_dir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    summary = demo.run(400, 42, tmp_path / "out")
    assert summary["verdict"] in ("retenu", "non concluant")
    assert (tmp_path / "out" / "rapport_demo.json").exists()
    assert not (tmp_path / "dropout_model.joblib").exists()
    assert not (tmp_path / "dropout_report.json").exists()
    if summary["verdict"] == "retenu":
        pred = summary["example_prediction"]
        assert 0.0 <= pred["probability"] <= 1.0
        assert (tmp_path / "out" / "modele_demo.joblib").exists()


def test_report_is_flagged_as_simulation(tmp_path):
    demo.run(300, 1, tmp_path)
    assert "SIMULATION" in (tmp_path / "rapport_demo.json").read_text(encoding="utf-8")
