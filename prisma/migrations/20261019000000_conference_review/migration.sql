ALTER TABLE "Conference" ADD COLUMN "sourceFetchedAt" DATETIME;
ALTER TABLE "Conference" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "Conference" ADD COLUMN "reviewedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conference" ADD COLUMN "reviewedFields" TEXT;
ALTER TABLE "ConferenceSuggestion" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "ConferenceSuggestion" ADD COLUMN "cfpDeadline" DATETIME;

CREATE TABLE "ConferenceRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conferenceId" TEXT NOT NULL,
  "actorId" TEXT,
  "reason" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "beforeJson" TEXT,
  "afterJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConferenceRevision_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConferenceRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ConferenceRevision_conferenceId_createdAt_idx" ON "ConferenceRevision"("conferenceId", "createdAt");

-- Preserve old publication state in the initial audit snapshot. Earlier source
-- timestamps did not establish human review, so retained non-demo listings need
-- an explicit curator review before they can be published again. No rows or
-- attendance are deleted. This migration must be rehearsed before retained use.
INSERT INTO "ConferenceRevision" ("id", "conferenceId", "reason", "sourceUrl", "beforeJson", "afterJson")
SELECT 'legacy-review-' || "id", "id", 'Legacy listing returned to draft: human review evidence was not recorded.', "sourceUrl",
  json_object('publicationState', "publicationState", 'sourceCheckedAt', "sourceCheckedAt"),
  json_object('publicationState', 'draft', 'sourceCheckedAt', NULL)
FROM "Conference" WHERE "publicationState" = 'published' AND "isDemo" = 0;
UPDATE "Conference" SET "publicationState" = 'draft', "sourceCheckedAt" = NULL WHERE "publicationState" = 'published' AND "isDemo" = 0;
