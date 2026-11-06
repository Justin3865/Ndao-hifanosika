-- A2 · ai_scores : historique des scores IA par bénéficiaire. Additif, idempotent.
CREATE TABLE IF NOT EXISTS "ai_scores" (
  "id" SERIAL PRIMARY KEY,
  "beneficiaryId" INTEGER NOT NULL,
  "projectId" INTEGER,
  "kind" TEXT NOT NULL DEFAULT 'DROPOUT_RISK',
  "score" DOUBLE PRECISION NOT NULL,
  "level" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "features" JSONB,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_scores_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_scores_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_scores_score_check" CHECK ("score" >= 0 AND "score" <= 100)
);
CREATE INDEX IF NOT EXISTS "ai_scores_beneficiaryId_kind_computedAt_idx" ON "ai_scores"("beneficiaryId", "kind", "computedAt");
CREATE INDEX IF NOT EXISTS "ai_scores_projectId_kind_idx" ON "ai_scores"("projectId", "kind");
