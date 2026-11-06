# Conformité au cahier des charges — état après ce lot

| Exigence | Avant | Maintenant | Preuve / où |
|---|---|---|---|
| Suivi post-programme 3, 6, 12 mois (§5.4) | absent | **ajouté** : relances générées à la clôture du projet, saisie, indicateurs (réponse, insertion, satisfaction, revenu), rappels | `srcb/src/services/followUp.service.ts`, `srcf/src/app/follow-ups`, migration `20261107…`, tests `followup-rules` |
| Export Excel (§5.5) | PDF + CSV | **.xlsx réel** (sans dépendance) en plus de CSV/PDF | `srcf/src/lib/xlsx.ts`, page Exports ; fichier relu avec openpyxl/pandas |
| Multilinguisme malgache (§6) | chatbot seulement | **i18n FR/MG** (menu, exports, post-programme) + bascule mémorisée ; extension progressive du dictionnaire | `srcf/src/lib/i18n`, test de complétude FR=MG |
| File d'attente Redis/BullMQ (§7.2, optionnel) | absente | file avec **repli en mémoire**, BullMQ si `REDIS_URL` ; utilisée pour l'envoi e-mail/SMS des notifications | `srcb/src/utils/jobQueue.ts`, 4 tests |
| Docker, CI/CD, hébergement, sauvegardes, dev/staging/prod (§7.2, 7.4, 10) | absents | Dockerfiles, compose 3 environnements, HTTPS (Caddy), sauvegarde + restauration testable, GitHub Actions | `deploy/`, `.github/workflows/ci.yml`, `docs/DEPLOIEMENT.md` |
| Performance < 2 s / < 500 ms (§6) | non mesurée | **mesurée** : en-tête `X-Response-Time`, p50/p95 par route, journal des lenteurs, script de campagne | `perf.middleware.ts`, `/api/metrics/perf`, `tests-http/perf.mjs` (à lancer sur la recette) |
| Plan de tests, recette (§11) | ~29 tests | +35 tests automatisés, plan de recette R01–R18 | `docs/PLAN_DE_TESTS_RECETTE.md` |
| Synthèse narrative IA (§5.7) | statistiques/règles | **texte narratif en français** (règles) + LLM optionnel garde-fou « aucun chiffre inventé » | `IA/app/narrative.py`, `GET /api/ai/narrative`, panneau « Synthèse narrative » (IA › Synthèse intelligente), `tests-http/llm-check.mjs` pour valider le LLM réel |
| IA : comparaison à un vrai label (§9.3) | non faite | protocole **baseline à règles vs ML** (AUC, PR-AUC, rappel, F1), reproductible | `ML/compare_baseline.py` |

## Fonctions au-delà du cahier (à présenter comme extensions dans le mémoire)
Zones GPS et vulnérabilité des ménages, missions/enquêtes terrain, messagerie temps réel, certificats vérifiables par QR, candidatures publiques de stage, 2FA/TOTP, notifications push.

## Reste ouvert (à dire honnêtement à la soutenance)
1. **Label « décrochage » réel** : la base n'enregistre pas l'abandon d'un bénéficiaire. Décision à prendre : ajouter un champ « statut du parcours » (actif / terminé / abandon) renseigné par les coordinateurs ; sans lui, le modèle ne peut être entraîné que sur des données fictives (mode `--synthetic`, clairement signalé).
2. Volume de données : le jeu de démonstration (≈ 20 bénéficiaires) est sous le seuil du service ML (30 lignes, 5 par classe).
3. Trois implémentations de scoring se recoupent (TypeScript, service IA, service ML) : en retenir une comme référence dans le mémoire et présenter les autres comme repli.
4. Synthèse par LLM : désactivée tant que `LLM_API_KEY` et `LLM_MODEL` ne sont pas définis.
5. Tests de composants React, tests de charge réels et résultats de recette : à produire sur la recette.
6. Le périmètre des coordinateurs (« ne voit que ses projets ») n'est pas filtré par projet dans le code existant ; les nouvelles routes suivent la même règle.

## Lot 20261108 — ajouts (aucune fonctionnalité existante supprimée)
| Exigence | Ajout | Où |
|---|---|---|
| Label « abandon » réel (§9.3) | statut du parcours ACTIVE / COMPLETED / DROPPED_OUT, taux d'abandon (parcours actifs exclus), export de labels 0/1 | `srcb/src/services/journey.service.ts`, `/api/journey`, `srcf/src/app/parcours`, migration `20261108000000…` |
| Périmètre des coordinateurs | affectation coordinateur → projets ; filtrage des bénéficiaires, évaluations, relances post-programme, statut de parcours et ménages vulnérables ; contrôle des écritures (`projectId`) | `coordinatorScope.middleware.ts`, `/api/project-coordinators`, `srcf/src/app/coordinateurs` |
| Docker, CI/CD, sauvegardes (§7.2, 10) | `deploy/` (compose dev/recette/prod, Caddy HTTPS, sauvegarde/restauration/test) et `.github/workflows/ci.yml` recréés | `deploy/`, `.github/workflows/` |

