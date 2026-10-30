-- CreateTable
CREATE TABLE "AnomalyAction" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "userId" INTEGER,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnomalyAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyAction_key_key" ON "AnomalyAction"("key");

-- CreateIndex
CREATE INDEX "AnomalyAction_status_idx" ON "AnomalyAction"("status");
