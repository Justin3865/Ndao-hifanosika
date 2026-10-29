-- CIN (carte d'identité nationale) du personnel : numéro, date/lieu de délivrance, duplicata
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cinNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cinIssuedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cinIssuedPlace" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cinDuplicata" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cinDuplicataAt" TIMESTAMP(3);

-- Copie figée dans le certificat + cas particulier
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "holderPhone" TEXT;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "holderCin" TEXT;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "holderCinIssuedAt" TIMESTAMP(3);
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "holderCinIssuedPlace" TEXT;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "holderCinDuplicata" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "holderCinDuplicataAt" TIMESTAMP(3);
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "specialCase" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "specialCaseNote" TEXT;