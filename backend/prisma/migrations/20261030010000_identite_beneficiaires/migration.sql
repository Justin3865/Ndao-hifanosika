-- Identité complète des bénéficiaires (naissance + CIN) pour remplir automatiquement les certificats.
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "birthPlace" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "cinNumber" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "cinIssuedAt" TIMESTAMP(3);
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "cinIssuedPlace" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "cinDuplicata" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "cinDuplicataAt" TIMESTAMP(3);
