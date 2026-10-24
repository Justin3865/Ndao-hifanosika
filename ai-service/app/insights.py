"""Analyses de pilotage — Ndao Hifanosika.

Détection d'anomalies, performance des projets, risque d'abandon et synthèse.
Bibliothèque standard uniquement (statistics) : pas de dépendance lourde.
Chaque anomalie porte de quoi la ROUTER : projectId (-> département) et ownerIds
(les personnes directement concernées). Le backend s'en sert pour notifier
automatiquement le bon responsable et le bon département.
"""
from __future__ import annotations

import statistics
from datetime import datetime, timezone
from typing import Any, Iterable

DAY = 86400.0
SEVERITY_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}

# --------------------------------------------------------------------------- #
# Catalogue des anomalies possibles
# --------------------------------------------------------------------------- #

CATALOG: list[dict[str, str]] = [
    # Projets
    {"code": "PROJECT_OVERDUE", "scope": "Projet", "severity": "HIGH", "label": "Projet dépassé",
     "description": "La date de fin est passée mais le projet est toujours actif."},
    {"code": "PROJECT_NOT_STARTED", "scope": "Projet", "severity": "MEDIUM", "label": "Projet non lancé",
     "description": "La date de début est passée de plus de 7 jours mais le projet est encore en brouillon."},
    {"code": "BUDGET_EXCEEDED", "scope": "Projet", "severity": "HIGH", "label": "Budget dépassé",
     "description": "Le total des budgets d'activités dépasse le budget du projet."},
    {"code": "BUDGET_NEAR_LIMIT", "scope": "Projet", "severity": "MEDIUM", "label": "Budget presque épuisé",
     "description": "Plus de 90 % du budget du projet est déjà engagé dans des activités."},
    {"code": "TARGET_GAP", "scope": "Projet", "severity": "MEDIUM", "label": "Objectif bénéficiaires en retard",
     "description": "Moins de 30 % de la cible atteinte alors que plus de la moitié du temps est écoulée."},
    {"code": "PROJECT_NO_ACTIVITY", "scope": "Projet", "severity": "MEDIUM", "label": "Projet sans activité",
     "description": "Projet actif depuis plus de 30 jours sans aucune activité enregistrée."},
    {"code": "PROJECT_NO_EVALUATION", "scope": "Projet", "severity": "LOW", "label": "Projet jamais évalué",
     "description": "Plus de la moitié du temps est écoulée sans aucune évaluation."},
    {"code": "PROJECT_BUDGET_MISSING", "scope": "Projet", "severity": "LOW", "label": "Budget manquant",
     "description": "Projet actif sans budget renseigné."},
    {"code": "PROJECT_CRITICAL", "scope": "Projet", "severity": "HIGH", "label": "Performance critique",
     "description": "Le score de performance global du projet est inférieur à 50/100."},
    # Jalons
    {"code": "OVERDUE_MILESTONE", "scope": "Jalon", "severity": "MEDIUM", "label": "Jalon en retard",
     "description": "Échéance dépassée et jalon non terminé (critique au-delà de 30 jours)."},
    {"code": "MILESTONE_AT_RISK", "scope": "Jalon", "severity": "MEDIUM", "label": "Jalon menacé",
     "description": "Échéance dans 7 jours ou moins avec une progression inférieure à 50 %."},
    {"code": "MILESTONE_INCONSISTENT", "scope": "Jalon", "severity": "LOW", "label": "Jalon incohérent",
     "description": "Jalon clôturé avec une progression inférieure à 100 %, ou à 100 % mais non clôturé."},
    # Activités
    {"code": "ACTIVITY_OVERDUE", "scope": "Activité", "severity": "MEDIUM", "label": "Activité en retard",
     "description": "Date de fin dépassée alors que l'activité n'est ni terminée ni annulée."},
    {"code": "ACTIVITY_NOT_STARTED", "scope": "Activité", "severity": "LOW", "label": "Activité non démarrée",
     "description": "Date de début dépassée de plus de 3 jours mais l'activité est toujours « planifiée »."},
    {"code": "ACTIVITY_BUDGET_OUTLIER", "scope": "Activité", "severity": "LOW", "label": "Budget d'activité atypique",
     "description": "Budget très supérieur aux autres activités (valeur extrême, méthode des quartiles)."},
    # Évaluations
    {"code": "LOW_SCORE", "scope": "Évaluation", "severity": "MEDIUM", "label": "Score très faible",
     "description": "Score d'évaluation inférieur à 40/100."},
    {"code": "SCORE_OUTLIER", "scope": "Évaluation", "severity": "LOW", "label": "Score atypique",
     "description": "Score éloigné de plus de 1,8 écart-type de la moyenne des évaluations."},
    {"code": "EVALUATION_STALE", "scope": "Évaluation", "severity": "LOW", "label": "Évaluation en brouillon",
     "description": "Évaluation restée en brouillon depuis plus de 14 jours."},
    # Bénéficiaires
    {"code": "BENEFICIARY_DUPLICATE", "scope": "Bénéficiaire", "severity": "MEDIUM", "label": "Doublon probable",
     "description": "Même nom ou même numéro de téléphone enregistré plusieurs fois dans un projet."},
    {"code": "BENEFICIARY_INVALID_DATA", "scope": "Bénéficiaire", "severity": "LOW", "label": "Donnée invalide",
     "description": "Âge impossible (négatif ou supérieur à 110 ans)."},
    {"code": "BENEFICIARY_LOST_CONTACT", "scope": "Bénéficiaire", "severity": "MEDIUM", "label": "Contact perdu",
     "description": "Suivi GPS activé mais aucune position depuis plus de 7 jours (critique au-delà de 30)."},
    {"code": "DROPOUT_HIGH", "scope": "Bénéficiaire", "severity": "HIGH", "label": "Risque d'abandon élevé",
     "description": "Score de risque d'abandon supérieur ou égal à 60/100."},
    {"code": "HOUSEHOLD_VULNERABLE", "scope": "Bénéficiaire", "severity": "HIGH", "label": "Ménage vulnérable",
     "description": "Le modèle de vulnérabilité note le ménage à 75/100 ou plus."},
    # Stages
    {"code": "INTERNSHIP_OVERDUE", "scope": "Stage", "severity": "MEDIUM", "label": "Stage à clôturer",
     "description": "Date de fin dépassée mais le stage est toujours « en cours »."},
    {"code": "INTERNSHIP_NOT_STARTED", "scope": "Stage", "severity": "LOW", "label": "Stage non démarré",
     "description": "Date de début dépassée mais le stage est toujours « en attente »."},
    {"code": "INTERNSHIP_NO_SUPERVISOR", "scope": "Stage", "severity": "MEDIUM", "label": "Stage sans tuteur",
     "description": "Stage en attente ou en cours sans tuteur assigné."},
    # Utilisateurs
    {"code": "PENDING_USER", "scope": "Utilisateur", "severity": "LOW", "label": "Inscription en attente",
     "description": "Demande d'inscription non traitée depuis 7 jours ou plus (moyenne au-delà de 30)."},
]


