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
