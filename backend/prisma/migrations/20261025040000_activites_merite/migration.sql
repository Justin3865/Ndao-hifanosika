CREATE TABLE IF NOT EXISTS "ActivityParticipation" (
  "id" SERIAL PRIMARY KEY,
  "activityId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "decidedById" INTEGER,
  "decidedAt" TIMESTAMP(3),
  "report" TEXT,
  "reportAt" TIMESTAMP(3),
  "proofName" TEXT,
  "proofMime" TEXT,
  "proofSize" INTEGER,
  "proofData" BYTEA,
  "checkedInAt" TIMESTAMP(3),
  "checkInLatitude" DOUBLE PRECISION,
  "checkInLongitude" DOUBLE PRECISION,
  "rating" INTEGER,
  "ratingComment" TEXT,
  "ratedById" INTEGER,
  "ratedAt" TIMESTAMP(3),
  "remindedStartAt" TIMESTAMP(3),
  "remindedReportAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ActivityParticipation_activityId_userId_key" ON "ActivityParticipation"("activityId","userId");
CREATE INDEX IF NOT EXISTS "ActivityParticipation_userId_idx" ON "ActivityParticipation"("userId");
CREATE INDEX IF NOT EXISTS "ActivityParticipation_activityId_idx" ON "ActivityParticipation"("activityId");
CREATE INDEX IF NOT EXISTS "ActivityParticipation_status_idx" ON "ActivityParticipation"("status");

CREATE TABLE IF NOT EXISTS "ActivityComment" (
  "id" SERIAL PRIMARY KEY,
  "activityId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ActivityComment_activityId_createdAt_idx" ON "ActivityComment"("activityId","createdAt");
CREATE INDEX IF NOT EXISTS "ActivityComment_userId_idx" ON "ActivityComment"("userId");

CREATE TABLE IF NOT EXISTS "MeritSnapshot" (
  "id" SERIAL PRIMARY KEY,
  "period" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "level" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "cohortSize" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "badge" TEXT,
  "details" JSONB,
  "closedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "MeritSnapshot_period_userId_key" ON "MeritSnapshot"("period","userId");
CREATE INDEX IF NOT EXISTS "MeritSnapshot_period_idx" ON "MeritSnapshot"("period");
CREATE INDEX IF NOT EXISTS "MeritSnapshot_userId_idx" ON "MeritSnapshot"("userId");