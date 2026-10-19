# Hosting decision and operational release gates

Updated 19 October 2026 · Source baseline `b404710` plus local P2A–P2B changes. Architecture retained; local validation is recorded in the evidence ledger. Follow [PLAN.md](../PLAN.md) for P2 and [IMPLEMENTATION_CHECKS.md](IMPLEMENTATION_CHECKS.md) for results and remaining deployment gates.

## Decision and reason

Retain Next.js/Prisma/SQLite on one persistent Node 24 server for the bounded pilot. Keep npm/`package-lock.json` authoritative. This preserves the implemented membership/privacy workflows without a framework or database rewrite.

The host must provide persistent writable storage, durable protected backups, HTTPS, secret management and controlled migrations. Ephemeral storage or independently writable replicas require a separate database decision. PHP-only hosting requires a separately scoped migration/rewrite. No vendor, region, domain or paid service has been chosen by this review.

## Current release blockers

- **P2A implemented locally:** runtime shortcut removed; known prior predictable tokens rejected at session reads; both seeds require an owned temporary target and preserve existing records. Record actual prior use in retained environments before deployment; no accounts/sessions were removed.
- **P2B implemented locally:** reviewed publication, transactional history/draft restore, date/calendar consistency, participation consent, paginated queues and own archived-RSVP cancellation. URL fetching and sync/cron/scheduler execution refuse during P2; catalogue import creates unreviewed drafts only.
- **P2C:** handle the rewritten migration's existing histories, demonstrate consistent offline recovery, prove full source-network isolation and record exact-release-SHA local/CI results. P2A now forces the scheduler off in verification.
- **P2D:** demonstrate real OAuth/HTTPS/session behavior, name operators, approve policies and rehearse restore/rollback on isolated staging.
- **P2E:** curate the small verified event set and recruit a consenting cohort only with separate authority.

Earlier fixes include curator authorization, fail-closed POST cron, table-rebuild migration, lifecycle UI and recovery tooling. P2B now disables real fetching/scheduled execution at runtime rather than leaving an environment opt-in. These changes do not close migration-lineage, recovery, provider or deployment gates.

## Environment separation

| Environment | Data/authentication | Operating rule |
| --- | --- | --- |
| Local | Developer-owned disposable SQLite; separate localhost OAuth client | No public exposure or retained-data seeds; scheduler explicitly off |
| Tests/build | Wrapper-owned temporary DB, synthetic sessions and dummy auth config | Harness forces scheduler off; full source-network denial still needs proof |
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

Existing `db:backup` uses `VACUUM INTO` and an integrity check. Its destination quoting needs repair. Existing `db:restore` copies the active main file, overwrites it and deletes WAL/SHM without proving writers stopped. A safety copy can omit committed WAL state. Script existence and quiescent tests are not production recovery evidence.

P2C requires offline/exclusive maintenance, a verified consistent safety snapshot, distinct validated paths, atomic replacement and failure rollback. Exclude all recovery files from Git; restrict OS access and protect off-volume copies. Then rehearse timed restoration and application rollback on synthetic populated staging data. Proposed recovery targets are at most 24 hours of data loss and four hours to restore, pending operator demonstration.

The migration wrapper never truncates an existing file, and the conference SQL now rebuilds/backfills tables. But it was changed under an existing migration name: inventory fresh, foundation-only, older-applied and failed histories before applying anything to retained data. Test the supported repair on disposable copies, preserving IDs/dates/attendance/participation fields and foreign keys. Never reset data or blindly resolve checksums to bypass the issue.

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

## Historical dependency follow-up — not a fresh audit

The earlier 11 October 2026 P0 record reported Node 24.19.0/npm 10.7.0 and eight high-severity transitive audit entries, with ESLint/glob and Prisma configuration chains; its production-only audit reported three Prisma-chain entries. Those are historical observations, not a current audit or production-artifact assessment.

The earlier record linked [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), and did not force suggested incompatible downgrades. P2C must rerun the audit, assess compatible fixes and actual deployed contents, and record resolved or accepted residual risks. The original planning pass installed nothing. P2B subsequently added development-only ICAL.js 2.2.1 for independent calendar parsing; the installation's audit summary still reported eight high-severity findings. Their release-artifact impact and remediation remain P2C work; no forced major changes or external advisory verification occurred.
