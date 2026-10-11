# Local setup and verification

The application uses Next.js, Google sign-in, Prisma, and SQLite. Node 24 and npm are the supported development baseline. Use the committed npm lockfile; npm was selected because the repository already had a working npm lock and the build needs only one deterministic dependency tree. The former Yarn lockfile and optional Prisma skill-sync hook have been removed.

Development, production builds, and browser tests explicitly use Webpack for a consistent compiler path. The lockfile was regenerated from an empty dependency tree to include native compiler packages for both Mac and Linux; the inherited lockfile omitted required platform-specific packages.

## 1. Install and configure

```sh
nvm install
nvm use
npm ci
cp .env.example .env
openssl rand -base64 48
```

Put the generated secret in `NEXTAUTH_SECRET` in `.env`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google OAuth web application. For local use, register `http://localhost:3000/api/auth/callback/google` as its redirect URI and keep `NEXTAUTH_URL=http://localhost:3000`. Use separate OAuth clients and secrets for local, staging, and production environments.

`DATABASE_URL="file:./dev.db"` stores the development database under `prisma/`; relative paths resolve from the Prisma schema. `APP_ENV=local` identifies this environment. Database files, journal/WAL files, generated build output, and local environment files are ignored by Git. `.env.example` contains placeholders only.

`ACADEMIC_EMAIL_DOMAINS` is a comma-separated list of exact domains. Matching an academic domain is evidence for review; it does not approve doctoral or alumni membership. Verified Google email is required for identity; members without an academic mailbox can still use the reviewed alumni path.

## 2. Create an empty local database

```sh
npm run db:validate
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. A real Google sign-in creates an individual pending account. No demo account or shared login is enabled. The directory and member tools become available only after membership approval.

Use an empty database for initial setup. If you have an older prototype database, copy it to a protected backup before migration and rehearse the upgrade on the copy; do not delete it or run reset commands to make migration succeed. The existing Git stash is unrelated to database migration and should be preserved.

`db:migrate` exclusively creates a missing SQLite file before running `prisma migrate deploy`, accommodating engines that cannot create the first file themselves. It never truncates an existing database. The parent directory must already exist and be writable.

## 3. Designate the first administrator

After the intended administrator has signed in through Google, a trusted operator with local database access runs:

```sh
npm run admin:bootstrap -- --email your-verified-sign-in-address@example.org
```

This operator command requires a pre-existing verified Google account. It records an initial membership decision and refuses to run when an approved administrator already exists, or to override a rejection/suspension. It does not create an account or provide an HTTP login route. The operator must first verify that the selected person is authorized to manage membership. Subsequent decisions use the administrator membership interface and retain reviewer, method, date, and a concise reason. Avoid storing documents or unnecessary personal details as evidence.

## 4. Optional synthetic events

```sh
ALLOW_DEMO_SEED=1 npm run db:seed
```

Seeding requires explicit opt-in and a non-production environment. Fixtures are synthetic demonstration events, not a verified conference catalogue and not member records. Repeating the seed is safe. Never promote demo data to a live catalogue without the separate P1C source-verification workflow.

## 5. Validate changes

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` generates the Prisma client, lints, generates Next.js route types and typechecks, runs service/security tests, and builds for production. `npm test`, `npm run build`, and `npm run test:e2e` each create and migrate a unique temporary SQLite database. These commands override ambient database and auth settings with test fixtures, never run demo seeding, and remove only their own temporary database when finished. Browser tests use their own local server and synthetic sessions; there is no runtime authentication bypass.

GitHub Actions installs with `npm ci` and runs the same checks plus Chromium browser coverage. Next.js compiles the production artifact using isolated build configuration; runtime database and OAuth secrets must be supplied by the deployment environment. A successful local build does not verify the live OAuth callback or deploy the site.

## Deployment baseline

The selected architecture is a single Node 24 server with persistent SQLite storage. See [the hosting decision](docs/HOSTING_DECISION.md) for the capabilities, isolation, backups, and unresolved account-specific decisions. Staging and production need distinct absolute `DATABASE_URL` paths, `APP_ENV`, OAuth clients, HTTPS origins, and secrets. Never place the database inside an ephemeral deployment directory.

Run committed migrations as a controlled release step, then start the built application with its runtime environment. `npm run start` uses the normal Next.js server; `output: "standalone"` also creates a self-contained server artifact for hosts that prefer it. Before pilot release, verify a real OAuth callback, backup restoration, HTTPS/private cookies, and the exact environment's access controls. Hosting, invitations, production data import, and deployment are not performed by local setup.
