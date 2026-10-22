-- Archivage des notifications / messages (par destinataire).
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Notification_userId_archived_idx" ON "Notification"("userId", "archived");
