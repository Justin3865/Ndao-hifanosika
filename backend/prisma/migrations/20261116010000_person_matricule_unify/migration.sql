-- Matricule unique d'une personne : le ménage enquêté garde son numéro en devenant bénéficiaire.
-- 1) un candidat déjà inscrit reprend le matricule de son bénéficiaire
UPDATE "enrollment_candidates" c
SET "code" = b."matricule"
FROM "Beneficiary" b
WHERE c."beneficiaryId" = b."id" AND b."matricule" IS NOT NULL;

-- 2) les autres candidats (anciens NH-AAAA-CAN-xxxx) passent dans la suite NH-AAAA-BEN-xxxx, à la suite du plus grand numéro des deux tables
WITH base AS (
  SELECT GREATEST(
    COALESCE((SELECT MAX(substring("matricule" from '^NH-\d{4}-BEN-(\d+)$')::int) FROM "Beneficiary"), 0),
    COALESCE((SELECT MAX(substring("code" from '^NH-\d{4}-BEN-(\d+)$')::int) FROM "enrollment_candidates"), 0)
  ) AS m
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "enrollment_candidates"
  WHERE "code" IS NULL OR "code" !~ '^NH-\d{4}-BEN-\d+$'
)
UPDATE "enrollment_candidates" c
SET "code" = 'NH-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-BEN-' || LPAD((base.m + ranked.rn)::text, 4, '0')
FROM ranked, base
WHERE c."id" = ranked."id";
