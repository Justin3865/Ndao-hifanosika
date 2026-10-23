-- Messages programmés
CREATE TABLE "ScheduledMessage" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "audience" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "recipientCount" INTEGER,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_ScheduledAttachments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE INDEX "ScheduledMessage_status_scheduledAt_idx" ON "ScheduledMessage"("status", "scheduledAt");
CREATE INDEX "ScheduledMessage_senderId_idx" ON "ScheduledMessage"("senderId");
CREATE UNIQUE INDEX "_ScheduledAttachments_AB_unique" ON "_ScheduledAttachments"("A", "B");
CREATE INDEX "_ScheduledAttachments_B_index" ON "_ScheduledAttachments"("B");

ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ScheduledAttachments" ADD CONSTRAINT "_ScheduledAttachments_A_fkey" FOREIGN KEY ("A") REFERENCES "NotificationAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ScheduledAttachments" ADD CONSTRAINT "_ScheduledAttachments_B_fkey" FOREIGN KEY ("B") REFERENCES "ScheduledMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
