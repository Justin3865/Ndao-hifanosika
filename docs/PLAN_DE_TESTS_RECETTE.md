# Plan de tests et procès-verbal de recette — Plateforme S&E Ndao Hifanosika

Cahier des charges §11 (« Plan de tests, rapport de recette fonctionnelle ») — version de travail.

## 1. Stratégie à quatre niveaux
| Niveau | Outil | Commande | Où |
|---|---|---|---|
| Unitaire back | `node:test` + `tsc` | `cd srcb && npm run test:unit` | règles post-programme, file d'attente, statistiques de performance, export xlsx |
| Unitaire back (configuration) | `node:test` | `cd srcb && npm test` | sécurité / configuration (existant) |
| Unitaire front | `node:test` + `tsx` | `cd srcf && npm test` | i18n (FR/MG complets), export xlsx |
| Services Python | pytest | `cd IA && pytest -q` ; `cd ML && python -m pytest -q` | anomalies, monitoring, narration, protocole baseline vs ML |
| Intégration HTTP (API réelle + PostgreSQL) | scripts Node | `cd srcb && node tests-http/t1.mjs` … `t5` | auth, projets, bénéficiaires, évaluations, IA… (existant) |
| Performance | script Node | `cd srcb && npm run perf` | p50/p95 par route, objectifs 500 ms / 2 s |

L'intégration continue (`.github/workflows/ci.yml`) exécute les niveaux unitaires à chaque `push` / `pull request`.

## 2. Cas de recette fonctionnelle (à exécuter sur l'environnement de recette)
Légende : **R** = résultat attendu. Colonne « Résultat » à remplir par le testeur (OK / KO + date + initiales).

