-- Zones : type (province, région, district, commune, fokontany) et contour géographique (GeoJSON)
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "level" TEXT;
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "boundary" TEXT;
