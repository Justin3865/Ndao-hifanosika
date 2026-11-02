-- AlterTable
ALTER TABLE "User" ADD COLUMN "matricule" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_matricule_key" ON "User"("matricule");