# Règle précise qui fait de chaque cas une anomalie (affichée dans l'application)
RULES: dict[str, str] = {
    "PROJECT_OVERDUE": "Statut = actif ET date de fin < aujourd'hui.",
    "PROJECT_NOT_STARTED": "Statut = brouillon ET date de début dépassée de plus de 7 jours.",
    "BUDGET_EXCEEDED": "Somme des budgets des activités (hors annulées) > budget du projet.",
    "BUDGET_NEAR_LIMIT": "Somme des budgets des activités ≥ 90 % du budget du projet, sans le dépasser.",
    "TARGET_GAP": "Projet actif avec une cible > 0, plus de 50 % du temps écoulé ET moins de 30 % de la cible atteinte.",
    "PROJECT_NO_ACTIVITY": "Projet actif, démarré depuis plus de 30 jours, sans aucune activité (hors annulées).",
    "PROJECT_NO_EVALUATION": "Projet actif, plus de 50 % du temps écoulé, aucune évaluation enregistrée.",
    "PROJECT_BUDGET_MISSING": "Projet actif dont le budget est vide ou égal à 0.",
    "PROJECT_CRITICAL": "Score de performance < 50/100 (35 % jalons, 25 % activités, 25 % évaluations, 15 % respect du calendrier).",
    "OVERDUE_MILESTONE": "Jalon non terminé ET échéance < aujourd'hui. Gravité : faible jusqu'à 7 jours de retard, moyenne de 8 à 30 jours, élevée au-delà.",
    "MILESTONE_AT_RISK": "Jalon non terminé, échéance dans 0 à 7 jours ET progression < 50 %.",
    "MILESTONE_INCONSISTENT": "Jalon clôturé avec une progression < 100 %, ou progression ≥ 100 % sans date de clôture.",
    "ACTIVITY_OVERDUE": "Statut planifiée ou en cours ET date de fin < aujourd'hui (moyenne si plus de 7 jours de retard).",
    "ACTIVITY_NOT_STARTED": "Statut planifiée alors que la date de début est dépassée de plus de 3 jours.",
    "ACTIVITY_BUDGET_OUTLIER": "Budget > Q3 + 3 × (Q3 − Q1) des budgets d'activités (au moins 8 activités budgétées).",
    "LOW_SCORE": "Score d'évaluation < 40/100.",
    "SCORE_OUTLIER": "Au moins 5 évaluations notées ET |score − moyenne| > 1,8 écart-type (z-score).",
    "EVALUATION_STALE": "Évaluation restée en brouillon plus de 14 jours après sa création.",
    "BENEFICIARY_DUPLICATE": "Même prénom + nom, ou même téléphone (8 chiffres ou plus), dans le même projet.",
    "BENEFICIARY_INVALID_DATA": "Âge enregistré < 0 ou > 110 ans.",
    "BENEFICIARY_LOST_CONTACT": "Suivi GPS activé ET dernière position reçue il y a plus de 7 jours (élevée au-delà de 30 jours).",
    "DROPOUT_HIGH": "Score de risque d'abandon ≥ 60/100 (projet suspendu, jalons en retard, évaluations faibles, vulnérabilité, âge < 14 ans).",
    "HOUSEHOLD_VULNERABLE": "Score du modèle de vulnérabilité ≥ 75/100 pour un ménage non encore classé vulnérable.",
    "INTERNSHIP_OVERDUE": "Statut en cours ET date de fin < aujourd'hui.",
    "INTERNSHIP_NOT_STARTED": "Statut en attente ET date de début < aujourd'hui.",
    "INTERNSHIP_NO_SUPERVISOR": "Statut en attente ou en cours ET aucun tuteur assigné.",
    "PENDING_USER": "Compte en attente de validation depuis 7 jours ou plus (moyenne dès 30 jours)."
}

