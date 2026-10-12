# IIM PhD & FPM Alumni Network — Project Overview

Version 1.2 · Updated 12 October 2026 · Inspected Git revision `a05f216` (`master`, matching the fetched `origin/master`).

Status: P0–P1B were locally verified at the earlier `cfd165e` revision. Conference curation, richer catalogue/detail pages and ingestion now exist in the merged source, but P1C/P3 acceptance and production readiness remain open. This is a source-grounded handoff, not a claim that the current database, official conference facts, live OAuth or deployment have been verified.

The café reference's eight-part structure and operating discipline are retained through the [reusable planning skill](skills/community-platform-planning/SKILL.md). [PLAN.md](PLAN.md) is the execution roadmap; [implementation checks](docs/IMPLEMENTATION_CHECKS.md) separates historical runs from current findings.

## 1. Purpose and current product

An independent academic community for IIM PhD/FPM scholars and alumni, starting with a proposed IIM Lucknow pilot. Membership approval, consent-based discovery and conference coordination are the core. Institutional endorsement is not established.

| Capability | Observed implementation |
| --- | --- |
| Identity/membership | Google mailbox verification; pending/approved/rejected/suspended statuses; member/curator/admin roles; application/review audit; paginated admin queue |
| Profiles/directory | Self-service controlled fields, opt-in visibility/contact, private search/filter/pagination and last-confirmed date |
| Contact introductions | Explicit sender reply address, recipient acceptance, withdrawal/cancellation; not a messaging platform |
| Attendance | Session-derived idempotent RSVP/cancellation and private, consent-filtered rosters |
| Event catalogue | Published-event search, upcoming/past filters, 24-record pages, discipline presentation and rich detail sections |
| Curation | Curator create/state/delete, suggestions/review, update service/action; manual edit UI and publication guarantees remain incomplete |
| Ingestion | URL extraction, matching/diffs, reconciliation, CLI batch, cron endpoint and startup timers |
| Collaboration/vault | Co-authorship, housing coordination, mentorship and document sharing remain proposed |

The next useful milestone is **hardening existing event workflows**, not building them again or expanding a nominal “verified” dataset.

## 2. Stack and hosting decision

| Layer | Current source |
| --- | --- |
| Application | Next.js 16.4, React 19.3, TypeScript, App Router |
| Runtime/build | Node 24, npm, committed lockfile, explicit Webpack dev/build |
| Persistence | Prisma/client 6.19.3, SQLite, two committed migrations |
| Identity | Google-only NextAuth database sessions; no demo-login provider |
| Authorization | Live membership/role/ownership checks for member workflows; new quick-fetch action is a known gap |
| Presentation | Tailwind/PostCSS, shared CSS, system fonts and Lucide icons |
| Verification | Node tests, Playwright Chromium, isolated DB wrappers and GitHub Actions |

Retain the selected single persistent Node/SQLite deployment described in [HOSTING_DECISION.md](docs/HOSTING_DECISION.md). Vendor, region, domain, budget and named operator are not established by this review. Ephemeral storage or multiple independent writers would require a new database decision; PHP-only hosting implies a separately scoped migration. No stack rewrite or infrastructure provisioning occurred.

## 3. Architecture and request flows

```text
Browser → Next.js pages/actions
  ├─ Published conference facts → conference-service → Prisma/SQLite
  └─ Database session → current membership/role/consent checks
       ├─ Profile, directory, contacts, RSVP → member-service
       └─ Curator create/review/publish → conference-service

Quick-fetch action → HTTP extraction → match/diff → browser reconciliation
  Known gap: the preview action does not first check curator authorization.

Node startup / cron / CLI → batch-sync → HTTP sources → direct published writes
  Current behavior, not the desired reviewed-draft import architecture.
```

### Important paths

```text
src/app/
  api/auth/[...nextauth]/route.ts    Google auth
  api/cron/sync-conferences/route.ts Existing mutating cron endpoint
  signin/, membership/              Identity/application/status
  admin/members/                    Membership review, search and pagination
  profile/, directory/, contacts/   Private member workflows
  conferences/                      Catalogue, details and suggestions
  admin/conferences/                Curator UI and quick-fetch actions
src/instrumentation.ts              Registers startup ingestion
src/lib/
  auth-policy.ts, auth.ts, session.ts
  member-service.ts, validation.ts  Membership/privacy and validation
  conference-service.ts            Event/suggestion CRUD and visibility
  conference-fetcher.ts            HTTP and metadata extraction
  conference-sync.ts               Matching, diffs and reconciliation
  batch-sync.ts, auto-scheduler.ts  Automatic imports and timers
  prisma.ts                        Shared DB client
prisma/schema.prisma, migrations/   Relational models and upgrade history
prisma/seed.ts                      Guarded but destructive real-looking seed
scripts/                           Migration, bootstrap, tests/build and sync
tests/                             Member, event, ingestion and browser tests
.github/workflows/check.yml         Verification workflow definition
```

Canonical files above are authoritative. Twenty-four untracked `* 2` copies were preserved; they are not additional supported implementations.

### Membership and private data

Google's verified identity and normalized email must match; academic domains are evidence, not automatic membership. Personal-email alumni can apply for review. Session-derived actions read current database membership rather than stale client roles. Pending/rejected/suspended users retain their own status and privacy/deletion controls but not member-directory access.

Directory projection excludes account email, membership evidence, OAuth accounts and sessions. Contact requests require opt-in on both sides; the recipient sees only the sender's deliberately supplied reply email after acceptance. Withdrawal/suspension closes requests and removes shared addresses. Profile affiliations remain self-reported.

