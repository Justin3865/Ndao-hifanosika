CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "InternshipOffer" (
  "id"          SERIAL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "domain"      TEXT,
  "location"    TEXT,
  "duration"    TEXT,
  "deadline"    TIMESTAMP(3),
  "places"      INTEGER,
  "description" TEXT NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE INDEX "InternshipOffer_isActive_idx"  ON "InternshipOffer"("isActive");
CREATE INDEX "InternshipOffer_createdAt_idx" ON "InternshipOffer"("createdAt");

CREATE TABLE "InternshipApplication" (
  "id"         SERIAL PRIMARY KEY,
  "offerId"    INTEGER NOT NULL,
  "userId"     INTEGER NOT NULL,
  "phone"      TEXT,
  "school"     TEXT,
  "level"      TEXT,
  "motivation" TEXT NOT NULL,
  "status"     "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "InternshipApplication_offerId_userId_key"
  ON "InternshipApplication"("offerId", "userId");
CREATE INDEX "InternshipApplication_offerId_idx" ON "InternshipApplication"("offerId");
CREATE INDEX "InternshipApplication_userId_idx"  ON "InternshipApplication"("userId");
CREATE INDEX "InternshipApplication_status_idx"  ON "InternshipApplication"("status");

ALTER TABLE "InternshipApplication"
  ADD CONSTRAINT "InternshipApplication_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "InternshipOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternshipApplication"
  ADD CONSTRAINT "InternshipApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;