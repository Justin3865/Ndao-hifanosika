-- Missions terrain, points GPS et enquêtes ménages
CREATE TABLE "Mission" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endReason" TEXT,
    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissionPoint" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionPoint_pkey" PRIMARY KEY ("id")
);

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

CREATE INDEX "Mission_agentId_idx" ON "Mission"("agentId");
CREATE INDEX "Mission_startedAt_idx" ON "Mission"("startedAt");
CREATE INDEX "Mission_endedAt_idx" ON "Mission"("endedAt");
CREATE INDEX "MissionPoint_missionId_createdAt_idx" ON "MissionPoint"("missionId", "createdAt");
CREATE INDEX "MissionPoint_createdAt_idx" ON "MissionPoint"("createdAt");
CREATE INDEX "Survey_beneficiaryId_createdAt_idx" ON "Survey"("beneficiaryId", "createdAt");
CREATE INDEX "Survey_agentId_idx" ON "Survey"("agentId");
CREATE INDEX "Survey_missionId_idx" ON "Survey"("missionId");

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionPoint" ADD CONSTRAINT "MissionPoint_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
