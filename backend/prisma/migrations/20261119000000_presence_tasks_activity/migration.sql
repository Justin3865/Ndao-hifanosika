-- Tâches du jour d'un membre non stagiaire : lien vers l'activité du projet (avancement du projet)
ALTER TABLE "daily_presence_tasks" ADD COLUMN IF NOT EXISTS "activityId" INTEGER;
CREATE INDEX IF NOT EXISTS "daily_presence_tasks_activityId_idx" ON "daily_presence_tasks"("activityId");
