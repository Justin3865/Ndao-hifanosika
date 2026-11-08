# Décision de référence IA — quel composant fait foi ?

Trois composants se recoupent (voir `ARCHITECTURE_REFERENCE_IA_ML.md`). Pour le mémoire, la **référence** retenue par fonction est :

| Fonction | Référence (fait foi) | Repli (jamais d'erreur visible) |
|---|---|---|
| Risque d'abandon | **Modèle appris du service ML** (`/predict-dropout`) **uniquement s'il est « retenu »** par la règle de décision (PR-AUC > baseline + σ ET rappel non dégradé) | Score à règles `rules-v1` (baseline) |
| Performance membre/stagiaire | Service IA `/ai/score/performance` | Calcul local TypeScript |
| Anomalies et indicateurs de pilotage | Service IA (`/v1/insights`, `/ai/anomaly/detect`, `/v1/anomalies` Isolation Forest) | Calcul local TypeScript |
| Synthèse narrative | Service IA `/ai/report/summary` (règles, LLM optionnel) | `narrative.service.ts` |
| Vulnérabilité des zones | Service ML `/predict-zones` | Modèle natif, puis indice terrain |

Règle d'écriture pour le mémoire : le score à règles est la **baseline scientifique** et le **repli de sécurité**, pas un échec. Un modèle appris n'est promu que s'il la dépasse de façon stable ; sinon la conclusion honnête est « non concluant, règles conservées ».

## Mise en route du modèle d'abandon sur les vraies données
1. Les coordinateurs renseignent le statut du parcours (page `/parcours` : actif / terminé / abandon) et les présences (`/presences`).
2. Dès **30 parcours clos** (5 par classe au minimum ; **100 recommandés**) : `POST /api/ai/dropout/train` (rôles ADMIN, DSI).
3. `GET /api/ai/dropout/report` : version, date, métriques, empreinte des données, verdict.
4. Verdict « retenu » → le backend utilise le modèle ; « non concluant » (HTTP 503 côté ML) → il garde les règles automatiquement.

## Démonstration sans données réelles
`ml/demo_dropout_train.py` exécute toute la chaîne sur des **données fictives** et n'écrit que dans son dossier de sortie.
Les chiffres produits ne doivent **jamais** être cités comme résultats réels.
