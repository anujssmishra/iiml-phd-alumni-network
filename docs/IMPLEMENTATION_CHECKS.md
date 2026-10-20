# Implementation evidence and P2 release gaps

Updated 19 October 2026 · Source baseline merged `736aecb` plus local P2C recovery/lineage work.

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
| C: migration lineage | Read-only inventory/preflight; fresh/populated foundation upgrades; pinned original-applied/single-failed candidate-copy normalization and reconciliation, preservation checks and rollback rehearsal | Authorized actual retained-state inventory, candidate acceptance and installation |
| C: recovery | Private quote-safe/no-clobber snapshots; lifetime client leases, offline marker/open-handle checks, WAL-consistent safety, atomic replacement and handled rollback; interruption keeps evidence | Operator acceptance on the supported host, protected off-volume copies and timed staging/application rollback |
| C: isolation/release | Child-only OS boundary, Node/browser guards and deny proxy; scoped dependency remediation with zero full/omit-dev findings | Exact-candidate clean install, successful matching Linux CI and authorized retained-state acceptance |
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

## P2C recovery and lineage-inventory slice — 19 October 2026

Baseline merged `736aecb` plus uncommitted P2C code/docs; Node **24.19.0**, npm **10.7.0**, macOS with `lsof`. P2A–P2B were merged through [PR #1](https://github.com/anujssmishra/iiml-phd-alumni-network/pull/1); their [passing PR workflow](https://github.com/anujssmishra/iiml-phd-alumni-network/actions/runs/39201971853) is evidence for head `74bec4d`, **not** these later local P2C changes.

Implemented [the offline recovery procedure](DATABASE_RECOVERY.md): owned private paths, quote-safe/no-clobber consistent snapshots, lifetime app/writing-CLI leases, an exclusive maintenance marker, mandatory open-handle checks, SQLite-managed WAL checkpoint/cleanup, a verified WAL-inclusive pre-restore snapshot, atomic replacement, validation and handled rollback. Crash/failed rollback retains the marker, snapshots and a synced phase manifest. Custom backups require ignored SQLite filename extensions. Supported scope is a controlled single-host Linux/macOS local filesystem with all clients and automatic restarts stopped, not arbitrary bypass processes or a distributed writer lock.

`db:lineage` inventories migration metadata read-only; `db:migrate` now refuses changed checksums, unresolved failures, unmanaged/drifted schema or integrity/foreign-key failures before deployment. Original migration SQL has not been rewritten again. The legacy SQL fixture's SHA-256 matches commit `c8225bc` byte-for-byte (`b9a220be717c89cdd110cab67747da95f651ddce9b15ba14710cf9b047168776`).

- **16 focused P2C tests passed**: fresh and populated foundation-only upgrades preserve IDs, dates, member consent and RSVP relations; older fully-applied SQL and partially failed original SQL are reproduced/inventoried and refused without changing data. Recovery cases cover idle/open and separate live-writer refusal, startup/CLI maintenance denial, online committed-WAL backup, crashed-writer WAL-inclusive safety, corrupt/FK-invalid backup refusal, quote/alias/permission/tooling boundaries, handled rollback, failed rollback, abrupt process interruption and Git exclusions.
- Final `ENABLE_AUTO_CONFERENCE_SYNC=1 npm run check` passed generation, lint, typecheck, **97 tests** and an isolated production build. Two inherited unused-variable warnings remain in `option2-experience.test.ts`; no lint errors. The parent-shell enable flag still cannot start ingestion. This is working-tree evidence with existing installed dependencies, not a clean-install candidate-SHA certification.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_APP_ENV=local npm run test:e2e` passed **20 Chromium workflows**. The new workflow proves a running application refuses restore even while idle and remains usable. Inherited development-server closed-stream/router-initialization diagnostics appeared; assertions passed.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_SERVER_MODE=production BROWSER_APP_ENV=local npm run test:e2e -- tests/browser/signin.spec.ts tests/browser/p2b.spec.ts tests/browser/p2c.spec.ts` passed **six focused production-browser workflows**, including running-server restore refusal. As before, loopback HTTP with an HTTPS auth origin, fixture sessions and the existing standalone-output warning are not real OAuth/TLS or standalone-host acceptance.
- Documentation link validation passed **33 local links** and `git diff --check`. External numbered copies continued to appear (31 untracked copies observed during this run); all were preserved, along with the earlier stash. Newly recurring `.next/dev/types/* 3.ts` duplicates caused an initial typecheck failure. The exclusion now covers space-suffixed generated type copies only; canonical generated types and application sources remain checked. No user copies were deleted.
- Early checks exposed an omitted inherited-test import, timestamp-tied migration ordering and SQLite's crash-WAL/exclusive cleanup edge case. These were fixed without weakening the open-client or sidecar refusal assertions. SQLite now attaches the existing WAL index before exclusive work and exits WAL mode through SQLite, never by deleting sidecars.

That first slice did not repair old-applied/failed histories or operate on retained databases. The subsequent candidate-copy repair is recorded below. Broader egress denial, dependency decisions, clean-checkout exact-candidate verification and matching remote CI remain release gates. Real staging OAuth/TLS, protected off-volume/timed recovery, external event verification and deployment/pilot authorization remain P2D–P2E work. P2C changes remain local, not pushed or deployed.

## P2C legacy candidate-copy repair — 19 October 2026

Baseline remains `736aecb` with uncommitted P2C implementation. [The explicit repair command](../scripts/repair-lineage.mjs) now recognizes only pinned known original-applied or single-failed conference migration states. It requires an inspected lineage digest and offline client exclusion, retains a consistent safety snapshot, and modifies only a separate candidate. Every existing application table is checked by row count and streamed typed-value hash over its original columns; schema/integrity/foreign keys and narrowly permitted metadata changes are checked before transaction commit. Other migration records and diagnostic logs are preserved. Private manifest headers omit diagnostic log values and all private application records.

Original completed SQL can have zero, one or two exact known successors. Its stored dates, review/provenance, publication and all relations survive normalization; only the known checksum is reconciled after the actual schema is built. The failed path supports no applied DDL or only `acronym`, preserves partial values and the original failed attempt/log, and inserts a separate completion after building the intended schema. Unknown checksums/schema, retries, other failures and stale plans refuse. Existing migration SQL was not edited again; the pinned original fixture moved from the test directory into the runtime repair resources without changing its bytes.

- [Ten new regression cases](../tests/p2c-legacy-repair.test.ts) cover every supported applied prefix, both failed layouts, member/consent/account/session/contact/review/RSVP/role/paper preservation, private file modes, audit headers, stale/unknown/refused states, live-client denial, injected data loss/diagnostic loss/post-metadata failure, transaction rollback and abrupt process interruption.
- Both original successful and failed histories were produced using the installed **Prisma 6.19.3 engine** in private disposable migration trees, not solely fabricated history rows. The actual non-constant-default failure/partial state is recognized; repaired candidates pass preflight and only pending migrations deploy.
- Disposable end-to-end installation and rollback uses the guarded restore command: repaired prefix installation followed by the pending review migration preserves dates/RSVP role/title, withdraws only unreviewed non-demo publication and creates its audit. Restoring the original safety image recovers the original schema/history/data. This is not a retained-data operation or timed staging acceptance.
- Initial checks found a test-only SQLite row-prototype comparison, missing exclusive first-file provisioning in the direct engine fixture, a helper name interpreted as a React Hook, and missing exported helper types. These were corrected without relaxing preservation/refusal assertions.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 npm run check` passed generation, lint, typecheck, **107 tests** and the isolated production build. Only the same two inherited unused-variable warnings remain. The ten new repair cases include actual-engine histories, pending migration and offline rollback; all use private disposable data.
- The production-mode sign-in/P2B/P2C Chromium subset passed **six workflows** with the parent scheduler enable flag set. The P2C workflow now proves both restore and legacy repair refuse a live/idle application and that it remains usable. Fixture sessions, loopback HTTP with an HTTPS auth origin, and the existing standalone-output warning are still not real OAuth/TLS or standalone-host acceptance. The earlier 20-flow development run belongs to the preceding recovery slice, not a newly repeated full development run here.
- The final recovery documentation/entry-point check verified **38 local links**, original SQL byte checksum, unchanged checked-in migration SQL, diff formatting and the existing stash. Dependency versions were not changed, no fresh-install or matching remote-CI evidence is claimed, and no push/deployment occurred.

No retained database was inspected, repaired, replaced or migrated. Copy preparation does not authorize installation; actual lineage acceptance and retained operations still need operator permission. The next implementation slice is deterministic egress denial and dependency/advisory decisions, followed by clean-checkout exact-candidate/CI evidence. All unrelated numbered copies and the earlier stash remain preserved. These changes are local and uncommitted.

## P2C offline verification and dependency review — 19 October 2026

Baseline `736aecb` plus uncommitted P2C work; existing installed dependencies, Node **24.19.0**, npm **10.7.0**, macOS. [The offline runbook](OFFLINE_VERIFICATION.md) distinguishes cooperative regression guards from the child-only OS boundary and its limits. No system firewall, retained database or hosted service was changed.

Implemented an owned private attempt ledger; inherited Node preload for DNS (including reverse/service lookups), fetch, TCP/TLS/HTTP/HTTP2 and UDP; fixed loopback-only browser transport; protected default/manual Chromium contexts, blocked service workers, WebSocket routing and an owned non-forwarding HTTP/CONNECT proxy. Caught denials still fail normal workloads. Expected negative probes use separate ledgers and assert refusal/redaction. Failed runs retain their private destination-free ledger; successful runs remove it.

- `ENABLE_AUTO_CONFERENCE_SYNC=1 __NEXT_AGENT_UPGRADE=security npm run verify:offline -- check` passed generation, lint, route/type checks, **115 service/integration tests** and the production Webpack build. The raw child probe observed kernel denial, and the final workload ledger contained **zero forbidden attempts**. Only the same two inherited unused-variable lint warnings remain. The deliberately enabled ambient scheduler/upgrade policy did not bypass the harness.
- Eight network regressions cover API families, resolver instances, child/worker inheritance, strict URL/port policy, real loopback fetch and Playwright API requests, ledger privacy/ownership/environment sanitation, and an explicitly unknown Next development-version fixture that never calls fetch. The unmanaged-writer recovery fixture now waits for readiness, retains its actual DB connection and independently asserts its PID is visible in lsof before expecting refusal; the live-client safety assertion was strengthened, not removed.
- `BROWSER_SERVER_MODE=production BROWSER_APP_ENV=local npm run verify:offline -- browser tests/browser/signin.spec.ts tests/browser/p2b.spec.ts tests/browser/p2c.spec.ts tests/browser/offline.spec.ts` passed **seven focused production Chromium cases**, with the parent scheduler enabled. These include actual external HTTP/WebSocket/redirect refusal and independent proxy HTTP/CONNECT denial using only reserved synthetic destinations and a separate expected-denial ledger. The parent workload ledger remained empty. Fixture sessions/loopback HTTP with an HTTPS auth origin and the existing next-start/standalone warning are not real OAuth/TLS or standalone-host acceptance.
- The final `ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_APP_ENV=local __NEXT_AGENT_UPGRADE=security npm run verify:offline -- browser` passed **all 21 development Chromium cases** in 2.4 minutes, with **zero forbidden parent-workload attempts**. The synthetic negative probe is included and asserts its own expected denials separately. Inherited closed-stream diagnostics and a screenshot-caret-related hydration warning appeared; assertions and the strict network gate passed. An earlier 20-assertion run failed the gate on the dev version-tag lookup and is not counted as an offline success.
- Initial guarded runs deliberately failed on swallowed Next tooling calls: the new 16.4 advisory reminder and the unconditional dev version-tag request. The documented reminder setting is disabled only during verification; the exact pinned dev-only helper returns installed version with **unknown** staleness before any fetch. It fails if the supported Next version/export shape changes; no application fetch allowlist exception or dependency source edit was added. An initial browser run also exposed Playwright's hostname-only API proxy bypass; Chromium now receives the port-specific proxy flags directly, while Node API requests use the exact-port guard. The regression covers that distinction.
- The separate read-only full/omit-dev npm audits returned valid reports with **8/3 high-severity package-chain entries**, across **two underlying advisories**. [The decision record](DEPENDENCY_REVIEW.md) and [captured JSON](evidence/dependency-audit.json) retain the lock digest, runtime, optional-peer classification and suggested incompatible major changes. No versions/lockfile changed, no force fix or major override was applied, and **no residual risk was accepted**.
- Read-only standalone inventory scanned **143 package manifests and 41 production trace manifests**, finding none of the eight named package manifests/trace paths and no skipped symlinks. This does not establish absence of bundled vulnerable code, exploitability, on-host migration-tooling safety or deployed contents. The inventory is reproducible with [the inspection script](../scripts/inspect-release-dependencies.mjs).
- CI now requests Linux user/network namespaces, installs lsof/iproute2/util-linux, and runs strict checks plus development/focused-production browsers after downloads. Workflow YAML parses locally; **the Linux path and a matching successful remote run are not yet verified**. Missing isolation fails closed. Downloads/audits remain outside the offline boundary.
- Final documentation checks verified local link targets, workflow YAML, unchanged lockfile and checked-in migration SQL, the pinned original SQL checksum, and `git diff --check`. Numbered duplicate files and the earlier stash were preserved; no cleanup or staging of user copies was performed.

Dependency remediation or explicit named-owner risk decisions, clean-install exact-candidate verification, matching successful CI and authorized actual retained-lineage acceptance remain P2C release gates. Real OAuth/TLS, protected off-volume/timed recovery, provider acceptance and pilot authorization remain P2D–E. All unrelated numbered copies and the earlier stash are preserved; no GitHub push or deployment occurred.

## P2C dependency remediation and candidate preparation — 20 October 2026

On branch `codex/p2c-release-verification`, both advisory chains were remediated through exact scoped overrides, without changing Next.js 16.4.0 or Prisma/client 6.19.3. The ESLint alias removes braces and preserves the actual pinned caller's root behavior through a process-local, caller-hash-checked adapter. Deepmerge-ts 8.0.2 is tested against the supported Prisma configuration/merge contract, not presumed universally v7-compatible. See [the compatibility review](DEPENDENCY_REVIEW.md) and [new full/omit-dev audit evidence](evidence/dependency-audit-2026-10-20.json), both zero-finding reports. The 19 October reports remain historical.

- Five new regressions pass: exact versions/overrides and absent affected paths; real Next root discovery across literal/brace/wildcard/array/absolute/missing roots; adversarial nesting/length/API refusal; CJS/ESM record/array/function/cycle merging without input mutation; actual Prisma config path/seed loading and invalid-config refusal.
- `ENABLE_AUTO_CONFERENCE_SYNC=1 npm run verify:offline -- check` passed **120 tests**, generation, lint/typecheck and production build with **zero forbidden workload attempts**. Two inherited lint warnings remain. This initial run uses the existing installation; the post-commit clean-clone run is recorded separately in the release handoff.
- Initial compatibility checks exposed tinyglobby's recursive literal expansion and absolute-path formatting, plus a test's CJS config cache reuse. The adapter preserves the former root semantics and the invalid-config fixture now uses an independent filename; refusal/preservation assertions were retained. An exploratory local-file package replacement was discarded; the final lock contains only pinned registry aliases/versions and no vendored package.
- CI pins npm 10.7.0 and runs both full/omit-dev high-severity audit gates before the strict offline checks and browser suites. Configuration is not a successful run. Git's authenticated push dry run succeeds, but `gh auth status` reports an invalid login, the connector/public API return 404 for the private repository and the available browser is signed out. Restore API/connector access to verify the matching Linux run; no host firewall/sysctl changes or unconfined fallback were added.
- No retained database target was identified or inspected. Read-only inventory awaits an explicit absolute target or owner confirmation that the gate is not applicable. No residual risk, retained-data operation, hosting/provider acceptance or pilot approval was inferred from “complete all.” See [the operator acceptance checklist](RELEASE_ACCEPTANCE.md).

The candidate commit intentionally excludes all numbered duplicate files and preserves the stash. Its exact SHA, clean-clone installation, final browser results and published ref will be provided in the release handoff. No deployment or invitation is part of this candidate preparation.

### Owner confirmation after candidate preparation

On 20 October 2026 the owner explicitly answered **“none”** for retained databases. All existing databases are disposable; actual retained-lineage acceptance is therefore **not applicable**, not an unperformed repair or a guessed inventory. No existing database was inspected or changed. The earlier clean-clone run was interrupted before completion and is not claimed as a full-check success; final exact-revision validation must be rerun to completion. The owner will restore GitHub CLI access if needed for matching Linux CI inspection.

