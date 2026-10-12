# Implementation evidence and release gaps

Updated 12 October 2026 · Current inspected revision: `a05f216`.

This is the evidence ledger for [PLAN.md](../PLAN.md), not deployment approval. Historical passes are tied to their revision. Source inspection, a targeted in-memory SQL reproduction and an actual application test run are different kinds of evidence.

## Historical local verification — before the latest merge

At `cfd165e` and its P0–P1B handoff state:

- A clean install from the regenerated cross-platform npm lockfile succeeded with Node 24.19.0/npm 10.7.0.
- Initial isolated migration and 19 service/auth tests passed. Subsequent queue coverage and concurrent event tests brought the full run to **38 passing tests**.
- `npm run check` passed Prisma generation, lint, route generation/typecheck, those 38 tests and the production Webpack build. Both migrations worked on empty isolated databases.
- `npm run test:e2e` passed **10 Chromium workflows**: guest privacy/cache headers, forged ownership, suspension, independent RSVP/anonymous replay, contact acceptance/cancellation, role protection, directory filters/pagination/mobile keyboard use, application approval, deletion and browser-back withdrawal.
- Desktop directory and 390px mobile profile screenshots were inspected.
- Reviews prompted fixes for mailto query injection, form label ambiguity and the membership review queue's former 200-account cap.

Limitations of those passes: ingestion tests used live HTTP and tolerated ICIS connection/SMS 403 failures; the dev server emitted closed-stream/router-initialization diagnostics; browser fixtures did not test real Google OAuth or production-mode staging. These passes do **not** certify `a05f216`.

## Current revision — inspection and bounded checks

The nine GitHub commits were fast-forwarded to `a05f216` without conflicts. Local documentation edits, 24 untracked `* 2` files and the earlier stash were preserved. No dependency changes were introduced by those nine commits.

This planning pass inspected routes/actions, auth/session services, event/member services, schema/migrations, seed, scripts, config, tests and CI. It did not start the app, run seed/sync, invoke live cron/fetch actions, inspect real member data or run the current full application suite.

Observed source counts are **27 hard-coded seed events** and **14 batch source entries**. They are not verified-event or database counts. Duplicate comparison found 23 of the 24 untracked copies byte-identical; the hosting-document copy retains older wording. Nothing was deleted.

A targeted SQLite check against an in-memory table containing one row reproduced the event migration's non-constant-default failure. No project database was touched.

## Findings driving the next plan

| Gate | Evidence in current source | Required proof after repair |
| --- | --- | --- |
| H1: action authorization/fetch safety | [Quick-fetch action](../src/app/admin/conferences/actions.ts) fetches and looks up draft matches without a session/curator check; [fetcher](../src/lib/conference-fetcher.ts) follows arbitrary HTTP(S) redirects; [reconcile](../src/lib/conference-sync.ts) trusts client event fields | Direct guest/member/unsafe-target/forged-payload requests denied before effects |
| H1: unattended operations | [Instrumentation](../src/instrumentation.ts) starts [timers](../src/lib/auto-scheduler.ts) outside NODE_ENV=test; [cron](../src/app/api/cron/sync-conferences/route.ts) allows missing-secret non-production calls and mutating GET | Off-by-default behavior, fail-closed cron, header-only secrets, bounded jobs/locks |
| H2: populated migration | [Event migration](../prisma/migrations/20261011000001_conference_curation/migration.sql) adds NOT NULL date columns with CURRENT_TIMESTAMP defaults | Empty and populated upgrades preserve records/RSVPs; compatible applied-history strategy and restore rehearsal |
| H2: seed/import safety | [Seed](../prisma/seed.ts) deletes demo rows, upserts 27 non-demo published editions and sets fixed check dates; [batch](../src/lib/batch-sync.ts) publishes/re-publishes matches | Non-destructive fixtures; reviewed drafts; no archive/manual-override regression |
| H2: evidence and edition identity | [Parser](../src/lib/conference-fetcher.ts) invents missing dates; [matcher](../src/lib/conference-sync.ts) can match shared URLs across editions | Unknown facts remain unknown; reviewed sources and edition-aware idempotence |
| H3: verification contract | [Seed test](../tests/membership.test.ts) still expects three rows; [ingestion tests](../tests/auto-sync-conferences.test.ts) call live sources | Offline fixture-based tests; seed safety assertions; current revision install/build/browser/CI record |
| H4: lifecycle/UI | Update service/action exists but manual edit form is absent; [attendance service](../src/lib/member-service.ts) checks existence, not event publication state | Correction UI, explicit archive/RSVP rules, current private-data projections and dedicated P1C browser tests |

The three-versus-27 seed assertion is a source-identified mismatch, **not a test failure observed by running the merged suite**. Do not claim a new green test run by copying historical results or simply raising the expected count.

## Current release limits

- No real Google consent/callback/account-linking flow was verified in this workstream. Do not infer readiness from configured credentials.
- Current event dates, venues, consortium schedules, travel details, organizer URLs and ranking/verification claims were not fact-checked externally.
- No hosting vendor/domain/operator, production/staging deployment or backup restore was verified by this update.
- Existing databases require backup and a populated-upgrade rehearsal. Never reset retained data to make a migration pass.
- Dependency advisories recorded before merge remain unresolved historical findings in [HOSTING_DECISION.md](HOSTING_DECISION.md); reassess the current lockfile/deployment artifact before pilot.
- Automated startup and live-network tests make whole-suite execution side-effectful, even though the verification wrapper isolates the database.
- The old ten-browser suite is P1B coverage, not a comprehensive security/accessibility certification or complete P1C acceptance suite.
- This update changes planning/documentation only; all H1–H6 implementation work remains separately executable.

## How to record the next verification

After H1–H2, run the H3 checks in a disposable checkout and record: exact revision/dirty scope, runtime/package-manager versions, install outcome, migration fixtures, lint/typecheck, offline test count, build, browser scenarios, console diagnostics and GitHub Actions result. Record live OAuth, official-source review and restore evidence separately with their environment and operator.

Documentation checks for this update: local Markdown links, source path references, command names/counts against source, phase/status consistency and `git diff --check`. Application tests/build are intentionally not rerun by this documentation-only task.