for _item in CATALOG:
    _item["rule"] = RULES[_item["code"]]

SCOPE_OF: dict[str, str] = {item["code"]: item["scope"] for item in CATALOG}
LABEL_OF: dict[str, str] = {item["code"]: item["label"] for item in CATALOG}

# --------------------------------------------------------------------------- #
# Utilitaires
# --------------------------------------------------------------------------- #


def to_ts(value: Any) -> float | None:
    """Date (ISO, datetime, date, ou secondes epoch) -> secondes epoch UTC ; None si absente."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, datetime):
        parsed = value
    elif hasattr(value, "isoformat") and not isinstance(value, str):  # datetime.date
        parsed = datetime.fromisoformat(value.isoformat())
    else:
        try:
            parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def num(value: Any, default: float | None = None) -> float | None:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return min(high, max(low, value))


def rnd(value: float, digits: int = 1) -> float:
    return round(value, digits)


def mean(values: Iterable[float]) -> float | None:
    items = list(values)
    return sum(items) / len(items) if items else None


def days_between(later: float, earlier: float) -> int:
    return int((later - earlier) // DAY)


def money(value: float) -> str:
    return f"{value:,.0f}".replace(",", " ") + " Ar"


# --------------------------------------------------------------------------- #
# Performance par projet
# --------------------------------------------------------------------------- #


def compute_performance(data: dict[str, list[dict[str, Any]]], now: float) -> list[dict[str, Any]]:
    result = []

    for project in data["projects"]:
        pid = project.get("id")
        milestones = [m for m in data["milestones"] if m.get("projectId") == pid]
        evaluations = [e for e in data["evaluations"] if e.get("projectId") == pid and num(e.get("score")) is not None]
        activities = [a for a in data["activities"] if a.get("projectId") == pid and a.get("status") != "CANCELLED"]

        milestone_progress = mean(num(m.get("progress"), 0.0) for m in milestones)
        evaluation_average = mean(num(e.get("score")) for e in evaluations)
        activity_completion = (
            sum(1 for a in activities if a.get("status") == "COMPLETED") / len(activities) * 100 if activities else None
        )

        start, end = to_ts(project.get("startDate")), to_ts(project.get("endDate"))
        elapsed = clamp((now - start) / (end - start) * 100) if start and end and end > start else 0.0
        schedule_gap = rnd(milestone_progress - elapsed) if milestone_progress is not None else None

        parts = [
            (milestone_progress, 0.35),
            (activity_completion, 0.25),
            (evaluation_average, 0.25),
            (clamp(100 + min(0, schedule_gap)) if schedule_gap is not None else None, 0.15),
        ]
        available = [(v, w) for v, w in parts if v is not None]
        weight = sum(w for _, w in available)
        score = rnd(sum(v * w for v, w in available) / weight) if weight else None
        level = "UNKNOWN" if score is None else "GOOD" if score >= 75 else "WATCH" if score >= 50 else "CRITICAL"

        result.append({
            "projectId": pid,
            "name": project.get("name"),
            "code": project.get("code"),
            "status": project.get("status"),
            "score": score,
            "level": level,
            "factors": {
                "milestoneProgress": rnd(milestone_progress) if milestone_progress is not None else None,
                "activityCompletion": rnd(activity_completion) if activity_completion is not None else None,
                "evaluationAverage": rnd(evaluation_average) if evaluation_average is not None else None,
                "timeElapsed": rnd(elapsed),
                "scheduleGap": schedule_gap,
            },
        })

    return result


# --------------------------------------------------------------------------- #
# Anomalies
# --------------------------------------------------------------------------- #


def _anomaly(kind: str, severity: str, title: str, detail: str, link: str, entity_kind: str,
             entity_id: Any, project_id: Any = None, owners: Iterable[Any] = ()) -> dict[str, Any]:
    return {
        "key": f"{kind}:{entity_id}",
        "type": kind,
        "severity": severity,
        "title": title,
        "detail": detail,
        "link": link,
        "entityKind": entity_kind,
        "entityId": entity_id,
        "projectId": project_id,
        "ownerIds": sorted({int(o) for o in owners if isinstance(o, (int, float)) and o}),
    }


def compute_anomalies(data: dict[str, list[dict[str, Any]]], now: float) -> list[dict[str, Any]]:
    projects = {p.get("id"): p for p in data["projects"]}
    name_of = lambda pid: (projects.get(pid) or {}).get("name") or f"Projet #{pid}"
    creator_of = lambda pid: (projects.get(pid) or {}).get("createdById")
    out: list[dict[str, Any]] = []

    # ---- jalons ----
    for m in data["milestones"]:
        pid, due, done = m.get("projectId"), to_ts(m.get("dueDate")), m.get("completedAt")
        progress = num(m.get("progress"), 0.0) or 0.0
        owners = [creator_of(pid)]

        if not done and due and due < now:
            days = days_between(now, due)
            sev = "HIGH" if days > 30 else "MEDIUM" if days > 7 else "LOW"
            out.append(_anomaly("OVERDUE_MILESTONE", sev, f"Jalon en retard : {m.get('title')}",
                                f"{name_of(pid)} — échéance dépassée de {days} jour(s), progression {int(progress)}%.",
                                f"/milestones/{m.get('id')}", "milestone", m.get("id"), pid, owners))
        elif not done and due and now <= due <= now + 7 * DAY and progress < 50:
            out.append(_anomaly("MILESTONE_AT_RISK", "MEDIUM", f"Jalon menacé : {m.get('title')}",
                                f"{name_of(pid)} — échéance dans {max(0, days_between(due, now))} jour(s) avec seulement {int(progress)}% d'avancement.",
                                f"/milestones/{m.get('id')}", "milestone", m.get("id"), pid, owners))

        if (done and progress < 100) or (not done and progress >= 100):
            detail = ("Jalon clôturé mais la progression est de %d%%." % progress) if done else "Progression à 100 % mais le jalon n'est pas clôturé."
            out.append(_anomaly("MILESTONE_INCONSISTENT", "LOW", f"Jalon incohérent : {m.get('title')}",
                                f"{name_of(pid)} — {detail}", f"/milestones/{m.get('id')}", "milestone", m.get("id"), pid, owners))

    # ---- projets ----
    performance = {p["projectId"]: p for p in compute_performance(data, now)}

    for p in data["projects"]:
        pid, status = p.get("id"), p.get("status")
        start, end = to_ts(p.get("startDate")), to_ts(p.get("endDate"))
        link, owners = f"/projects/{pid}", [p.get("createdById")]
        elapsed = (now - start) / (end - start) if start and end and end > start else 0.0
        activities = [a for a in data["activities"] if a.get("projectId") == pid and a.get("status") != "CANCELLED"]
        budget = num(p.get("budget"), 0.0) or 0.0
        spent = sum(num(a.get("budget"), 0.0) or 0.0 for a in activities)

        if status == "ACTIVE" and end and end < now:
            out.append(_anomaly("PROJECT_OVERDUE", "HIGH", f"Projet dépassé : {p.get('name')}",
                                "La date de fin est passée mais le projet est toujours actif.", link, "project", pid, pid, owners))

        if status == "DRAFT" and start and start < now - 7 * DAY:
            out.append(_anomaly("PROJECT_NOT_STARTED", "MEDIUM", f"Projet non lancé : {p.get('name')}",
                                f"La date de début est dépassée de {days_between(now, start)} jours mais le projet est encore en brouillon.",
                                link, "project", pid, pid, owners))

        if budget > 0 and spent > budget:
            out.append(_anomaly("BUDGET_EXCEEDED", "HIGH", f"Budget dépassé : {p.get('name')}",
                                f"Les activités totalisent {money(spent)} pour un budget de {money(budget)}.", link, "project", pid, pid, owners))
        elif budget > 0 and spent >= 0.9 * budget:
            out.append(_anomaly("BUDGET_NEAR_LIMIT", "MEDIUM", f"Budget presque épuisé : {p.get('name')}",
                                f"{rnd(spent / budget * 100, 0):.0f}% du budget est déjà engagé ({money(spent)} sur {money(budget)}).",
                                link, "project", pid, pid, owners))

        target = num(p.get("beneficiaryTarget"), 0.0) or 0.0
        reached = sum(1 for b in data["beneficiaries"] if b.get("projectId") == pid)
        if status == "ACTIVE" and target > 0 and elapsed > 0.5 and reached / target < 0.3:
            out.append(_anomaly("TARGET_GAP", "MEDIUM", f"Objectif bénéficiaires en retard : {p.get('name')}",
                                f"{reached} bénéficiaire(s) enregistré(s) pour une cible de {int(target)}, alors que {round(elapsed * 100)}% du temps est écoulé.",
                                link, "project", pid, pid, owners))

        if status == "ACTIVE" and start and start < now - 30 * DAY and not activities:
            out.append(_anomaly("PROJECT_NO_ACTIVITY", "MEDIUM", f"Projet sans activité : {p.get('name')}",
                                f"Actif depuis {days_between(now, start)} jours sans aucune activité enregistrée.", link, "project", pid, pid, owners))

        if status == "ACTIVE" and elapsed > 0.5 and not any(e.get("projectId") == pid for e in data["evaluations"]):
            out.append(_anomaly("PROJECT_NO_EVALUATION", "LOW", f"Projet jamais évalué : {p.get('name')}",
                                f"{round(elapsed * 100)}% du temps est écoulé sans aucune évaluation.", link, "project", pid, pid, owners))

        if status == "ACTIVE" and budget <= 0:
            out.append(_anomaly("PROJECT_BUDGET_MISSING", "LOW", f"Budget manquant : {p.get('name')}",
                                "Ce projet actif n'a pas de budget renseigné.", link, "project", pid, pid, owners))

        perf = performance.get(pid)
        if status == "ACTIVE" and perf and perf["score"] is not None and perf["score"] < 50:
            out.append(_anomaly("PROJECT_CRITICAL", "HIGH", f"Performance critique : {p.get('name')}",
                                f"Score global de {perf['score']}/100 (jalons, activités, évaluations et respect du calendrier).",
                                link, "project", pid, pid, owners))

    # ---- activités ----
    budgets = [num(a.get("budget"), 0.0) or 0.0 for a in data["activities"] if a.get("status") != "CANCELLED"]
    budgets = [b for b in budgets if b > 0]
    upper_fence = None
    if len(budgets) >= 8:
        q1, _, q3 = statistics.quantiles(budgets, n=4, method="inclusive")
        if q3 > q1:
            upper_fence = q3 + 3 * (q3 - q1)

    for a in data["activities"]:
        pid, status = a.get("projectId"), a.get("status")
        owners = [a.get("createdById"), creator_of(pid)]
        a_start, a_end = to_ts(a.get("startDate")), to_ts(a.get("endDate"))
        link = f"/activities/{a.get('id')}"

        if status in ("PLANNED", "IN_PROGRESS") and a_end and a_end < now:
            days = days_between(now, a_end)
            out.append(_anomaly("ACTIVITY_OVERDUE", "MEDIUM" if days > 7 else "LOW", f"Activité en retard : {a.get('title')}",
                                f"{name_of(pid)} — date de fin dépassée de {days} jour(s).", link, "activity", a.get("id"), pid, owners))
        elif status == "PLANNED" and a_start and a_start < now - 3 * DAY:
            out.append(_anomaly("ACTIVITY_NOT_STARTED", "LOW", f"Activité non démarrée : {a.get('title')}",
                                f"{name_of(pid)} — début prévu il y a {days_between(now, a_start)} jours, toujours « planifiée ».",
                                link, "activity", a.get("id"), pid, owners))

        budget = num(a.get("budget"), 0.0) or 0.0
        if upper_fence and status != "CANCELLED" and budget > upper_fence:
            out.append(_anomaly("ACTIVITY_BUDGET_OUTLIER", "LOW", f"Budget d'activité atypique : {a.get('title')}",
                                f"{name_of(pid)} — {money(budget)}, très au-dessus des autres activités (seuil {money(upper_fence)}).",
                                link, "activity", a.get("id"), pid, owners))

    # ---- évaluations ----
    scored = [e for e in data["evaluations"] if num(e.get("score")) is not None]
    low_ids = set()

    for e in scored:
        score = num(e.get("score"))
        if score is not None and score < 40:
            low_ids.add(e.get("id"))
            out.append(_anomaly("LOW_SCORE", "MEDIUM", f"Score très faible : {e.get('title')}",
                                f"{name_of(e.get('projectId'))} — {score:g}/100.", f"/evaluations/{e.get('id')}",
                                "evaluation", e.get("id"), e.get("projectId"), [e.get("createdById"), creator_of(e.get("projectId"))]))

    if len(scored) >= 5:
        values = [num(e.get("score")) for e in scored]
        avg = statistics.fmean(values)
        sd = statistics.pstdev(values)
        if sd > 0:
            for e in scored:
                if e.get("id") in low_ids:
                    continue
                z = (num(e.get("score")) - avg) / sd
                if abs(z) > 1.8:
                    out.append(_anomaly("SCORE_OUTLIER", "LOW", f"Score atypique : {e.get('title')}",
                                        f"Score {num(e.get('score')):g}/100 contre une moyenne de {rnd(avg)} (écart {z:.2f} σ).",
                                        f"/evaluations/{e.get('id')}", "evaluation", e.get("id"), e.get("projectId"),
                                        [e.get("createdById"), creator_of(e.get("projectId"))]))

    for e in data["evaluations"]:
        created = to_ts(e.get("createdAt"))
        if e.get("status") == "DRAFT" and created and created < now - 14 * DAY:
            out.append(_anomaly("EVALUATION_STALE", "LOW", f"Évaluation en brouillon : {e.get('title')}",
                                f"Brouillon depuis {days_between(now, created)} jours.", f"/evaluations/{e.get('id')}",
                                "evaluation", e.get("id"), e.get("projectId"), [e.get("createdById")]))

    # ---- bénéficiaires ----
    groups: dict[tuple, list[dict[str, Any]]] = {}
    for b in data["beneficiaries"]:
        name_key = ("name", b.get("projectId"), str(b.get("firstName", "")).strip().lower(), str(b.get("lastName", "")).strip().lower())
        phone = "".join(ch for ch in str(b.get("phone") or "") if ch.isdigit())
        groups.setdefault(name_key, []).append(b)
        if len(phone) >= 8:
            groups.setdefault(("phone", b.get("projectId"), phone), []).append(b)

    seen_groups: set[tuple] = set()
    for members in groups.values():
        ids = tuple(sorted({m.get("id") for m in members}))
        if len(ids) < 2 or ids in seen_groups:
            continue
        seen_groups.add(ids)
        first = members[0]
        pid = first.get("projectId")
        out.append(_anomaly("BENEFICIARY_DUPLICATE", "MEDIUM", f"Doublon probable : {first.get('firstName')} {first.get('lastName')}",
                            f"{name_of(pid)} — {len(ids)} fiches semblables (n° {', '.join(str(i) for i in ids)}).",
                            f"/beneficiaries/{ids[0]}", "beneficiary", ids[0], pid, [creator_of(pid)]))

    for b in data["beneficiaries"]:
        pid, age = b.get("projectId"), num(b.get("age"))
        name = f"{b.get('firstName')} {b.get('lastName')}"
        link = f"/beneficiaries/{b.get('id')}"

        if age is not None and (age < 0 or age > 110):
            out.append(_anomaly("BENEFICIARY_INVALID_DATA", "LOW", f"Donnée invalide : {name}",
                                f"{name_of(pid)} — âge enregistré : {age:g} ans.", link, "beneficiary", b.get("id"), pid, [creator_of(pid)]))

        seen = to_ts(b.get("lastSeenAt"))
        if b.get("trackingEnabled") and seen and now - seen > 7 * DAY:
            days = days_between(now, seen)
            out.append(_anomaly("BENEFICIARY_LOST_CONTACT", "HIGH" if days > 30 else "MEDIUM", f"Contact perdu : {name}",
                                f"{name_of(pid)} — aucune position depuis {days} jours.", link, "beneficiary", b.get("id"), pid, [creator_of(pid)]))

    # ---- stages ----
    for i in data["internships"]:
        pid, status = i.get("projectId"), i.get("status")
        start, end = to_ts(i.get("startDate")), to_ts(i.get("endDate"))
        owners = [i.get("studentId"), i.get("supervisorId")]
        link = f"/internships/{i.get('id')}"

        if status == "IN_PROGRESS" and end and end < now:
            out.append(_anomaly("INTERNSHIP_OVERDUE", "MEDIUM", f"Stage à clôturer : {i.get('title')}",
                                "La date de fin est dépassée mais le stage est toujours « en cours ».", link, "internship", i.get("id"), pid, owners))
        if status == "PENDING" and start and start < now:
            out.append(_anomaly("INTERNSHIP_NOT_STARTED", "LOW", f"Stage non démarré : {i.get('title')}",
                                "La date de début est passée mais le stage est toujours « en attente ».", link, "internship", i.get("id"), pid, owners))
        if status in ("PENDING", "IN_PROGRESS") and not i.get("supervisorId"):
            out.append(_anomaly("INTERNSHIP_NO_SUPERVISOR", "MEDIUM", f"Stage sans tuteur : {i.get('title')}",
                                "Aucun tuteur n'est assigné à ce stage.", link, "internship", i.get("id"), pid, owners))

    # ---- utilisateurs en attente ----
    for u in data["pendingUsers"]:
        created = to_ts(u.get("createdAt"))
        if not created:
            continue
        days = days_between(now, created)
        if days >= 7:
            out.append(_anomaly("PENDING_USER", "MEDIUM" if days >= 30 else "LOW",
                                f"Inscription en attente : {u.get('firstName')} {u.get('lastName')}",
                                f"Demande non traitée depuis {days} jours.", f"/users/{u.get('id')}", "user", u.get("id"), None, []))

    out.sort(key=lambda a: SEVERITY_RANK[a["severity"]])
    return out


# --------------------------------------------------------------------------- #
# Risque d'abandon
# --------------------------------------------------------------------------- #


def compute_dropout_risk(data: dict[str, list[dict[str, Any]]], now: float) -> list[dict[str, Any]]:
    projects = {p.get("id"): p for p in data["projects"]}
    performance = {p["projectId"]: p for p in compute_performance(data, now)}
    rows = []

    for b in data["beneficiaries"]:
        pid = b.get("projectId")
        project, perf = projects.get(pid), performance.get(pid)
        milestones = [m for m in data["milestones"] if m.get("projectId") == pid]
        overdue = sum(1 for m in milestones if not m.get("completedAt") and (to_ts(m.get("dueDate")) or now + 1) < now)
        ratio = overdue / len(milestones) if milestones else 0.0

        factors, risk = [], 0.0
        status = (project or {}).get("status")
        if status == "SUSPENDED":
            risk += 30; factors.append("Projet suspendu")
        elif status == "DRAFT":
            risk += 10; factors.append("Projet pas encore lancé")

        if ratio > 0:
            risk += round(ratio * 25); factors.append(f"{overdue} jalon(s) en retard")

        eval_avg = perf["factors"]["evaluationAverage"] if perf else None
        if eval_avg is not None and eval_avg < 60:
            risk += 20; factors.append(f"Évaluations faibles ({eval_avg}/100)")
        elif eval_avg is not None and eval_avg < 70:
            risk += 10; factors.append(f"Évaluations moyennes ({eval_avg}/100)")

        if b.get("vulnerable"):
            risk += 15; factors.append("Personne vulnérable")

        age = num(b.get("age"))
        if age is not None and age < 14:
            risk += 5; factors.append("Très jeune (< 14 ans)")

        score = int(clamp(risk))
        rows.append({
            "beneficiaryId": b.get("id"),
            "projectId": pid,
            "name": f"{b.get('firstName')} {b.get('lastName')}",
            "age": b.get("age"),
            "projectName": (project or {}).get("name") or f"Projet #{pid}",
            "riskScore": score,
            "riskLevel": "HIGH" if score >= 60 else "MEDIUM" if score >= 30 else "LOW",
            "factors": factors,
        })

    rows.sort(key=lambda r: r["riskScore"], reverse=True)
    return rows


# --------------------------------------------------------------------------- #
# Synthèse
# --------------------------------------------------------------------------- #


def compute_summary(data, anomalies, performance, dropout, now: float) -> dict[str, Any]:
    ranked = [p for p in performance if p["score"] is not None]
    best = max(ranked, key=lambda p: p["score"], default=None)
    worst = min(ranked, key=lambda p: p["score"], default=None)

    active = sum(1 for p in data["projects"] if p.get("status") == "ACTIVE")
    high = sum(1 for a in anomalies if a["severity"] == "HIGH")
    high_risk = sum(1 for r in dropout if r["riskLevel"] == "HIGH")
    scores = [num(e.get("score")) for e in data["evaluations"] if num(e.get("score")) is not None]
    avg_eval = mean(scores)

    highlights = [f"{len(data['projects'])} projets dont {active} actifs, {len(data['beneficiaries'])} bénéficiaires suivis."]
    if avg_eval is not None:
        highlights.append(f"Score moyen des évaluations : {rnd(avg_eval)}/100 ({len(scores)} évaluations).")
    if best:
        highlights.append(f"Meilleure performance : « {best['name']} » ({best['score']}/100).")
    if worst and worst is not best:
        highlights.append(f"Projet le plus fragile : « {worst['name']} » ({worst['score']}/100).")

    recommendations = []
    if high:
        recommendations.append(f"Traiter en priorité les {high} anomalie(s) critique(s) (budget, retards majeurs).")
    if any(a["type"] == "OVERDUE_MILESTONE" for a in anomalies):
        recommendations.append("Réajuster le calendrier ou les ressources des jalons en retard.")
    if high_risk:
        recommendations.append(f"Organiser un suivi renforcé pour les {high_risk} bénéficiaire(s) à risque d'abandon élevé.")
    if worst and worst["score"] < 50:
        recommendations.append(f"Mener une revue de projet pour « {worst['name']} » (performance critique).")
    if not recommendations:
        recommendations.append("Aucune action urgente : poursuivre le suivi régulier.")

    return {
        "headline": f"{high} point(s) critique(s) nécessitent votre attention." if high else "La situation globale est maîtrisée.",
        "highlights": highlights,
        "recommendations": recommendations,
        "counters": {
            "projects": len(data["projects"]),
            "activeProjects": active,
            "anomalies": len(anomalies),
            "criticalAnomalies": high,
            "highRiskBeneficiaries": high_risk,
        },
        "generatedAt": datetime.fromtimestamp(now, timezone.utc).isoformat(),
        "method": "Règles et statistiques (service Python) calculées sur les données réelles.",
    }


# --------------------------------------------------------------------------- #
# Point d'entrée
# --------------------------------------------------------------------------- #

LISTS = ("projects", "milestones", "evaluations", "activities", "beneficiaries", "internships", "pendingUsers")


def analyze(payload: dict[str, Any], now: float | None = None) -> dict[str, Any]:
    data = {name: list(payload.get(name) or []) for name in LISTS}
    moment = now if now is not None else datetime.now(timezone.utc).timestamp()

    performance = compute_performance(data, moment)
    anomalies = compute_anomalies(data, moment)
    dropout = compute_dropout_risk(data, moment)

    # Risque d'abandon élevé = anomalie routée vers le responsable du projet et son département
    creators = {p.get("id"): p.get("createdById") for p in data["projects"]}
    for row in dropout:
        if row["riskLevel"] == "HIGH":
            anomalies.append(_anomaly(
                "DROPOUT_HIGH", "HIGH", f"Risque d'abandon élevé : {row['name']}",
                f"{row['projectName']} — score {row['riskScore']}/100 ({'; '.join(row['factors']) or 'facteurs multiples'}).",
                "/ai/dropout-risk", "beneficiary", row["beneficiaryId"], row["projectId"], [creators.get(row["projectId"])]))
    anomalies.sort(key=lambda a: SEVERITY_RANK[a["severity"]])

    return {
        "anomalies": anomalies,
        "performance": performance,
        "dropoutRisk": dropout,
        "summary": compute_summary(data, anomalies, performance, dropout, moment),
        "engine": "python",
    }
