-- LOT 1 · Évaluations polymorphes (cahier §5.3, §8) — 100 % ADDITIF.
-- Les tables/routes d'évaluation existantes (Evaluation, EvaluationScore, InternshipEvaluation, grilles, campagnes) sont conservées.

-- Grilles : projet (nullable) + barème + type de cible
ALTER TABLE "EvaluationGrid" ADD COLUMN IF NOT EXISTS "projectId" INTEGER;
ALTER TABLE "EvaluationGrid" ADD COLUMN IF NOT EXISTS "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20;
ALTER TABLE "EvaluationGrid" ADD COLUMN IF NOT EXISTS "targetType" TEXT;            -- MEMBER | STAGIAIRE | BENEFICIARY

-- Campagnes : périodicité et type de cible
ALTER TABLE "EvaluationCampaign" ADD COLUMN IF NOT EXISTS "periodicity" TEXT;       -- MONTHLY | QUARTERLY | END_OF_MISSION
ALTER TABLE "EvaluationCampaign" ADD COLUMN IF NOT EXISTS "targetType" TEXT;        -- MEMBER | STAGIAIRE | BENEFICIARY

-- Stagiaire : tuteur académique (le tuteur entreprise reste supervisorId / supervisorName)
ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "academicSupervisorName" TEXT;
ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "academicSupervisorEmail" TEXT;

-- Évaluation d'une personne (membre, stagiaire ou bénéficiaire)
CREATE TABLE IF NOT EXISTS "person_evaluations" (
  "id" SERIAL NOT NULL,
  "targetType" TEXT NOT NULL,                       -- MEMBER | STAGIAIRE | BENEFICIARY
  "targetId" INTEGER NOT NULL,                      -- User.id ou Beneficiary.id selon targetType
  "evaluatorId" INTEGER,                            -- User.id de l'évaluateur
  "evaluatorRole" TEXT NOT NULL DEFAULT 'SUPERVISOR', -- SELF | SUPERVISOR | TUTOR_ENTERPRISE | TUTOR_ACADEMIC | HR
  "gridId" INTEGER,
  "campaignId" INTEGER,
  "projectId" INTEGER,
  "period" TEXT,                                    -- ex. 2026-T3, 2026-11, FIN_MISSION
  "status" TEXT NOT NULL DEFAULT 'DRAFT',           -- DRAFT | SUBMITTED | VALIDATED
  "totalScore" DOUBLE PRECISION,                    -- sur 100
  "comment" TEXT,
  "submittedAt" TIMESTAMP(3),
  "validatedById" INTEGER,
  "validatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "person_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "person_evaluations_targetType_targetId_createdAt_idx" ON "person_evaluations"("targetType", "targetId", "createdAt");
CREATE INDEX IF NOT EXISTS "person_evaluations_campaignId_idx" ON "person_evaluations"("campaignId");
CREATE INDEX IF NOT EXISTS "person_evaluations_evaluatorId_idx" ON "person_evaluations"("evaluatorId");
-- Unicité (campagne, cible, rôle, évaluateur) : garantie par le code (voir personEvaluations.routes.ts), pas par un index partiel,
-- car schema.prisma ne sait pas le représenter et `migrate dev` le signalerait comme dérive.

CREATE TABLE IF NOT EXISTS "person_evaluation_scores" (
  "id" SERIAL NOT NULL,
  "evaluationId" INTEGER NOT NULL,
  "criterion" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "comment" TEXT,
  CONSTRAINT "person_evaluation_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "person_evaluation_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "person_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "person_evaluation_scores_evaluationId_criterion_key" ON "person_evaluation_scores"("evaluationId", "criterion");
