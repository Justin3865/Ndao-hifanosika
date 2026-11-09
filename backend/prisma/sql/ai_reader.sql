-- prisma/sql/ai_reader.sql
-- Rôle PostgreSQL en LECTURE SEULE pour le service IA (cahier §9.3 et §10 : moindre privilège).
-- Le service FastAPI (ai/) ne fait que des SELECT ; ce rôle l'empêche techniquement d'écrire ou de lire
-- au-delà de ce dont il a besoin (jamais de mots de passe, CIN, adresses, GPS, notes de stage…).
--
-- Usage (une fois, en superuser) :
--   psql "$DATABASE_URL_ADMIN" -v ai_password="'MOT_DE_PASSE_LONG_ET_ALEATOIRE'" -f prisma/sql/ai_reader.sql
-- Puis, dans l'environnement du service IA uniquement :
--   AI_DATABASE_URL=postgresql://ai_reader:MOT_DE_PASSE@hote:5432/nom_base
-- (le service IA lit DATABASE_URL ; pointez-le sur ce rôle dans son propre .env / docker-compose).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_reader') THEN
    CREATE ROLE ai_reader LOGIN;
  END IF;
END $$;

ALTER ROLE ai_reader WITH PASSWORD :ai_password NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO ai_reader', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO ai_reader;

-- Repartir de zéro : aucun droit hérité d'un ancien essai
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ai_reader;

-- Colonnes lues par ai/app/db.py (accès COLONNE par COLONNE pour les tables sensibles)
GRANT SELECT (id, name, code, status, budget, "startDate", "endDate", "beneficiaryTarget", "departmentId", "createdById") ON "Project" TO ai_reader;
GRANT SELECT (id, "projectId", title, progress, "dueDate", "completedAt") ON "Milestone" TO ai_reader;
GRANT SELECT (id, "projectId", title, score, status, "evaluatedAt", "createdAt", "createdById") ON "Evaluation" TO ai_reader;
GRANT SELECT (id, "projectId", title, status, budget, "startDate", "endDate", "createdById") ON "Activity" TO ai_reader;
-- Bénéficiaires : identité minimale utilisée pour la détection de doublons ; PAS de CIN, adresse, GPS fin, contact tuteur
GRANT SELECT (id, "projectId", "firstName", "lastName", phone, gender, age, vulnerable, "trackingEnabled", "lastSeenAt") ON "Beneficiary" TO ai_reader;
GRANT SELECT (id, "projectId", "studentId", "supervisorId", title, status, "startDate", "endDate") ON "Internship" TO ai_reader;
-- Utilisateurs : uniquement les comptes en attente, SANS mot de passe ni e-mail
GRANT SELECT (id, "firstName", "lastName", "createdAt", status) ON "User" TO ai_reader;

-- Tables de suivi & évaluation lues en entier (aucune donnée nominative)
GRANT SELECT ON "ProjectObjective", "ProjectResult", "ProjectIndicator", "ProjectMonitoringSnapshot" TO ai_reader;
-- « AiAlert » est optionnelle côté service IA (courbe d'historique) : droit accordé seulement si la table existe
DO $$ BEGIN
  IF to_regclass('public."AiAlert"') IS NOT NULL THEN
    GRANT SELECT ON "AiAlert" TO ai_reader;
  END IF;
END $$;

-- Contrôle : ceci doit échouer (permission denied)
--   SET ROLE ai_reader; SELECT password FROM "User" LIMIT 1;  -- ERREUR attendue
--   SET ROLE ai_reader; DELETE FROM "Project";                -- ERREUR attendue
