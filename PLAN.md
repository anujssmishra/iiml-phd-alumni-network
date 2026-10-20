# Delivery plan: P2 secure release candidate and closed pilot

Updated 19 October 2026 · Source baseline: merged `736aecb` plus local P2C recovery/lineage work. No deployment.

## Outcome and evidence

The next phase is **P2: make the implemented network safe to operate, then run a small authorized pilot**. Retain Next.js/Prisma/SQLite on one persistent Node server. Follow the café-inspired approach: a bounded community, manually reviewed facts, explicit consent, and recovery evidence before automation.

P0–P1B have earlier local verification. P1C now includes curator editing, archive/restore, suggestion review, publication-aware RSVP/rosters, participation roles/paper titles, and calendar export. Recent commits also add H1–H3 hardening and H5 recovery tooling. These are implemented capabilities to verify, not features to rebuild.

The previous H1–H6 roadmap is superseded by the work below. P2A–P2B close the local development-safety and manual-workflow gates, with real ingestion disabled. H5 recovery/readiness still needs P2C–P2E acceptance; H6 becomes deferred P3 automation. Historical 62/14 counts are kept separately from current local execution in [the evidence ledger](docs/IMPLEMENTATION_CHECKS.md).

## Sequence and owners

Owner labels are roles to assign, not people already committed. Stages are acceptance gates, not calendar promises.

| Stage | Outcome | Dependencies | Owner roles |
| --- | --- | --- | --- |
| P2A | Runtime shortcut removed; guarded additive fixtures and legacy-token retirement implemented | Local validation in the evidence ledger | Implementer + security reviewer |
| P2B | Reviewed publication/history, date/calendar correctness and private archived-RSVP cancellation implemented | Local validation in the evidence ledger | Implementer + event curator |
| P2C | Upgrade, recovery and exact-revision verification are reproducible | P2A–B before final release run; fixture work can start earlier | Implementer + operator |
| P2D | Isolated staging is demonstrably operable | P2C + authorized hosting/provider access | Operator + membership reviewer + curator |
| P2E | Small consenting cohort validates usefulness | P2D + explicit launch/invitation authority | Pilot coordinator + support owner |

Automatic scheduling stays off throughout P2. Bulk imports and direct auto-update commands are outside the pilot operating procedure. No invitations, paid provisioning, production data changes, cleanup of user files, or live deployment are authorized by this plan.

## P2A — Isolate development identity and fixtures

**Implemented in the local working tree; validation recorded in the evidence ledger.** The original shortcut trusted only `APP_ENV=local`, accepted a submitted user ID and issued predictable 30-day sessions. Both original fixture paths had preservation/safeguard gaps. The requirements below now have implementation and regression coverage.

1. Remove the runtime development-login shortcut from the deployable sign-in page. Preserve test convenience through isolated database-session fixtures, not a second deployed identity path. Document that ordinary application sign-in requires valid Google configuration; the current session reader still enforces that configuration.
2. Guard any retained development seed with explicit opt-in, local/test and non-production checks, and an owned disposable database target. Use synthetic identities with non-deliverable test addresses, namespaced IDs and least privilege. Do not create or print fixed bearer tokens.
3. Make repeated seeding additive/idempotent: no blanket demo deletion, no overwrite of non-demo collisions, and no loss of existing fixture attendance. Keep member fixtures separate from event candidate imports.
4. Inventory any use of the prior shortcut/seed before deployment. If it affected a shared environment, obtain authority for narrowly scoped fixture-account/session removal; do not delete real accounts or unrelated sessions.
5. Document the supported local workflow and add negative tests: production runtime with `APP_ENV=local`, staging/unset environment, arbitrary user ID, wrong/retained database target, ID collision and repeated seed with an RSVP.

Implemented: the sign-in page has no fixture action; the auth adapter rejects prior predictable tokens without deleting data. `db:fixtures` provisions a marked, owner-restricted temporary database. Both seeds validate the target before constructing Prisma, use fictional namespaced fixtures, skip existing ID/email collisions and create no sessions. Verification forces the scheduler off even when the parent shell enables it.

