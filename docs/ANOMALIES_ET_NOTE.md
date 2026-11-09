# Anomalies de présence, vérification avant la note, chatbot

## Règle métier
Un jour **non ouvrable** (samedi, dimanche, jour férié malgache, jour de fermeture de l'ONG) ne devrait comporter **aucune présence**.
Une seule présence ce jour-là est signalée (`PRESENCE_NON_WORKING_DAY`). Elle peut être légitime (mission autorisée) : elle est donc
**vérifiée avant d'entrer dans la note**, jamais sanctionnée automatiquement.

## Chaîne complète
1. **Détection** : `extraAnomalies.service.ts` (règles pures : `utils/extraAnomalyRules.ts`) est branchée dans `runAnalysis`
   → les anomalies apparaissent dans « Détection d'anomalies », les alertes (in-app, e-mail pour les critiques) et le chatbot.
2. **Porte avant la note** : `/api/note-anomalies/*` (page « Anomalies & note »). Le tuteur du stage, la RH, la Direction ou l'administrateur
   **justifie** (aucun impact, justification obligatoire), **confirme** ou met **en vérification** chaque cas.
3. **Accumulation** : ≥ 3 cas sans décision sur un stage → anomalie critique `INTERN_NOTE_REVIEW_NEEDED` (stagiaire, tuteur, RH notifiés).
4. **Recommandation de note** : chaque cas confirmé propose de retirer 0,25 pt sur 20 (plafond 2 pt, `NOTE_ANOMALY_PENALTY_*`).
   La note existante (ordre de mérite) **n'est pas modifiée** : la proposition est affichée et décidée par la RH.
5. Les décisions sont conservées dans `AnomalyAction` (clé `NOTEVERIF:…`), sans migration ; l'audit enregistre chaque décision.

## Anomalies ajoutées (25 types, au catalogue existant)
- **Stagiaire** : présence un jour non ouvrable ; GPS répété hors zone ; GPS identique ; présences très courtes ; départs non pointés ;
  présences hors période de stage ; journées sans compte rendu ; dates de stage incohérentes ; tâches incohérentes ;
  comportement atypique (Isolation Forest du service IA `/v1/anomalies`, repli statistique MAD) ; note à vérifier.
- **Bénéficiaire** : âge ≠ date de naissance ; ménage incohérent ; position hors Madagascar ; CIN en double ; téléphone partagé ;
  mineur sans consentement ; présent après abandon ; abandon probable non déclaré.
- **Activité / projet** : séance pointée un jour non ouvrable ; dépenses > budget ; activité hors période du projet ;
  dates de projet incohérentes ; projet clôturé inachevé ; projet actif sans bénéficiaire.

## Chatbot (Analyses IA › Assistant)
Questions comprises (FR + malgache) : « Quelles présences un jour non ouvrable ? », « Quels stagiaires ont des anomalies à vérifier avant la note ? »,
« Anomalies des bénéficiaires / des projets », « Jours fériés de cette année ? », « Quels sont les types d'anomalies ? ».
Réservé aux rôles autorisés par la route du chatbot (ADMIN, DIRECTION, COORDINATOR) ; la réponse détaillée est refusée aux autres.

## À valider par la Direction
Liste des jours fériés (`utils/extraAnomalyRules.ts › malagasyHolidays`, + `NON_WORKING_DAYS_EXTRA`), barème de pénalité, seuils des règles.
