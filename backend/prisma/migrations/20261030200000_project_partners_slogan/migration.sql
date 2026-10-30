-- Slogan du projet + slogan figé sur le certificat
ALTER TABLE "Project"     ADD COLUMN IF NOT EXISTS "slogan" TEXT;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "slogan" TEXT;

-- Partenaires (les tables n'étaient créées par aucune migration précédente ;
-- tout est idempotent au cas où elles existeraient déjà via « prisma db push »)
DO $$ BEGIN
  CREATE TYPE "PartnerType" AS ENUM ('FUNDING_PARTNER','IMPLEMENTING_PARTNER','TECHNICAL_PARTNER','INSTITUTIONAL_PARTNER','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Partner" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "type"        "PartnerType" NOT NULL DEFAULT 'OTHER',
  "slogan"      TEXT,
  "logoUrl"     TEXT,
  "website"     TEXT,
  "description" TEXT,
  "email"       TEXT,
  "phone"       TEXT,
  "address"     TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "Partner_type_idx"     ON "Partner"("type");
CREATE INDEX IF NOT EXISTS "Partner_isActive_idx" ON "Partner"("isActive");

CREATE TABLE IF NOT EXISTS "ProjectPartner" (
  "id"           SERIAL PRIMARY KEY,
  "projectId"    INTEGER NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "partnerId"    INTEGER NOT NULL REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "role"         TEXT,
  "contribution" TEXT,
  "startDate"    TIMESTAMP(3),
  "endDate"      TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectPartner_projectId_partnerId_key" ON "ProjectPartner"("projectId","partnerId");
CREATE INDEX IF NOT EXISTS "ProjectPartner_projectId_idx" ON "ProjectPartner"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectPartner_partnerId_idx" ON "ProjectPartner"("partnerId");

CREATE TABLE IF NOT EXISTS "CertificatePartner" (
  "id"             SERIAL PRIMARY KEY,
  "certificateId"  INTEGER NOT NULL REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "partnerId"      INTEGER NOT NULL REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "role"           TEXT,
  "displayOrder"   INTEGER NOT NULL DEFAULT 0,
  "nameSnapshot"   TEXT NOT NULL,
  "sloganSnapshot" TEXT,
  "logoSnapshot"   TEXT
);
CREATE INDEX IF NOT EXISTS "CertificatePartner_certificateId_idx" ON "CertificatePartner"("certificateId");
CREATE INDEX IF NOT EXISTS "CertificatePartner_partnerId_idx"     ON "CertificatePartner"("partnerId");
