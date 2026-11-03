-- Localisation administrative du ménage + adresse exacte du bénéficiaire
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "adminProvince" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "adminRegion" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "adminDistrict" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "adminCommune" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "adminFokontany" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "addressDetail" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "zoneUnits" TEXT;
