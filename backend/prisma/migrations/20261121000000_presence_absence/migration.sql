-- Absence déclarée (« 0 · Absent ») : une ligne par membre et par jour, avec un motif facultatif.
-- Table séparée de daily_presences : une absence n'est jamais comptée comme un pointage de présence.
CREATE TABLE IF NOT EXISTS "presence_absences" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "day" TEXT NOT NULL,
  "internshipId" INTEGER,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "presence_absences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "presence_absences_userId_day_key" ON "presence_absences"("userId", "day");
CREATE INDEX IF NOT EXISTS "presence_absences_day_idx" ON "presence_absences"("day");
CREATE INDEX IF NOT EXISTS "presence_absences_internshipId_idx" ON "presence_absences"("internshipId");
