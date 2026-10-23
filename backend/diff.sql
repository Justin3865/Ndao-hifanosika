-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE');
ALTER TABLE "public"."User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropIndex
DROP INDEX "Mission_userId_idx";

-- DropIndex
DROP INDEX "MissionPoint_missionId_idx";

-- DropIndex
DROP INDEX "Notification_read_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- DropIndex
DROP INDEX "User_matricule_key";

-- AlterTable
ALTER TABLE "Beneficiary" DROP COLUMN "electricityAccess",
DROP COLUMN "healthIssues",
DROP COLUMN "housingType",
DROP COLUMN "lastSurveyAt",
DROP COLUMN "mealsPerDay",
DROP COLUMN "outOfSchoolChildren",
DROP COLUMN "surveyCount",
DROP COLUMN "waterAccess";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "email",
DROP COLUMN "isActive",
DROP COLUMN "manager",
DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "Mission" DROP COLUMN "userId",
ADD COLUMN     "agentId" INTEGER NOT NULL,
ADD COLUMN     "endReason" TEXT;

-- AlterTable
ALTER TABLE "MissionPoint" ADD COLUMN     "heading" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "commentaires",
DROP COLUMN "competences",
DROP COLUMN "dateEntree",
DROP COLUMN "dateSortie",
DROP COLUMN "fonction",
DROP COLUMN "localisation",
DROP COLUMN "matricule",
DROP COLUMN "memberRole",
DROP COLUMN "responsable";

-- AlterTable
ALTER TABLE "Zone" ALTER COLUMN "latitude" DROP DEFAULT,
ALTER COLUMN "longitude" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "HouseholdSurvey";

-- CreateTable
CREATE TABLE "Survey" (
    "id" SERIAL NOT NULL,
    "beneficiaryId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "missionId" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "householdSize" INTEGER,
    "monthlyIncome" DOUBLE PRECISION,
    "childrenUnder5" INTEGER,
    "outOfSchoolChildren" INTEGER,
    "mealsPerDay" INTEGER,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "healthIssues" BOOLEAN,
    "waterAccess" BOOLEAN,
    "electricityAccess" BOOLEAN,
    "housingType" TEXT,
    "vulnerable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Survey_beneficiaryId_createdAt_idx" ON "Survey"("beneficiaryId", "createdAt");

-- CreateIndex
CREATE INDEX "Survey_agentId_idx" ON "Survey"("agentId");

-- CreateIndex
CREATE INDEX "Survey_missionId_idx" ON "Survey"("missionId");

-- CreateIndex
CREATE INDEX "Mission_agentId_idx" ON "Mission"("agentId");

-- CreateIndex
CREATE INDEX "Mission_startedAt_idx" ON "Mission"("startedAt");

-- CreateIndex
CREATE INDEX "Mission_endedAt_idx" ON "Mission"("endedAt");

-- CreateIndex
CREATE INDEX "MissionPoint_missionId_createdAt_idx" ON "MissionPoint"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionPoint_createdAt_idx" ON "MissionPoint"("createdAt");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionPoint" ADD CONSTRAINT "MissionPoint_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
