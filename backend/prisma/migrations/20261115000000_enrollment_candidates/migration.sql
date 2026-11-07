-- Sélection automatique des bénéficiaires : critères par projet + ménages candidats enquêtés en mission.
-- Aucune table existante n'est modifiée.

CREATE TABLE IF NOT EXISTS "enrollment_rules" (
  "projectId"         INTEGER      NOT NULL,
  "enabled"           BOOLEAN      NOT NULL DEFAULT true,
  "autoEnroll"        BOOLEAN      NOT NULL DEFAULT true,
  "minScore"          INTEGER      NOT NULL DEFAULT 50,
  "gender"            TEXT,
  "ageMin"            INTEGER,
  "ageMax"            INTEGER,
  "maxMonthlyIncome"  DOUBLE PRECISION,
  "minHouseholdSize"  INTEGER,
  "minChildrenUnder5" INTEGER,
  "requireDisability" BOOLEAN      NOT NULL DEFAULT false,
  "requireVulnerable" BOOLEAN      NOT NULL DEFAULT false,
  "localityContains"  TEXT,
  "updatedById"       INTEGER,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enrollment_rules_pkey" PRIMARY KEY ("projectId")
);

CREATE TABLE IF NOT EXISTS "enrollment_candidates" (
  "id"                  SERIAL       NOT NULL,
  "code"                TEXT,
  "firstName"           TEXT         NOT NULL,
  "lastName"            TEXT         NOT NULL,
  "gender"              "Gender",
  "age"                 INTEGER,
  "phone"               TEXT,
  "locality"            TEXT,
  "adminCommune"        TEXT,
  "adminFokontany"      TEXT,
  "addressDetail"       TEXT,
  "latitude"            DOUBLE PRECISION,
  "longitude"           DOUBLE PRECISION,
  "altitude"            DOUBLE PRECISION,
  "householdSize"       INTEGER,
  "monthlyIncome"       DOUBLE PRECISION,
  "childrenUnder5"      INTEGER,
  "outOfSchoolChildren" INTEGER,
  "mealsPerDay"         INTEGER,
  "hasDisability"       BOOLEAN      NOT NULL DEFAULT false,
  "healthIssues"        BOOLEAN,
  "waterAccess"         BOOLEAN,
  "electricityAccess"   BOOLEAN,
  "housingType"         TEXT,
  "vulnerable"          BOOLEAN      NOT NULL DEFAULT false,
  "notes"               TEXT,
  "agentId"             INTEGER      NOT NULL,
  "missionId"           INTEGER,
  "startedAt"           TIMESTAMP(3),
  "endedAt"             TIMESTAMP(3),
  "projectId"           INTEGER,
  "status"              TEXT         NOT NULL DEFAULT 'PENDING',
  "score"               DOUBLE PRECISION,
  "scoreMethod"         TEXT,
  "scoredAt"            TIMESTAMP(3),
  "decision"            JSONB,
  "waitlistProjectId"   INTEGER,
  "waitlistRank"        INTEGER,
  "enrolledProjectId"   INTEGER,
  "beneficiaryId"       INTEGER,
  "enrolledAt"          TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enrollment_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enrollment_candidates_code_key" ON "enrollment_candidates"("code");
CREATE INDEX IF NOT EXISTS "enrollment_candidates_status_idx" ON "enrollment_candidates"("status");
CREATE INDEX IF NOT EXISTS "enrollment_candidates_agentId_idx" ON "enrollment_candidates"("agentId");
CREATE INDEX IF NOT EXISTS "enrollment_candidates_projectId_idx" ON "enrollment_candidates"("projectId");
CREATE INDEX IF NOT EXISTS "enrollment_candidates_enrolledProjectId_idx" ON "enrollment_candidates"("enrolledProjectId");
CREATE INDEX IF NOT EXISTS "enrollment_candidates_missionId_idx" ON "enrollment_candidates"("missionId");
