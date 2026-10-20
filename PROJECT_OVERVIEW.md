# IIM PhD & FPM Alumni Network — Project Overview

Version 1.8 · Updated 20 October 2026 · P2C implementation accepted at `45da2c9`, published for review.

P2A development safety and P2B manual curation are merged. P2C adds recovery, fail-closed lineage inventory, bounded legacy candidate-copy repair and [offline verification](docs/OFFLINE_VERIFICATION.md). [Dependency remediation](docs/DEPENDENCY_REVIEW.md) reports zero full/omit-dev findings using scoped compatibility-tested replacements, retaining Next/Prisma versions. [Exact-revision local and Linux acceptance](docs/RELEASE_ACCEPTANCE.md) passed; retained-history acceptance is not applicable because the owner confirmed no retained database exists. Evidence is separate from real OAuth, external facts and deployment in [IMPLEMENTATION_CHECKS.md](docs/IMPLEMENTATION_CHECKS.md). The execution contract is [PLAN.md](PLAN.md).

The café reference's eight-part structure, small-pilot approach and human editorial operation remain represented by the [planning skill](skills/community-platform-planning/SKILL.md).

## 1. Purpose and current product

An independent academic community for IIM PhD/FPM scholars and alumni, starting with a proposed IIM Lucknow cohort. Membership review, consent-based discovery and conference coordination are the core. Institutional endorsement is not established.

| Capability | Observed implementation |
| --- | --- |
| Membership | Verified Google identity policy; reviewed status/roles, audit and current-state access checks |
| Directory/contact | Opt-in profiles, private filters/pagination, consent-based introductions, withdrawal/deletion |
| Curation | Draft/suggestion review, explicit source-confirmed publication, corrections, archive and version restore |
| Participation | Session-derived RSVP, bounded role/paper title, consent-filtered member roster |
| Own attendance | Private My RSVPs page; cancellation after archive without revealing unpublished facts |
| Calendars | All-day event dates plus exact UTC CFP reminder, safe text folding and non-cached export |
| Queues/history | Stable pagination for catalogue, suggestions, own suggestions and correction history |
| Ingestion | Runtime fetch/sync/scheduler/cron disabled for P2; additive draft-only catalogue import |
| Collaboration/vault | Co-authorship, mentorship, housing coordination and document sharing remain proposed |

## 2. Stack and hosting decision

| Layer | Current source |
| --- | --- |
| App | Next.js 16.4, React 19.3, TypeScript/App Router, Webpack |
| Runtime | Node 24/npm, committed package lock |
| Persistence | Prisma/client 6.19.3, SQLite, four migrations including local P2B review migration |
| Identity | Google NextAuth database sessions; old predictable development tokens rejected |
| UI | Tailwind/PostCSS, shared CSS, system fonts and Lucide |
| Verification | Node tests, Playwright, isolated DB wrappers, development/production test modes, GitHub Actions definition |
| Calendar test tooling | ICAL.js 2.2.1 as a development-only independent parser |

Retain one persistent Node/SQLite server with isolated environment storage and secrets. Vendor, region, budget, domain and named operator remain unresolved; see [hosting](docs/HOSTING_DECISION.md). Ephemeral storage, independently writable replicas or PHP-only hosting require a separate decision.

## 3. Architecture and request flows

```text
Browser → Next.js pages/actions
  ├─ Published event facts → conference-service → Prisma/SQLite
  └─ Database session → live membership/role/consent
       ├─ Directory/contact/own RSVP → member-service
       └─ Curator edits/review/publication → conference-service
            └─ Atomic before/after revision + reviewer/source/reason

Catalogue candidates → additive drafts → explicit curator source review → publication
Runtime URL fetch / sync CLI / scheduler / cron → refused during P2
```

Important paths:

- `src/lib/auth.ts`, `session.ts`, `src/app/signin/`: Google identity/session boundary, without fixture login.
- `src/lib/member-service.ts`, `src/app/profile/`, `directory/`, `contacts/`: ownership, consent and private member workflows.
- `src/lib/conference-service.ts`, `validation.ts`: event/suggestion CRUD, review/publication, revisions and queues.
- `src/app/admin/conferences/`, `[id]/history/`: curator editing, source review and restore as an unreviewed draft.
- `src/app/conferences/attendance/`: private own-RSVP list and session-owned cancellation.
- `src/lib/conference-dates.ts`, `ical-generator.ts`, `src/app/api/conferences/[id]/ics/`: calendar-day versus timed-deadline handling and public-facts export.
- `src/lib/conference-ingestion-policy.ts`: P2 runtime refusal shared by fetch, sync and cron paths.
- `scripts/fixture-database.mjs`, `create-fixture-database.mjs`: marked temporary targets; both seeds preserve collisions and existing state.
- `prisma/schema.prisma`, `prisma/migrations/`, `tests/`: models, upgrade history and evidence.

The 24 untracked repository `* 2` copies and earlier stash remain preserved. Duplicate generated `.next/* 2.ts` files are excluded from typechecking; canonical generated types remain included.

## 4. Data models and integrity

