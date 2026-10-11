-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "current_institution" TEXT,
    "current_title" TEXT,
    "research_domain" TEXT,
    "methodological_expertise" TEXT,
    "open_to_chat" BOOLEAN NOT NULL DEFAULT false,
    "membershipStatus" TEXT NOT NULL DEFAULT 'pending' CHECK ("membershipStatus" IN ('pending', 'approved', 'rejected', 'suspended')),
    "role" TEXT NOT NULL DEFAULT 'member' CHECK ("role" IN ('member', 'curator', 'admin')),
    "doctoralInstitution" TEXT,
    "programme" TEXT CHECK ("programme" IS NULL OR "programme" IN ('PhD', 'FPM')),
    "batchYear" INTEGER,
    "membershipEvidence" TEXT,
    "applicationSubmittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "directoryVisible" BOOLEAN NOT NULL DEFAULT false,
    "profileConfirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MembershipReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewerId" TEXT,
    "targetId" TEXT,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL,
    "toRole" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MembershipReview_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "replyEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'declined', 'cancelled')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConferenceAttendee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'attending' CHECK ("status" IN ('attending', 'considering')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConferenceAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConferenceAttendee_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_membershipStatus_directoryVisible_current_institution_idx" ON "User"("membershipStatus", "directoryVisible", "current_institution");

-- CreateIndex
CREATE INDEX "MembershipReview_targetId_createdAt_idx" ON "MembershipReview"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_senderId_createdAt_idx" ON "ContactRequest"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_recipientId_status_idx" ON "ContactRequest"("recipientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceAttendee_userId_conferenceId_key" ON "ConferenceAttendee"("userId", "conferenceId");


-- One active request per direction, including concurrent submissions.
CREATE UNIQUE INDEX "ContactRequest_active_pair_key" ON "ContactRequest"("senderId", "recipientId") WHERE "status" IN ('pending', 'accepted');
