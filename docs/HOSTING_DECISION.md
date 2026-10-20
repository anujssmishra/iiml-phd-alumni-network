# Hosting decision and operational release gates

Updated 19 October 2026 · Source baseline merged `736aecb` plus local P2C recovery/lineage work. Architecture retained; local validation is recorded in the evidence ledger. Follow [PLAN.md](../PLAN.md) for P2 and [IMPLEMENTATION_CHECKS.md](IMPLEMENTATION_CHECKS.md) for results and remaining deployment gates.

## Decision and reason

Retain Next.js/Prisma/SQLite on one persistent Node 24 server for the bounded pilot. Keep npm/`package-lock.json` authoritative. This preserves the implemented membership/privacy workflows without a framework or database rewrite.

The host must provide persistent writable storage, durable protected backups, HTTPS, secret management and controlled migrations. Ephemeral storage or independently writable replicas require a separate database decision. PHP-only hosting requires a separately scoped migration/rewrite. No vendor, region, domain or paid service has been chosen by this review.

## Current release blockers

- **P2A implemented locally:** runtime shortcut removed; known prior predictable tokens rejected at session reads; both seeds require an owned temporary target and preserve existing records. Record actual prior use in retained environments before deployment; no accounts/sessions were removed.
- **P2B implemented locally:** reviewed publication, transactional history/draft restore, date/calendar consistency, participation consent, paginated queues and own archived-RSVP cancellation. URL fetching and sync/cron/scheduler execution refuse during P2; catalogue import creates unreviewed drafts only.
- **P2C:** recovery, pinned legacy candidate-copy repair, layered offline verification and scoped dependency remediation are implemented; authorize actual retained-lineage acceptance and record clean-install exact-release-SHA local/matching Linux CI results. See [offline boundaries](OFFLINE_VERIFICATION.md) and [dependency remediation](DEPENDENCY_REVIEW.md).
- **P2D:** demonstrate real OAuth/HTTPS/session behavior, name operators, approve policies and rehearse restore/rollback on isolated staging.
- **P2E:** curate the small verified event set and recruit a consenting cohort only with separate authority.

Earlier fixes include curator authorization, fail-closed POST cron, table-rebuild migration, lifecycle UI and recovery tooling. P2B now disables real fetching/scheduled execution at runtime rather than leaving an environment opt-in. These changes do not close migration-lineage, recovery, provider or deployment gates.

## Environment separation

| Environment | Data/authentication | Operating rule |
| --- | --- | --- |
| Local | Developer-owned disposable SQLite; separate localhost OAuth client | No public exposure or retained-data seeds; scheduler explicitly off |
| Tests/build | Wrapper-owned temporary DB, synthetic sessions and dummy auth config | Strict `verify:offline` adds OS isolation and Node/browser guards; exact-candidate and Linux CI proof remain |
| Staging | Separate volume and OAuth client/HTTPS callback; synthetic or explicitly consented test data | P2C precedes live staging acceptance; no routine production member-data copies |
| Production | Dedicated persistent volume, absolute DB path, separate HTTPS client/secrets | Controlled release/migrations, restricted OS access, protected off-volume backups; deployment unverified |

