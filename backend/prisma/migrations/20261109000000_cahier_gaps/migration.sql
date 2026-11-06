-- Lot additif « conformité cahier des charges » :
--   (1) présence des bénéficiaires aux séances            (§5.4)
--   (2) objectifs individuels / KPI RH des membres        (§5.3)
--   (3) documents de stage : convention, rapport, mémoire (§5.3)
--   (4) consentement des tuteurs légaux pour les mineurs  (§10)
-- Aucune table existante n'est modifiée. Idempotent (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "BeneficiaryAttendance" (
  "id" SERIAL PRIMARY KEY,
  "activityId" INTEGER NOT NULL,
  "beneficiaryId" INTEGER NOT NULL,
  "present" BOOLEAN NOT NULL DEFAULT TRUE,
  "note" TEXT,
  "recordedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeneficiaryAttendance_activityId_fkey" FOREIGN KEY ("activityId")
    REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BeneficiaryAttendance_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId")
    REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BeneficiaryAttendance_activityId_beneficiaryId_key"
  ON "BeneficiaryAttendance"("activityId", "beneficiaryId");
CREATE INDEX IF NOT EXISTS "BeneficiaryAttendance_beneficiaryId_idx" ON "BeneficiaryAttendance"("beneficiaryId");

CREATE TABLE IF NOT EXISTS "MemberObjective" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "kpi" TEXT,
  "unit" TEXT,
  "targetValue" DOUBLE PRECISION,
  "currentValue" DOUBLE PRECISION,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "projectId" INTEGER,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberObjective_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MemberObjective_status_check"
    CHECK ("status" IN ('PLANNED','IN_PROGRESS','ACHIEVED','MISSED','CANCELLED'))
);
CREATE INDEX IF NOT EXISTS "MemberObjective_userId_idx" ON "MemberObjective"("userId");
CREATE INDEX IF NOT EXISTS "MemberObjective_status_idx" ON "MemberObjective"("status");

CREATE TABLE IF NOT EXISTS "InternshipDocument" (
  "id" SERIAL PRIMARY KEY,
  "internshipId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "note" TEXT,
  "uploadedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternshipDocument_internshipId_fkey" FOREIGN KEY ("internshipId")
    REFERENCES "Internship"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InternshipDocument_kind_check" CHECK ("kind" IN ('CONVENTION','REPORT','MEMOIRE','OTHER'))
);
CREATE INDEX IF NOT EXISTS "InternshipDocument_internshipId_idx" ON "InternshipDocument"("internshipId");

CREATE TABLE IF NOT EXISTS "BeneficiaryConsent" (
  "id" SERIAL PRIMARY KEY,
  "beneficiaryId" INTEGER NOT NULL,
  "guardianName" TEXT NOT NULL,
  "guardianRelation" TEXT,
  "guardianContact" TEXT,
  "scope" TEXT,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "recordedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeneficiaryConsent_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId")
    REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BeneficiaryConsent_beneficiaryId_key" ON "BeneficiaryConsent"("beneficiaryId");
