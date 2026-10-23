-- Heure de réception : createdAt = heure d'envoi, receivedAt = arrivée chez le destinataire.
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

-- Messages existants : considérés reçus au moment de leur création
UPDATE "Notification" SET "receivedAt" = "createdAt" WHERE "receivedAt" IS NULL;
