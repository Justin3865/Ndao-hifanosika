-- Messages de groupe : une pièce jointe peut être liée à plusieurs notifications
-- (table de liaison implicite Prisma) + abonnements Web Push.

CREATE TABLE IF NOT EXISTS "_NotificationToNotificationAttachment" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_NotificationToNotificationAttachment_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX IF NOT EXISTS "_NotificationToNotificationAttachment_B_index"
  ON "_NotificationToNotificationAttachment"("B");

ALTER TABLE "_NotificationToNotificationAttachment"
  DROP CONSTRAINT IF EXISTS "_NotificationToNotificationAttachment_A_fkey";
ALTER TABLE "_NotificationToNotificationAttachment"
  ADD CONSTRAINT "_NotificationToNotificationAttachment_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_NotificationToNotificationAttachment"
  DROP CONSTRAINT IF EXISTS "_NotificationToNotificationAttachment_B_fkey";
ALTER TABLE "_NotificationToNotificationAttachment"
  ADD CONSTRAINT "_NotificationToNotificationAttachment_B_fkey"
  FOREIGN KEY ("B") REFERENCES "NotificationAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des liens existants (ancienne colonne notificationId)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'NotificationAttachment' AND column_name = 'notificationId'
  ) THEN
    INSERT INTO "_NotificationToNotificationAttachment" ("A", "B")
    SELECT "notificationId", "id" FROM "NotificationAttachment"
    WHERE "notificationId" IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

ALTER TABLE "NotificationAttachment" DROP CONSTRAINT IF EXISTS "NotificationAttachment_notificationId_fkey";
DROP INDEX IF EXISTS "NotificationAttachment_notificationId_idx";
ALTER TABLE "NotificationAttachment" DROP COLUMN IF EXISTS "notificationId";

-- Abonnements Web Push
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS "PushSubscription_userId_fkey";
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
