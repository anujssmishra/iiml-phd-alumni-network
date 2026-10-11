# Hosting decision: P0 baseline

Recorded 11 October 2026. This is the selected application architecture for implementation, not a claim that infrastructure has been purchased or deployed.

## Decision and reason

Retain Next.js with Prisma/SQLite on one persistent Node 24 process. The existing application already uses this stack and the initial private community has small expected traffic. This avoids a framework/database rewrite while implementing membership and directory access control. npm and `package-lock.json` are the only package-manager authority. Tailwind uses its supported PostCSS integration; private pages use request-time rendering rather than shared component caching.

The deployment must provide a persistent writable volume, durable backups, HTTPS, environment secrets, and a controlled migration step. SQLite is unsuitable for an ephemeral filesystem or several independently writable application instances. A serverless-only or horizontally scaled host would require a separate database decision and tested migration; PHP-only shared hosting would require a separately scoped rewrite. Do not provision either under the current baseline.

## Environment separation

| Environment | Database and data | Authentication | Operating rule |
| --- | --- | --- | --- |
| Local | Developer-owned SQLite path; synthetic fixtures only by default | Local OAuth client and localhost callback | `.env` ignored; opt-in seeding; back up an older prototype before migration |
| Tests/build | Unique temporary SQLite file for each invocation | In-process fixture accounts/sessions and non-live configuration | Forced by scripts; no real-member data; no seed or production mutation |
| Staging | Separate persistent volume; synthetic/consented test data | Separate client, secret, and HTTPS callback | No copy of production member records without a specific approved purpose |
| Production | Absolute path on a dedicated persistent volume | Production client, secret, and HTTPS callback | Operator-controlled migrations, restricted OS access, encrypted backups |

Runtime settings are `APP_ENV`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ACADEMIC_EMAIL_DOMAINS`. `ALLOW_DEMO_SEED` stays unset/zero outside an explicit local/test fixture task. No secret belongs in a `NEXT_PUBLIC_*` variable, source file, image, browser bundle, or log. The build wrapper supplies isolated values and the deployed Node process reads its own runtime environment.

## Backup and release requirements

The future operator must arrange a consistent SQLite backup using the SQLite backup API/CLI or a database-aware volume snapshot. Copying only the main database during writes can omit WAL contents; rehearse the chosen method. Keep encrypted backups outside the application volume, limit access, and verify restoration to an isolated database before launch. Proposed pilot recovery targets remain at most 24 hours of data loss and four hours to restore until an operator demonstrates them.

Before each production migration, create and verify a recoverable backup. Commit migrations to source, apply them with `npm run db:migrate`, and record the released revision. Application rollback must use a schema-compatible revision or a tested restore; never assume that checking out older code reverses a migration. Separate logs and health checks must avoid member names, email addresses, auth tokens, and contact-request text.

## Decisions still required before P2

| Item | Current status |
| --- | --- |
| Hosting vendor/account and region | Unknown; must meet the persistent Node/SQLite requirements |
| Domain, institutional branding permission, and DNS access | Unknown |
| Monthly budget and billing owner | Unknown |
| Named production operator and alternate | Unassigned |
| Membership reviewer and contact-request moderator | Unassigned |
| Backup destination, retention, and restore evidence | Not provisioned or tested |
| Production OAuth consent/client configuration | Not supplied or verified |
| Staging and production deployment | Not performed |

These account-specific decisions do not block local P0–P1B implementation. They remain release gates; no external services or credentials are created by this decision.

## Dependency follow-up recorded during P0

A clean `npm ci` succeeds on Node 24.19.0/npm 10.7.0. The 11 October 2026 audit reports eight high-severity entries across two transitive chains: ESLint's glob tooling uses `braces` with a deeply nested-pattern denial-of-service advisory, and Prisma's configuration tooling uses `deepmerge-ts` with a recursive-object denial-of-service advisory. `npm audit --omit=dev` still reports the three Prisma-chain entries because the Prisma client can bring in the CLI as an optional peer. Do not describe the production dependency audit as clean.

The recorded advisory sources are [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). The reported fixes require incompatible toolchain downgrades, so no forced downgrade was applied. Review compatible upstream fixes and the deployed artifact's contents before pilot release. User-supplied directory/profile values are not intentionally passed to these configuration or glob APIs; that limits the known path but does not resolve the dependency advisories.
