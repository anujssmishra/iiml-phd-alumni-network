-- AlterTable Conference: add new columns
ALTER TABLE "Conference" ADD COLUMN "acronym" TEXT;
ALTER TABLE "Conference" ADD COLUMN "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Conference" ADD COLUMN "endDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Conference" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Conference" ADD COLUMN "cfpDeadline" DATETIME;
ALTER TABLE "Conference" ADD COLUMN "publicationState" TEXT NOT NULL DEFAULT 'draft' CHECK ("publicationState" IN ('draft', 'published', 'archived'));
ALTER TABLE "Conference" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Conference" ADD COLUMN "sourceCheckedAt" DATETIME;
ALTER TABLE "Conference" ADD COLUMN "curatorId" TEXT CONSTRAINT "Conference_curatorId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conference" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable ConferenceSuggestion
CREATE TABLE "ConferenceSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConferenceSuggestion_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Conference_publicationState_startDate_idx" ON "Conference"("publicationState", "startDate");

-- CreateIndex
CREATE INDEX "ConferenceSuggestion_status_createdAt_idx" ON "ConferenceSuggestion"("status", "createdAt");
