# AI service — Ndao Hifanosika

Service FastAPI de base ajouté à l'architecture. Il fournit `/health` et un endpoint de statistiques descriptives `/v1/summary`. **Ce n'est pas encore un modèle de prédiction** : les modèles de risque de décrochage, performance, anomalies et résumé demandés par le cahier des charges nécessitent des données, des critères métier, entraînement et validation.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate ; Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```
