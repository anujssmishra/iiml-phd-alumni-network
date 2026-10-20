# SQLite upgrade inventory and offline recovery

P2C implementation, 19 October 2026. These are guarded tools, not permission to operate on retained data. Tests use disposable synthetic databases. Staging sign-off, protected off-volume backup retention, timed recovery and application-version rollback remain outstanding.

## Supported operating boundary

One controlled Linux/macOS host, a local filesystem, Node 24, `lsof`, and a dedicated database directory owned by the operator with mode `0700`. Database/snapshot files must be owned regular files without symlink or hardlink aliases; snapshots are `0600`. Separate sibling applications and databases. Network filesystems, independently writable replicas, Windows recovery, and arbitrary uncooperative processes are not supported.

Stop the application, all workers, migrations, bootstrap/import/seed processes and automatic restarts before restore. The `--offline` flag acknowledges this requirement; it does not stop services for you. Lifetime access leases detect managed clients even before they open SQLite. Mandatory `lsof` checks also refuse open handles from unmanaged clients. Missing process visibility/tooling fails closed. A private maintenance marker prevents new managed clients; SQLite exclusive locking protects snapshot/checkpoint work. This is not a promise to block arbitrary same-user/root processes that deliberately bypass the operating procedure.

The server registers its lease before accepting requests and when initializing Prisma. Supported writing CLIs and backup acquire leases too. Dead lease PIDs are ignored, not automatically deleted; malformed leases, permission failures and PID reuse refuse recovery. Never remove a live lease to force a restore.

## Migration inventory (no reset or automatic repair)

With the intended `DATABASE_URL` explicitly set, `npm run db:lineage` opens the existing database read-only and reports migration names/checksums/state, schema agreement and foreign-key/integrity results. It prints no member, attendance, token or submitted-content records. It never resolves checksums. Opening a WAL database can involve SQLite-managed sidecars; use an existing consistent copy for strict forensic preservation.

`npm run db:migrate` now runs this check before Prisma deployment and refuses unsupported histories. Its existing exclusive file creation does not truncate an existing target. Do not bypass the guard by invoking Prisma directly.

| Fixture history | Current behavior | Authorized retained-data procedure still required |
| --- | --- | --- |
| Empty/new database | Fresh deployment supported | Confirm the exact path/environment before creating |
| Current-checksum populated foundation-only prefix | Rebuild/backfill preserves legacy dates, IDs, member consent and RSVP relations | Snapshot and rehearse the actual supported prefix on a disposable copy |
| Current-checksum full history | Schema, checksum, integrity and foreign-key agreement required | Review pending migrations and intentional visibility changes |
| Original conference SQL already applied | Ordinary deployment refuses; explicit pinned candidate-copy repair supports the exact original schema with zero, one or two known successor migrations | Inspect/approve the actual lineage, verify a candidate copy, then separately authorize installation |
| Original SQL failed on populated Conference | Ordinary deployment refuses retry; candidate-copy repair supports exactly one failed original attempt with no DDL or only the partial `acronym` addition | Preserve failure history/logs; rehearse the candidate and its rollback; separately authorize installation |
| Unknown checksum, unmanaged tables, schema drift, foreign-key failure, non-prefix history | Deployment refuses | Operator-reviewed inventory and a case-specific repair rehearsal |

The [pinned original SQL](../scripts/legacy-migrations/20261011000001_conference_curation.sql) is copied byte-for-byte from commit `c8225bc`, with SHA-256 `b9a220be717c89cdd110cab67747da95f651ddce9b15ba14710cf9b047168776`. It is a reference used to recognize supported schemas, never blindly replayed against a populated source. Existing migration SQL has not been rewritten again.

The P2B review migration returns non-demo published records to draft, records the old publication/check state, and preserves IDs, dates and RSVPs. Other publication states and demo records retain their state. An old checked timestamp is not human-review evidence.

## Explicit legacy repair: prepare a candidate, never install automatically

