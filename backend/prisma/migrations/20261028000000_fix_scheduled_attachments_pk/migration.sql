-- Prisma 7 attend une clé primaire (A, B) sur la table de liaison implicite
ALTER TABLE "_ScheduledAttachments" ADD CONSTRAINT "_ScheduledAttachments_AB_pkey" PRIMARY KEY ("A", "B");

DROP INDEX "_ScheduledAttachments_AB_unique";
