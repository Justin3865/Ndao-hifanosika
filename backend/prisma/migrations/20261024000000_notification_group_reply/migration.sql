-- Réponse au groupe : les messages d'un même envoi de groupe partagent un batchId.
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "groupSize" INTEGER;
CREATE INDEX IF NOT EXISTS "Notification_batchId_idx" ON "Notification"("batchId");
