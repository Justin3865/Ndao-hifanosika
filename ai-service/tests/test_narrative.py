from app.narrative import build_rule_narrative, generate_narrative

ANALYSIS = {
    "summary": {
        "headline": "2 point(s) critique(s) nécessitent votre attention.",
        "counters": {"projects": 3, "activeProjects": 2},
        "recommendations": ["Traiter en priorité les 2 anomalie(s) critique(s)."],
    },
    "anomalies": [
        {"severity": "HIGH", "title": "Budget dépassé : Alpha"},
        {"severity": "HIGH", "title": "Jalon en retard : Beta"},
        {"severity": "LOW", "title": "Doublon possible"},
    ],
    "performance": [{"name": "Alpha", "score": 80}, {"name": "Beta", "score": 40}],
    "dropoutRisk": [{"name": "Rakoto", "riskLevel": "HIGH"}, {"name": "Rasoa", "riskLevel": "LOW"}],
}


def test_rules_narrative_is_factual_and_complete():
    out = build_rule_narrative(ANALYSIS, "T3 2026")
    assert out["source"] == "rules" and "T3 2026" in out["title"]
    assert "3 projets" in out["text"] and "2 actif" in out["text"]
    assert "« Alpha » (80/100)" in out["text"] and "« Beta » (40/100)" in out["text"]
    assert "3 anomalie(s) détectée(s), dont 2 critique(s)" in out["text"]
    assert "Rakoto" in out["text"] and "Rasoa" not in out["text"]
    assert out["disclaimer"]


def test_empty_analysis_does_not_crash():
    out = build_rule_narrative({})
    assert "Aucune anomalie" in out["text"]


def test_no_llm_configured_uses_rules(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    assert generate_narrative(ANALYSIS)["source"] == "rules"


def test_llm_rewrite_accepted_when_no_new_numbers():
    out = generate_narrative(ANALYSIS, llm=lambda _p: "Trois projets suivis. Alpha 80, Beta 40. 2 alertes critiques.")
    assert out["source"] == "llm"


def test_llm_rejected_when_it_invents_a_number():
    out = generate_narrative(ANALYSIS, llm=lambda _p: "Il y a 99 projets en retard.")
    assert out["source"] == "rules" and out.get("llmRejected")


def test_llm_failure_falls_back_to_rules():
    def boom(_p):
        raise TimeoutError("réseau")
    out = generate_narrative(ANALYSIS, llm=boom)
    assert out["source"] == "rules" and out.get("llmError")
