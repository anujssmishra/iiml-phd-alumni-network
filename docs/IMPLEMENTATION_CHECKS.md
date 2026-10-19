# Implementation evidence and P2 release gaps

Updated 19 October 2026 · Source baseline `b404710` plus local P2A–P2B implementation.

This is the evidence ledger for [PLAN.md](../PLAN.md), not release approval. Source inspection, a historical test report, a current local run and actual deployed evidence are distinct.

## Historical verification — retain, do not promote to current evidence

### P0–P1B: `cfd165e` and handoff state

Earlier work recorded a clean Node 24.19.0/npm 10.7.0 install, **38 passing tests**, `npm run check` and **10 Chromium workflows**. Coverage included membership/roles, profile/directory consent, contact disclosure/withdrawal, session-derived RSVP, deletion, filters/pagination and mobile keyboard checks. Desktop/mobile screenshots were inspected.

Limitations: some ingestion checks contacted live sources and tolerated source errors; dev-server diagnostics appeared; browser fixtures were not real Google OAuth or a production-mode deployed session test.

### Earlier merged inspection: `a05f216`

The previous planning review found unguarded quick-fetch, unsafe cron/startup behavior, a populated-table migration failure, seed/catalogue mismatch and lifecycle gaps. A bounded in-memory SQLite reproduction confirmed the old non-constant-default migration problem. These findings are historical; later commits fix substantial parts and the current residual list below supersedes them.

### H1–H5 report committed through `22f757c`

The inherited document reported **62 passing unit/integration tests**, **14 passing Playwright workflows** and a successful full check pipeline, labelled “`e1e8190` and working tree.” It reported targeted H1/H2/H4 tests and backup/restore tests plus four additional conference browser journeys.

This planning pass did not reproduce those results. The report is not precise exact-SHA evidence and predates `52850bd` (calendar/participation) and `b404710` (development login/seed). Its broad claims of complete SSRF protection, universally non-destructive imports and safe recovery are not supported by the remaining source gaps. Retain the reported counts as history, not acceptance.

## Baseline inspection and subsequent P2A execution

The original source-only review covered auth/session paths, event/member services, actions, schema/migrations, fixture/import/sync/recovery scripts, tests and CI. Independent identity/workflow and operations audits informed the plan. That planning pass ran no app/tests or data commands. The subsequent P2A implementation runs checks, fixtures and servers only against wrapper-owned disposable databases; retained member databases and secrets were not inspected.

Observed improvements at `b404710`:

- Quick-fetch now calls `requireCurator`; reconciliation validates event input.
- Fetcher checks public destinations/redirects and limits body size, with remaining transport/deadline gaps.
- Cron is fail-closed, header-authenticated and POST-only; scheduler is opt-in; batch has a process-local overlap guard.
- Event migration rebuilds/backfills the table; three demo events are separated from 27 catalogue candidates.
- Batch creates drafts, preserves archived/curator-owned records, and matching includes edition logic.
- Curator edit/archive/restore exists; RSVP creation and roster reads enforce publication boundaries.
- ICS downloads, participation roles and optional paper titles exist with targeted tests.
- Backup/restore scripts, isolated test/build wrappers and additional browser coverage exist.

P2A subsequently removes the runtime fixture-login action, retires prior predictable tokens in the auth adapter, and replaces destructive seeds with additive fictional fixtures. A new `db:fixtures` command creates a marked owner-restricted temporary target; direct seeds validate environment, marker, ownership and exact target before creating Prisma. They preserve existing IDs/email collisions, consent/membership, sessions and attendance. Neither seed creates OAuth accounts, verified mailboxes or sessions. The wrapper now forces scheduler off, and the browser harness supports focused production runs.

Source counts (three demo fixtures, 27 candidate editions, 14 batch sources) are not database, verification or adoption counts. Twenty-four untracked duplicate-named files and the earlier stash were preserved. Earlier comparison found 23 copies identical; no new comparison or cleanup is claimed.

## Current gates after P2A–P2B

