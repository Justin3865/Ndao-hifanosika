"""Analyse S&E d'un projet : avancement, risque, prévision, anomalies, recommandations.

Fonctions pures (aucun accès réseau/base) : le backend envoie les données du projet
(POST /v1/monitoring/analyze) ou le service les lit en base (GET /v1/live/monitoring/{id}).

Méthode — transparente, pas de « boîte noire » :
  - avancement prévu  = part du temps écoulé de chaque activité (moyenne) ;
  - avancement réel   = moyenne (activités, jalons, indicateurs) ;
  - risque            = somme plafonnée de facteurs explicites, chacun avec son poids ;
  - prévision         = régression linéaire sur l'historique d'avancement (snapshots),
                        à défaut vitesse moyenne depuis le début du projet.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

DAY = 86_400.0


# ---------------------------------------------------------------- utilitaires
def _ts(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def _num(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if np.isfinite(n) else None


def _clamp(n: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, n))


def _avg(values: list[float | None]) -> float | None:
    items = [v for v in values if v is not None]
    return sum(items) / len(items) if items else None


def _iso(ts: float | None) -> str | None:
    return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat() if ts is not None else None


def _round(v: float | None, digits: int = 1) -> float | None:
    return None if v is None else round(v, digits)


# ---------------------------------------------------------------- avancement
def time_elapsed_pct(start: Any, end: Any, now: float) -> float | None:
    s, e = _ts(start), _ts(end)
    if s is None or e is None or e <= s:
        return None
    return _clamp((now - s) / (e - s) * 100)


def activity_actual(a: dict[str, Any]) -> float | None:
    status = a.get("status")
    if status == "CANCELLED":
        return None
    if status == "COMPLETED":
        return 100.0
    progress = _num(a.get("progress"))
    if progress is not None and (progress > 0 or status == "PLANNED"):
        return _clamp(progress)
    return 50.0 if status == "IN_PROGRESS" else 0.0


def milestone_actual(m: dict[str, Any]) -> float:
    return 100.0 if m.get("completedAt") else _clamp(_num(m.get("progress")) or 0.0)


def indicator_progress(i: dict[str, Any]) -> float | None:
    target, current = _num(i.get("target")), _num(i.get("currentValue"))
    if target is None or current is None:
        return None
    base = _num(i.get("baseline")) or 0.0
    span = target - base
    if span == 0:
        return 100.0 if current >= target else 0.0
    return _clamp((current - base) / span * 100)


def compute_progress(data: dict[str, Any], now: float) -> dict[str, Any]:
    project = data.get("project") or {}
    activities = [a for a in data.get("activities") or [] if a.get("status") != "CANCELLED"]
    milestones = data.get("milestones") or []
    results = [r for o in data.get("objectives") or [] for r in o.get("results") or []]

    acts = _avg([activity_actual(a) for a in activities])
    mss = _avg([milestone_actual(m) for m in milestones])
    inds = _avg(
        [
            _avg([indicator_progress(i) for i in r.get("indicators") or []])
            if r.get("indicators")
            else None
            for r in results
        ]
    )

    actual = _avg([acts, mss, inds])
    if actual is None and project.get("status") == "COMPLETED":
        actual = 100.0

    elapsed = time_elapsed_pct(project.get("startDate"), project.get("endDate"), now)
    planned = _avg([time_elapsed_pct(a.get("startDate"), a.get("endDate"), now) for a in activities])
    if planned is None:
        planned = elapsed

    gap = actual - planned if actual is not None and planned is not None else None

    budget, spent = _num(project.get("budget")), _num(project.get("budgetSpent"))
    if spent is None:
        parts = [_num(a.get("budgetSpent")) for a in activities]
        parts = [p for p in parts if p is not None]
        spent = sum(parts) if parts else None
    execution = spent / budget * 100 if budget and budget > 0 and spent is not None else None

    return {
        "planned": _round(planned),
        "actual": _round(actual),
        "gap": _round(gap),
        "elapsed": _round(elapsed),
        "components": {"activities": _round(acts), "milestones": _round(mss), "indicators": _round(inds)},
        "budgetExecution": _round(execution),
    }


# ---------------------------------------------------------------- prévision
def forecast(data: dict[str, Any], progress: dict[str, Any], now: float) -> dict[str, Any] | None:
    project = data.get("project") or {}
    actual = progress["actual"]
    start, end = _ts(project.get("startDate")), _ts(project.get("endDate"))
    if actual is None or start is None or end is None or end <= start:
        return None

    if actual >= 100:
        return {"method": "completed", "projectedFinalProgress": 100.0, "projectedCompletionDate": _iso(now), "delayDays": 0, "confidence": "high"}

    points = [
        ((_ts(s.get("recordedAt")) or 0) - start, _num(s.get("actualProgress")))
        for s in data.get("snapshots") or []
        if _ts(s.get("recordedAt")) and _num(s.get("actualProgress")) is not None
    ]
    points.append((now - start, actual))
    xs = np.array([p[0] / DAY for p in points], dtype=float)
    ys = np.array([p[1] for p in points], dtype=float)

    method, confidence = "average-velocity", "low"
    velocity = None  # points d'avancement par jour

    if len(points) >= 4 and (xs.max() - xs.min()) >= 7:
        slope, _intercept = np.polyfit(xs, ys, 1)
        pred = np.polyval([slope, _intercept], xs)
        ss_res, ss_tot = float(np.sum((ys - pred) ** 2)), float(np.sum((ys - ys.mean()) ** 2))
        r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
        if slope > 0:
            velocity, method = float(slope), "linear-regression"
            confidence = "high" if r2 >= 0.85 and len(points) >= 8 else "medium"

    if velocity is None:
        elapsed_days = max((now - start) / DAY, 1.0)
        velocity = actual / elapsed_days if actual > 0 else 0.0

    if velocity <= 0:
        return {"method": method, "projectedFinalProgress": _round(actual), "projectedCompletionDate": None, "delayDays": None, "confidence": "low",
                "note": "Aucun progrès mesurable : la date d'achèvement ne peut pas être estimée."}

    days_to_finish = (100 - actual) / velocity
    completion = now + days_to_finish * DAY
    remaining_to_end = max((end - now) / DAY, 0.0)
    final_at_end = _clamp(actual + velocity * remaining_to_end)

    return {
        "method": method,
        "projectedFinalProgress": _round(final_at_end),
        "projectedCompletionDate": _iso(completion),
        "delayDays": int(round((completion - end) / DAY)),
        "confidence": confidence,
    }


# ---------------------------------------------------------------- anomalies
def detect_anomalies(data: dict[str, Any], progress: dict[str, Any], now: float) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    project = data.get("project") or {}
    live = project.get("status") == "ACTIVE"

    def add(code: str, level: str, category: str, message: str) -> None:
        out.append({"code": code, "level": level, "category": category, "message": message})

    s, e = _ts(project.get("startDate")), _ts(project.get("endDate"))
    if s and e and e < s:
        add("DATES_INCOHERENTES", "critical", "Données", "La date de fin précède la date de début du projet.")
    if live and e and e < now and (progress["actual"] or 0) < 100:
        add("PROJET_ECHU", "critical", "Projet", "La date de fin est dépassée alors que le projet n'est pas terminé.")

    budget = _num(project.get("budget"))
    if budget is not None and budget < 0:
        add("BUDGET_NEGATIF", "critical", "Données", "Le budget prévu est négatif.")
    ex = progress["budgetExecution"]
    if ex is not None:
        if ex > 100:
            add("BUDGET_DEPASSE", "critical", "Budget", f"Budget dépassé : {ex:.0f} % du budget prévu consommé.")
        elif progress["actual"] is not None and ex - progress["actual"] > 15:
            add("BUDGET_VS_AVANCEMENT", "warning", "Budget",
                f"{ex:.0f} % du budget consommé pour {progress['actual']:.0f} % d'avancement.")

    for a in data.get("activities") or []:
        end_a, status = _ts(a.get("endDate")), a.get("status")
        title = a.get("title", "?")
        if status in ("PLANNED", "IN_PROGRESS") and end_a and end_a < now:
            add("ACTIVITE_EN_RETARD", "warning", "Activité", f"Activité « {title} » en retard.")
        if status == "COMPLETED" and (_num(a.get("progress")) or 100) < 100:
            add("ACTIVITE_INCOHERENTE", "warning", "Données", f"Activité « {title} » terminée mais avancement < 100 %.")
        if status == "PLANNED" and (_num(a.get("progress")) or 0) > 0:
            add("ACTIVITE_INCOHERENTE", "warning", "Données", f"Activité « {title} » planifiée mais avancement > 0 %.")
        upd = _ts(a.get("updatedAt"))
        if status == "IN_PROGRESS" and upd and (now - upd) / DAY > 30:
            add("ACTIVITE_SANS_MAJ", "info", "Activité", f"Activité « {title} » sans mise à jour depuis plus de 30 jours.")
        b, bs = _num(a.get("budget")), _num(a.get("budgetSpent"))
        if b is not None and bs is not None and bs > b:
            add("ACTIVITE_BUDGET", "warning", "Budget", f"Activité « {title} » : dépenses supérieures au budget.")

    for m in data.get("milestones") or []:
        due = _ts(m.get("dueDate"))
        if due and due < now and milestone_actual(m) < 100:
            add("JALON_EN_RETARD", "warning", "Jalon", f"Jalon « {m.get('title', '?')} » dépassé et non terminé.")

    for o in data.get("objectives") or []:
        for r in o.get("results") or []:
            for i in r.get("indicators") or []:
                name = i.get("name", "?")
                t, c = _num(i.get("target")), _num(i.get("currentValue"))
                base = _num(i.get("baseline")) or 0.0
                if t is not None and c is not None and t != base and c > max(t, base) * 1.5 and max(t, base) > 0:
                    add("INDICATEUR_ABERRANT", "warning", "Données", f"Indicateur « {name} » : valeur ({c:g}) très supérieure à la cible ({t:g}).")
                if t is None:
                    add("INDICATEUR_SANS_CIBLE", "info", "Données", f"Indicateur « {name} » sans cible définie.")
                last = _ts(i.get("lastCollectedAt"))
                if live and (last is None or (now - last) / DAY > 90):
                    add("INDICATEUR_NON_COLLECTE", "info", "Données", f"Indicateur « {name} » non collecté depuis plus de 90 jours.")

    seen: dict[str, int] = {}
    incomplete = 0
    for b in data.get("beneficiaries") or []:
        key = f"{b.get('firstName', '')}|{b.get('lastName', '')}|{b.get('phone', '') or ''}".lower().strip()
        seen[key] = seen.get(key, 0) + 1
        if not b.get("gender") or b.get("age") is None:
            incomplete += 1
    dups = sum(1 for n in seen.values() if n > 1)
    if dups:
        add("BENEFICIAIRE_DOUBLON", "warning", "Bénéficiaire", f"{dups} doublon(s) potentiel(s) parmi les bénéficiaires.")
    if incomplete:
        add("BENEFICIAIRE_INCOMPLET", "info", "Bénéficiaire", f"{incomplete} bénéficiaire(s) avec données incomplètes.")

    for ev in data.get("evaluations") or []:
        sc = _num(ev.get("score"))
        if sc is not None and not 0 <= sc <= 100:
            add("SCORE_HORS_INTERVALLE", "critical", "Données", "Une évaluation a un score hors de l'intervalle 0-100.")
            break

    order = {"critical": 0, "warning": 1, "info": 2}
    return sorted(out, key=lambda a: order[a["level"]])


# ---------------------------------------------------------------- risque
def risk_score(data: dict[str, Any], progress: dict[str, Any], fc: dict[str, Any] | None, anomalies: list[dict[str, str]]) -> dict[str, Any]:
    factors: list[dict[str, Any]] = []

    def add(label: str, points: float) -> None:
        if points > 0:
            factors.append({"factor": label, "points": round(points, 1)})

    gap = progress["gap"]
    if gap is not None and gap < 0:
        add(f"Écart prévu/réel de {gap:.0f} points", min(abs(gap) * 1.5, 40))

    ex, actual = progress["budgetExecution"], progress["actual"]
    if ex is not None and actual is not None and ex - actual > 0:
        add("Budget consommé plus vite que l'avancement", min((ex - actual) * 0.8, 25))

    late_acts = sum(1 for a in anomalies if a["code"] == "ACTIVITE_EN_RETARD")
    add(f"{late_acts} activité(s) en retard", min(late_acts * 6, 20))

    late_ms = sum(1 for a in anomalies if a["code"] == "JALON_EN_RETARD")
    add(f"{late_ms} jalon(s) dépassé(s)", min(late_ms * 5, 15))

    if fc and fc.get("delayDays") and fc["delayDays"] > 0:
        add(f"Achèvement prévu avec {fc['delayDays']} jour(s) de retard", min(fc["delayDays"] / 3, 20))

    target = _num((data.get("project") or {}).get("beneficiaryTarget"))
    reached = len(data.get("beneficiaries") or [])
    elapsed = progress["elapsed"]
    if target and elapsed is not None:
        pct = reached / target * 100
        if pct < elapsed - 20:
            add("Cible de bénéficiaires en retard sur le calendrier", min((elapsed - pct) * 0.3, 10))

    crit = sum(1 for a in anomalies if a["level"] == "critical")
    add(f"{crit} anomalie(s) critique(s)", min(crit * 5, 15))

    score = int(_clamp(round(sum(f["points"] for f in factors))))
    return {
        "score": score,
        "level": "ELEVE" if score >= 55 else "MOYEN" if score >= 25 else "FAIBLE",
        "factors": sorted(factors, key=lambda f: -f["points"]),
    }


# ---------------------------------------------------------------- textes
def recommendations(progress: dict[str, Any], risk: dict[str, Any], anomalies: list[dict[str, str]], data: dict[str, Any]) -> list[str]:
    codes = {a["code"] for a in anomalies}
    out: list[str] = []
    if progress["gap"] is not None and progress["gap"] <= -10:
        out.append("Réviser le calendrier et prioriser les activités critiques pour résorber l'écart.")
    if codes & {"BUDGET_DEPASSE", "BUDGET_VS_AVANCEMENT", "ACTIVITE_BUDGET"}:
        out.append("Contrôler les dépenses et justifier l'écart budgétaire avec la direction financière.")
    if "ACTIVITE_EN_RETARD" in codes:
        out.append("Replanifier ou débloquer les activités en retard.")
    if "JALON_EN_RETARD" in codes:
        out.append("Faire le point sur les jalons dépassés et fixer de nouvelles échéances.")
    if "INDICATEUR_NON_COLLECTE" in codes:
        out.append("Relancer la collecte des indicateurs non mis à jour.")
    if "BENEFICIAIRE_DOUBLON" in codes:
        out.append("Dédoublonner la liste des bénéficiaires pour fiabiliser les chiffres.")
    if not any(r.get("indicators") for o in data.get("objectives") or [] for r in o.get("results") or []):
        out.append("Définir des résultats et indicateurs (baseline + cible) pour mesurer les effets réels du projet.")
    if not out and risk["level"] == "FAIBLE":
        out.append("Maintenir le rythme actuel et poursuivre la collecte régulière des données.")
    return out


LEVEL_FR = {"FAIBLE": "faible", "MOYEN": "moyen", "ELEVE": "élevé"}


def summary_text(progress: dict[str, Any], risk: dict[str, Any], fc: dict[str, Any] | None) -> str:
    if progress["actual"] is None:
        return "Données insuffisantes pour évaluer l'avancement de ce projet."
    parts = [f"Avancement réel de {progress['actual']:.0f} %"]
    if progress["planned"] is not None:
        parts.append(f"pour {progress['planned']:.0f} % prévu")
    text = " ".join(parts) + f" ; risque de retard {LEVEL_FR[risk['level']]} ({risk['score']}/100)."
    if fc and fc.get("delayDays") is not None:
        d = fc["delayDays"]
        text += f" Achèvement estimé le {fc['projectedCompletionDate']}" + (f", soit {d} jour(s) de retard." if d > 0 else ", dans les délais.")
    return text


# ---------------------------------------------------------------- point d'entrée
def analyze_project(data: dict[str, Any], now: float | None = None) -> dict[str, Any]:
    moment = now if now is not None else (_ts(data.get("now")) or datetime.now(timezone.utc).timestamp())
    progress = compute_progress(data, moment)
    fc = forecast(data, progress, moment)
    anomalies = detect_anomalies(data, progress, moment)
    risk = risk_score(data, progress, fc, anomalies)
    return {
        "progress": progress,
        "forecast": fc,
        "risk": risk,
        "anomalies": anomalies,
        "recommendations": recommendations(progress, risk, anomalies, data),
        "summary": summary_text(progress, risk, fc),
        "generatedAt": datetime.fromtimestamp(moment, tz=timezone.utc).isoformat(),
    }