### Points à valider (non testés ici)
* Périmètre : tests d'intégration avec PostgreSQL (un coordinateur affecté au projet A ne doit rien voir du projet B) ; seules les règles pures sont testées automatiquement.
* Mode transition : un coordinateur sans affectation garde l'accès historique tant que `COORDINATOR_SCOPE=strict` n'est pas défini.
* Non filtrés à ce jour : `/api/vulnerability/zones`, tableaux de bord et rapports agrégés, services IA/ML.
* `deploy/` et le workflow CI n'ont pas été exécutés (pas de Docker ni de GitHub dans l'environnement de rédaction) : syntaxe YAML et scripts vérifiés seulement.

## Lot 20261109 — conformité au cahier des charges (ajouts uniquement)
Ce lot ne modifie aucune table ni aucune route existantes : 4 tables nouvelles (migration `20261109000000_cahier_gaps`), 6 groupes de routes nouveaux, 6 pages nouvelles.

| Exigence du cahier | Ajout | Où |
|---|---|---|
| §5.4 présence aux sessions | pointage des bénéficiaires par séance, taux et niveau de présence (le niveau n'est évalué qu'à partir de 3 séances) | `/api/attendance`, page `/presences`, table `BeneficiaryAttendance` |
| §5.3 objectifs individuels / KPI RH, alertes RH | objectifs par membre (cible, valeur atteinte, échéance), progression, objectifs en retard | `/api/objectives`, page `/objectifs`, table `MemberObjective` |
| §5.3 convention de stage, dépôt rapport/mémoire | dépôt, liste, téléchargement, suppression (PDF, Word, PNG, JPEG, 8 Mo max) ; droits par stage | `/api/internship-documents`, page `/internships/documents`, table `InternshipDocument` |
| §10 consentement des tuteurs légaux | consentement daté par bénéficiaire mineur, retrait conservé, liste des consentements manquants | `/api/consents`, page `/consentements`, table `BeneficiaryConsent` |
| §10 conservation et purge | simulation puis purge des **journaux techniques** uniquement (audit ≥ 12 mois, notifications lues, rappels, jetons expirés) ; confirmation exigée, action journalisée | `/api/admin/retention`, page `/administration/retention` |
| §6 portabilité JSON ; §10 anonymisation pour la Communication | export JSON par jeu de données, périmètre coordinateur respecté, lignes pseudonymisées pour la Communication | `/api/exports/json`, page `/exports` |
| §11 MCD/MLD | MCD (Mermaid) + dictionnaire généré depuis le schéma : 53 entités | `docs/MCD_MLD.md`, `srcb/scripts/gen-mcd.py` |
| §11 plan de maintenance | procédures et calendrier | `docs/PLAN_MAINTENANCE.md` |

Tests automatiques ajoutés : 6 (back, règles pures `gapRules`) + 2 (front) ; les 49 tests unitaires back passent, y compris les 43 existants.

### Ce qui n'est PAS fait ou PAS vérifié (à dire tel quel)
* Ces ajouts n'ont **pas été exécutés** contre PostgreSQL ni dans un navigateur (pas de base ni de dépendances installées dans l'environnement de rédaction). Vérifiés : règles pures (tests), cohérence de syntaxe, parité des droits d'export front/back. À faire : `npm install`, `npx prisma generate`, `npm run migrate:deploy`, `npm run typecheck`, `npm run build` (back et front), puis recette R19–R26.
* **Score de risque d'abandon** : il reste un score à règles ; aucun modèle n'est entraîné. Le taux de présence est désormais disponible mais **n'est pas encore branché** comme variable du score ni du service ML.
* **Politique de conservation** : les durées par défaut (audit 24 mois, notifications 12 mois, rappels 6 mois) sont une proposition technique ; la durée légale applicable à Madagascar et les exigences des bailleurs restent à faire valider par la Direction (§14.2 point 12). La purge n'est pas planifiée automatiquement : elle se lance à la main depuis l'administration.
* **Chiffrement au repos** de la base : non traité dans le code ; relève de l'hébergement (disque/volume chiffré, sauvegardes chiffrées) — à décider avec la DSI (§14.2 point 9).
* Les documents de stage sont stockés dans PostgreSQL (BYTEA), comme les preuves d'activité existantes ; au-delà de quelques milliers de fichiers, prévoir un stockage objet.
* Résultats de recette R01–R26 et mesures de performance : toujours à produire sur l'environnement de recette.
