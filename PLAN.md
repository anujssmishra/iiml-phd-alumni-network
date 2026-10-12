# Delivery plan: stabilize the merged academic network

Updated 12 October 2026 · Inspected revision: `a05f216` · Status: P0–P1B previously verified locally; P1C and early P3 code now require hardening and acceptance.

This plan preserves the café reference's small-pilot, human-review, provenance and hosting-aware approach. It supersedes the old assumption that conference curation/ingestion has not been implemented. Code presence, a seed record and a previous green test run are not release evidence for the merged revision.

## Current phase position

| Phase | Evidence | Remaining gate |
| --- | --- | --- |
| P0: reproducible foundation | Node 24/npm, portable lockfile, environment template, two migrations, isolated DB harness and CI exist | Fix populated-database upgrade, unsafe fixtures and network-dependent/startup behavior; revalidate current revision |
| P1A: identity and authorization | Verified Google identity policy, reviewed membership, roles, admin audit and session-derived RSVP | Real provider flow and staging verification; extend the same action-boundary checks to new ingestion endpoints |
| P1B: profiles and directory | Private-by-default profiles, filters/pagination, contact consent, withdrawal/deletion; ten browser workflows passed before merge | Rerun after hardening; keep private fields protected as event tooling grows |
| P1C: curated conferences | Schema, catalogue/detail UI, date filters/pagination, curator creation/publication/deletion, suggestions and service-level updates exist | Provenance/publication guarantees, correction UI, lifecycle rules, populated migration and dedicated browser coverage |
| P2: controlled pilot | Plan only | H1–H5 gates, named operators, actual OAuth/HTTPS/restore evidence and authorized recruitment |
| P3: reviewed ingestion | Fetch/diff/reconcile, 14-source batch registry, cron and startup scheduler already exist | Make existing prototype safe now; enable unattended operation only after H6 acceptance |
| P4: academic collaboration | Product direction only | Pilot demand, moderation, permissions and separate design for sensitive files |

Historical verification and current source findings are in [IMPLEMENTATION_CHECKS.md](docs/IMPLEMENTATION_CHECKS.md). Keep Next.js/Prisma/SQLite on one persistent Node server unless hosting constraints explicitly require a new decision. No infrastructure purchase, live data modification, invitations or deployment is authorized by this plan.

## Ordered next steps

Owners below are roles to assign, not named people. Work estimates are deliberately omitted until the implementer agrees on the security/data scope. Complete the observable gate before advancing.

### H1 — Close ingestion entry points and unattended writes

**Priority:** release blocker · **Owner:** implementer/security reviewer · **Dependency:** none.

1. Require current curator/admin authorization inside the quick-fetch server action before any network request or draft lookup. Keep checks at the service/action boundary, not only the admin page.
2. Restrict server-side fetching to approved public destinations. Reject private/loopback/link-local/metadata destinations, unsafe schemes/credentials, and unsafe redirects; validate resolution/each redirect, bound redirects/body size/content type/time and request rate. Test without contacting internal services.
3. Validate the client-supplied reconciliation payload and action enum with the same bounded event schema used by manual edits. Do not trust serialized browser extraction results.
4. Make automatic ingestion explicitly opt-in and off by default, including local/test/build runs. Introduce a supported disable/enable contract; no such flag exists today. Avoid using `NODE_ENV=test` as a substitute for a production runtime policy.
5. Make cron authorization fail closed in every environment, use secret headers rather than URLs, and require a deliberate mutating request. Bound intervals and add a single-run lock so app workers, cron and CLI cannot overlap.
6. Limit error details and remove any implication of official IIM endorsement from the fetcher identity unless authorized.

**Acceptance:** guest/member/pending/suspended quick-fetch calls cannot fetch or inspect drafts; unsafe URL and forged-payload cases fail safely; no HTTP import or conference mutation occurs during ordinary startup/build/browser tests by default; unauthorized cron and overlapping jobs do no work. Preserve existing membership/privacy tests.

### H2 — Make upgrades, fixtures and provenance safe

**Priority:** release blocker · **Owner:** implementer + event curator + operator · **Dependency:** H1 before running the app against meaningful data.

1. Repair the event migration for databases containing existing conferences. SQLite rejects the current non-constant `CURRENT_TIMESTAMP` column defaults on populated tables. Inventory migration state first; use a compatible rebuild/backfill strategy and a forward repair where already-applied histories require it. Do not blindly reset a database or rewrite applied history.
2. Rehearse empty and populated upgrades on disposable copies, preserving original event dates, IDs, attendance relations and draft/public visibility. Verify rollback/restore and migration checksums for the intended deployment history.
3. Separate a small synthetic test fixture from a reviewed real-data import. Remove broad seed deletion/overwrites of retained records; require explicit bounded import targets and preserve curator edits. Do not simply change the test's expected count from 3 to 27.
4. Treat the 27 hard-coded seed editions as unverified candidates until a curator checks each important field against an edition-specific official source. Dates, deadlines, consortium sessions, venues, travel/accommodation and “tier” labels all need evidence or an unknown state. No fact checking was performed by this documentation update.
5. Separate fetched time from human-verified time/reviewer. Missing extracted dates must remain unknown/review-required; remove the current invented six-month start/three-day duration behavior from publishable records.
6. Imports must produce drafts/proposed changes, never silently publish, republish archived records or overwrite reviewed facts. Persist review decisions, field provenance, change history and a safe revert path.
7. Add edition-aware identity/uniqueness and matching. Shared organizer URLs (including the PACIS/AMCIS `aisnet.org` entries) must not collapse distinct conferences or years.

**Acceptance:** upgrade tests pass with populated legacy data; safe fixtures cannot delete unrelated events; missing facts cannot acquire “verified” status; re-import is idempotent; draft/archive/manual overrides survive imports; conflicting editions enter review.

