// src/services/anomalyCatalogExtra.ts  (AJOUT) — types d'anomalies complémentaires.
// Ajoutés au catalogue existant par anomalyCatalog.ts ; détectés par extraAnomalies.service.ts.
export interface ExtraAnomalyType {
  code: string;
  scope: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  description: string;
  rule: string;
  notifiedTo: string;
}

export const EXTRA_ANOMALY_TYPES: ExtraAnomalyType[] = [
  {
    "code": "PRESENCE_NON_WORKING_DAY",
    "scope": "Stage",
    "severity": "MEDIUM",
    "label": "Présence un jour non ouvrable",
    "description": "Une présence est enregistrée un samedi, dimanche, jour férié ou jour de fermeture : aucune présence ne devrait exister ce jour-là.",
    "rule": "Présence (pointage GPS) dont le jour est un week-end, un jour férié malgache ou un jour de fermeture (NON_WORKING_DAYS_EXTRA). À vérifier avant qu'elle n'entre dans la note.",
    "notifiedTo": "Stagiaire + tuteur (+ RH si cas confirmés)"
  },
  {
    "code": "INTERN_NOTE_REVIEW_NEEDED",
    "scope": "Stage",
    "severity": "HIGH",
    "label": "Note à vérifier avant publication",
    "description": "Plusieurs anomalies de présence non vérifiées s'accumulent et risquent de faire baisser la note.",
    "rule": "Au moins 3 cas d'anomalie de présence sans décision (ni justifié, ni confirmé) sur un même stage.",
    "notifiedTo": "Stagiaire + tuteur + RH"
  },
  {
    "code": "INTERN_GPS_REPEATED_SUSPECT",
    "scope": "Stage",
    "severity": "MEDIUM",
    "label": "Positions GPS répétées hors zone",
    "description": "Plusieurs pointages hors zone ou avec altitude incohérente : possible usurpation de position.",
    "rule": "≥ 3 présences avec OUT_OF_ZONE ou ALTITUDE_MISMATCH sur un même stage.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_GPS_IDENTICAL",
    "scope": "Stage",
    "severity": "MEDIUM",
    "label": "Coordonnées GPS identiques",
    "description": "Mêmes latitude, longitude et précision à ≥ 5 arrivées : valeur copiée ou simulée.",
    "rule": "≥ 5 arrivées avec exactement les mêmes coordonnées (6 décimales) et la même précision.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_PRESENCE_SHORT_REPEATED",
    "scope": "Stage",
    "severity": "LOW",
    "label": "Présences très courtes répétées",
    "description": "Arrivée puis départ presque immédiat, à plusieurs reprises.",
    "rule": "≥ 3 journées avec le drapeau VERY_SHORT_PRESENCE.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_NO_CHECKOUT_REPEATED",
    "scope": "Stage",
    "severity": "LOW",
    "label": "Départs non pointés",
    "description": "Plusieurs journées passées sans pointage de départ.",
    "rule": "≥ 3 journées antérieures à aujourd'hui sans heure de départ.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_PRESENCE_OUTSIDE_STAGE",
    "scope": "Stage",
    "severity": "MEDIUM",
    "label": "Présences hors période de stage",
    "description": "Pointages avant le début ou après la fin du stage.",
    "rule": "Au moins une présence dont le jour est hors [début, fin] du stage.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_NO_ACTIVITY_REPORT",
    "scope": "Stage",
    "severity": "LOW",
    "label": "Journées sans compte rendu",
    "description": "Journées terminées sans tâche ni résumé.",
    "rule": "≥ 5 journées terminées avec 0 tâche et résumé vide.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_DATES_INVALID",
    "scope": "Stage",
    "severity": "HIGH",
    "label": "Dates de stage incohérentes",
    "description": "La date de fin précède la date de début.",
    "rule": "Date de fin < date de début.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_TASK_INCONSISTENT",
    "scope": "Stage",
    "severity": "LOW",
    "label": "Tâches incohérentes",
    "description": "Tâches terminées sans rapport ni preuve, ou statut contradictoire avec la progression.",
    "rule": "≥ 2 tâches : terminée avec progression < 100 %, 100 % non terminée, ou terminée sans rapport ni preuve.",
    "notifiedTo": "Stagiaire + tuteur"
  },
  {
    "code": "INTERN_BEHAVIOR_OUTLIER",
    "scope": "Stage",
    "severity": "LOW",
    "label": "Comportement atypique du stagiaire",
    "description": "Le profil de présence (jours, durée, tâches, pointages suspects, heure d'arrivée) s'écarte fortement des autres stagiaires.",
    "rule": "Isolation Forest (service IA) sur 5 variables des 45 derniers jours, ≥ 8 stagiaires comparables ; repli : écart robuste (MAD) ≥ 3,5.",
    "notifiedTo": "Tuteur + RH"
  },
  {
    "code": "BENEFICIARY_AGE_MISMATCH",
    "scope": "Bénéficiaire",
    "severity": "LOW",
    "label": "Âge incohérent",
    "description": "L'âge saisi ne correspond pas à la date de naissance.",
    "rule": "|âge saisi − âge calculé| > 1 an.",
    "notifiedTo": "Équipe du projet"
  },
  {
    "code": "BENEFICIARY_HOUSEHOLD_INCONSISTENT",
    "scope": "Bénéficiaire",
    "severity": "LOW",
    "label": "Composition du ménage incohérente",
    "description": "Plus d'enfants que de membres du ménage, ou taille nulle.",
    "rule": "Taille ≤ 0, ou enfants < 5 ans / non scolarisés > taille du ménage.",
    "notifiedTo": "Équipe du projet"
  },
  {
    "code": "BENEFICIARY_GPS_INVALID",
    "scope": "Bénéficiaire",
    "severity": "MEDIUM",
    "label": "Position hors de Madagascar",
    "description": "Coordonnées en dehors du territoire (latitude / longitude inversées ou mal saisies).",
    "rule": "Latitude hors [-26 ; -11,5] ou longitude hors [42,5 ; 50,7].",
    "notifiedTo": "Équipe du projet"
  },
  {
    "code": "BENEFICIARY_CIN_DUPLICATE",
    "scope": "Bénéficiaire",
    "severity": "HIGH",
    "label": "CIN en double",
    "description": "Le même numéro de CIN est enregistré pour plusieurs bénéficiaires.",
    "rule": "Même CIN (sans espaces) pour ≥ 2 bénéficiaires.",
    "notifiedTo": "Administrateurs + Direction"
  },
  {
    "code": "BENEFICIARY_PHONE_SHARED",
    "scope": "Bénéficiaire",
    "severity": "LOW",
    "label": "Téléphone partagé",
    "description": "Le même numéro est utilisé par plusieurs bénéficiaires.",
    "rule": "Même numéro (≥ 9 chiffres) pour ≥ 3 bénéficiaires.",
    "notifiedTo": "Équipe du projet"
  },
  {
    "code": "BENEFICIARY_MINOR_NO_CONSENT",
    "scope": "Bénéficiaire",
    "severity": "MEDIUM",
    "label": "Mineur sans consentement",
    "description": "Aucun consentement valide du tuteur légal pour un mineur.",
    "rule": "Âge < 18 ans sans consentement, ou consentement retiré.",
    "notifiedTo": "Coordinateurs + Direction"
  },
  {
    "code": "BENEFICIARY_PRESENT_AFTER_DROPOUT",
    "scope": "Bénéficiaire",
    "severity": "MEDIUM",
    "label": "Présent après abandon déclaré",
    "description": "Une présence est enregistrée après la date d'abandon du parcours.",
    "rule": "Parcours « abandon » et présence enregistrée > 1 jour après la date d'abandon.",
    "notifiedTo": "Coordinateurs"
  },
  {
    "code": "BENEFICIARY_SILENT_DROPOUT",
    "scope": "Bénéficiaire",
    "severity": "MEDIUM",
    "label": "Abandon probable non déclaré",
    "description": "Plus aucune présence depuis longtemps alors que le parcours est actif.",
    "rule": "≥ 3 présences passées, aucune depuis plus de 60 jours, parcours actif.",
    "notifiedTo": "Coordinateurs"
  },
  {
    "code": "ATTENDANCE_NON_WORKING_DAY",
    "scope": "Activité",
    "severity": "MEDIUM",
    "label": "Présences un jour non ouvrable",
    "description": "Des bénéficiaires sont pointés présents un samedi, dimanche, jour férié ou jour de fermeture.",
    "rule": "Séance d'un jour (ou pointage saisi) un jour non ouvrable avec ≥ 1 présent.",
    "notifiedTo": "Créateur de l'activité"
  },
  {
    "code": "PROJECT_DATES_INVALID",
    "scope": "Projet",
    "severity": "HIGH",
    "label": "Dates de projet incohérentes",
    "description": "La date de fin précède la date de début.",
    "rule": "Date de fin < date de début.",
    "notifiedTo": "Responsable du projet"
  },
  {
    "code": "PROJECT_COMPLETED_INCOMPLETE",
    "scope": "Projet",
    "severity": "MEDIUM",
    "label": "Projet clôturé mais inachevé",
    "description": "Le projet est terminé alors que des activités ou jalons ne le sont pas.",
    "rule": "Statut terminé avec ≥ 1 activité (hors annulées) ou jalon non terminé.",
    "notifiedTo": "Responsable du projet"
  },
  {
    "code": "PROJECT_ACTIVE_NO_BENEFICIARIES",
    "scope": "Projet",
    "severity": "MEDIUM",
    "label": "Projet actif sans bénéficiaire",
    "description": "Cible définie mais aucun bénéficiaire inscrit depuis plus de 30 jours.",
    "rule": "Projet actif, cible > 0, 0 bénéficiaire, démarré depuis > 30 jours.",
    "notifiedTo": "Responsable du projet"
  },
  {
    "code": "ACTIVITY_SPENT_OVER_BUDGET",
    "scope": "Activité",
    "severity": "MEDIUM",
    "label": "Dépenses supérieures au budget",
    "description": "Le montant dépensé dépasse le budget de l'activité.",
    "rule": "Dépensé > budget de l'activité.",
    "notifiedTo": "Responsable du projet"
  },
  {
    "code": "ACTIVITY_OUT_OF_PROJECT_WINDOW",
    "scope": "Activité",
    "severity": "LOW",
    "label": "Activité hors période du projet",
    "description": "Les dates de l'activité dépassent la période du projet.",
    "rule": "Début avant le début du projet, ou fin / début après la fin du projet.",
    "notifiedTo": "Responsable du projet"
  }
];
