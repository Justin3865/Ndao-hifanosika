-- Journal horodaté (à la seconde) des enregistrements, suppressions et absences automatiques de présence.
CREATE TABLE IF NOT EXISTS "AttendanceLog" (
  "id" SERIAL PRIMARY KEY,
  "activityId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "beneficiaryId" INTEGER,
  "userId" INTEGER,
  "userName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceLog_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AttendanceLog_activityId_createdAt_idx" ON "AttendanceLog"("activityId", "createdAt");
