-- LOT 3 · Livrables attendus par jalon (cahier §5.2) — 100 % ADDITIF (nouvelle table, aucune colonne existante modifiée).
CREATE TABLE IF NOT EXISTS "milestone_deliverables" (
  "id" SERIAL NOT NULL,
  "milestoneId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNED',          -- PLANNED | DELIVERED | VALIDATED | REJECTED
  "fileUrl" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "deliveredById" INTEGER,
  "validatedAt" TIMESTAMP(3),
  "validatedById" INTEGER,
  "reviewComment" TEXT,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "milestone_deliverables_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "milestone_deliverables_milestoneId_idx" ON "milestone_deliverables"("milestoneId");
CREATE INDEX IF NOT EXISTS "milestone_deliverables_status_idx" ON "milestone_deliverables"("status");
DO $$ BEGIN
  ALTER TABLE "milestone_deliverables" ADD CONSTRAINT "milestone_deliverables_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
