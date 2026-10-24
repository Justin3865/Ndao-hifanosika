"""Agrégats pour les graphiques (courbes, diagrammes circulaires, histogrammes)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .insights import LABEL_OF, SCOPE_OF, SEVERITY_RANK, mean, num, rnd, to_ts

SEVERITY_LABELS = {"HIGH": "Critiques", "MEDIUM": "Moyennes", "LOW": "Faibles"}
LEVEL_LABELS = {"HIGH": "Élevé", "MEDIUM": "Moyen", "LOW": "Faible"}
STATUS_LABELS = {
    "DRAFT": "Brouillon", "ACTIVE": "Actif", "SUSPENDED": "Suspendu",
    "COMPLETED": "Terminé", "CANCELLED": "Annulé",
}


def histogram(values: list[float], width: int = 10, top: int = 100) -> list[dict[str, Any]]:
    """Classes de largeur `width` entre 0 et `top` (la valeur maximale entre dans la dernière classe)."""
    count = top // width
    bins = [0] * count

    for value in values:
        index = min(count - 1, max(0, int(value // width)))
        bins[index] += 1

    return [{"label": f"{i * width}-{(i + 1) * width}", "value": bins[i]} for i in range(count)]


def anomaly_trend(history: list[dict[str, Any]], now: float, current_open: int, days: int = 30) -> dict[str, Any]:
    """Courbe sur `days` jours : anomalies ouvertes, détectées et résolues chaque jour."""
    today = datetime.fromtimestamp(now, timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = [(to_ts(h.get("firstSeenAt")), to_ts(h.get("resolvedAt"))) for h in history]
    rows = [(a, b) for a, b in rows if a is not None]

    labels, opened, detected, resolved = [], [], [], []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        start, end = day.timestamp(), (day + timedelta(days=1)).timestamp()

        labels.append(day.strftime("%d/%m"))
        detected.append(sum(1 for a, _ in rows if start <= a < end))
        resolved.append(sum(1 for _, b in rows if b is not None and start <= b < end))
        opened.append(sum(1 for a, b in rows if a < end and (b is None or b >= end)))

    # Le dernier point reflète toujours l'état réel du moment
    opened[-1] = current_open

    return {
        "labels": labels,
        "series": [
            {"key": "open", "name": "Ouvertes", "values": opened},
            {"key": "detected", "name": "Détectées", "values": detected},
            {"key": "resolved", "name": "Résolues", "values": resolved},
        ],
        "hasHistory": bool(rows),
    }


def evaluation_trend(evaluations: list[dict[str, Any]], months: int = 12) -> list[dict[str, Any]]:
    buckets: dict[str, list[float]] = {}

    for e in evaluations:
        score = num(e.get("score"))
        moment = to_ts(e.get("evaluatedAt")) or to_ts(e.get("createdAt"))
        if score is None or moment is None:
            continue
        key = datetime.fromtimestamp(moment, timezone.utc).strftime("%Y-%m")
        buckets.setdefault(key, []).append(score)

    keys = sorted(buckets)[-months:]
    return [{"label": key, "value": rnd(mean(buckets[key]) or 0), "count": len(buckets[key])} for key in keys]


def build_dashboard(
    analysis: dict[str, Any],
    data: dict[str, list[dict[str, Any]]],
    history: list[dict[str, Any]],
    now: float,
) -> dict[str, Any]:
    anomalies = analysis["anomalies"]
    performance = analysis["performance"]
    dropout = analysis["dropoutRisk"]
    summary = analysis["summary"]

    by_severity = {k: 0 for k in SEVERITY_RANK}
    by_scope: dict[str, int] = {}
    by_type: dict[str, int] = {}

    for a in anomalies:
        by_severity[a["severity"]] += 1
        by_scope[SCOPE_OF.get(a["type"], "Autre")] = by_scope.get(SCOPE_OF.get(a["type"], "Autre"), 0) + 1
        by_type[a["type"]] = by_type.get(a["type"], 0) + 1

    scores = [p for p in performance if p["score"] is not None]
    avg_perf = mean(p["score"] for p in scores)
    eval_scores = [num(e.get("score")) for e in data["evaluations"] if num(e.get("score")) is not None]

    status_counts: dict[str, int] = {}
    for p in data["projects"]:
        status_counts[p.get("status") or "DRAFT"] = status_counts.get(p.get("status") or "DRAFT", 0) + 1

    dropout_levels = {k: 0 for k in ("HIGH", "MEDIUM", "LOW")}
    for r in dropout:
        dropout_levels[r["riskLevel"]] += 1

    return {
        "generatedAt": datetime.fromtimestamp(now, timezone.utc).isoformat(),
        "totals": {
            "projects": len(data["projects"]),
            "activeProjects": summary["counters"]["activeProjects"],
            "beneficiaries": len(data["beneficiaries"]),
            "anomalies": len(anomalies),
            "criticalAnomalies": by_severity["HIGH"],
            "highRiskBeneficiaries": dropout_levels["HIGH"],
            "avgPerformance": rnd(avg_perf) if avg_perf is not None else None,
            "avgEvaluation": rnd(mean(eval_scores)) if eval_scores else None,
        },
        "anomaliesBySeverity": [
            {"key": k, "label": SEVERITY_LABELS[k], "value": by_severity[k]} for k in ("HIGH", "MEDIUM", "LOW")
        ],
        "anomaliesByScope": [
            {"key": k, "label": k, "value": v} for k, v in sorted(by_scope.items(), key=lambda kv: -kv[1])
        ],
        "anomaliesByType": [
            {"key": k, "label": LABEL_OF.get(k, k), "value": v}
            for k, v in sorted(by_type.items(), key=lambda kv: -kv[1])[:12]
        ],
        "projectsByStatus": [
            {"key": k, "label": STATUS_LABELS.get(k, k), "value": v} for k, v in status_counts.items()
        ],
        "performanceHistogram": histogram([p["score"] for p in scores]),
        "performanceByProject": [
            {"key": str(p["projectId"]), "label": p.get("code") or p.get("name") or "", "value": p["score"], "level": p["level"]}
            for p in sorted(scores, key=lambda p: p["score"])[:20]
        ],
        "dropoutLevels": [
            {"key": k, "label": LEVEL_LABELS[k], "value": dropout_levels[k]} for k in ("HIGH", "MEDIUM", "LOW")
        ],
        "dropoutHistogram": histogram([r["riskScore"] for r in dropout]),
        "evaluationTrend": evaluation_trend(data["evaluations"]),
        "anomalyTrend": anomaly_trend(history, now, len(anomalies)),
    }
