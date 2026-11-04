"""Synthèse narrative d'un rapport (cahier des charges §5.7 : « génération assistée de synthèses »).

Deux niveaux, avec dégradation gracieuse :
  1. RÈGLES (toujours disponible, déterministe, sans dépendance) : rédige un texte en français
     à partir des indicateurs calculés (anomalies, performance, risque d'abandon).
  2. LLM (optionnel) : si LLM_API_KEY et LLM_MODEL sont définis, le texte à règles sert de base
     factuelle et le modèle ne fait que le reformuler (il n'a pas le droit d'ajouter de chiffres).
     Toute erreur réseau / format => retour automatique au texte à règles.
Le texte est une AIDE À LA DÉCISION : il est identifié comme tel (champ `disclaimer`).
"""
from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Callable

DISCLAIMER = "Synthèse générée automatiquement : aide à la décision, à valider par un responsable."


def _plural(n: int, one: str, many: str) -> str:
    return one if n == 1 else many


def build_rule_narrative(analysis: dict[str, Any], period: str | None = None) -> dict[str, Any]:
    summary = analysis.get("summary") or {}
    counters = summary.get("counters") or {}
    anomalies = analysis.get("anomalies") or []
    performance = [p for p in (analysis.get("performance") or []) if p.get("score") is not None]
    dropout = analysis.get("dropoutRisk") or []

    paragraphs: list[str] = []
    where = f" sur la période {period}" if period else ""

    projects = int(counters.get("projects", 0) or 0)
    active = int(counters.get("activeProjects", 0) or 0)
    paragraphs.append(
        f"Bilan{where} : {projects} {_plural(projects, 'projet', 'projets')} suivi(s), dont {active} actif(s). "
        + (summary.get("headline") or "")
    )

    if performance:
        ranked = sorted(performance, key=lambda p: p["score"], reverse=True)
        avg = sum(p["score"] for p in ranked) / len(ranked)
        text = f"La performance moyenne des projets évalués est de {avg:.0f}/100. "
        text += f"Le projet le plus performant est « {ranked[0]['name']} » ({ranked[0]['score']}/100)"
        if len(ranked) > 1:
            text += f", le plus fragile est « {ranked[-1]['name']} » ({ranked[-1]['score']}/100)"
        paragraphs.append(text + ".")

    critical = [a for a in anomalies if a.get("severity") == "HIGH"]
    if anomalies:
        text = f"{len(anomalies)} anomalie(s) détectée(s), dont {len(critical)} critique(s)."
        if critical:
            titles = "; ".join(a.get("title", "") for a in critical[:3])
            text += f" Principales : {titles}."
        paragraphs.append(text)
    else:
        paragraphs.append("Aucune anomalie détectée dans les données saisies.")

    high = [r for r in dropout if r.get("riskLevel") == "HIGH"]
    if dropout:
        text = f"Sur {len(dropout)} bénéficiaire(s) analysé(s), {len(high)} présentent un risque d'abandon élevé."
        if high:
            names = ", ".join(r.get("name", "?") for r in high[:3])
            text += f" À contacter en priorité : {names}."
        paragraphs.append(text)

    recos = summary.get("recommendations") or []
    if recos:
        paragraphs.append("Actions recommandées : " + " ".join(recos))

    return {
        "title": "Synthèse automatique" + (f" — {period}" if period else ""),
        "paragraphs": paragraphs,
        "text": "\n\n".join(paragraphs),
        "source": "rules",
        "disclaimer": DISCLAIMER,
    }


def llm_configured() -> bool:
    return bool(os.getenv("LLM_API_KEY", "").strip() and os.getenv("LLM_MODEL", "").strip())


def _call_anthropic(prompt: str) -> str:
    """Appel HTTP minimal (stdlib) à l'API Messages d'Anthropic."""
    body = json.dumps({
        "model": os.environ["LLM_MODEL"].strip(),
        "max_tokens": 900,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    request = urllib.request.Request(
        os.getenv("LLM_API_URL", "https://api.anthropic.com/v1/messages"),
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": os.environ["LLM_API_KEY"].strip(),
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 (URL contrôlée par l'administrateur)
        payload = json.loads(response.read().decode())
    return "".join(block.get("text", "") for block in payload.get("content", []) if block.get("type") == "text").strip()


def _prompt(base_text: str) -> str:
    return (
        "Tu rédiges la synthèse d'un rapport de suivi-évaluation pour la direction d'une ONG malgache. "
        "Reformule le texte ci-dessous en français clair et professionnel (150 mots maximum). "
        "RÈGLES STRICTES : n'ajoute aucun chiffre, nom ou fait absent du texte ; ne supprime aucune alerte critique ; "
        "garde un ton factuel.\n\n---\n" + base_text
    )


def _numbers(text: str) -> set[str]:
    import re
    return set(re.findall(r"\d+(?:[.,]\d+)?", text))


def generate_narrative(
    analysis: dict[str, Any],
    period: str | None = None,
    llm: Callable[[str], str] | None = None,
) -> dict[str, Any]:
    """Texte à règles ; reformulé par un LLM si configuré ET si le résultat ne contient aucun chiffre inventé."""
    base = build_rule_narrative(analysis, period)
    if llm is None:
        if not llm_configured():
            return base
        llm = _call_anthropic
    try:
        rewritten = llm(_prompt(base["text"])).strip()
    except Exception:  # réseau, quota, format… : on garde la version à règles
        return {**base, "llmError": True}
    if not rewritten or not _numbers(rewritten) <= _numbers(base["text"]):
        return {**base, "llmRejected": True}
    return {**base, "text": rewritten, "paragraphs": [p for p in rewritten.split("\n\n") if p.strip()], "source": "llm"}
