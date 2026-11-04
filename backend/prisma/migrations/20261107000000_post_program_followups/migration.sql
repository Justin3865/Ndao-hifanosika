-- Suivi post-programme : relances à 3, 6 et 12 mois après la fin du parcours (cahier des charges §5.4)
DO $$ BEGIN
  CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'MISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpOccupation" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'IN_TRAINING', 'SEEKING', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PostProgramFollowUp" (
  "id" SERIAL PRIMARY KEY,
  "beneficiaryId" INTEGER NOT NULL,
  "horizonMonths" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "occupation" "FollowUpOccupation",
  "activityCreated" BOOLEAN,
  "monthlyIncome" DOUBLE PRECISION,
  "satisfaction" INTEGER,
  "notes" TEXT,
  "completedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostProgramFollowUp_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId")
    REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostProgramFollowUp_horizon_check" CHECK ("horizonMonths" IN (3, 6, 12)),
  CONSTRAINT "PostProgramFollowUp_satisfaction_check" CHECK ("satisfaction" IS NULL OR ("satisfaction" BETWEEN 1 AND 5))
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostProgramFollowUp_beneficiaryId_horizonMonths_key"
  ON "PostProgramFollowUp"("beneficiaryId", "horizonMonths");
CREATE INDEX IF NOT EXISTS "PostProgramFollowUp_status_dueDate_idx"
  ON "PostProgramFollowUp"("status", "dueDate");
