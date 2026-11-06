-- Lot additif : (1) statut du parcours d'un bénéficiaire (label « abandon » réel pour le ML, cahier §9.3)
--               (2) affectation des coordinateurs aux projets (périmètre « ne voit que ses projets »)
-- Aucune table existante n'est modifiée.

DO $$ BEGIN
  CREATE TYPE "JourneyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "BeneficiaryJourney" (
  "id" SERIAL PRIMARY KEY,
  "beneficiaryId" INTEGER NOT NULL,
  "status" "JourneyStatus" NOT NULL DEFAULT 'ACTIVE',
  "statusDate" TIMESTAMP(3),
  "dropoutReason" TEXT,
  "recordedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeneficiaryJourney_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId")
    REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BeneficiaryJourney_reason_check"
    CHECK ("status" <> 'DROPPED_OUT' OR "statusDate" IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS "BeneficiaryJourney_beneficiaryId_key" ON "BeneficiaryJourney"("beneficiaryId");
CREATE INDEX IF NOT EXISTS "BeneficiaryJourney_status_idx" ON "BeneficiaryJourney"("status");

CREATE TABLE IF NOT EXISTS "ProjectCoordinator" (
  "id" SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "assignedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectCoordinator_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectCoordinator_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCoordinator_projectId_userId_key" ON "ProjectCoordinator"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "ProjectCoordinator_userId_idx" ON "ProjectCoordinator"("userId");
