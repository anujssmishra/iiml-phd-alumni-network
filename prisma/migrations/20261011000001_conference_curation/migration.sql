-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "cfpDeadline" DATETIME,
    "publicationState" TEXT NOT NULL DEFAULT 'draft' CHECK ("publicationState" IN ('draft', 'published', 'archived')),
    "location" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "sourceUrl" TEXT,
    "sourceCheckedAt" DATETIME,
    "curatorId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conference_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conference" ("id", "name", "date", "startDate", "endDate", "location", "description", "url", "createdAt", "updatedAt")
SELECT "id", "name", "date", "date", "date", "location", "description", "url", "createdAt", "updatedAt" FROM "Conference";
DROP TABLE "Conference";
ALTER TABLE "new_Conference" RENAME TO "Conference";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
