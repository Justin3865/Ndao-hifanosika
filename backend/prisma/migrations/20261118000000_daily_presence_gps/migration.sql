-- Pointage journalier GPS (arrivée vérifiée au siège / sur le terrain + départ avec les tâches du jour)
CREATE TABLE IF NOT EXISTS "daily_presences" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "day" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'SIEGE',
  "internshipId" INTEGER,
  "projectId" INTEGER,
  "missionId" INTEGER,
  "checkInAt" TIMESTAMP(3) NOT NULL,
  "inLatitude" DOUBLE PRECISION NOT NULL,
  "inLongitude" DOUBLE PRECISION NOT NULL,
  "inAltitude" DOUBLE PRECISION,
  "inAccuracy" DOUBLE PRECISION,
  "inZoneId" INTEGER,
  "inDistanceM" DOUBLE PRECISION,
  "inExpectedAltitude" DOUBLE PRECISION,
  "checkOutAt" TIMESTAMP(3),
  "outLatitude" DOUBLE PRECISION,
  "outLongitude" DOUBLE PRECISION,
  "outAltitude" DOUBLE PRECISION,
  "outAccuracy" DOUBLE PRECISION,
  "outDistanceM" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'OK',
  "flags" JSONB,
  "tasksDone" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_presences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_presences_userId_day_key" ON "daily_presences"("userId", "day");
CREATE INDEX IF NOT EXISTS "daily_presences_day_idx" ON "daily_presences"("day");
CREATE INDEX IF NOT EXISTS "daily_presences_internshipId_idx" ON "daily_presences"("internshipId");
CREATE INDEX IF NOT EXISTS "daily_presences_projectId_idx" ON "daily_presences"("projectId");

CREATE TABLE IF NOT EXISTS "daily_presence_tasks" (
  "id" SERIAL NOT NULL,
  "presenceId" INTEGER NOT NULL,
  "internshipTaskId" INTEGER,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "progress" INTEGER,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_presence_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "daily_presence_tasks_presenceId_idx" ON "daily_presence_tasks"("presenceId");
CREATE INDEX IF NOT EXISTS "daily_presence_tasks_internshipTaskId_idx" ON "daily_presence_tasks"("internshipTaskId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_presence_tasks_presenceId_fkey') THEN
    ALTER TABLE "daily_presence_tasks"
      ADD CONSTRAINT "daily_presence_tasks_presenceId_fkey"
      FOREIGN KEY ("presenceId") REFERENCES "daily_presences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
