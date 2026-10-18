-- ---------------------------------------------------------------------------
-- 1) Notifications : cette table n'était créée par aucune migration
--    (elle n'existait que dans la base locale). Création idempotente.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2) Zones : une seule table de référence, "Zone".
--    Les formulaires, les listes déroulantes (/api/lookups/zones) et la carte
--    utilisent "Zone" ; la clé étrangère de Beneficiary.zoneId pointait encore
--    vers l'ancienne table "ZoneIntervention" (erreur 500 à l'enregistrement
--    d'un bénéficiaire rattaché à une zone).
-- ---------------------------------------------------------------------------
UPDATE "Beneficiary" SET "zoneId" = NULL
 WHERE "zoneId" IS NOT NULL
   AND "zoneId" NOT IN (SELECT "id" FROM "Zone");

ALTER TABLE "Beneficiary" DROP CONSTRAINT IF EXISTS "Beneficiary_zoneId_fkey";
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Anciennes tables jamais alimentées par l'API (routes non montées) : supprimées.
DROP TABLE IF EXISTS "UserLocation";
DROP TABLE IF EXISTS "ZoneIntervention";