**Exit evidence:** the production artifact has no development login action; fixture commands fail before writes on unsupported targets; no predictable development session is created; collision/repeat-seed tests preserve records and attendance. Existing Google/membership authorization tests remain green. Actual prior use of the shortcut/seed in retained databases has not been inventoried; that operator check remains required before deployment.

## P2B — Finish the manually curated event contract

**Implemented locally; validation is recorded in the evidence ledger.** The following acceptance contract now has source-review/history, date/calendar, cancellation, queue and privacy implementation.

1. Separate fetched metadata from human verification. Record edition-specific source, fields checked, reviewer and review time; require that evidence to publish. Remove invented dates and fixed “checked” timestamps from publishable facts. Unknown information stays unknown or review-required. Carry timezone/CFP values through suggestion review; verify edition-aware matching and manual overrides.
2. Every active import path follows the draft rule: catalogue import adds absent drafts and preserves every existing ID; `--publish`, direct sync/auto-update and runtime quick-fetch application are disabled. Manual corrections record reason/source and before/after history.
3. Keep server-side URL quick-fetch unavailable in the pilot until its transport is fully bounded. Before enabling it, bind connections to validated public addresses, validate every redirect, and apply one deadline across DNS/connect/headers/body with byte/rate limits. Cover DNS changes, IPv4-mapped IPv6, redirect chains and stalled bodies with deterministic fixtures. Keeping this feature disabled is an acceptable P2 scope reduction; manual source entry remains available.
4. Define date-only conference days separately from timestamped deadlines. Ensure forms, stored values, displayed dates and ICS agree across Asia/America timezones and daylight-saving boundaries; interpret CFP local time in the selected event timezone. Test edit/export round trips and missing values.
5. My RSVPs provides session-owned cancellation after archive, masking unpublished event facts and never exposing another member's attendance. Archived detail/roster access remains restricted.
6. Validate role/paper-title inputs and explain who can see them before submission. Preserve approved-member and directory-consent filtering. ICS must contain public event facts only; test draft/archive authorization, long/Unicode/control-character text and calendar-client import. Define cache behavior so withdrawing publication cannot keep serving a previously cached public export.
7. Add pagination or an explicit, tested operational limit to curator queues; avoid silent 200/100-record cutoffs. Verify correction/suggestion/publish/archive journeys, empty/error states, mobile and keyboard behavior. Copy must not claim fact verification, endorsement or collaboration features without evidence.

Implemented scope: source/reviewer/time/checked fields and transactional revision snapshots; explicit review before publishing; reviewed changes or restores return to draft unless reconfirmed. Suggestions preserve timezone/CFP but cannot publish directly. Queue/history/own-attendance views paginate. URL fetching, sync commands, scheduled execution and authorized cron refuse during P2 even with legacy enable settings; catalogue imports are additive drafts and reject `--publish`. Missing parser dates produce a review error; offer expiry is not a CFP deadline.

Start/end dates render as calendar days; CFP inputs convert from the selected zone, rejecting invalid/ambiguous clock times unless explicitly offset. ICS folds Unicode safely, contains public facts only and uses private/no-store on success/errors. My RSVPs masks unpublished facts and permits session-owned cancellation. Historical or attended records must be archived instead of hard-deleted.

The new forward migration records previous publication state and returns non-demo legacy publications to draft for explicit review. IDs, dates and RSVPs remain intact. This intentional visibility change must be included in P2C's retained-data rehearsal.

**Exit evidence:** a curated draft can be reviewed, published, corrected and archived with provenance/history; imports cannot overwrite reviewed facts; missing metadata cannot become invented verified facts; a member can cancel after archive; displayed and exported dates agree; no private participation fields appear in public responses. Any disabled importer/fetch path is denied server-side and documented, not merely hidden in the UI.

## P2C — Prove upgrades, recovery and release checks

