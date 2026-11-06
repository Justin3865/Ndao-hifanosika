-- A1 · evaluation_scores : note d'un bénéficiaire pour une évaluation. Additif, idempotent.
CREATE TABLE IF NOT EXISTS "evaluation_scores" (
  "id" SERIAL PRIMARY KEY,
  "evaluationId" INTEGER NOT NULL,
  "beneficiaryId" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "comment" TEXT,
  "recordedById" INTEGER,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "evaluation_scores_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "evaluation_scores_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "evaluation_scores_score_check" CHECK ("score" >= 0 AND "maxScore" > 0 AND "score" <= "maxScore")
);
CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_scores_evaluationId_beneficiaryId_key" ON "evaluation_scores"("evaluationId", "beneficiaryId");
CREATE INDEX IF NOT EXISTS "evaluation_scores_beneficiaryId_evaluatedAt_idx" ON "evaluation_scores"("beneficiaryId", "evaluatedAt");
