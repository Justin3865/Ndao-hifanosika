# Livrables finaux — document unique

> Regroupe en un seul document : spécifications, maquettes, charte graphique, guide par rôle, support de formation, plan de maintenance.
> Ajout : il ne remplace ni `GUIDE_UTILISATEUR.md`, `GUIDE_ADMINISTRATEUR.md`, `PLAN_DE_MAINTENANCE.md`, `PLAN_MAINTENANCE.md`, `PLAN_DE_TESTS_RECETTE.md` ni `CONFORMITE_CAHIER_DES_CHARGES.md`, il les référence. Le guide par rôle (§4) est **généré** depuis `srcf/src/lib/access.ts` : en cas de doute, ce fichier fait foi.
> Statut : brouillon technique à relire et valider par le porteur du projet avant remise.

## 1. Spécifications

**Objet.** Plateforme « Ndao Hifanosika – Suivi & Évaluation » : suivi des projets, activités, jalons, bénéficiaires, stagiaires (présence GPS, évaluations, ordre de mérite), reporting, et aide à la décision par IA.

**Composants.**

| Composant | Techno | Rôle |
|---|---|---|
| `srcb` | Express + Prisma + PostgreSQL | API, règles métier, rôles, audit, notifications |
| `srcf` | Next.js (app router), Tailwind v4 | Interface, contrôle d'accès miroir (`lib/access.ts`) |
| `ai` | FastAPI | Anomalies (règles + Isolation Forest), insights, synthèse |
| `ml` | FastAPI | Risque d'abandon (modèle vs baseline règles), zones de vulnérabilité |
| `ivelany` | Docker/Nginx, docs | Déploiement et documentation |

**Principes de conception (exigences non fonctionnelles retenues).**
1. L'IA aide à décider, elle ne décide jamais : toute anomalie passe par une décision humaine (`AnomalyAction`), aucune pénalité n'est appliquée automatiquement à la note.
2. Dégradation gracieuse : si `ai` ou `ml` est indisponible, le backend retombe sur le calcul local par règles.
3. Contrôle d'accès par rôle, double (backend `authorizeRoles` + frontend `access.ts`).
4. Traçabilité : `AuditLog` sur les actions sensibles.
5. Ajouts non destructifs : chaque lot s'ajoute sans modifier le comportement existant.

**Exigences fonctionnelles et leur état.** La table complète exigence par exigence, avec le pourcentage d'avancement, est dans `CONFORMITE_CAHIER_DES_CHARGES.md` et `CONFORMITE_LOT_20261110.md` (ne pas la dupliquer ici pour éviter deux sources divergentes).

**Cas d'usage clés ajoutés (lots IA 1 et 2).**
- *Anomalies complémentaires* (stagiaire / bénéficiaire / projet) : voir `ANOMALIES_ET_NOTE.md`.
- *Présence un jour non ouvrable* → cas à vérifier → décision du tuteur/RH (`JUSTIFIED | CONFIRMED | IN_REVIEW`) → recommandation de note **indicative** (porte avant publication de la note) → alerte d'accumulation à partir de 3 cas ouverts.
- *Entraînement du modèle d'abandon* depuis `/ai/models` (nécessite ≥ 30 parcours clos et ≥ 100 recommandations réelles ; sinon « non concluant »).
- *Chatbot* : répond aussi sur les anomalies (ADMIN, DIRECTION, COORDINATOR uniquement, comme `/ai/chat`).

**Indicateurs §13.** `GET /api/kpi` (ADMIN, DIRECTION, DSI), lecture seule : adoption sur 90 jours, alertes IA ayant reçu une décision, évaluations soumises/validées. Les cibles sont **vides** tant que la Direction ne les a pas fixées. Disponibilité, temps de production d'un rapport et satisfaction ne sont **pas** calculables depuis la base : l'API les liste avec la méthode de mesure à mettre en place.

## 2. Maquettes (schémas fonctionnels)

Maquettes à basse fidélité des écrans ajoutés. Elles décrivent la structure, pas le rendu final ; les écrans réels sont `srcf/src/app/note-anomalies/page.tsx` et `srcf/src/components/ai-charts/DropoutTrainCard.tsx`.

