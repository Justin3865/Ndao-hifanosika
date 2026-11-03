-- AlterTable
ALTER TABLE "InternshipApplication"
  ADD COLUMN "dossierNumber" TEXT,
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "fileMime" TEXT,
  ADD COLUMN "fileSize" INTEGER,
  ADD COLUMN "fileData" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "InternshipApplication_dossierNumber_key" ON "InternshipApplication"("dossierNumber");
