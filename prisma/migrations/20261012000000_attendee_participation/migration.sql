-- AlterTable
ALTER TABLE "ConferenceAttendee" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'attendee';
ALTER TABLE "ConferenceAttendee" ADD COLUMN "paperTitle" TEXT;
