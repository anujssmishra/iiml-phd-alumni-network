# Local setup and verification

Updated 12 October 2026 · Inspected baseline: merged `a05f216`. This guide describes current behavior and required safety gates; it does not claim a fresh post-merge application/test pass. See [PLAN.md](PLAN.md) for H1–H6 and [implementation checks](docs/IMPLEMENTATION_CHECKS.md) for evidence and limitations.

The application uses Next.js, Google sign-in, Prisma, and SQLite. Node 24 and npm are the supported development baseline. Use the committed npm lockfile; the former Yarn lockfile and optional Prisma skill-sync hook were removed. Development, production builds, and browser tests explicitly use Webpack. The lockfile contains native compiler packages for Mac and Linux.

## Read before starting the application

The merged application is not passive on startup. `npm run dev` and `npm run start` initialize conference ingestion, with an initial run scheduled after ten seconds and further runs every 24 hours by default. It makes external HTTP requests and writes/publishes into the configured database. There is no supported disable flag in this revision; `ALLOW_DEMO_SEED=0` and `APP_ENV=test` do not disable it. Do not use `NODE_ENV=test` as a normal application workaround.

Until H1 (ingress/scheduler safety), H2 (data/provenance and populated migration), and H3 (deterministic CI) are complete, use only a disposable database for any expressly intended app experiment. Do not start this revision against retained data or expose it as a pilot. A scheduler-disabled, reviewed startup is a proposed fix, not an available command.

## 1. Install and configure without starting the app

```sh
nvm install
nvm use
npm ci
```

If `.env` does not already exist, copy `.env.example` to `.env`; preserve existing local configuration. Generate a unique secret with `openssl rand -base64 48` and put it in `NEXTAUTH_SECRET`. Never commit secrets or the resulting `.env` file.

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google OAuth web application. For local use, register `http://localhost:3000/api/auth/callback/google` as its redirect URI and keep `NEXTAUTH_URL=http://localhost:3000`. Use separate OAuth clients and secrets for local, staging, and production. Real OAuth behavior has not been verified by this planning pass.

`DATABASE_URL="file:./dev.db"` resolves under `prisma/`; ensure the chosen path is new and disposable, not a retained prototype. `APP_ENV=local` identifies the environment but does not protect it from automatic ingestion. Database files, journal/WAL files, build output, and local environment files are ignored by Git. `.env.example` contains placeholders only.

`ACADEMIC_EMAIL_DOMAINS` is a comma-separated list of exact domains. Matching a domain is evidence for review, not doctoral/alumni membership approval. Verified Google email establishes identity; alumni without an academic mailbox can still use the reviewed membership path.

Two existing ingestion settings are absent from the current template:

| Setting | Current behavior and limitation |
| --- | --- |
| `CRON_SECRET` | Protects `/api/cron/sync-conferences` when set. The route accepts a bearer token, `x-cron-secret`, or `?secret=`; avoid query-string secrets because URLs can be logged. When unset, production denies this route but non-production allows it without authentication. It does not protect or disable the startup scheduler. |
| `AUTO_SYNC_INTERVAL_HOURS` | `Number(value) || 24` sets the interval. Zero/invalid values fall back to 24, not off; negative/oversized values are not validated. The initial ten-second run is independent of this interval. Do not treat it as a disable switch. |

H1 must define explicit opt-in, validated scheduling, and fail-closed ingress before these are deployment instructions.

## 2. Create only an empty disposable database

With the disposable `DATABASE_URL` confirmed, schema validation, client generation, and empty-database migration are separate from starting the application:

```sh
npm run db:validate
npm run db:generate
npm run db:migrate
```

`db:migrate` exclusively creates a missing SQLite file before `prisma migrate deploy`; it never truncates an existing file. The parent directory must exist and be writable. This file-creation safeguard does not make every migration safe for populated data.

The conference-curation migration adds non-null dates using `DEFAULT CURRENT_TIMESTAMP`. An isolated SQLite reproduction confirmed that these `ALTER TABLE ... ADD COLUMN` statements fail when `Conference` already has rows. An empty-database pass is not upgrade evidence. H2 requires a compatible table-rebuild/backfill migration and a backed-up upgrade rehearsal that preserves events and attendance. Do not apply the current migration to retained databases, delete records to bypass the failure, or reset a database to make setup succeed. Preserve the earlier Git stash independently of database work.