Runtime settings: `APP_ENV`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ACADEMIC_EMAIL_DOMAINS`. `ALLOW_DEMO_SEED` and `ALLOW_DEV_SEED` stay unset/zero outside a deliberate disposable fixture operation. Both seeds require a marked, owner-restricted temporary database and matching `FIXTURE_DATABASE_DIR`; they skip existing records without deletion or updates.

The template now documents the scheduler disable flag. Cron/interval settings below remain absent from it:

| Setting | Observed semantics | Operating rule |
| --- | --- | --- |
| `ENABLE_AUTO_CONFERENCE_SYNC` | Compatibility flag; cannot enable P2 runtime ingestion | Keep `0`; P3 needs a reviewed implementation |
| `CRON_SECRET` | Missing/blank denies every environment; GET 405; valid POST header credentials reach P2 refusal (503) | Leave unconfigured for pilot; no URL secrets |
| `AUTO_SYNC_INTERVAL_HOURS` | Inactive throughout P2 | Define bounds/runtime controls before P3 |

Do not put secrets in `NEXT_PUBLIC_*`, source, bundles, URLs or logs. Build-time isolated values are not production runtime configuration. P2B also refuses sync CLI and cron execution. Catalogue `--publish` is rejected; its supported importer adds absent drafts without changing any existing record or claiming source checks.

## Backup, migrations and recovery

P2C recovery now uses verified private `VACUUM INTO` snapshots with bound quote-safe paths and no-clobber publication. Offline restore checks lifetime app/CLI leases plus mandatory `lsof`, excludes new managed clients, takes a WAL-inclusive safety snapshot, lets SQLite checkpoint/remove sidecars and atomically replaces/validates the database. Handled failures roll back; interruption or failed rollback retains a durable marker and recovery evidence. See [DATABASE_RECOVERY.md](DATABASE_RECOVERY.md) for the controlled single-host Linux/macOS operating boundary; unsupported clients or missing process visibility refuse recovery.

Snapshot/marker/lease/recovery paths are ignored by Git and owner-restricted, not encrypted or automatically expired. Retained-data use, protected off-volume copies, timed restoration and application-version rollback still require operator acceptance on synthetic populated staging data. Proposed recovery targets are at most 24 hours of data loss and four hours to restore, pending demonstration.

The migration wrapper never truncates an existing file and checks migration metadata/schema before deployment. Disposable fresh/foundation-only histories upgrade; ordinary deployment refuses older-applied checksums and original failures. Explicit pinned repair now prepares a separately verified candidate copy with transactional schema normalization, record preservation and known metadata reconciliation; it never replaces the source or applies pending SQL. Actual retained inventory/use/installation still requires operator authority and acceptance. Rehearse the supported actual lineage and rollback on disposable copies. Never reset data or blindly resolve checksums.

The fourth (P2B) review migration intentionally returns non-demo legacy published events to draft for human review, preserving IDs/facts/RSVPs and recording their old publication state. Confirm this visibility change in the staging rehearsal; a timestamp from the old importer does not bypass the new review gate.

Every retained-data migration needs a recoverable backup, supported history, controlled `db:migrate` step and exact application revision. An older checkout does not undo a schema change. Preserve sibling applications, credentials, domains and volumes on shared accounts.

## Operations and automation

Log minimal diagnostics without member names/emails, tokens, contact text or submitted paper titles. Name incident, rollback and support owners; define retention/deletion and credential rotation.

Keep P3 automation deferred. Before enabling it, require a durable cross-process lease/run ledger, bounded runtime/intervals, retries/rate limits, meaningful partial-failure status/notifications, source-access review, human change approval and reversal history. Current process-local locking and timers do not supply those guarantees.

## Decisions required before staging and pilot

| Decision | Current status |
| --- | --- |
| Vendor/account/region and persistent storage | Unconfirmed |
| Domain, DNS access and institutional branding permission | Unconfirmed |
| Budget/billing owner | Unassigned |
| Operator/alternate, rollback and support owners | Unassigned |
| Membership reviewer, event curator, pilot coordinator | Unassigned |
| Backup destination, retention and timed recovery evidence | Unverified |
| Actual retained-database migration lineage | Not inspected |
| Real Google OAuth callbacks and deployed browser evidence | Unverified |
| Privacy/retention policy, cohort and launch authorization | Required |

These are release gates, not reasons to rebuild already working product flows. P2D collects evidence; P2E follows explicit authorization. This document creates no services, credentials, real accounts or invitations.

## Dependency remediation — exact-candidate verification still required

The historical 19 October audit reported eight high-severity full-graph entries and three omit-dev entries across two advisories. The 20 October scoped remediation removes both chains; current full and omit-dev reports contain zero findings. Next 16.4.0 and Prisma/client 6.19.3 remain pinned. See [the compatibility contract and evidence](DEPENDENCY_REVIEW.md).

The scoped ESLint alias uses tinyglobby plus a caller-hash-checked adapter to preserve literal/absolute root behavior; the scoped Prisma configuration dependency uses patched deepmerge-ts 8.0.2 with actual loader/merge regressions. No dependency source files, framework/ORM majors or risk waivers were changed. Current clean audits do not establish deployed safety: exact-candidate install/artifact assessment and matching Linux CI remain required, alongside actual operator/retained-data acceptance.
