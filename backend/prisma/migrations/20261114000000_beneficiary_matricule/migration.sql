-- Matricule automatique des bénéficiaires (NH-AAAA-BEN-0001) : colonne facultative et unique.
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "matricule" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Beneficiary_matricule_key" ON "Beneficiary"("matricule");