The [repair command](../scripts/repair-lineage.mjs) implements a narrowly pinned recovery path, not a general migration resolver. It requires the exact four rehearsed current migration checksums and the pinned original SQL. It refuses unknown checksums, retries/multiple attempts, rolled-back source histories, additional failures, missing integrity/foreign keys, extra tables/columns/triggers or any other schema difference. A future migration requires re-reviewing the repair version rather than silently extending its scope.

With the exact source `DATABASE_URL` set, inspect without changing its migration history:

```sh
npm run db:repair-lineage -- --inspect
```

The output identifies the supported history, `lineageSha`, target prefix and still-pending migrations. The digest binds schema, full migration metadata and pinned SQL, **not application-row contents**. Diagnostic log values and member/session/attendance records are not printed. A changed history invalidates the plan; normal member-data changes before offline snapshotting are preserved from the latest committed snapshot, not an old inspection.

After stopping every client and automatic restart, and only with authorization for the chosen source:

```sh
npm run db:repair-lineage -- --offline --expect-lineage <lineageSha-from-inspection>
```

This takes a verified consistent safety snapshot under the same maintenance/client-exclusion rules as restore and builds `repaired-candidate.db` in a unique private `<source>.recovery-<unique>/` directory. **It does not replace the source, rewrite its migration history or deploy pending migrations.** Normal SQLite access can checkpoint WAL, so this is logical preservation, not strict forensic preservation of source file bytes/sidecars. Use an existing consistent copy for forensic work.

Within one candidate-only transaction, the tool rebuilds Conference to the exact current prefix schema, retaining every existing column value. Original-applied start/end dates are not reset to the legacy date. For supported failures, missing start/end values are backfilled from the retained date, new metadata stays null/default and publication starts as draft; a partially added acronym is preserved. No existing application records are deleted or republished. Every source application table is checked for equal row count and a streamed typed-value hash over all original columns, plus exact schema and foreign-key/integrity checks.

Only after actual schema normalization does the transaction reconcile the known conference metadata. A completed old record keeps its ID, timestamps, step count and diagnostic log, with its known checksum updated. A failed old attempt retains its checksum/log and remains unfinished, is marked superseded via `rolled_back_at`, and receives a separate current-checksum completion record. Other migration records remain identical. A private `repair.json` records pre/post headers (without diagnostic log values), preservation evidence and the result. No table is blindly marked applied.

