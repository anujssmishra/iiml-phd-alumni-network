import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { generateConferenceICal } from "../src/lib/ical-generator";
import { parseAttendanceDetails } from "../src/lib/validation";
import { setAttendance, getRoster, getOwnAttendance, NetworkError } from "../src/lib/member-service";
import { GET } from "../src/app/api/conferences/[id]/ics/route";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

async function clearDb() {
  await prisma.conferenceAttendee.deleteMany();
  await prisma.conferenceSuggestion.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.membershipReview.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(email: string, status = "approved", role = "member") {
  return prisma.user.create({
    data: {
      name: `User ${email}`,
      email,
      emailVerified: new Date(),
      membershipStatus: status,
      role,
      directoryVisible: true,
      open_to_chat: true,
      current_institution: "IIM Lucknow",
    },
  });
}

test("Option 2 — Conference Experience Enhancements (Calendar ICS & Attendee Roles)", async (t) => {
  beforeEach(async () => {
    await clearDb();
  });

  await t.test("generateConferenceICal generates valid RFC 5545 format with timezone and metadata", () => {
    const ics = generateConferenceICal({
      id: "conf-icis-2027",
      name: "International Conference on Information Systems 2027",
      acronym: "ICIS 2027",
      startDate: new Date("2027-12-12T00:00:00.000Z"),
      endDate: new Date("2027-12-15T00:00:00.000Z"),
      timezone: "Asia/Kolkata",
      location: "Bangalore, India",
      description: "Premier gathering of IS scholars worldwide.\n### Tracks\nDigital Innovation, AI in Management.",
      url: "https://icis2027.aisnet.org",
      cfpDeadline: new Date("2027-05-01T23:59:59.000Z"),
    });

    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.endsWith("\r\nEND:VCALENDAR\r\n"));
    assert.ok(ics.includes("VERSION:2.0\r\n"));
    assert.ok(ics.includes("PRODID:-//IIM PhD & FPM Alumni Network//EN\r\n"));
    assert.ok(ics.includes("BEGIN:VEVENT\r\n"));
    assert.ok(ics.includes("SUMMARY:ICIS 2027 - International Conference on Information Systems 2027\r\n"));
    assert.ok(ics.includes("LOCATION:Bangalore\\, India\r\n"));
    assert.ok(ics.includes("URL:https://icis2027.aisnet.org/\r\n"));
    assert.ok(ics.includes("DTSTART;VALUE=DATE:20271212\r\n"));
    // Multi-day DTEND should be exclusive (advanced by 1 day to 20271216)
    assert.ok(ics.includes("DTEND;VALUE=DATE:20271216\r\n"));
    // CFP reminder event with VALARM should be included
    assert.ok(ics.includes("SUMMARY:CFP Deadline: ICIS 2027\r\n"));
    assert.ok(ics.includes("BEGIN:VALARM\r\n"));
    assert.ok(ics.includes("TRIGGER:-P7D\r\n"));
    assert.ok(ics.includes("END:VEVENT\r\n"));
  });

  await t.test("parseAttendanceDetails validates roles and bounds paperTitle length", () => {
    // Standard presenter with paper title
    const fd1 = new FormData();
    fd1.set("role", "presenter");
    fd1.set("paperTitle", "  Mechanism Design in Carbon Credit Markets  ");
    const d1 = parseAttendanceDetails(fd1);
    assert.equal(d1.role, "presenter");
    assert.equal(d1.paperTitle, "Mechanism Design in Carbon Credit Markets");

    // Invalid role defaults to "attendee"
    const fd2 = new FormData();
    fd2.set("role", "super_keynote_speaker");
    fd2.set("paperTitle", "");
    assert.throws(() => parseAttendanceDetails(fd2), /listed participation role/);

    // Doctoral consortium fellow
    const fd3 = new FormData();
    fd3.set("role", "doctoral_consortium");
    fd3.set("paperTitle", "Thesis Proposal on Supply Chain Resilience");
    const d3 = parseAttendanceDetails(fd3);
    assert.equal(d3.role, "doctoral_consortium");
    assert.equal(d3.paperTitle, "Thesis Proposal on Supply Chain Resilience");

    // Enforces max title length of 300
    const fd4 = new FormData();
    fd4.set("role", "chair_discussant");
    fd4.set("paperTitle", "A".repeat(400));
    assert.throws(() => parseAttendanceDetails(fd4), /300 characters/);
  });

  await t.test("setAttendance persists and updates participation role and paper title in DB", async () => {
    const member = await createUser("scholar@example.test", "approved", "member");
    const conf = await prisma.conference.create({
      data: {
        id: "conf-aom-2028",
        name: "Academy of Management Annual Meeting 2028",
        acronym: "AOM 2028",
        date: new Date("2028-08-04T00:00:00.000Z"),
        startDate: new Date("2028-08-04T00:00:00.000Z"),
        endDate: new Date("2028-08-08T00:00:00.000Z"),
        location: "Chicago, IL, USA",
        publicationState: "published",
      },
    });

    // 1. Initial RSVP as presenter
    await setAttendance(member.id, conf.id, true, {
      role: "presenter",
      paperTitle: "Strategic Human Capital in Academic Spinoffs",
    });

    const att1 = await getOwnAttendance(member.id, conf.id);
    assert.ok(att1);
    assert.equal(att1.status, "attending");
    assert.equal(att1.role, "presenter");
    assert.equal(att1.paperTitle, "Strategic Human Capital in Academic Spinoffs");

    // 2. Roster reflects scholar participation details
    const roster1 = await getRoster(member.id, conf.id);
    assert.equal(roster1.length, 1);
    assert.equal(roster1[0].userId, member.id);
    assert.equal(roster1[0].role, "presenter");
    assert.equal(roster1[0].paperTitle, "Strategic Human Capital in Academic Spinoffs");

    // 3. Update RSVP to doctoral consortium fellow
    await setAttendance(member.id, conf.id, true, {
      role: "doctoral_consortium",
      paperTitle: "Doctoral Consortium Research Proposal",
    });

    const att2 = await getOwnAttendance(member.id, conf.id);
    assert.equal(att2?.role, "doctoral_consortium");
    assert.equal(att2?.paperTitle, "Doctoral Consortium Research Proposal");

    // 4. Cancel RSVP cleans up the record
    await setAttendance(member.id, conf.id, false);
    const attAfter = await getOwnAttendance(member.id, conf.id);
    assert.equal(attAfter, null);

    const rosterAfter = await getRoster(member.id, conf.id);
    assert.equal(rosterAfter.length, 0);
  });

  await t.test("GET /api/conferences/[id]/ics endpoint serves downloadable calendar stream", async () => {
    const conf = await prisma.conference.create({
      data: {
        id: "conf-download-ics-test",
        name: "Strategic Management Society Annual Conference 2028",
        acronym: "SMS 2028",
        date: new Date("2028-10-14T00:00:00.000Z"),
        startDate: new Date("2028-10-14T00:00:00.000Z"),
        endDate: new Date("2028-10-17T00:00:00.000Z"),
        location: "London, UK",
        url: "https://sms2028.org",
        publicationState: "published",
      },
    });

    // 1. Valid request to published conference
    const req = new NextRequest("http://127.0.0.1:3100/api/conferences/conf-download-ics-test/ics");
    const res = await GET(req, { params: Promise.resolve({ id: "conf-download-ics-test" }) });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "text/calendar; charset=utf-8");
    assert.ok(res.headers.get("Content-Disposition")?.includes("sms-2028.ics"));

    const body = await res.text();
    assert.ok(body.includes("BEGIN:VCALENDAR"));
    assert.ok(body.includes("SUMMARY:SMS 2028 - Strategic Management Society Annual Conference 2028"));
    assert.ok(body.includes("LOCATION:London\\, UK"));

    // 2. Request for nonexistent conference returns 404
    const notFoundReq = new NextRequest("http://127.0.0.1:3100/api/conferences/non-existent-id/ics");
    const notFoundRes = await GET(notFoundReq, { params: Promise.resolve({ id: "non-existent-id" }) });
    assert.equal(notFoundRes.status, 404);
  });
});
