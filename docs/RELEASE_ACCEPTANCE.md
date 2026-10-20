# P2C release-candidate acceptance

Updated 20 October 2026. **P2C implementation acceptance passed** at `45da2c9957bf617cd79dfbc1f78c4628697d716e`. This checklist does not authorize merging, deployment or changes to retained data. The candidate branch is `codex/p2c-release-verification`, published in [PR #2](https://github.com/anujssmishra/iiml-phd-alumni-network/pull/2). Documentation-only follow-ups are identified separately in the release handoff; always inspect CI for the final published SHA.

| Gate | Evidence/status |
| --- | --- |
| Dependency remediation | Zero full/omit-dev findings; [captured audit and scoped compatibility contract](DEPENDENCY_REVIEW.md) |
| Local strict verification | Clean disposable checkout at `45da2c9`: 120 tests, generation, lint/typecheck, production build, 21 development and seven focused production browser cases passed; zero forbidden workload attempts. Node 24.19.0 / npm 10.7.0. Locked dependencies were freshly installed at `7b41aea`, then only the CI bootstrap/launcher changed; the lock stayed byte-identical |
| Matching Linux CI | [Successful exact-SHA run](https://github.com/anujssmishra/iiml-phd-alumni-network/actions/runs/39376461743) at `45da2c9`: clean install, both audits, Prisma validation, 120 tests/build, 21 development and seven focused production browser cases; all three isolated workloads left zero forbidden attempts. Node 24.21.0; workflow pins npm 10.7.0 |
| Retained database | **Not applicable:** the owner confirmed “none” on 20 October 2026; existing databases are disposable. No retained-data inspection, repair, replacement or migration is needed or performed |

## Verification notes and limits

- The first Linux attempt at `3246773` failed before tests because Ubuntu denied rootless UID mapping. The explicit CI bootstrap creates only a fresh network namespace as root, restores the original runner UID/GID and runner-owned home, drops every capability set and enables no-new-privileges. Each workload verifies those conditions and kernel denial before running. The intermediate `7b41aea` check passed but browsers failed because sudo's root home was retained; `45da2c9` corrects that handoff. Neither failed run counts as acceptance, and no host firewall/sysctl/security policy was weakened.
- Both full and omit-dev audits were repeated at `45da2c9` with zero findings. The lock digest remains `eacb1267b437ce34e9e92b2371546278cb3382d97713b9834131b5701f1cfd27`.
- A read-only inventory of that clean-checkout production artifact scanned 141 package manifests and 41 production traces, finding none of the eight named audit-chain package manifests/paths and no skipped symlinks. This limited inventory is not bundled-code reachability or deployment proof.
- Two inherited unused-variable lint warnings, development closed-stream/screenshot-caret hydration diagnostics and the next-start/standalone warning remain documented; the assertions and strict egress gates passed. The browser production subset uses fixture sessions and loopback HTTP, not real Google OAuth, HTTPS or standalone hosting.
- All 32 unrelated numbered copies and the existing stash remain outside the candidate. No existing database, hosted service or real member data was changed.

## Authorized operator procedure

1. The owner confirmed no retained database exists, so this candidate's retained-data gate is not applicable. If retained data is introduced later, identify its host/client owner and authorized target before applying the following procedure. Do not guess from ambient configuration or scan unrelated user data.
2. With an identified, authorized target, run read-only `DATABASE_URL="file:/absolute/approved.db" npm run db:lineage`. For a recognized legacy history, the repair inspection is also read-only: `npm run db:repair-lineage -- --inspect`. Keep path/metadata reports private; do not publish member records or diagnostics.
3. Review the actual history against [DATABASE_RECOVERY.md](DATABASE_RECOVERY.md). Any candidate-copy repair, offline client shutdown, installation, migration or restore needs a separately confirmed target and operating window. Disposable upgrade/rollback regression results do not constitute acceptance of retained data.
4. GitHub CLI access is restored. Inspect the Check workflow for the **exact published candidate SHA**, including namespace/privilege assertions; resolve failures and repeat before marking CI accepted. Do not paste tokens into chat or infer success from the workflow definition.

Clean installation/downloads and advisory checks occur outside the [offline workload boundary](OFFLINE_VERIFICATION.md). Keep all unrelated duplicate files and the stash preserved and excluded from the candidate. A successful macOS run does not certify Linux, live Google OAuth/TLS, standalone hosting, protected off-volume/timed restore or a pilot launch. Those remain P2D–E operator/provider gates.
