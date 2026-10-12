# Hosting decision and operational release gates

Updated 12 October 2026 against merged `a05f216`. The architecture decision is retained; this is not infrastructure provisioning, a deployment approval, or a fresh application verification. Follow [PLAN.md](../PLAN.md) for H1–H6 and [IMPLEMENTATION_CHECKS.md](IMPLEMENTATION_CHECKS.md) for evidence boundaries.

## Decision and reason

Retain Next.js with Prisma/SQLite on one persistent Node 24 process. The existing application uses this stack and the proposed private pilot is small. This avoids a framework/database rewrite while preserving membership and directory access control. npm and `package-lock.json` remain the package-manager authority. Tailwind uses PostCSS; private pages use request-time rendering rather than shared component caching.

The deployment must provide a persistent writable volume, durable backups, HTTPS, environment secrets, and a controlled migration step. SQLite is unsuitable for an ephemeral filesystem or several independently writable application instances. A serverless-only or horizontally scaled host needs a separate database decision and tested migration; PHP-only shared hosting needs a separately scoped rewrite. No vendor is selected or provisioned by this document.

## Current operational blockers

- H1: the Node startup hook schedules an external ingestion run after ten seconds and repeats every 24 hours by default. Both development and production starts can mutate/publish into their configured database. No supported disable flag exists; `APP_ENV=test` and `ALLOW_DEMO_SEED=0` do not stop it. The `NODE_ENV=test` timer guard is for unit tests, not an approved runtime workaround. Default-off scheduling, bounded execution, ingress protection, and concurrency control remain work to implement.
- H2: the seed deletes demo records and overwrites 27 real-looking events as published/non-demo with a fixed source-check timestamp. Neither seed labels nor successful fetch timestamps prove reviewed provenance. The conference migration's `ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP` fails against populated `Conference` tables in an isolated SQLite reproduction. A compatible table rebuild/backfill plus upgrade/restore rehearsal is required before retained-data migration.
- H3: isolated database wrappers do not make the current suite offline. Live ingestion tests and the development browser server can access external sources; historical passing checks do not verify this merged revision. Fixture-driven tests and exact-revision CI evidence are required.

Until these are closed, do not start or migrate this revision against retained member/event data, or expose it as a pilot. Local experiments must use expressly disposable data. See [local setup](../GETTING_STARTED.md) for the present command side effects.

## Environment separation

| Environment | Database and data | Authentication | Operating rule |
| --- | --- | --- | --- |
| Local | Developer-owned disposable SQLite path until H1–H3 pass | Separate local OAuth client and localhost callback | `.env` ignored; no retained database startup or unsafe seed use |
| Tests/build | Unique temporary SQLite file for each wrapper invocation | Fixture sessions and non-live auth configuration | Retained database writes are isolated, but external HTTP/background ingestion is not yet disabled |
| Staging | Separate persistent volume; synthetic/consented test data | Separate client, secret, and HTTPS callback | H5 follows H1–H4; no production member-data copy without a specific approved purpose |
| Production | Absolute path on a dedicated persistent volume | Production client, secret, and HTTPS callback | Required: controlled release/migrations, restricted OS access and encrypted backups; deployment unverified |