| N° | Exigence (cahier) | Scénario | R | Résultat |
|---|---|---|---|---|
| R01 | §5.1 Accès | Connexion avec chaque rôle (ADMIN, DIRECTION, DSI, DAF, RH, COMMUNICATION, COORDINATOR, TUTEUR, STAGIAIRE) | Chaque rôle ne voit que son menu | |
| R02 | §5.1 2FA | Activer la double authentification puis se reconnecter | Code demandé à la connexion | |
| R03 | §5.1 Audit | Modifier un bénéficiaire | Ligne dans « Journal d'audit » | |
| R04 | §5.2 Projets | Créer un projet avec bailleur, jalons, budget | Fiche créée, avancement visible | |
| R05 | §5.3 Stagiaires | Créer un stage, évaluer (tuteur), générer l'attestation | Note finale + certificat avec QR | |
| R06 | §5.4 Bénéficiaires | Inscrire un enfant (mineur) | Données masquées pour les rôles non autorisés | |
| R07 | §5.4 Post-programme | Clôturer un projet puis **Suivi post-programme › Générer les relances** | 3 relances par bénéficiaire (3, 6, 12 mois) | |
| R08 | §5.4 Post-programme | Saisir une relance (situation, revenu, satisfaction 1-5) | Statut « Réalisée », indicateurs d'impact mis à jour | |
| R09 | §5.5 Export | **Rapports › Exports** : télécharger un fichier Excel puis un CSV | Le .xlsx s'ouvre dans Excel, en-têtes en gras, accents corrects | |
| R10 | §5.5 PDF | Générer un rapport bailleur en PDF | PDF lisible, période respectée | |
| R11 | §5.6 Notifications | Une relance arrive à échéance (≤ 7 jours) | Notification in-app (+ e-mail si configuré) au responsable du projet | |
| R12 | §5.7 IA | Ouvrir « Analyses IA », puis `GET /api/ai/narrative` | Synthèse en français, mention « aide à la décision » | |
| R12b | §5.7 / §5.5 LLM | Définir `LLM_API_KEY` + `LLM_MODEL` sur le service IA puis `node tests-http/llm-check.mjs` ; ouvrir IA › Synthèse intelligente › Générer | `source = llm` ; le panneau indique « Reformulée par un modèle de langage » | |
| R13 | §5.7 Dégradation | Arrêter le service IA (`docker compose stop ia`) | Le reste de la plateforme fonctionne ; la synthèse est produite par le repli local | |
| R14 | §6 Multilinguisme | Basculer FR → MG (en-tête) | Menu, page Exports et page Post-programme en malgache ; choix mémorisé | |
| R15 | §6 Connectivité | Navigateur en « 3G lente » (outils développeur) | Pages utilisables, pas d'écran blanc | |
| R16 | §6 Performance | `npm run perf` sur la recette | p95 ≤ 500 ms (API), ≤ 2 s (pages) | |
| R17 | §10 Sauvegarde | `test-restore.sh` | « Restauration OK : N tables » | |
| R18 | §6 Disponibilité | `docker compose stop back` puis `start` | Redémarrage automatique, `/health` répond | |
| R19 | §5.4 Présence | **Présences** : choisir un projet et une séance, décocher des absents, enregistrer | Taux de présence par bénéficiaire mis à jour ; niveau « Trop peu de séances » sous 3 séances | |
| R20 | §5.3 Objectifs | **Objectifs** (RH) : créer un objectif chiffré pour un membre ; le membre met à jour sa valeur atteinte | Barre de progression ; statut « Atteint » à 100 % ; objectif échu listé dans les alertes | |
| R21 | §5.3 Documents de stage | **Documents de stage** : le stagiaire dépose son rapport (PDF) ; la RH dépose la convention ; un autre stagiaire tente d'ouvrir le stage | Dépôts visibles du stagiaire, du tuteur, de la RH ; refus (403) pour l'autre stagiaire ; fichier > 8 Mo refusé | |
| R22 | §10 Consentement | **Consentements** : enregistrer le tuteur légal d'un mineur, puis le retirer | État Manquant → Accordé → Retiré ; le retrait reste daté | |
| R23 | §10 Purge | **Conservation des données** : simuler puis exécuter | Compteurs cohérents ; une ligne « RETENTION_PURGE » dans le journal d'audit ; aucune donnée métier supprimée | |
| R24 | §6 Export JSON | **Export JSON** en ADMIN puis en COMMUNICATION (bénéficiaires) | Fichier valide ; en COMMUNICATION : pseudonymes `B-00012`, aucun nom/contact/GPS | |
| R25 | §5.1 Périmètre | Coordinateur affecté au projet A : appeler `/api/attendance/summary?projectId=B` et `/api/exports/json?dataset=beneficiaries&projectId=B` | 403 « ne fait pas partie de votre périmètre » | |
| R26 | §10 Rôles | Un stagiaire appelle `/api/admin/retention` et `/api/consents` | 403 | |

## 3. Couverture actuelle (à jour au 4 nov. 2026)
Tests automatisés **exécutés lors de la préparation de ce lot** : back unitaire 16/16, front 8/8, narration IA 6/6, baseline vs ML 5/5 (voir §5 sur les limites). Les 22 tests IA, 4 tests ML et 3 tests back préexistants, ainsi que les scripts `tests-http`, n'ont pas été relancés ici (pas de base PostgreSQL ni de dépendances Python complètes dans l'environnement de préparation).
Reste à faire avant la soutenance : exécuter R01–R26 sur la recette et joindre ce tableau rempli au mémoire ; ajouter des tests de composants React si le temps le permet.

## 4. Critères d'acceptation
Aucun cas critique (R01, R03, R06, R07, R08, R13) en échec ; ≥ 90 % des autres cas OK ; objectifs de performance atteints ou écarts expliqués.

## 5. Limites connues
* Le moteur Prisma n'était pas disponible hors ligne : la migration `20261107000000_post_program_followups` a été écrite à la main (même style que les migrations existantes) ; elle doit être appliquée (`npx prisma migrate deploy`) puis `npx prisma generate` avant de tester R07/R08.
* Les Dockerfiles et le compose n'ont pas pu être construits dans l'environnement de préparation (pas de Docker) : premier `docker compose build` à faire sur votre machine.
