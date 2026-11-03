-- CreateTable : plusieurs fichiers par candidature
CREATE TABLE "InternshipApplicationFile" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternshipApplicationFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternshipApplicationFile_applicationId_idx" ON "InternshipApplicationFile"("applicationId");

-- AddForeignKey
ALTER TABLE "InternshipApplicationFile"
  ADD CONSTRAINT "InternshipApplicationFile_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "InternshipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