### H3 — Restore a trustworthy verification baseline

**Priority:** before claiming merged readiness · **Owner:** implementer · **Dependencies:** H1–H2.

1. Replace live-network unit tests with deterministic HTTP fixtures, frozen clocks and bounded responses. Test missing/malformed metadata, redirects, timeouts, partial failure, duplicate editions and repeat imports. Keep live-source checks separate and opt-in.
2. Update seed tests to assert safety/invariants, not a marketing catalogue size. The current test expects three rows while the seed defines 27.
3. Add populated-migration, direct-action authorization, SSRF-policy, forged-reconcile, cron-auth, scheduler-disabled and concurrency cases.
4. Inspect the 24 untracked `* 2` files with their owner. Preserve or archive recoverably before removing approved duplicates; 23 were byte-identical at inspection, while the hosting copy differed. Do not silently delete them or the earlier Git stash.
5. Run a fresh install in a disposable checkout, Prisma validation/generation, lint, typecheck, all offline tests, isolated production build, and browser checks. Record exact revision, commands, counts and errors. Review the dependency audit again rather than reusing old advisory totals as current.
6. Run the same workflow in GitHub Actions and record its result. Local success is not remote CI evidence.

**Acceptance:** after dependencies and browser binaries are installed, tests/build/browser execution make no external-source requests or background imports; no ambient member DB is used; known failures cannot be masked by partial ingestion success; current-revision evidence replaces—not relabels—the historical `cfd165e` record.

### H4 — Finish conference lifecycle and user-facing correctness

**Priority:** finish P1C · **Owner:** implementer + curator · **Dependencies:** H1–H3.

1. Wire a manual correction/edit interface to the existing update service/action, including source/reviewer details; retain creation, suggestions, draft review and publication flows, and add explicit archive/restore controls.
2. Define and enforce event visibility and RSVP rules at the service boundary. A member must not create an RSVP for a draft/archived event merely by submitting its ID. Decide whether cancellation remains possible after archive; protect roster reads and private curator/submitter data.
3. Require actual publication evidence, not a nonempty URL or automatically assigned timestamp. Include timezone/date/deadline validation and carry those fields through suggestion approval. Preserve date-only calendar values across timezones; do not infer CFP deadlines from ticket-offer expiry.
4. Paginate curator queues instead of silently capping conference/suggestion lists. Preserve filters, stable ordering and correction feedback.
5. Check the merged catalogue/details at mobile widths and by keyboard: long names, many pages, invalid query parameters, empty/error states, past/ongoing events, timezone boundaries, expanded descriptions and focus after actions.
6. Correct “Verified Sources,” “tier-1,” and other unsupported copy. RSVP roster access and privacy text must match actual behavior; travel/housing and co-authorship coordination are not implemented booking/messaging features.
7. Add dedicated curator/suggestion/publish/archive/edit browser scenarios alongside the ten existing P1B workflows. Verify production-mode navigation and cache invalidation, not only the dev server.

**Acceptance:** complete curator and member journeys pass; guests see published facts only; public copy reflects evidence; archive/correction actions remain respected after re-import; P1C is marked accepted only with recorded tests.

### H5 — Stage and release a controlled pilot

**Owner:** operator + membership reviewer + curator + pilot coordinator · **Dependencies:** H1–H4 and explicit authority for external actions.

1. Assign real owners, vendor/region, budget, domain and institutional-branding permissions. Retain the [persistent Node/SQLite constraints](docs/HOSTING_DECISION.md).
2. Provision isolated staging/production storage and secrets. Verify real Google sign-in, callback errors, sessions, role changes, sign-out, deletion and HTTPS/private cookies. Provider credentials/configuration are not proof that the flow works.
3. Publish plain-language membership, privacy/retention, contact consent, correction and support policies. Define incident handling and minimal logs.
4. Rehearse database backup/restore and application rollback using a populated fixture. Proposed targets: at most 24 hours of data loss and four hours to restore, only accepted after demonstration.
5. Record dependency decisions, exact release revision, current CI/browser evidence and a rollback owner. Obtain deployment approval; do not infer it from this plan.
6. After approval, curate a proposed 10–20-event set and invite a proposed 15–25 consenting members. Invitations/importing real people require separate execution authority.

**Acceptance:** all safety gates closed, real OAuth/staging/restore evidence recorded, dataset sources reviewed, owners assigned and release explicitly authorized. Two-week pilot targets—not current achievements—are ten consented profiles, five successful RSVP users, current provenance for every published event and no unresolved access-control defect.

### H6 — Enable controlled automation, then evaluate collaboration

**Owner:** implementer + curator/operator · **Dependencies:** safe ingestion from H1–H2 and successful pilot operation.

Run one bounded ingestion executor with locks, retries/backoff, rate limits, audit history, curator review and failure notifications. Separate scheduled fetching from publishing. Prove that cancellations, changed deadlines, blocked sources and partial failures preserve approved records and human overrides. Verify source access terms and actual edition feeds before enabling them; a source registry is not a validated catalogue.

Only then consider co-authorship posts, mentorship or opt-in matching with expiry/reporting/deletion. The R&R vault is a separate permission/anonymization/private-storage/malware/download-authorization/retention workstream. No private document upload or proprietary dataset transfer is part of this plan's execution.

## Next smallest implementation slice

Implement **H1** first, with regression tests for unauthenticated quick-fetch, unsafe URL targets, forged reconciliation and disabled startup ingestion. Follow with populated-migration and fixture repair in H2, then run the complete isolated checks in H3. Do not expand the catalogue or add collaboration features before these gates.

The next implementation request can name H1 explicitly. This planning update itself modifies documentation only; it neither fixes these defects nor certifies the merged application.
