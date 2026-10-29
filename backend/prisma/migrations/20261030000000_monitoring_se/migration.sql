-- AlterTable
ALTER TABLE "Project" ADD COLUMN "budgetSpent" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "budgetSpent" DECIMAL(15,2),
ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "actualStartDate" TIMESTAMP(3),
ADD COLUMN "actualEndDate" TIMESTAMP(3);

-- Les activités déjà terminées / en cours reçoivent un avancement cohérent
UPDATE "Activity" SET "progress" = 100 WHERE "status" = 'COMPLETED';
UPDATE "Activity" SET "progress" = 50 WHERE "status" = 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "IndicatorMeasurement" (
    "id" SERIAL NOT NULL,
    "indicatorId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicatorMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndicatorMeasurement_indicatorId_collectedAt_idx" ON "IndicatorMeasurement"("indicatorId", "collectedAt");

-- AddForeignKey
ALTER TABLE "IndicatorMeasurement" ADD CONSTRAINT "IndicatorMeasurement_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "ProjectIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
