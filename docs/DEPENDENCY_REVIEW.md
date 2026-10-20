# Dependency remediation and verification

Updated 20 October 2026. Next.js **16.4.0**, Prisma/client **6.19.3**, Node 24 and SQLite are retained. Exact scoped overrides remove both previously reported chains; no framework downgrade, ORM major migration or risk waiver was applied.

## Audit evidence

The [19 October baseline](evidence/dependency-audit.json) reported eight high-severity chain entries (three in omit-dev), representing two underlying advisories. The [20 October report](evidence/dependency-audit-2026-10-20.json) records **zero findings in both full and omit-dev audits**, runtime, lock digest and overrides. Historical evidence remains unchanged.

Outside [offline verification](OFFLINE_VERIFICATION.md), reproduce with `npm audit --json --ignore-scripts`, `npm audit --omit=dev --json --ignore-scripts`, and `npm ls fast-glob tinyglobby braces deepmerge-ts --all`. An unavailable registry/report is not a clean result. This is advisory-database evidence at a point in time, not comprehensive security certification. See [npm's audit reference](https://docs.npmjs.com/cli/v10/commands/npm-audit/).

## Next ESLint root discovery

Only `@next/eslint-plugin-next@16.4.0`'s fast-glob edge is replaced by `npm:tinyglobby@0.2.17`, removing fast-glob → micromatch → braces. [The braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) still lists no patched upstream version; removing the dependency is not an upstream fix. [Tinyglobby](https://github.com/SuperchupuDev/tinyglobby) provides the consumed globSync interface.

The libraries are not universally interchangeable: literal-directory expansion and absolute/trailing paths differ. [The adapter](../scripts/eslint-root-glob.mjs) explicitly preserves roots-only behavior and formatting, and bounds length/nesting before parsing. It installs only the scoped alias's process-local exports **before** dynamically importing Next's ESLint config; no dependency source file or other tinyglobby consumer is modified. Changed caller SHA-256 or unsupported API/options fail closed. Next/ESLint upgrades require adapter review.

## Prisma configuration merge

Only `@prisma/config@6.19.3`'s deepmerge-ts edge is pinned to **8.0.2**. [The advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) identifies 8.0.0 as the first patched release. [Upstream release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) disclose breaking changes including recursive Map merging, as well as circular-reference support. This is a tested scoped override, not a claim that all v7 consumers support v8.

The installed c12 loader uses deepmerge for supported plain-record configuration, nested settings, arrays and function values. Regressions exercise CJS/ESM merging, input preservation, cyclic-object safety, and the actual installed Prisma loader's valid schema/migration/seed path resolution and invalid-config refusal. Arbitrary Map-based/custom configuration is outside this application's accepted contract. The complete migration/repair/recovery suite must remain green; a clean npm summary is insufficient.

## Acceptance and remaining gates

[Five compatibility regressions](../tests/p2c-dependencies.test.ts) cover the actual Next caller, literal/brace/wildcard/array/missing/absolute roots, directory-only filtering, nesting/length/API refusal, exact overrides, merge semantics and Prisma config loading. Full service/build/browser and clean-install exact-candidate results belong in [the evidence ledger](IMPLEMENTATION_CHECKS.md) and release handoff, not inferred from focused tests.

The historical standalone inventory is limited: named-package absence is not proof of bundled-code absence, exploitability or deployed safety. [Clean-checkout verification, repeated audits and matching Linux CI passed at `45da2c9`](RELEASE_ACCEPTANCE.md); repeat for subsequent application changes. No residual advisory risk was accepted. The owner confirmed no retained database exists, so that gate is not applicable for this candidate. Staging OAuth/TLS, operational sign-off and deployment remain separate gates. No existing database or hosted service was changed.
