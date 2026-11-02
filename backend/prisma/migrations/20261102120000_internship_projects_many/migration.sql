-- CreateTable
CREATE TABLE "InternshipProject" (
    "internshipId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternshipProject_pkey" PRIMARY KEY ("internshipId","projectId")
);

-- CreateIndex
CREATE INDEX "InternshipProject_projectId_idx" ON "InternshipProject"("projectId");

-- AddForeignKey
ALTER TABLE "InternshipProject" ADD CONSTRAINT "InternshipProject_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "Internship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipProject" ADD CONSTRAINT "InternshipProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des rattachements existants (projet unique -> table de liens)
INSERT INTO "InternshipProject" ("internshipId","projectId")
SELECT "id","projectId" FROM "Internship" WHERE "projectId" IS NOT NULL
ON CONFLICT DO NOTHING;