| Gate | Current implementation/evidence | Remaining proof |
| --- | --- | --- |
| A: identity/fixtures | No runtime fixture login; retired known tokens; marked owned temporary targets; additive collision-preserving seeds | Inventory previous shared-environment fixture use before deployment |
| B: source review/history | [Service](../src/lib/conference-service.ts) requires review before publication; changes record actor/source/reason/time/checked fields and before/after snapshots; version restore creates an unreviewed draft | External fact checks for the actual pilot catalogue |
| B: import boundaries | Runtime [fetch policy](../src/lib/conference-ingestion-policy.ts), sync CLIs, scheduler and authorized cron refuse; catalogue import is additive draft-only and rejects publish | P3 must build and verify a safe real HTTP transport before reintroduction |
| B: dates/calendar | [Shared date handling](../src/lib/conference-dates.ts) separates calendar days from zoned deadlines; gap/overlap rejection; Unicode folding; independent ICAL.js round trips; all ICS outcomes no-store | Deployed/provider and optional external calendar-client acceptance remain staging work |
| B: participation/privacy | [Own attendance](../src/app/conferences/attendance/page.tsx) masks unpublished facts; cancellation derives actor from session; roster keeps approved/visible filtering and UI explains role/title sharing | Pilot consent/support acceptance |
| B: queues/history | Stable pagination reaches catalogue, pending/own suggestions and revisions; restore/history are curator-only; stale edits rejected | Operational curation capacity and reviewed dataset |
| C: migration lineage | New forward review migration tested on populated disposable data; unreviewed non-demo publications return to draft with an audit and preserved dates/RSVPs | Older rewritten migration's applied/failed histories and actual retained-state rehearsal |
| C: recovery | Existing backup/restore still lacks exclusive writer/WAL-consistent safety and atomic failure recovery | Repair/rehearse offline recovery, distinct/quoted paths, rollback and backup protection |
| C: isolation/release | Wrapper forces scheduler off; real conference-source calls also refuse during P2; production browser mode exists | Clean install at release SHA, broader egress denial, successful matching CI and dependency decisions |
| D–E | No live Google/HTTPS hosting, real dataset verification, timed operational restore or consented cohort was inspected | Named owners/policies, actual staging evidence and explicit launch authority |

P2B tests are in [p2b-curation.test.ts](../tests/p2b-curation.test.ts) and [browser/p2b.spec.ts](../tests/browser/p2b.spec.ts). Historical findings describe earlier source and are not open P2B defects after these changes.

## Deferred automation acceptance

The retained batch prototype uses a process-local overlap guard; its source-error/run handling is not an accepted unattended executor. P2B removed runtime scheduling/HTTP execution rather than enabling that prototype. P3 requires a durable cross-process lease/run ledger, bounded retries/runtime, failure reporting, source-access review and human publication decisions before unattended operation. None is needed to justify enabling automation during P2; keep it off.

## Release evidence to collect

For the eventual candidate, record:

1. Exact SHA and clean-checkout/runtime versions; install, Prisma validation/generation, lint, typecheck, offline tests, production build and dev/production browser results.
2. Actual test counts, logs and dependency-advisory decisions; linked successful GitHub Actions run for that SHA.
3. Migration fixture histories/results, no unintended network/import activity, and populated backup/restore/rollback failure-path evidence.
4. Real staging Google callbacks, HTTPS sessions, sign-out/revocation, membership/privacy and browser cache behavior.
5. Named owners, approved policies, timed recovery targets, event-source review and explicit pilot/deployment authorization.

The planning pass validated documentation consistency, 34 local links and diff formatting. P2A execution adds the validation record below. P2B execution evidence is added below; remaining P2C–E release checks stay outstanding.


## P2A local validation — 19 October 2026

Baseline `b404710` with uncommitted P2A code/docs; Node 24.19.0 and the bundled npm runtime. These results describe the working tree, not a committed release SHA or remote CI run.

