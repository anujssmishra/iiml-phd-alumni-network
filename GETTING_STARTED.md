# Local setup and verification

Updated 19 October 2026 · Source baseline merged `736aecb` plus local P2C recovery/lineage work. Node 24/npm, Next.js/React, Google NextAuth database sessions, Prisma and SQLite are the supported baseline. See [PLAN.md](PLAN.md) and [implementation evidence](docs/IMPLEMENTATION_CHECKS.md).

## 1. Install and configure

```sh
nvm install
nvm use
npm ci
npm run db:generate
```

Use the committed npm lockfile. If `.env` does not exist, copy `.env.example` to it; preserve existing configuration. Generate a unique `NEXTAUTH_SECRET` with `openssl rand -base64 48`. Never commit secrets or `.env`.

Configure a separate local Google OAuth web client. Register `http://localhost:3000/api/auth/callback/google`, with `NEXTAUTH_URL=http://localhost:3000`. Separate staging/production clients and secrets remain required. Actual Google OAuth is a staging gate.

Application sign-in uses Google in every environment. Fixture profiles do not provide a login: they have no verified mailbox, OAuth account or session. The old local shortcut has been removed, and its known predictable tokens are rejected even if still stored. Browser tests create their own isolated sessions.

`ACADEMIC_EMAIL_DOMAINS` contains exact comma-separated domains; matching supports review, not automatic membership. Personal-email alumni can apply.

## 2. Choose a disposable local database

The easiest fixture workflow creates a new target regardless of any ambient `DATABASE_URL`:

```sh
APP_ENV=local npm run db:fixtures
```

This command refuses production/staging runtime settings. It creates an owner-restricted temporary directory with a target marker, migrates a new database, and adds three fictional demo events plus three private synthetic profiles. It prints the database path and a command to start the local app with that target and the scheduler disabled.

Profiles use `@example.test` addresses, include member/curator/applicant cases, and start with directory/contact sharing off. There are no admin fixtures, verified mailboxes, OAuth accounts, sessions or automatic RSVPs. Events use namespaced IDs, fictional descriptions and no claimed source-verification timestamp.

The operating system may remove temporary storage. Do not use it for retained data. An ordinary empty database without fixtures can instead be created after confirming a new disposable `DATABASE_URL`:

```sh
npm run db:validate
npm run db:migrate
ENABLE_AUTO_CONFERENCE_SYNC=0 npm run dev
```

`DATABASE_URL="file:./dev.db"` resolves under `prisma/`; use an explicit absolute path when the target would be ambiguous. The migration wrapper creates missing files exclusively and never truncates existing ones.

There are four migrations. `npm run db:lineage` inventories existing migration metadata read-only; `db:migrate` refuses unknown checksums, unresolved failures and schema drift before deployment. The older conference migration was rewritten under an existing name. `db:repair-lineage -- --inspect` recognizes only pinned original-applied/single-failed states; its explicit offline operation prepares a verified candidate copy without replacing the source or deploying pending SQL. Follow [the full repair procedure](docs/DATABASE_RECOVERY.md) and obtain authority before retained-data use or installation. The new review migration returns non-demo published listings to draft, recording old state while preserving facts/RSVPs; they require explicit source review before republication. No retained database was migrated by this implementation. Do not reset data or blindly resolve migrations.

## 3. Repeating fixture seeds

Both direct seed commands now validate their target **before constructing Prisma**:

| Command | Explicit opt-in | Other required conditions |
| --- | --- | --- |
| `npm run db:seed` | `ALLOW_DEMO_SEED=1` | APP_ENV local/test; NODE_ENV development/test; absolute DATABASE_URL and matching FIXTURE_DATABASE_DIR created by db:fixtures/the test harness |
| `npm run db:seed:dev` | `ALLOW_DEV_SEED=1` | The same environment, ownership, marker and target checks |

The provisioning output identifies the directory and database URL to reuse. A relative path, arbitrary retained target, missing marker, linked database or production/staging environment fails. Leave both opt-ins at zero in normal configuration.

Repeats add only missing fixtures. Existing event IDs, user IDs and user-email collisions are skipped without updating/deleting records. Curator changes, membership/roles/consent, stored sessions and RSVPs are preserved. No seed creates or prints a session token. No old development accounts/sessions were removed by the implementation; inventory any previous shared-environment use before deployment.

## 4. First administrator

After the intended administrator signs in through Google against the intended environment, an authorized operator runs:

```sh
npm run admin:bootstrap -- --email your-verified-sign-in-address@example.org
```

This needs a pre-existing verified Google account, audits the decision, refuses if an approved administrator exists, and cannot override rejection/suspension. It creates no identity or login route. Subsequent reviews use the administrator interface.

## 5. Manual curator workflow

An approved curator/admin can use the curator workspace:

1. Create a draft or accept a member suggestion as a draft. Suggestions retain venue timezone and timed CFP information.
2. Enter an edition-specific source URL and change reason. Check every displayed fact, including any stated absence of deadline/details, and explicitly confirm the review.
3. Publish only after review. Reviewer/time/checked fields are recorded server-side; a URL or fetched timestamp alone does not establish review.
4. Correct facts in Edit. Reconfirm the whole record to keep it published, or save as a draft without confirmation; unconfirmed edits clear prior review. A stale form must be reopened.
5. Use History / restore to inspect field changes and restore a previous version as an unreviewed draft. Attendance is retained. Archive published/history-bearing events; hard deletion is limited to unused unreviewed drafts.