**Release acceptance remains gated.** Offline recovery, fail-closed lineage inventory and pinned legacy candidate-copy repair are implemented and covered by disposable fixtures. [Layered offline verification](docs/OFFLINE_VERIFICATION.md) adds child-only OS and Node/browser controls. [The 20 October remediation](docs/DEPENDENCY_REVIEW.md) removes both affected dependency chains with tested scoped overrides and zero full/omit-dev findings; no waiver or framework/ORM major change was applied. Authorized retained-history acceptance and exact-candidate/matching Linux CI remain distinct gates. See [the recovery runbook](docs/DATABASE_RECOVERY.md).

1. Inventory migration lineage without changing retained data. The conference migration was rewritten in place since `2ebd685`; distinguish fresh databases, populated foundation-only databases, already-applied older SQL and failed migrations. Specify a supported forward repair/checksum reconciliation for each actual lineage. Never reset retained data or blindly mark a migration applied.
2. Rehearse these upgrades on disposable populated fixtures, preserving IDs, legacy dates, member relations, attendance and roles/paper titles. Verify the intentional P2B downgrade of unreviewed non-demo publications to draft and its before/after audit; preserve all other publication states. Check foreign keys and rollback/restore.
3. Make restore an offline/exclusive maintenance operation: prove writers stopped, take a consistent safety snapshot (including committed WAL state), validate distinct paths and backup integrity, replace atomically, and preserve rollback on failure. Do not treat copying an active main DB then deleting WAL/SHM as safe recovery. Handle quoted backup paths and exclude all recovery snapshots from Git.
4. Verify test/build isolation independent of ambient settings: the harness forces scheduler off, denies Node DNS/HTTP/socket attempts, and confines native children through a separate OS boundary. Browser contexts, WebSockets, service workers and an owned deny proxy restrict intended traffic to the fixture. Run `verify:offline` and require zero forbidden workload attempts; keep downloads/audits/live-source checks separate. macOS validation does not certify the Linux CI path. Complete deployment-specific navigation/cache acceptance and record the candidate SHA.
5. From a clean disposable checkout, record the exact candidate SHA, Node/npm versions, clean install, Prisma validation/generation, lint, typecheck, all offline tests, isolated production build, development/production browser runs and dependency-audit decisions. Require a successful GitHub Actions run for the same SHA; workflow existence is not success.
6. Preserve the original 24 untracked `* 2` files, subsequently appearing numbered copies and earlier stash. Resolve ownership separately; do not include them in the release or delete them to achieve a clean checkout.

Current slice: lifetime app/CLI leases and mandatory process/open-handle checks refuse restore while clients run, including idle/startup clients. A private marker excludes new managed clients. Verified quote-safe backups and WAL-inclusive safety snapshots are owner-restricted; replacement and handled rollback use same-filesystem atomic renames. Interruption/failed rollback keeps the marker and recovery evidence. SQLite manages sidecar checkpoint/cleanup; scripts do not delete WAL/SHM. These guarantees require the single-host, controlled-client offline procedure; arbitrary bypass processes are unsupported.

`db:lineage` inventories metadata read-only; `db:migrate` refuses checksum mismatch, unresolved failures, unmanaged/drifted schema or invalid foreign keys. Fresh and populated current-checksum foundation histories upgrade in fixtures. `db:repair-lineage` recognizes exact pinned original-applied or single-failed states and prepares a separately verified copy under offline exclusion. It preserves application records and diagnostic history, normalizes schema and reconciles only the proven metadata transactionally; it never replaces the source or applies pending migrations. Synthetic installation/review-migration/rollback is rehearsed; actual retained use needs separate authority. Unknown states still refuse. New numbered duplicate files and the earlier stash remain preserved; only generated type copies are excluded from declaration checks.

**Exit evidence:** all supported migration histories and recovery failure cases pass on disposable data; zero unintended source requests/background imports occur; release record links exact-SHA local/CI results and accepted dependency risks. Record counts from actual runs, not the historical 62/14 report.

