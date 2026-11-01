-- Fahafaham-po (satisfaction) des partenaires et bénéficiaires, base de l'évaluation finale des projets
CREATE TABLE IF NOT EXISTS "ProjectFeedback" (
  "id" SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "partnerId" INTEGER,
  "beneficiaryId" INTEGER,
  "respondent" TEXT,
  "ratings" JSONB NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "comment" TEXT,
  "collectedById" INTEGER,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProjectFeedback_projectId_kind_idx" ON "ProjectFeedback"("projectId","kind");
CREATE INDEX IF NOT EXISTS "ProjectFeedback_partnerId_idx" ON "ProjectFeedback"("partnerId");
CREATE INDEX IF NOT EXISTS "ProjectFeedback_beneficiaryId_idx" ON "ProjectFeedback"("beneficiaryId");