**Anomalies de présence → note** (`/note-anomalies`)
```
+--------------------------------------------------------------+
| Anomalies de présence à vérifier                [Calendrier] |
+--------------------------------------------------------------+
| Stagiaire        Stage            Cas ouverts   Reco. note   |
| Rakoto Jean      Dév. web         3  (!)        -1,0 (indic.)|
| Rabe Aina        Data             0             —            |
+--------------------------------------------------------------+
| > Détail d'un stage : date, motif (week-end / férié /        |
|   fermeture), pointage, [Justifié] [Confirmé] [À revoir]     |
|   + champ commentaire                                        |
+--------------------------------------------------------------+
```
**Entraînement du modèle d'abandon** (`/ai/models`)
```
+---------------------------------------------+
| Modèle d'abandon          État : non concluant|
| Parcours clos : 12/30   Recommandés : 40/100  |
| [ Entraîner le modèle ]                       |
| Résultat : baseline règles vs modèle (métriques)   |
+---------------------------------------------+
```
**Indicateurs §13** (API seule pour l'instant ; carte à ajouter au tableau de bord si la Direction le souhaite)
```
Adoption 90 j        62,5 %  (25/40)   cible : à fixer
Alertes IA traitées  41,2 %  (7/17)    cible : à fixer
Évaluations soumises 78,0 %            cible : à fixer
Non mesuré : disponibilité · temps de rapport · satisfaction
```

## 3. Charte graphique

Valeurs lues dans `srcf/src/app/globals.css` (source de vérité ; Tailwind n'a pas de thème personnalisé).

| Jeton | RGB | Usage |
|---|---|---|
| Primaire | 124, 58, 237 (violet) | Actions principales, liens, éléments actifs |
| Fond | 248, 250, 252 | Arrière-plan |
| Texte | 15, 23, 42 | Texte courant |
| Danger | 239, 68, 68 | Erreurs, anomalies HIGH, suppressions |
| Succès | 34, 197, 94 | Validé, justifié |
| Avertissement | 234, 179, 8 | À vérifier, anomalies MEDIUM |

Règles : un mode sombre existe (variante personnalisée) ; ne jamais coder une couleur en dur, utiliser les variables ; la gravité n'est jamais signalée par la couleur seule (ajouter un libellé) pour l'accessibilité ; textes en français, vocabulaire malgache conservé pour les noms propres du projet. Le logo et la police officiels ne figurent pas dans le dépôt : **à fournir par le porteur** pour compléter cette charte.

## 4. Guide par rôle

Généré depuis `access.ts` (« * » = tous les rôles connectés : dashboard, profil, paramètres, notifications, objectifs). Les droits de création/modification sont plus restreints que la lecture (ex. création d'utilisateur : ADMIN seul ; vérification d'une anomalie : ADMIN, DIRECTION, RH, tuteur).

### Administration & direction

- **ADMIN** (33 espaces) : `/activities`, `/administration`, `/ai`, `/beneficiaries`, `/consentements`, `/coordinateurs`, `/dashboard`, `/departements`, `/enrollment`, `/evaluation-finale`, `/evaluations`, `/exports`, `/follow-ups`, `/internships`, `/members`, `/merit`, `/milestones`, `/mission`, `/note-anomalies`, `/notifications`, `/objectifs`, `/parcours`, `/presences`, `/profile`, `/projects`, `/reports`, `/security`, `/settings`, `/stages`, `/suivi-evaluation`, `/tracking`, `/users`, `/zones`
- **DIRECTION** (27 espaces) : `/activities`, `/ai`, `/beneficiaries`, `/consentements`, `/coordinateurs`, `/dashboard`, `/enrollment`, `/evaluation-finale`, `/evaluations`, `/exports`, `/follow-ups`, `/members`, `/merit`, `/milestones`, `/mission`, `/note-anomalies`, `/notifications`, `/objectifs`, `/parcours`, `/presences`, `/profile`, `/projects`, `/reports`, `/settings`, `/suivi-evaluation`, `/tracking`, `/zones`
- **DSI** (11 espaces) : `/ai`, `/dashboard`, `/departements`, `/note-anomalies`, `/notifications`, `/objectifs`, `/profile`, `/security`, `/settings`, `/suivi-evaluation`, `/users`
- **DAF** (11 espaces) : `/beneficiaries`, `/dashboard`, `/evaluation-finale`, `/exports`, `/notifications`, `/objectifs`, `/profile`, `/projects`, `/reports`, `/settings`, `/suivi-evaluation`
- **RH** (16 espaces) : `/dashboard`, `/departements`, `/evaluation-finale`, `/exports`, `/internships`, `/members`, `/merit`, `/note-anomalies`, `/notifications`, `/objectifs`, `/profile`, `/reports`, `/settings`, `/stages`, `/suivi-evaluation`, `/users`
- **COMMUNICATION** (11 espaces) : `/activities`, `/dashboard`, `/evaluation-finale`, `/exports`, `/notifications`, `/objectifs`, `/profile`, `/projects`, `/reports`, `/settings`, `/suivi-evaluation`

### Pilotage terrain

- **COORDINATOR** (26 espaces) : `/activities`, `/ai`, `/beneficiaries`, `/consentements`, `/dashboard`, `/enrollment`, `/evaluation-finale`, `/evaluations`, `/exports`, `/follow-ups`, `/internships`, `/members`, `/merit`, `/milestones`, `/mission`, `/notifications`, `/objectifs`, `/parcours`, `/presences`, `/profile`, `/projects`, `/reports`, `/settings`, `/stages`, `/suivi-evaluation`, `/tracking`

### Encadrement

- **TUTEUR_L3** (14 espaces) : `/activities`, `/dashboard`, `/evaluation-finale`, `/evaluations`, `/internships`, `/merit`, `/milestones`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`, `/suivi-evaluation`
- **TUTEUR_M2** (14 espaces) : `/activities`, `/dashboard`, `/evaluation-finale`, `/evaluations`, `/internships`, `/merit`, `/milestones`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`, `/suivi-evaluation`

### Stagiaires

- **STAGIAIRE_L3** (11 espaces) : `/activities`, `/dashboard`, `/evaluations`, `/internships`, `/merit`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`
- **STAGIAIRE_M2** (11 espaces) : `/activities`, `/dashboard`, `/evaluations`, `/internships`, `/merit`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`
- **STAGIAIRE_L1** (11 espaces) : `/activities`, `/dashboard`, `/evaluations`, `/internships`, `/merit`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`
- **STAGIAIRE_L2** (11 espaces) : `/activities`, `/dashboard`, `/evaluations`, `/internships`, `/merit`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`
- **STAGIAIRE_M1** (11 espaces) : `/activities`, `/dashboard`, `/evaluations`, `/internships`, `/merit`, `/note-anomalies`, `/notifications`, `/objectifs`, `/presences`, `/profile`, `/settings`

Pour les procédures pas à pas : `GUIDE_UTILISATEUR.md` (+ `.mg.md`), `GUIDE_ADMINISTRATEUR.md` (+ `.mg.md`), `GUIDE_PARCOURS_COORDINATEURS.md` (+ `.mg.md`).

## 5. Support de formation

Format proposé : 3 séances courtes, à dérouler avec la plateforme de test et des **données fictives** (jamais des données réelles de bénéficiaires).

| Séance | Public | Durée | Contenu | Vérification de l'acquis |
|---|---|---|---|---|
| A — Découverte | Tous | 1 h | Connexion, profil, notifications, double authentification, tableau de bord | Chaque participant se connecte et active la 2FA |
| B — Encadrement | Tuteurs, RH, coordinateurs | 2 h | Pointage et anomalies de présence, décision JUSTIFIED/CONFIRMED/IN_REVIEW, évaluations, ordre de mérite | Traiter 3 cas fictifs dont un jour férié |
| C — Pilotage | ADMIN, DIRECTION, DSI | 2 h | Rapports, alertes IA, entraînement du modèle, indicateurs, audit, export | Lire une alerte, décider, retrouver la trace dans l'audit |

Message à faire passer : « Une alerte IA est une piste à vérifier, pas un verdict. » Prévoir la version malagasy via les guides `.mg.md`. Support de présentation : à produire à partir de ce plan une fois les écrans validés (non fait ici).

## 6. Plan de maintenance (unifié)

Consolide `PLAN_DE_MAINTENANCE.md` et `PLAN_MAINTENANCE.md` ; en cas de différence, vérifier ces deux fichiers avant d'appliquer.

| Fréquence | Action | Responsable |
|---|---|---|
| Quotidien | Vérifier `/health` (backend, `ai`, `ml`) et la sauvegarde de la base | DSI |
| Hebdomadaire | Revue des erreurs de logs ; alertes IA en attente depuis plus de 14 jours | DSI / coordinateurs |
| Mensuel | Mises à jour de sécurité des dépendances ; test de restauration d'une sauvegarde ; revue des comptes inactifs (`INACTIVE`) | DSI / ADMIN |
| Trimestriel | Réentraînement du modèle d'abandon si de nouvelles données closes existent ; revue des seuils d'anomalies et de la liste des jours fériés ; relecture du registre des traitements | DSI + Direction |
| Annuel | Mise à jour du calendrier des jours fériés (fêtes mobiles basées sur Pâques déjà calculées, **jours exceptionnels à saisir**) ; revue d'impact (AIPD) ; exercice de gestion d'incident | Direction / DSI |

Règle de changement : toute modification suit « ajouter, tester, puis basculer » ; les tests (`node --test`, `pytest`) et le typecheck/build doivent passer avant déploiement. **Non en place à ce jour** : supervision de disponibilité externe, test de restauration documenté, mesure du temps de rapport (voir §1 indicateurs).

## 7. Ce qui reste hors de ce document
- Logo, police officielle, validation du ton graphique.
- Diaporama de formation.
- Validation juridique (voir `GOUVERNANCE_DONNEES.md`) et réponses de la Direction (voir `LOT11_DEMANDES_DIRECTION.md`).