## P2D — Isolated staging and operating sign-off

**Requires operator choices and explicit execution authority.**

1. Assign membership reviewer, event curator, operator/rollback owner and support/pilot coordinator. Confirm vendor/region, budget, domain and branding permission. Preserve the [persistent Node/SQLite decision](docs/HOSTING_DECISION.md); a different runtime/storage constraint requires a separate design decision.
2. Provision separate staging/production databases, secrets and OAuth callbacks. No real member database copies in development/test; keep sibling deployments isolated. Keep scheduler disabled, cron unconfigured/disabled and unsafe CLI ingestion out of the operating runbook.
3. Verify actual Google consent/callback behavior, HTTPS cookies, sign-out, revocation/suspension, role changes, membership review and deletion in staging. Test private responses and publication changes in the production build with real browser navigation.
4. Approve plain-language consent, role/paper-title visibility, retention/deletion, correction, support and incident procedures. Define minimal logs and credential rotation. Mailbox verification does not establish doctoral affiliation or institutional endorsement.
5. Demonstrate protected off-volume backups, restoration and application rollback with synthetic populated staging data. Proposed targets are at most 24 hours of data loss and four hours to restore; accept them only after a timed drill.
6. Link the exact release SHA, migration procedure, recovery evidence, provider/browser evidence, dependency decisions and named sign-offs. Obtain deployment approval separately.

**Exit evidence:** actual staging checks and timed restore/rollback recorded; owners and policies agreed; all P2A–C blockers closed; no claim of production readiness rests solely on source inspection or an automated test count.

## P2E — Closed pilot and go/no-go

**Proposed scope:** 10–20 manually verified event editions, 15–25 consenting members, two weeks of observation. These are targets, not achieved counts.

After explicit authorization, curate the event set against official edition-specific sources and invite the cohort. Do not treat the 27 catalogue candidates or 14 source-registry entries as verified data. No academic ranking or travel/logistics claim is published without an appropriate basis.

Track consented visible profiles, distinct successful RSVP users, cancelled RSVPs, correction turnaround, failed access attempts and support issues without collecting unnecessary personal data. Proposed success signals: ten opt-in profiles, five distinct RSVP users, provenance for every published event, and no unresolved access-control or data-loss defect.

Pause expansion on a privacy/security/recovery incident. At pilot review, either resolve blockers and repeat, continue the same bounded cohort, or approve a separately scoped expansion. Small sample counts indicate usefulness, not statistically established adoption.

## Deferred: P3 automation and P4 collaboration

P3 may start after a successful pilot and assigned curator capacity. Before enabling unattended execution, add a durable cross-process lease/run ledger, bounded interval/runtime, retries/backoff, rate limits, failure notifications/exit status, source-access review and auditable proposed changes. The current process-local lock and cron success response do not establish multi-process safety or partial-failure visibility. Keep fetching separate from publishing.

P4 follows demonstrated demand: co-authorship posts, mentorship and opt-in matching need moderation, expiry/reporting and deletion. An R&R vault or proprietary dataset sharing needs separate permission, anonymization, private storage, malware/download controls and retention design.

## Next smallest implementation slice

Finish **P2C acceptance** with clean-checkout exact-candidate verification, successful matching Linux CI and authorized retained-lineage acceptance. [Dependency remediation](docs/DEPENDENCY_REVIEW.md) now has scoped compatibility regressions and zero current full/omit-dev findings; keep the pinned adapter/override contract under review. Git publishing works, but CI reading currently needs restored GitHub CLI/connector access. No retained database target/operator is identified; do not guess it, reset data or blindly resolve checksums. Use [the strict offline commands](docs/OFFLINE_VERIFICATION.md). Results and access requirements are in [the evidence ledger](docs/IMPLEMENTATION_CHECKS.md).

The original planning pass changed documentation only. P2A–P2B execution modifies application/fixture/curation/test code and uses disposable verification databases. Real OAuth, event fact-checking, retained-data operations, deployment and recruitment remain outstanding.
