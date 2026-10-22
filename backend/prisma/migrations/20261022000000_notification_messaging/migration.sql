-- Messagerie dans les notifications : expéditeur, réponse, position, pièces jointes.
-- Idempotent (IF NOT EXISTS) comme les migrations précédentes.

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "senderId"  INTEGER;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "replyToId" INTEGER;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "latitude"  DOUBLE PRECISION;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "accuracy"  DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "Notification_userId_senderId_idx" ON "Notification"("userId", "senderId");

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_senderId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_replyToId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "NotificationAttachment" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER,
    "uploaderId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationAttachment_notificationId_idx" ON "NotificationAttachment"("notificationId");
CREATE INDEX IF NOT EXISTS "NotificationAttachment_uploaderId_idx" ON "NotificationAttachment"("uploaderId");

ALTER TABLE "NotificationAttachment" DROP CONSTRAINT IF EXISTS "NotificationAttachment_notificationId_fkey";
ALTER TABLE "NotificationAttachment" ADD CONSTRAINT "NotificationAttachment_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationAttachment" DROP CONSTRAINT IF EXISTS "NotificationAttachment_uploaderId_fkey";
ALTER TABLE "NotificationAttachment" ADD CONSTRAINT "NotificationAttachment_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
