python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
set BACKEND_URL=http://localhost:4000
set AI_SERVICE_KEY=<même valeur que dans le .env du backend>
uvicorn main:app --port 8001
# Entraînement (à relancer quand les données évoluent) :
curl -X POST http://localhost:8001/train -H "x-service-key: <clé>"