| Model | Purpose and limits |
| --- | --- |
| User | Identity, reviewed membership/role, private evidence, profile and consent |
| Account / Session / VerificationToken | OAuth/database sessions; account deletion cascades |
| MembershipReview | Membership decision audit with deletion redaction |
| ContactRequest | Directed consent-based introduction with limited disclosure |
| Conference | Date-only start/end, venue timezone, timed CFP, source URL, separate fetched/reviewed metadata, publication/demo state |
| ConferenceSuggestion | Submitted facts, timezone/CFP and pending/approved/rejected review; acceptance creates a draft |
| ConferenceRevision | Before/after snapshot, actor, source, reason/time; protected curator-only history and draft restore |
| ConferenceAttendee | Unique user/event pair, status, validated role and optional paper title |

Manual edits record their revision in the same transaction. Unconfirmed edits clear previous review; publishing needs source/review evidence. Optimistic edit checks reject stale forms. Restoring a version clears review and returns it to draft while preserving attendance. Only unreviewed drafts with no history or attendance may be hard-deleted; other records are archived.

The older conference migration was rewritten under its existing name. P2C now supplies pinned candidate-copy normalization/reconciliation for exact original-applied/single-failed states, with transaction and preservation checks; actual retained inventory/use still needs operator authority. The forward review migration adds metadata/history and returns existing non-demo publications to draft because old source timestamps did not establish human review. It records prior state and preserves IDs, dates and RSVPs. A populated disposable rehearsal does not replace retained-history/backup acceptance.

## 5. Dataset, provenance and editorial operation

Source contains three fictional fixture events, 27 catalogue candidates and 14 prototype batch source entries. These are code counts, not verified facts, database totals or adoption measures. No real event facts or member databases were inspected during this implementation.

Seeds use namespaced synthetic IDs and test addresses in owned temporary databases; they skip existing event/user/email collisions and create no verified mailboxes or sessions. The catalogue importer creates unreviewed drafts, rejects `--publish` and never updates existing IDs. Sync CLIs, URL fetching and cron/scheduled execution refuse during P2; the batch prototype is exercised only with explicit deterministic test fixtures.

Curators record edition-specific source, reason and confirmation of all displayed fields before publication. Reviewer/time are server-derived, with checked fields and version snapshots. Suggestions preserve timezone/CFP values but cannot publish directly. Missing extracted dates require manual input; ticket expiry is not treated as CFP evidence.

Proposed pilot: 10–20 externally verified event editions and 15–25 consenting members. No recruitment, source verification or participation is claimed by the code update.

## 6. Security and privacy

Session-derived ownership, current membership/roles, private directory defaults, safe projections and contact consent remain enforced. Academic mailbox evidence does not establish doctoral affiliation or institutional endorsement.

P2A removed development login and retires its old predictable tokens on session reads; no retained users/sessions were deleted. Both seeds validate environment, marker, owner and exact disposable target before constructing Prisma.

P2B enforces manual review at publication and disables real ingestion at server/command boundaries. It removes the incomplete HTTP transport rather than enabling it with an environment switch. P3 must implement address-bound, fully bounded transport before reintroducing fetching.

Participation roles/titles appear only for approved, visible profiles to approved members. The form explains that sharing boundary. Own-RSVP management masks unpublished event facts and never exposes another member's attendance. Calendar exports include no profiles, attendance or contacts; success/error responses use private/no-store, so publication withdrawal requires a fresh authorization check.

Current full/omit-dev advisory reports contain zero findings; this is not comprehensive security/accessibility certification, live OAuth or real TLS deployment acceptance.

## 7. Setup, operations and recovery

[GETTING_STARTED.md](GETTING_STARTED.md) documents disposable fixtures and the curator review workflow. Keep separate local/test/staging/production data and credentials. The wrapper supplies its own marked database and forces scheduler off; runtime P2 gates also deny conference-source requests even with legacy enable settings.

P2C adds quote-safe private snapshots, managed-client leases, mandatory open-handle checks, offline exclusion, WAL-consistent safety, atomic replacement and handled rollback. Interrupted/failed rollback retains the marker/evidence. See [the recovery procedure and supported-host boundary](docs/DATABASE_RECOVERY.md). Lineage inventory is read-only; deployment refuses unsupported history. Explicit legacy repair modifies only a verified candidate copy and reconciles pinned metadata after actual normalization/preservation checks. Actual installation, protected off-volume copies and proposed 24-hour data-loss/four-hour restore targets await authorized staging/operator acceptance.

Current local and matching Linux checks are in the evidence ledger and release acceptance record. Historical 38/10 and 62/14 counts remain historical. Real OAuth, protected off-volume/timed restore and operator sign-off remain staging gates; no retained database exists for this candidate.

## 8. Roadmap and decisions

P2A and P2B are merged; P2C recovery/lineage/legacy-copy repair, offline verification and dependency remediation have passed implementation acceptance. Next are P2D staging/provider/operations acceptance and P2E a separately authorized small pilot. P3 ingestion and P4 collaboration remain deferred.

The owner confirmed no retained database exists on 20 October 2026; actual retained-lineage acceptance is not applicable for this candidate. Open staging choices: hosting/region/budget/domain, named operators/reviewers, branding permission, privacy/retention policy and cohort/launch authorization. No existing database inspection/change, deployment, invitations, real-data import or user-file cleanup occurred.
