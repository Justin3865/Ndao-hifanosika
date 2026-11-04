python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
set BACKEND_URL=http://localhost:4000
set AI_SERVICE_KEY=<même valeur que dans le .env du backend>
uvicorn main:app --port 8001
# Entraînement (à relancer quand les données évoluent) :
curl -X POST http://localhost:8001/train -H "x-service-key: <clé>"

## Rapport d'apprentissage (mémoire-style)

1. Page « Modèles d'apprentissage » → choisir la source (Ménages, Stagiaires, **Avancement du stage**, Projets) → **Exporter en CSV (Python)**.
2. `python train_report.py dataset-stage_progress.csv --out rapport_stage`
   Produit : `rapport.md/json`, `comparaison_modeles.csv`, `description_variables.csv`, `predictions.csv`,
   `modele.joblib` et les figures (comparaison, courbe d'apprentissage, matrice de confusion + ROC, importance des variables).

## Baseline à règles vs ML (risque de décrochage)

`compare_baseline.py` compare, avec les mêmes plis de validation croisée (5 × 3, stratifiée, sans fuite), un score à règles fixes et trois modèles appris. Métriques : AUC, PR-AUC, rappel, précision, F1, précision@10 %.

```bash
python compare_baseline.py --synthetic 600 --out rapport_baseline_demo   # DONNÉES FICTIVES : démonstration du protocole
python compare_baseline.py --csv dataset-decrochage.csv --out rapport    # données réelles
```
Colonnes du CSV réel : `attendance_rate, missed_streak, progress_pct, last_eval_score, days_since_activity, age, household_size, monthly_income_kar, dropped_out` (`dropped_out` = 1 si le bénéficiaire a abandonné le parcours). Minimum : 30 lignes et 5 par classe.
Les chiffres du mode `--synthetic` ne sont **pas** des résultats sur les bénéficiaires de l'ONG.

