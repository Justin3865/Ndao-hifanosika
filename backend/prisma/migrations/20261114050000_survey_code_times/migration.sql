-- Enquêtes ménage : matricule automatique (NH-AAAA-ENQ-0001) + début / fin (détection d'anomalies).
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Survey_code_key" ON "Survey"("code");

-- Enquêtes déjà enregistrées : la fin = date d'enregistrement (le début n'a pas été relevé)
UPDATE "Survey" SET "endedAt" = "createdAt" WHERE "endedAt" IS NULL;

WITH base AS (
  SELECT COALESCE(MAX(substring("code" from '^NH-\d{4}-ENQ-(\d+)$')::int), 0) AS m
  FROM "Survey"
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Survey"
  WHERE "code" IS NULL
)
UPDATE "Survey" sv
SET "code" = 'NH-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-ENQ-' || LPAD((base.m + ranked.rn)::text, 4, '0')
FROM ranked, base
WHERE sv."id" = ranked."id";
