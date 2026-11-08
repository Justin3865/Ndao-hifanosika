"""Scores individuels (cahier des charges §5.7 et §9.2) — module AJOUTÉ, sans dépendance FastAPI.

  * score_dropout(...)     : risque d'abandon d'UN bénéficiaire. Port fidèle de `scoreWithRules` (backend
                             src/services/dropoutScoring.ts, « rules-v1 ») : mêmes seuils, mêmes points.
  * score_performance(...) : score 0-100 d'un membre/stagiaire à partir de son historique d'évaluations,
                             avec tendance, points forts (critères les plus hauts) et axes d'amélioration (les plus bas).

Toute sortie est une AIDE À LA DÉCISION, jamais une décision automatique (§9.3).
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

DISCLAIMER = "Aide à la décision : ce score ne remplace pas le jugement de l'équipe."


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return min(hi, max(lo, v))


def _num(v: Any, default: float | None = None) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    return default if (math.isnan(f) or math.isinf(f)) else f


def _round_half_up(x: float) -> int:
    """Comme Math.round de JavaScript (0.5 -> 1), à l'inverse du round() de Python (arrondi au pair)."""
    return int(math.floor(x + 0.5))


def level_from_score(score: float) -> str:
    return "HIGH" if score >= 60 else "MEDIUM" if score >= 30 else "LOW"


# --------------------------------------------------------------------------- risque d'abandon
def score_dropout(age: Any = None, attendance_rate: Any = 100, evaluation_average: Any = 100,
                  activities_completed: Any = 0, missed_activities: Any = 0) -> dict[str, Any]:
    factors: list[str] = []
    risk = 0

    attendance = _clamp(_num(attendance_rate, 100.0))
    if attendance < 50:
        risk += 40; factors.append(f"Présence très faible ({_round_half_up(attendance)} %)")
    elif attendance < 70:
        risk += 25; factors.append(f"Présence insuffisante ({_round_half_up(attendance)} %)")
    elif attendance < 85:
        risk += 10; factors.append(f"Présence moyenne ({_round_half_up(attendance)} %)")

    average = _clamp(_num(evaluation_average, 100.0))
    if average < 50:
        risk += 30; factors.append(f"Résultats d'évaluation faibles ({_round_half_up(average)}/100)")
    elif average < 60:
        risk += 20; factors.append(f"Résultats d'évaluation insuffisants ({_round_half_up(average)}/100)")
    elif average < 70:
        risk += 10; factors.append(f"Résultats d'évaluation moyens ({_round_half_up(average)}/100)")

    missed = max(0.0, _num(missed_activities, 0.0))
    done = max(0.0, _num(activities_completed, 0.0))
    if missed > 0:
        total = missed + done
        ratio = missed / total if total > 0 else 1.0
        risk += _round_half_up(ratio * 20)
        factors.append(f"{int(missed)} activité(s) manquée(s)")

    a = _num(age)
    if a is not None:
        if a < 14:
            risk += 5; factors.append("Très jeune (< 14 ans)")
        elif a >= 18:
            risk += 5; factors.append("Âge supérieur à 18 ans (risque d'abandon plus élevé)")

    score = _round_half_up(_clamp(risk))
    return {
        "riskScore": score,
        "riskLevel": level_from_score(score),
        "probability": round(score / 100, 3),
        "model": "rules-v1",
        "source": "rules",
        "factors": factors,
        "disclaimer": DISCLAIMER,
    }


# --------------------------------------------------------------------------- performance membre / stagiaire
MIN_FOR_TREND = 2


def _parse_date(v: Any) -> float:
    """Date ISO (avec ou sans heure/fuseau) ou timestamp -> secondes UTC ; 0 si illisible."""
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            d = datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return 0.0
        return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).timestamp()
    return 0.0


def _pct(item: dict[str, Any]) -> float | None:
    """Note ramenée sur 100 : score / maxScore (maxScore par défaut 20, comme EvaluationScore)."""
    score = _num(item.get("score"))
    if score is None:
        return None
    mx = _num(item.get("maxScore"), 20.0)
    if not mx or mx <= 0:
        return None
    return _clamp(score / mx * 100.0)


def _trend(points: list[float]) -> str:
    """UP / DOWN / STABLE : moyenne de la 2e moitié moins moyenne de la 1re (seuil ±5 points)."""
    if len(points) < MIN_FOR_TREND:
        return "STABLE"
    half = len(points) // 2
    first, second = points[:half] or points[:1], points[half:]
    delta = sum(second) / len(second) - sum(first) / len(first)
    return "UP" if delta >= 5 else "DOWN" if delta <= -5 else "STABLE"


def score_performance(evaluations: list[dict[str, Any]]) -> dict[str, Any]:
    """`evaluations` : [{score, maxScore?, evaluatedAt?, criteria?: [{name, score, maxScore?}]}].

    Score = moyenne pondérée vers le récent (la plus récente évaluation pèse deux fois la plus ancienne).
    Points forts / axes : moyenne par critère sur tout l'historique (3 meilleurs / 3 plus faibles, écart ≥ 1 point)."""
    dated = sorted(evaluations or [], key=lambda e: _parse_date(e.get("evaluatedAt")))
    series = [(e, _pct(e)) for e in dated]
    series = [(e, p) for e, p in series if p is not None]

    # moyenne par critère
    per: dict[str, list[float]] = {}
    for e in dated:
        for c in e.get("criteria") or []:
            name = str(c.get("name") or "").strip()
            pct = _pct(c)
            if name and pct is not None:
                per.setdefault(name, []).append(pct)
    crit = sorted(((n, sum(v) / len(v)) for n, v in per.items()), key=lambda t: t[1], reverse=True)

    if not series:
        return {"score": None, "level": None, "trend": "STABLE", "count": 0, "strengths": [], "improvements": [],
                "message": "Aucune évaluation chiffrée : score non calculable.", "disclaimer": DISCLAIMER}

    pcts = [p for _, p in series]
    n = len(pcts)
    weights = [1 + i / max(1, n - 1) for i in range(n)]  # 1 .. 2
    score = sum(p * w for p, w in zip(pcts, weights)) / sum(weights)

    strengths = [{"criterion": n_, "score": round(v, 1)} for n_, v in crit[:3] if v >= 60]
    improvements = [{"criterion": n_, "score": round(v, 1)} for n_, v in sorted(crit, key=lambda t: t[1])[:3]
                    if v < 60 and not any(s["criterion"] == n_ for s in strengths)]

    return {
        "score": _round_half_up(_clamp(score)),
        "level": "HIGH" if score >= 75 else "MEDIUM" if score >= 50 else "LOW",
        "trend": _trend(pcts),
        "count": n,
        "history": [round(p, 1) for p in pcts],
        "strengths": strengths,
        "improvements": improvements,
        "message": ("Un seul résultat : la tendance n'est pas significative." if n < MIN_FOR_TREND else None),
        "disclaimer": DISCLAIMER,
    }
