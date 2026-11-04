# AI service — Ndao Hifanosika

Service FastAPI d'aide à la décision (cahier des charges §5.7 / §9). Il ne remplace jamais le jugement humain.

| Fonction | Méthode | Endpoint |
|---|---|---|
| Santé | — | `GET /health` |
| Anomalies, performance, risque d'abandon, synthèse chiffrée | **règles et statistiques** (`insights.py`, 25+ types d'anomalies) | `POST /v1/insights`, `GET /v1/live/insights` |
| **Synthèse narrative en français** | règles ; reformulation **LLM optionnelle** (`LLM_API_KEY` + `LLM_MODEL`), rejetée si elle invente un chiffre, repli automatique sur les règles | `POST /v1/narrative`, `GET /v1/live/narrative` |
| Modèles ML (SGD, forêt aléatoire, gradient boosting, MLP) et détection d'anomalies Isolation Forest | service `ML/` | voir `ML/README.md` |

**Honnêteté méthodologique** : le score de risque de décrochage de ce service est un score à règles pondérées. Le protocole `ML/compare_baseline.py` le compare à des modèles appris sur un vrai label (`dropped_out`) avec AUC, PR-AUC, rappel et F1.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate ; Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
pytest -q   # dont tests/test_narrative.py
uvicorn app.main:app --reload --port 8000
```
