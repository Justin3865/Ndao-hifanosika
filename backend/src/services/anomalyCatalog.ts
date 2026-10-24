/**
 * Catalogue des types d'anomalies (identique à celui du service Python : GET /v1/anomalies/catalog).
 * Sert à afficher libellés et règles même si le service Python est arrêté.
 */
export interface AnomalyType {
  code: string;
  scope: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  description: string;
  /** Règle précise qui fait de ce cas une anomalie. */
  rule: string;
  notifiedTo: string;
}

export const ANOMALY_CATALOG: AnomalyType[] = [
  {
    "code": "PROJECT_OVERDUE",
    "scope": "Projet",
    "severity": "HIGH",
    "label": "Projet dépassé",
    "description": "La date de fin est passée mais le projet est toujours actif.",
    "rule": "Statut = actif ET date de fin < aujourd'hui.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "PROJECT_NOT_STARTED",
    "scope": "Projet",
    "severity": "MEDIUM",
    "label": "Projet non lancé",
    "description": "La date de début est passée de plus de 7 jours mais le projet est encore en brouillon.",
    "rule": "Statut = brouillon ET date de début dépassée de plus de 7 jours.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "BUDGET_EXCEEDED",
    "scope": "Projet",
    "severity": "HIGH",
    "label": "Budget dépassé",
    "description": "Le total des budgets d'activités dépasse le budget du projet.",
    "rule": "Somme des budgets des activités (hors annulées) > budget du projet.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "BUDGET_NEAR_LIMIT",
    "scope": "Projet",
    "severity": "MEDIUM",
    "label": "Budget presque épuisé",
    "description": "Plus de 90 % du budget du projet est déjà engagé dans des activités.",
    "rule": "Somme des budgets des activités ≥ 90 % du budget du projet, sans le dépasser.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "TARGET_GAP",
    "scope": "Projet",
    "severity": "MEDIUM",
    "label": "Objectif bénéficiaires en retard",
    "description": "Moins de 30 % de la cible atteinte alors que plus de la moitié du temps est écoulée.",
    "rule": "Projet actif avec une cible > 0, plus de 50 % du temps écoulé ET moins de 30 % de la cible atteinte.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "PROJECT_NO_ACTIVITY",
    "scope": "Projet",
    "severity": "MEDIUM",
    "label": "Projet sans activité",
    "description": "Projet actif depuis plus de 30 jours sans aucune activité enregistrée.",
    "rule": "Projet actif, démarré depuis plus de 30 jours, sans aucune activité (hors annulées).",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "PROJECT_NO_EVALUATION",
    "scope": "Projet",
    "severity": "LOW",
    "label": "Projet jamais évalué",
    "description": "Plus de la moitié du temps est écoulée sans aucune évaluation.",
    "rule": "Projet actif, plus de 50 % du temps écoulé, aucune évaluation enregistrée.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "PROJECT_BUDGET_MISSING",
    "scope": "Projet",
    "severity": "LOW",
    "label": "Budget manquant",
    "description": "Projet actif sans budget renseigné.",
    "rule": "Projet actif dont le budget est vide ou égal à 0.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "PROJECT_CRITICAL",
    "scope": "Projet",
    "severity": "HIGH",
    "label": "Performance critique",
    "description": "Le score de performance global du projet est inférieur à 50/100.",
    "rule": "Score de performance < 50/100 (35 % jalons, 25 % activités, 25 % évaluations, 15 % respect du calendrier).",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "OVERDUE_MILESTONE",
    "scope": "Jalon",
    "severity": "MEDIUM",
    "label": "Jalon en retard",
    "description": "Échéance dépassée et jalon non terminé (critique au-delà de 30 jours).",
    "rule": "Jalon non terminé ET échéance < aujourd'hui. Gravité : faible jusqu'à 7 jours de retard, moyenne de 8 à 30 jours, élevée au-delà.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "MILESTONE_AT_RISK",
    "scope": "Jalon",
    "severity": "MEDIUM",
    "label": "Jalon menacé",
    "description": "Échéance dans 7 jours ou moins avec une progression inférieure à 50 %.",
    "rule": "Jalon non terminé, échéance dans 0 à 7 jours ET progression < 50 %.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "MILESTONE_INCONSISTENT",
    "scope": "Jalon",
    "severity": "LOW",
    "label": "Jalon incohérent",
    "description": "Jalon clôturé avec une progression inférieure à 100 %, ou à 100 % mais non clôturé.",
    "rule": "Jalon clôturé avec une progression < 100 %, ou progression ≥ 100 % sans date de clôture.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "ACTIVITY_OVERDUE",
    "scope": "Activité",
    "severity": "MEDIUM",
    "label": "Activité en retard",
    "description": "Date de fin dépassée alors que l'activité n'est ni terminée ni annulée.",
    "rule": "Statut planifiée ou en cours ET date de fin < aujourd'hui (moyenne si plus de 7 jours de retard).",
    "notifiedTo": "Créateur de l'activité + responsable du projet + département"
  },
  {
    "code": "ACTIVITY_NOT_STARTED",
    "scope": "Activité",
    "severity": "LOW",
    "label": "Activité non démarrée",
    "description": "Date de début dépassée de plus de 3 jours mais l'activité est toujours « planifiée ».",
    "rule": "Statut planifiée alors que la date de début est dépassée de plus de 3 jours.",
    "notifiedTo": "Créateur de l'activité + responsable du projet + département"
  },
  {
    "code": "ACTIVITY_BUDGET_OUTLIER",
    "scope": "Activité",
    "severity": "LOW",
    "label": "Budget d'activité atypique",
    "description": "Budget très supérieur aux autres activités (valeur extrême, méthode des quartiles).",
    "rule": "Budget > Q3 + 3 × (Q3 − Q1) des budgets d'activités (au moins 8 activités budgétées).",
    "notifiedTo": "Créateur de l'activité + responsable du projet + département"
  },
  {
    "code": "LOW_SCORE",
    "scope": "Évaluation",
    "severity": "MEDIUM",
    "label": "Score très faible",
    "description": "Score d'évaluation inférieur à 40/100.",
    "rule": "Score d'évaluation < 40/100.",
    "notifiedTo": "Auteur de l'évaluation + responsable du projet + département"
  },
  {
    "code": "SCORE_OUTLIER",
    "scope": "Évaluation",
    "severity": "LOW",
    "label": "Score atypique",
    "description": "Score éloigné de plus de 1,8 écart-type de la moyenne des évaluations.",
    "rule": "Au moins 5 évaluations notées ET |score − moyenne| > 1,8 écart-type (z-score).",
    "notifiedTo": "Auteur de l'évaluation + responsable du projet + département"
  },
  {
    "code": "EVALUATION_STALE",
    "scope": "Évaluation",
    "severity": "LOW",
    "label": "Évaluation en brouillon",
    "description": "Évaluation restée en brouillon depuis plus de 14 jours.",
    "rule": "Évaluation restée en brouillon plus de 14 jours après sa création.",
    "notifiedTo": "Auteur de l'évaluation + responsable du projet + département"
  },
  {
    "code": "BENEFICIARY_DUPLICATE",
    "scope": "Bénéficiaire",
    "severity": "MEDIUM",
    "label": "Doublon probable",
    "description": "Même nom ou même numéro de téléphone enregistré plusieurs fois dans un projet.",
    "rule": "Même prénom + nom, ou même téléphone (8 chiffres ou plus), dans le même projet.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "BENEFICIARY_INVALID_DATA",
    "scope": "Bénéficiaire",
    "severity": "LOW",
    "label": "Donnée invalide",
    "description": "Âge impossible (négatif ou supérieur à 110 ans).",
    "rule": "Âge enregistré < 0 ou > 110 ans.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "BENEFICIARY_LOST_CONTACT",
    "scope": "Bénéficiaire",
    "severity": "MEDIUM",
    "label": "Contact perdu",
    "description": "Suivi GPS activé mais aucune position depuis plus de 7 jours (critique au-delà de 30).",
    "rule": "Suivi GPS activé ET dernière position reçue il y a plus de 7 jours (élevée au-delà de 30 jours).",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "DROPOUT_HIGH",
    "scope": "Bénéficiaire",
    "severity": "HIGH",
    "label": "Risque d'abandon élevé",
    "description": "Score de risque d'abandon supérieur ou égal à 60/100.",
    "rule": "Score de risque d'abandon ≥ 60/100 (projet suspendu, jalons en retard, évaluations faibles, vulnérabilité, âge < 14 ans).",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "HOUSEHOLD_VULNERABLE",
    "scope": "Bénéficiaire",
    "severity": "HIGH",
    "label": "Ménage vulnérable",
    "description": "Le modèle de vulnérabilité note le ménage à 75/100 ou plus.",
    "rule": "Score du modèle de vulnérabilité ≥ 75/100 pour un ménage non encore classé vulnérable.",
    "notifiedTo": "Responsable du projet + membres de son département"
  },
  {
    "code": "INTERNSHIP_OVERDUE",
    "scope": "Stage",
    "severity": "MEDIUM",
    "label": "Stage à clôturer",
    "description": "Date de fin dépassée mais le stage est toujours « en cours ».",
    "rule": "Statut en cours ET date de fin < aujourd'hui.",
    "notifiedTo": "Stagiaire + tuteur + département du projet"
  },
  {
    "code": "INTERNSHIP_NOT_STARTED",
    "scope": "Stage",
    "severity": "LOW",
    "label": "Stage non démarré",
    "description": "Date de début dépassée mais le stage est toujours « en attente ».",
    "rule": "Statut en attente ET date de début < aujourd'hui.",
    "notifiedTo": "Stagiaire + tuteur + département du projet"
  },
  {
    "code": "INTERNSHIP_NO_SUPERVISOR",
    "scope": "Stage",
    "severity": "MEDIUM",
    "label": "Stage sans tuteur",
    "description": "Stage en attente ou en cours sans tuteur assigné.",
    "rule": "Statut en attente ou en cours ET aucun tuteur assigné.",
    "notifiedTo": "Stagiaire + tuteur + département du projet"
  },
  {
    "code": "PENDING_USER",
    "scope": "Utilisateur",
    "severity": "LOW",
    "label": "Inscription en attente",
    "description": "Demande d'inscription non traitée depuis 7 jours ou plus (moyenne au-delà de 30).",
    "rule": "Compte en attente de validation depuis 7 jours ou plus (moyenne dès 30 jours).",
    "notifiedTo": "Administrateurs et RH"
  }
];

export const ANOMALY_LABELS: Record<string, string> = Object.fromEntries(
  ANOMALY_CATALOG.map((type) => [type.code, type.label]),
);

export const ANOMALY_SCOPES: Record<string, string> = Object.fromEntries(
  ANOMALY_CATALOG.map((type) => [type.code, type.scope]),
);