RSVP uniqueness and current-user ownership are implemented. However, the RSVP service currently checks event existence rather than publication state; H4 must enforce draft/archive rules even for direct action calls. Public-roster protections from P1B must survive these event changes.

## 4. Data models and integrity

| Model | Role and current limits |
| --- | --- |
| User | Identity, reviewed membership/role, private evidence, profile and consent |
| Account / Session / VerificationToken | OAuth/database sessions; account-deletion cascades |
| MembershipReview | Reviewer/target, old/new status/role, reason/method/time; target notes redacted on deletion |
| ContactRequest | Directed consent-based introduction with bounded message/address and active-request uniqueness |
| Conference | Name/acronym, legacy date plus start/end, timezone/CFP, source URL/check time, curator, publication state and demo flag |
| ConferenceSuggestion | Member submission and review status; no dedicated correction/audit record or resulting-event link |
| ConferenceAttendee | User/event relation, attending/considering field, unique pair and cascading deletion |

The foundation migration enforces member/contact status sets and foreign-key/uniqueness rules. Event publication/suggestion status, date ordering, edition identity and provenance need stronger end-to-end guarantees; a source timestamp is not proof of human review.

The second migration uses `ALTER TABLE ... ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP`; an in-memory populated-table check reproduced SQLite rejection. Empty-database migration success does not establish a safe upgrade of retained conferences. H2 requires a compatible rebuild/backfill and migration-history-aware rehearsal before applying it to existing data.

Deleting a member removes their identity, evidence, sessions, attendance and contacts, redacts identifying target review notes, and preserves last-admin continuity. Event deletion can also cascade attendance; seed cleanup is therefore not harmless.

## 5. Dataset, provenance and editorial operation

Source inspection counted **27 hard-coded conference editions** in `prisma/seed.ts` and **14 entries** in the batch source registry. These are code counts, not database counts, verified sources or active-community metrics. This review did not query member data or verify event facts externally.

The seed still requires `ALLOW_DEMO_SEED=1`, local/test `APP_ENV`, a SQLite URL and non-production `NODE_ENV`. Inside that guard it deletes every demo-marked event (plus the old synthetic ID/acronym), overwrites matching IDs, marks entries published/non-demo and assigns a fixed 11 October 2026 check date. The older “one/three synthetic fixtures” description is obsolete. Never use it on retained event data.

Batch import directly creates/updates published records and can republish draft/archive matches. The parser substitutes future dates/duration when source dates are absent. Matching by shared organizer URL can conflate editions. CLI rechecks write check timestamps even without `--auto-update`.

Desired H2/H6 behavior is different: draft candidates, explicit unknown values, edition-specific sources, fetched-versus-reviewed dates, human decisions, preserved overrides and traceable corrections. Rich descriptions, consortium agendas and travel logistics need evidence. Neither “tier-1” nor a “Verified” badge establishes quality or fact accuracy; journal rankings must not be translated into conference rankings.

The proposed pilot remains 10–20 curator-verified events and 15–25 consenting members. No recruitment or verified participation is claimed.

## 6. Security, privacy and release blockers

The strongest inherited controls are session-derived ownership, live membership checks, private-by-default consent, safe directory projections, guarded contact disclosure and account deletion. Auth configuration fails closed when incomplete; production sign-in requires HTTPS. Browser fixtures are database sessions, not a runtime bypass.

New event tooling has specific gaps:

- Quick-fetch preview lacks an action-level curator check and fetches arbitrary HTTP(S) destinations with automatic redirects; it can also return matched draft fields.
- Fetching has a timeout but no demonstrated private-network/redirect destination policy or bounded body handling. Client reconciliation payloads bypass the normal event validator.
- Cron accepts unauthenticated non-production calls when its secret is unset, accepts query-string secrets and mutates on GET.
- Node startup schedules ingestion after ten seconds outside `NODE_ENV=test`; `APP_ENV=test` alone does not disable it. No supported off switch or cross-run lock exists.
- Imports/seeds assign publication/check status without the required human provenance; direct RSVP does not enforce event lifecycle state.

These are source-inspected findings, not fixes applied by this planning pass. H1–H4 define testable remediation. Earlier dependency advisories are historical unresolved risk, to be reassessed before release. Production OAuth, deployment and comprehensive accessibility/security verification remain unverified.

## 7. Setup, operations and recovery

Read [GETTING_STARTED.md](GETTING_STARTED.md) before executing commands: ordinary app startup now has ingestion side effects. Use disposable data until startup/import/migration safety is repaired. Do not use a copied production member DB for experimentation.

The migration wrapper creates a missing SQLite file exclusively and never truncates it; the actual migration SQL still needs populated-upgrade repair. Test/build/browser wrappers override DB/auth settings and own temporary databases, but event tests and browser startup currently contact external sources. A temporary DB does not make those tests deterministic.

Keep separate local/test/staging/production credentials and volumes. Before any retained-data migration, take a consistent SQLite backup and rehearse restoration. Recovery targets of 24 hours of data loss/four hours to restore are proposals pending operator demonstration. Preserve the earlier Git stash, duplicate local files, and sibling deployments until their owner approves cleanup.

The recorded 38-test/build and ten-browser passes belong to `cfd165e`, before the nine merged commits. No current `a05f216` full-suite/build success or remote CI success is asserted.

## 8. Next milestones

[PLAN.md](PLAN.md) now orders six concrete work packages: H1 ingress/startup safety; H2 populated migration, fixtures and provenance; H3 deterministic verification; H4 conference lifecycle and UX acceptance; H5 staging/pilot; H6 controlled automation and only then demand-led collaboration.

Preserve the existing stack and useful implemented flows. Do not treat this documentation update as authorization to deploy, send invitations, publish unverified data, remove local files or add advanced collaboration features.