Conference start/end fields are calendar dates, not midnight instants converted into the venue timezone. CFP inputs represent a local clock time in the selected timezone. Invalid/nonexistent/repeated local times are rejected; an optional UTC offset disambiguates a repeated hour. Edits show the deadline in that timezone.

Approved members can use My RSVPs to cancel after archive; the page masks unpublished event details and shows only their own participation. The RSVP form explains directory-consent visibility for role/title. Public ICS contains event facts only and is not cached; a downloaded calendar copy remains the user's own file.

## 6. Ingestion remains disabled during P2

`ENABLE_AUTO_CONFERENCE_SYNC=0` stays in the template for compatibility. Setting it to `true`/`1` does **not** re-enable runtime fetching or timers during this phase.

| Setting/entry point | Current behavior |
| --- | --- |
| `CRON_SECRET` | Missing/blank rejects all environments. Valid header authorization reaches a P2 refusal (503); GET remains 405. Do not put secrets in URLs. |
| `AUTO_SYNC_INTERVAL_HOURS` | Inactive; no scheduled ingestion runs during P2. |
| `import:catalogue` | Adds absent candidates as unreviewed drafts with no fabricated check time; skips all existing IDs. `--publish` fails before database writes. |
| `sync:conferences`, including `--auto-update` | Refuses before database/network activity. |
| `sync:auto-conferences` / URL quick-fetch / cron / scheduler | Runtime execution refuses; authenticated curators enter source facts manually. |

The batch prototype is tested only with injected deterministic fixtures in the test runtime. Real HTTP transport was removed; it needs separate P3 implementation and review. [Offline verification](docs/OFFLINE_VERIFICATION.md) now layers Node/browser guards with child-only OS network isolation; exact-candidate/CI proof remains required.

## 7. Verification

Run isolated checks with Node 24:

```sh
npx playwright install chromium
npm run verify:offline -- check
BROWSER_APP_ENV=local npm run verify:offline -- browser
```

The wrapper creates a unique marked database, supplies synthetic auth settings, disables fixture opt-ins and scheduler, and removes only its owned directory. Tests can explicitly enable fixtures inside that isolated target. Strict verification requires macOS sandbox-exec or Linux user/network namespaces with util-linux/iproute2; recovery tests require lsof. It refuses unavailable isolation instead of retrying unconfined. Install/download commands run before isolation. See [the boundary and evidence limits](docs/OFFLINE_VERIFICATION.md); fixture-driven ingestion logs are not proof of live-source verification.

Ordinary `npm run check`/`npm run test:e2e` still work with the cooperative Node/browser guards but do not prove native-child isolation. A forbidden attempt fails even when caught by the caller; failed runs retain a private destination-free ledger. Next's upgrade reminder is disabled only in guarded verification, with [the separate dependency audit](docs/DEPENDENCY_REVIEW.md) still required. The 20 October scoped remediation reports zero full/omit-dev findings; no risk waiver is implied. Keep the pinned ESLint compatibility adapter and Prisma override under review when updating dependencies.

The browser harness defaults to a development server. After `npm run build`, these focused production regressions exercise sign-in and the P2B workflows:

```sh
BROWSER_SERVER_MODE=production BROWSER_APP_ENV=local npm run verify:offline -- browser tests/browser/signin.spec.ts tests/browser/p2b.spec.ts tests/browser/p2c.spec.ts tests/browser/offline.spec.ts
```

For production-mode test configuration only, the harness supplies an HTTPS authentication origin while serving loopback HTTP; this exercises compiled application workflows, not deployed TLS or a live Google callback. Calendar exports also round-trip through the independent ICAL.js test parser; no external calendar account was modified.

Numbered generated type copies under `.next/` are excluded from TypeScript checks; canonical generated declarations remain checked and all copies are preserved. External duplicate creation has continued beyond ` 2.ts`; no user copies were deleted.

See the evidence ledger for actual local results. Remote CI for a release SHA, real OAuth, source facts and deployment are separate evidence.

## 8. Recovery and deployment gates

Read [DATABASE_RECOVERY.md](docs/DATABASE_RECOVERY.md) before using recovery commands. Linux/macOS offline recovery requires Node 24, `lsof`, private owned directories (`0700`), intact standalone snapshots, and all clients/automatic restarts stopped. Application and writing CLIs hold lifetime leases; restore refuses even an idle running server.

`npm run db:backup -- "/absolute/private-backups/snapshot.db"` creates a quote-safe, verified, owner-only consistent snapshot without overwriting an existing file. `npm run db:restore -- "/absolute/private-backups/snapshot.db" --offline` validates stopped clients, retains a WAL-inclusive safety snapshot and manifest, and atomically replaces/validates the active database. Handled replacement failures roll back; interruption or failed rollback retains the maintenance marker for operator review. Never delete WAL/SHM or steal the marker to force recovery. This is locally tested tooling, not authorization to restore retained data or proof of timed staging recovery.

Retain one persistent Node server, separate absolute DB paths/secrets/OAuth clients/HTTPS origins, protected off-volume backups and storage outside release directories. See [hosting](docs/HOSTING_DECISION.md). P2D verifies real OAuth/HTTPS/session behavior and timed recovery; P2E requires reviewed events and authorized invitations.
