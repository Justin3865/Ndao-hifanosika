-- Téléphones : 10 chiffres seulement (ex. 0340000000).
-- Normalise les numéros existants : "+261 34 00 000 00" / "261340000000" -> "0340000000" ;
-- les autres formats sont réduits à leurs chiffres. Un numéro qui ne donne pas 10 chiffres est laissé tel quel.
CREATE OR REPLACE FUNCTION pg_temp.norm_phone(p TEXT) RETURNS TEXT AS $$
DECLARE d TEXT;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(p, '\D', '', 'g');
  IF length(d) = 12 AND d LIKE '261%' THEN RETURN '0' || substr(d, 4); END IF;
  IF length(d) = 10 THEN RETURN d; END IF;
  RETURN p;
END;
$$ LANGUAGE plpgsql;

UPDATE "User"                   SET "phone"       = pg_temp.norm_phone("phone")       WHERE "phone" IS NOT NULL;
UPDATE "Beneficiary"            SET "phone"       = pg_temp.norm_phone("phone")       WHERE "phone" IS NOT NULL;
UPDATE "InternshipApplication"  SET "phone"       = pg_temp.norm_phone("phone")       WHERE "phone" IS NOT NULL;
UPDATE "Zone"                   SET "phone"       = pg_temp.norm_phone("phone")       WHERE "phone" IS NOT NULL;
UPDATE "Certificate"            SET "holderPhone" = pg_temp.norm_phone("holderPhone") WHERE "holderPhone" IS NOT NULL;
UPDATE "Partner"                SET "phone"       = pg_temp.norm_phone("phone")       WHERE "phone" IS NOT NULL;