The table rebuild follows [SQLite's documented create/copy/drop/rename sequence](https://www.sqlite.org/lang_altertable.html#otheralter), with foreign-key enforcement restored and checked. The [Prisma 6 recovery guidance](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/patching-and-hotfixing) distinguishes schema repair from history reconciliation; this project's copy-only path tests both before any separately authorized replacement.

On a handled schema/data/metadata failure, the candidate transaction rolls back and its manifest says `rejected`; never install that candidate. The source is not replaced. An abrupt interruption leaves the maintenance marker and private safety/working files; do not infer success from their presence. Inspect them with the operator procedure below. Repeated successful preparation makes a new unique workspace, never overwrites an earlier candidate, and refuses to reconcile an already-normalized candidate again.

For a retained environment, review the verified manifest, independently validate the candidate, protect off-volume backups, rehearse pending migrations and rollback on another disposable copy, and obtain separate installation authority. Use the full pinned maintenance checkout with its Node/Prisma versions, not just a standalone app bundle. The existing offline restore can install an approved candidate; `db:migrate` applies only the remaining migrations. Prefer completing/validating pending migrations on the approved copy before installation; otherwise keep services and automatic restarts stopped between installation and migration. Never start the current app against an incomplete prefix. A pending review migration still intentionally withdraws unreviewed non-demo publications. Restoring `before-repair.db` returns original schema/history/data and requires application compatibility review; it is not an automatic rollback command. No retained database was operated on during implementation.

## Backup

Set the exact intended `DATABASE_URL`; relative SQLite paths resolve beneath `prisma/`, as in Prisma. Use plain file paths without URL query parameters. Do not paste secrets into command arguments.

```sh
npm run db:backup -- "/absolute/private-backups/edition's snapshot.db"
```

The destination parent must already be private/owned (`0700`). Filenames must end in lowercase `.db`, `.sqlite` or `.sqlite3` so repository-wide Git exclusions apply to custom paths too. Without an argument, the command creates/uses the private repository `backups/` directory. It refuses existing destinations, including aliases, and publishes a completed snapshot without overwriting any existing file. Do not overwrite a previous backup.

SQLite `VACUUM INTO` reads a consistent committed snapshot, including WAL state, while online backup remains possible. The output is staged in a private directory, normalized to standalone journal mode, integrity/foreign-key/application-table checked, synced, then published atomically with no clobber. Bound filenames handle quotes without SQL interpolation. These guarantees follow [SQLite's VACUUM contract](https://www.sqlite.org/lang_vacuum.html); interrupted staging is not a valid backup. A local snapshot is not off-volume protection: an operator must protect and verify off-volume copies separately.

## Restore after stopping every client

Only restore an intact standalone snapshot: no adjacent `-wal`, `-shm` or `-journal`. Never separate a retained WAL from its database; committed transactions may exist only in that file. See [SQLite WAL lifecycle](https://www.sqlite.org/wal.html).

```sh
npm run db:restore -- "/absolute/private-backups/edition's snapshot.db" --offline
```

The active database must already exist in a private owned directory. The command:

1. Validates distinct regular paths, backup state and offline acknowledgement; creates an exclusive maintenance marker.
2. Refuses live access leases, open handles and uncertain process visibility.
3. Validates the backup, stages a verified replacement beside the active database, and snapshots the current database consistently under SQLite exclusive locking. This safety snapshot includes committed WAL left by a crashed writer.
4. Checkpoints and changes journal mode through SQLite. It never deletes WAL/SHM files directly. Rechecks stopped clients and absence of sidecars.
5. Syncs a private recovery manifest/snapshot, replaces the active path with a same-filesystem atomic rename, and validates the restored database.
6. On a handled post-replacement failure, atomically restores the verified pre-restore snapshot. On a failed rollback, retains the maintenance marker and recovery evidence, refusing new managed clients.

Successful output identifies `before-restore.db` inside `<active>.recovery-<unique>/`. Keep it and `restore.json`; the manifest records `prepared`, `replaced`, `verified` or `rolled-back`. Snapshots and manifests can contain sensitive data and operational paths. They are ignored by Git, not encrypted or automatically expired.

An abrupt process interruption leaves the maintenance marker deliberately. Do not restart the app, delete sidecars, steal the marker or rerun blindly. Preserve the active file and all sidecars/recovery directories; inspect the manifest, owner PID and all client processes. An operator must choose/validate a recovery snapshot and reconcile the marker while services remain disabled. There is intentionally no automatic stale-lock recovery command. A crash between rename and manifest update may leave a prior phase, so the manifest alone is not proof of active contents.

Only reopen services after checking migration lineage/schema compatibility with the selected application revision and validating the restored data. Deploying an older application checkout does not undo a newer schema. This tooling does not grant authority to inspect, restore, clean or migrate any retained database.

## Local proof versus release approval

Regression cases cover relational preservation, quote-safe/no-clobber/private backup, idle and live separate-process refusal, lease/maintenance startup denial, WAL crash recovery, pre/post-replacement failures, failed rollback, abrupt interruption, corrupt/FK-invalid backups, aliases, permissions and missing `lsof`. Browser checks verify a running application refuses restore and remains usable. Exact execution counts/results belong in [the evidence ledger](IMPLEMENTATION_CHECKS.md).

The legacy repair has disposable populated and actual-Prisma-engine coverage, including candidate installation, pending review migration, safety rollback, transactional failure and interruption. Actual retained lineage inventory/repair/installation still requires operator authority and is not claimed. Remaining P2C: broader deterministic egress denial, dependency decisions, clean-checkout candidate-SHA verification and matching successful CI. P2D adds staging/provider evidence and a timed restore/application rollback drill. No deployment approval is implied.
