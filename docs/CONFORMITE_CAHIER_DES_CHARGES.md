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
