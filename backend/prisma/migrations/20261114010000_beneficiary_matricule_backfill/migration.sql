-- Donne un matricule NH-AAAA-BEN-xxxx aux bénéficiaires existants qui n'en ont pas encore
-- (ordre de création, en continuant après le plus grand numéro déjà attribué).
WITH base AS (
  SELECT COALESCE(MAX(substring("matricule" from '^NH-\d{4}-BEN-(\d+)$')::int), 0) AS m
  FROM "Beneficiary"
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Beneficiary"
  WHERE "matricule" IS NULL
)
UPDATE "Beneficiary" b
SET "matricule" = 'NH-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-BEN-' || LPAD((base.m + ranked.rn)::text, 4, '0')
FROM ranked, base
WHERE b."id" = ranked."id";