- `ENABLE_AUTO_CONFERENCE_SYNC=1 npm run check` passed Prisma generation, lint, route generation/typecheck, **72 unit/integration tests** and the production Webpack build. The deliberate parent-shell enable tests the wrapper override. Four pre-existing unused-variable lint warnings remain; no lint errors.
- New fixture cases exercised both seeds' opt-in/runtime/environment/target denial, arbitrary/retained/linked targets, event ID collisions, legacy demo preservation, repeated-seed RSVP identity, user ID/email collisions, membership/consent/session preservation and complete disposable provisioning.
- Production sign-in artifact inspection found no references to the removed action/UI.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_APP_ENV=local npm run test:e2e` passed **15 Chromium workflows**, including the new sign-in regression, against the development server. It checks forged user IDs and persisted prior predictable tokens as well as the inherited member/curator journeys. Existing development-server closed-stream diagnostics appeared during navigation; assertions passed.
- `BROWSER_SERVER_MODE=production BROWSER_APP_ENV=local npm run test:e2e -- tests/browser/signin.spec.ts` passed. Separate focused production runs with `BROWSER_APP_ENV=staging` and an empty value also passed: **three production configuration cases**. Each used a fresh database and an enabled parent-shell scheduler flag, which the wrapper overrode. Forged IDs created no sessions; both known legacy token patterns failed at the session API and protected page even when persisted.
- The compiled server artifact scan checked 78 JavaScript/JSON files and found no references to the removed action/UI. Production checks used `next start` on loopback with an HTTPS auth origin; Next emitted its existing standalone-output warning. These are compiled-server sign-in tests, not a standalone deployment or TLS/OAuth acceptance test.
- Final documentation validation passed diff formatting and all 38 local links.

An initial check was blocked by duplicate generated declarations under `.next/dev/types/`. Five generated `* 2` files were moved intact to `/private/tmp/iiml-generated-types.yAces8/`, preserving them outside the generated type tree; the 24 untracked repository copies remain untouched. The first browser attempt could not bind loopback under the sandbox; the same isolated suite was restarted with local-server permission.

These checks do not establish live OAuth, TLS termination, retained-data migration/restore safety, source truth, release CI or pilot authorization.


## P2B local validation — 19 October 2026

Baseline `b404710` plus uncommitted P2A–P2B changes; retained databases were not used.

Implemented manual source review/publication, revision history and restore-as-draft, UTC calendar-day display, venue-zone timed CFP editing, private archived-RSVP cancellation, input/consent boundaries, stable queue pagination and no-store public-facts-only ICS. Runtime URL fetch/sync/scheduler/cron execution is disabled in code; catalogue imports are additive drafts and reject `--publish`.

- `npm run check` passed generation, lint/typecheck, **81 tests** and production build. After the final browser-flow changes, `ENABLE_AUTO_CONFERENCE_SYNC=1 npm run build` also passed against a fresh isolated database. Three inherited unused-variable lint warnings remain.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_APP_ENV=local npm run test:e2e` passed **19 Chromium workflows**. The four P2B workflows cover mobile dialog/Escape focus, review/publication and history restore, date/export round trips, session-owned archived cancellation and cache withdrawal, participation privacy and queue navigation. Existing development-server closed-stream diagnostics appeared during inherited navigation tests; assertions passed.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_SERVER_MODE=production BROWSER_APP_ENV=local npm run test:e2e -- tests/browser/signin.spec.ts tests/browser/p2b.spec.ts` passed **five focused production-browser workflows**. Positive curator/member access uses isolated fixture sessions; no real OAuth was invoked. The loopback HTTP transport with an HTTPS auth origin and the existing standalone-output warning remain distinct from a deployed HTTPS/standalone acceptance test.
- The final compiled-server scan checked **83 JavaScript/JSON files** with no references to the removed development login action/UI. Documentation diff checks and **26 local links** passed.
- Nine P2B service/integration cases cover review refusal and server-derived identity/time, review invalidation/stale edits, transactional history/restore with preserved attendance, America/Asia timezones and DST gaps/repeats, queues beyond prior caps, own-only cancellation, immutable repeated imports, ingestion refusal and independent calendar parsing.
- The new forward migration was applied to a populated disposable SQLite fixture. It preserves IDs/calendar dates/RSVP role and title, returns unreviewed non-demo published rows to draft, records the prior state and passes foreign-key checks. This does not certify the older rewritten migration's actual applied/failed histories.
- ICAL.js 2.2.1 is development-only test tooling. Its parser round-trips folded multibyte Unicode, date-only exclusive end dates, exact UTC deadlines and escaped control/newline text without private attendee properties. No external calendar account or real event source was accessed.
- Duplicate generated `.next/* 2.ts` declarations recurred after P2A's recoverable move. TypeScript now excludes only those generated copies; canonical declarations and application sources remain checked. Copies are preserved.
- The first service run exposed URL normalization and action-error compatibility differences; these were corrected and the full suite passed. No test assertions were weakened to permit missing review or unsafe publication.

Live OAuth/TLS, retained-state migrations/recovery, release-SHA CI, actual event truth and pilot authorization remain separate gates.

