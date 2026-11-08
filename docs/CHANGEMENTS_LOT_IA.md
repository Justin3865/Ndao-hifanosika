# Lot IA — ajouts uniquement (aucun fichier ni route existants modifiés, hors 2 lignes de montage)

| Ajout | Fichier |
|---|---|
| Route `POST /v1/anomalies` (Isolation Forest) que le backend appelait déjà et qui n'existait pas côté service IA | `ai/app/anomaly_service.py`, `ai/app/routes_anomalies.py`, 2 lignes dans `ai/app/main.py` |
| Tests de cette route (logique pure) | `ai/tests/test_anomaly_service.py` |
| Pilotage du modèle d'abandon depuis la plateforme | `srcb/src/routes/aiDropout.routes.ts`, 2 lignes dans `srcb/src/app.ts` |
| Démonstration de bout en bout (données fictives, sans effet sur la production) + tests | `ml/demo_dropout_train.py`, `ml/tests/test_demo_dropout.py` |
| Exemple de configuration du service IA (LLM optionnel) | `ai/.env.example` |
| Décision « qui fait foi » + mise en route | `docs/DECISION_REFERENCE_IA.md` |

## Vérifié
- Python : 32 tests `ai` réussis (2 ignorés : FastAPI absent de l'environnement), 17 tests `ml` réussis (dropout, baseline, démo).
- `aiDropout.routes.ts` : aucune erreur de syntaxe TypeScript.

## Non vérifié (à faire chez vous)
- `npm run typecheck` / `npm run build` du backend avec les vraies dépendances ; test HTTP réel de `POST /v1/anomalies` et de `/api/ai/dropout/*` (FastAPI, PostgreSQL absents ici).
- Le modèle d'abandon ne sera « retenu » qu'avec de vraies données (≥ 30 parcours clos) : sur le jeu fictif de la démonstration le verdict est « non concluant », ce qui est le comportement attendu de la règle de décision.
- Le synthèse LLM reste inactive sans `LLM_API_KEY` et `LLM_MODEL`.
