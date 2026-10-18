-- NB : la table "Notification" existe deja dans la base : on n'y touche pas.

-- Zones d'intervention
CREATE TABLE IF NOT EXISTS "ZoneIntervention" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "district" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ZoneIntervention_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ZoneIntervention_name_key" ON "ZoneIntervention"("name");

-- Beneficiaire : altitude + zone
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "altitude" DOUBLE PRECISION;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "zoneId" INTEGER;
CREATE INDEX IF NOT EXISTS "Beneficiary_zoneId_idx" ON "Beneficiary"("zoneId");
ALTER TABLE "Beneficiary" DROP CONSTRAINT IF EXISTS "Beneficiary_zoneId_fkey";
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "ZoneIntervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Position GPS en direct des mpiasa
CREATE TABLE IF NOT EXISTS "UserLocation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserLocation_userId_key" ON "UserLocation"("userId");
ALTER TABLE "UserLocation" DROP CONSTRAINT IF EXISTS "UserLocation_userId_fkey";
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;