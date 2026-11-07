-- Matricule automatique des missions terrain (NH-AAAA-MIS-0001) : colonne unique + rattrapage des missions existantes.
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Mission_code_key" ON "Mission"("code");

WITH base AS (
  SELECT COALESCE(MAX(substring("code" from '^NH-\d{4}-MIS-(\d+)$')::int), 0) AS m
  FROM "Mission"
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "startedAt" ASC, "id" ASC) AS rn
  FROM "Mission"
  WHERE "code" IS NULL
)
UPDATE "Mission" mi
SET "code" = 'NH-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-MIS-' || LPAD((base.m + ranked.rn)::text, 4, '0')
FROM ranked, base
WHERE mi."id" = ranked."id";
