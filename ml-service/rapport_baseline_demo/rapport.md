# Risque de décrochage : baseline à règles vs modèles ML

- Lignes : **600** — décrochages : **95** (16%) — variables : attendance_rate, missed_streak, progress_pct, last_eval_score, days_since_activity, age, household_size, monthly_income_kar
- Validation : stratifiée 5 plis × 3 répétitions (mêmes plis pour tous), standardisation dans le pipeline.

> **DONNÉES FICTIVES** : démonstration du protocole. Ne pas présenter ces chiffres comme des résultats sur les bénéficiaires réels.

| Modèle | AUC | PR-AUC | Rappel | Précision | F1 | Préc.@10 % |
|---|---|---|---|---|---|---|
| Baseline à règles (seuil 50) | 0.810 ± 0.075 | 0.537 | 0.232 | 0.708 | 0.339 | 0.556 |
| Régression logistique | 0.823 ± 0.075 | 0.519 | 0.747 | 0.372 | 0.495 | 0.528 |
| Forêt aléatoire | 0.790 ± 0.079 | 0.451 | 0.568 | 0.413 | 0.475 | 0.472 |
| Gradient boosting | 0.767 ± 0.069 | 0.439 | 0.274 | 0.469 | 0.337 | 0.467 |

Meilleur modèle (PR-AUC) : **Baseline à règles (seuil 50)**.

Lecture : la baseline sert de point de comparaison ; un modèle n'est retenu que s'il la dépasse de façon stable (écart supérieur à l'écart-type entre plis) sur PR-AUC et rappel. Les alertes restent une aide à la décision.