Runtime identity/database settings are `APP_ENV`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ACADEMIC_EMAIL_DOMAINS`. `ALLOW_DEMO_SEED` stays unset/zero outside an explicit disposable local/test experiment; its current guard does not make the seed non-destructive.

The merged ingestion code also reads settings not yet included in `.env.example`:

| Setting | Observed semantics | Release implication |
| --- | --- | --- |
| `CRON_SECRET` | When absent, production denies the cron route but non-production permits it. When set, a bearer token, `x-cron-secret`, or query parameter authorizes GET/POST batch execution. | Prefer secrets outside URLs; H1 must remove unsafe defaults and mutating GET behavior. This secret does not govern the startup timer. |
| `AUTO_SYNC_INTERVAL_HOURS` | `Number(value) || 24`; zero/invalid input falls back to 24, while negative/oversized intervals are not validated. Initial startup sync still runs after ten seconds. | Not an off switch. Validate bounds and add explicit default-off scheduling in H1; controlled automation remains H6. |

No secret belongs in a `NEXT_PUBLIC_*` variable, source file, image, browser bundle, URL, or log. The build wrapper supplies isolated database/auth values; deployment must supply its own runtime environment. Do not infer network isolation from database isolation.

`sync:conferences` is not read-only even without `--auto-update`: it records source-check timestamps. The batch CLI, startup timer, and cron route all create/update/publish records. Existing drafts/archived records can be republished by batch matching. Replace this behavior with reviewable changes and protected curator state before allowing scheduled production execution.

## Backup, migration, and release requirements

The future operator must arrange a consistent SQLite backup using the SQLite backup API/CLI or a database-aware volume snapshot. Copying only the main database during writes can omit WAL contents; rehearse the chosen method. Keep encrypted backups outside the application volume, limit access, and verify restoration to an isolated database. Proposed pilot recovery targets remain at most 24 hours of data loss and four hours to restore until demonstrated.

The migration wrapper's exclusive file creation does not truncate existing databases, but it cannot fix incompatible migration SQL. H2 must test the conference migration on a populated copy, with existing event dates, attendance relations, constraints and rollback evidence. Empty-database success is insufficient. Never delete records, reset a database, or edit already-applied migration history merely to bypass the populated migration failure; plan the repair for each observed migration state.

After that gate passes, every production migration needs a verified recoverable backup, committed migration history, an operator-controlled `npm run db:migrate` step, and an exact released revision. Application rollback needs a schema-compatible revision or a tested restore; checking out older code does not reverse a migration. Preserve unrelated applications, secrets, domains and volumes on any shared account.

Health checks and logs must avoid member names, email addresses, tokens and contact-request text. H6 additionally requires a durable ingestion run ledger, bounded/retry-safe execution, overlap protection, clear partial-failure reporting, curator-visible changes and a tested reversal path. A process-local interval is not proof of reliable scheduled operation.

## Account-specific decisions required for H5 / the P2 pilot

| Item | Current status |
| --- | --- |
| Hosting vendor/account and region | Unknown; must meet persistent Node/SQLite requirements |
| Domain, institutional branding permission, and DNS access | Unknown |
| Monthly budget and billing owner | Unknown |
| Named production operator and alternate | Unassigned |
| Membership reviewer, event curator and contact-request moderator | Unassigned |
| Backup destination, retention, and restore evidence | Not provisioned or tested |
| Production OAuth consent/client configuration | Not verified by this review |
| Staging and production deployment | Not verified by this review |

These unknowns do not erase the earlier local P0–P1B implementation, but remain release gates alongside post-merge hardening. H4 accepts event lifecycle/public UX; H5 must verify real OAuth callbacks, HTTPS/private cookies, access controls, backup restoration and rollback on the chosen staging environment before a separately authorized pilot. No external service, credential, real member, invitation or deployment is created by this decision.

## Historical dependency follow-up — not a fresh audit

The earlier 11 October 2026 P0 verification recorded a clean install on Node 24.19.0/npm 10.7.0 and eight high-severity transitive audit entries. Its recorded chains were ESLint glob tooling through `braces` and Prisma configuration tooling through `deepmerge-ts`; `npm audit --omit=dev` reported three Prisma-chain entries because the client could bring in the CLI as an optional peer. Those are historical observations, not a new audit of `a05f216` or a clean production-artifact assessment.

The recorded advisory references are [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). The earlier audit suggested incompatible toolchain downgrades, so none was forced. H3/H5 must rerun the audit, assess compatible fixes and actual deployed contents, and document resolved or explicitly accepted residual risk before exposure. Current member inputs are not intentionally passed to those configuration/glob APIs; that observation does not resolve the advisories. No dependency installation or audit was performed for this documentation update.
