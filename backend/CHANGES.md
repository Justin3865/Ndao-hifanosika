# Corrections apportées (audit frontend ↔ backend ↔ PostgreSQL ↔ ML)

## Base de données
- `prisma/schema.prisma` aligné sur les migrations : User (notifyEmail/Sms, latitude, longitude, altitude, locationUpdatedAt, sharingLocation), Beneficiary (locality, home*, householdSize, monthlyIncome, childrenUnder5, hasDisability), modèles Zone, Certificate, AiModel. Suppression de ZoneIntervention et UserLocation.
- `20261017000000_zones_gps_notifications` rendue idempotente (elle échouait sur une base neuve : colonne zoneId déjà créée par lot4).
- Nouvelle migration `20261018000000_unify_zones_notifications` : crée la table Notification (absente de toutes les migrations), pointe la clé étrangère Beneficiary.zoneId vers Zone, supprime les anciennes tables ZoneIntervention / UserLocation.
  Base déjà migrée ? Si `zones_gps_notifications` est notée « failed » : `npx prisma migrate resolve --rolled-back 20261017000000_zones_gps_notifications` puis `npx prisma migrate deploy`.

## API
- Routers `/api/vulnerability/*` et `/api/service/dataset` montés (ils ne l'étaient pas) et réécrits sur les données réelles (Zone, domicile des ménages, position des agents). Score ML par zone : ml-service si disponible, sinon modèle natif.
- Champs ménage des bénéficiaires enfin enregistrés (create + update) avec validation ; contrôle d'existence de la zone.
- `error.middleware` + `sendError` : doublon → 409, référence → 409, introuvable → 404, données invalides → 400 (au lieu de 500) ; 99 blocs catch corrigés ; pas de détail interne en production.
- Garde-fous utilisateurs : impossible de supprimer / rétrograder / désactiver son propre compte ou le dernier admin actif ; inscription : e-mail valide + 8 caractères minimum.
- Validations ajoutées : score d'évaluation 0-100, budget projet ≥ 0, âge/coordonnées/ménage, dates de fin ≥ début (stages, campagnes), latitude/longitude de zone numériques (les NaN étaient stockés).
- Jalons / projets sans date : plus d'« anomalie de retard » fausse (new Date(null) = 1970).
- Notifications : tout utilisateur peut supprimer SES notifications (le frontend le proposait, le backend refusait avec 403).
- Suivi GPS : la limitation de fréquence n'est plus consommée par une requête sans consentement ; nettoyage de la table en mémoire.
- ORG_LAT / ORG_LNG vides ne valent plus 0.
- `/api/ai/health` interroge réellement ai-service et ml-service ; `POST /api/ai/train` déclenche aussi l'entraînement scikit-learn (non bloquant). `ai.service.ts` (code mort qui prétendait appeler FastAPI) supprimé.
- Chatbot `/api/ai/chat` renvoie aussi `zoneIds` (surbrillance sur la carte).
- JWT : JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN sont désormais lus ; `chat.routes.ts` (doublon non monté) supprimé.

## Configuration cohérente
Frontend 3000 → Backend 4000 → ai-service 8000 / ml-service 8001 → PostgreSQL 5432 (voir `.env.example`).