After H1–H3 are complete, follow their recorded safe startup procedure, then open the local site. Google sign-in creates an individual pending account; there is no demo/shared login. Directory and member tools require membership approval. Starting now remains a deliberate networked, database-mutating experiment, not the default setup step.

## 3. Designate the first administrator after safe startup is available

After the intended administrator has signed in through Google, a trusted operator with local database access runs:

```sh
npm run admin:bootstrap -- --email your-verified-sign-in-address@example.org
```

This requires a pre-existing verified Google account and an authorized operator decision. It audits the initial membership decision, refuses when an approved administrator already exists, and cannot override rejection/suspension. It does not create an account or provide an HTTP login route. Subsequent membership decisions use the administrator interface with reviewer, method, date, and concise reason. Avoid documents or unnecessary personal details in review evidence.

## 4. Seed and sync commands are not safe fixture setup

Do not run the current `db:seed` command against retained data. Its environment guard still requires `ALLOW_DEMO_SEED=1`, `APP_ENV=local` or `test`, a SQLite file URL, and a non-production runtime. Inside that guard it:

- Deletes the legacy symposium ID/acronym and every record marked `isDemo=true`.
- Upserts 27 hard-coded, real-looking conference records, overwriting matching IDs.
- Marks records `published` and `isDemo=false`, and assigns a fixed 11 October 2026 source-check timestamp.

Those labels and timestamps are not evidence of official-source verification. No user identities are created, but event data and related attendance may be affected by deletion. H2 separates reversible synthetic fixtures from reviewed event imports; until then, skip this command except in a disposable test specifically assessing its behavior.

The merged sync commands also mutate data:

| Entry point | Current side effect |
| --- | --- |
| `npm run sync:conferences` | Fetches existing sources and writes `sourceCheckedAt` even without `--auto-update`; it is not a dry run. With `--auto-update`, also overwrites extracted event fields. |
| `npm run sync:auto-conferences` | Fetches the 14-source registry and automatically creates/updates/publishes matched records. |
| `/api/cron/sync-conferences` | GET and POST both execute the mutating batch under the authorization behavior above. |
| Application startup/timer | Executes the same batch without a curator action or cron request. |

Do not use these to verify data by assumption. H1 secures execution; H2 establishes source/reviewer provenance; H6 reintroduces controlled automation after the earlier gates pass.

## 5. Verification status and intended workflow

The previous 38-test, ten-browser-workflow, and production-build results were recorded before the merged baseline. They must not be reported as a fresh pass for `a05f216`. Source inspection also finds a seed assertion still expecting three records while the seed now declares 27.

`npm test`, `npm run build`, and `npm run test:e2e` use a unique temporary SQLite database, override ambient database/auth settings, and remove only their own database directory. This protects retained member data, but it does not isolate network side effects. Ingestion tests make live HTTP requests; the browser harness uses `NODE_ENV=development`, and builds use `production`, both outside the scheduler's unit-test guard. Browser sessions are synthetic database fixtures, not a runtime authentication bypass.

After H1–H3 repair those contracts, the intended verification sequence remains:

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` generates Prisma, lints, generates route types/typechecks, runs tests, and builds for production. GitHub Actions configures the same sequence and Chromium. A configured workflow is not proof the merged revision passed remote CI. H3 must record the exact revision, offline fixture results, populated migration results, and any separately authorized live-source checks. No full application suite was run for this documentation update.

## Deployment baseline and remaining gates

Retain one Node 24 server with persistent SQLite storage; see [the hosting decision](docs/HOSTING_DECISION.md). Staging and production need distinct absolute database paths, `APP_ENV`, OAuth clients, HTTPS origins, and secrets. Keep database storage outside ephemeral release directories.

`npm run start` is the normal Next.js server command; `output: "standalone"` also emits a standalone artifact. Neither is safe deployment approval while automatic ingestion and populated migrations remain unresolved. H4 accepts event lifecycle/public UX, H5 verifies real OAuth, HTTPS/private cookies, access controls, backup restore and rollback on staging, and H6 gates controlled automation. Hosting, invitations, production imports, and deployment require their own authorization; this guide performs none.
