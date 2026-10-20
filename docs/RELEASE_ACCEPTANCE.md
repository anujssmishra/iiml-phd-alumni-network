# P2C release-candidate acceptance

Updated 20 October 2026. This checklist does not authorize deployment or changes to retained data. The candidate branch is `codex/p2c-release-verification`; its exact SHA and post-commit clean-clone results are reported in the release handoff.

| Gate | Evidence/status |
| --- | --- |
| Dependency remediation | Zero full/omit-dev findings; [captured audit and scoped compatibility contract](DEPENDENCY_REVIEW.md) |
| Local strict verification | 120 service/integration cases, generation, lint/typecheck and production build passed on the working tree; post-commit clean install/browser runs are separately required |
| Matching Linux CI | CLI access restored. First run at `3246773` failed on Ubuntu UID mapping, before tests. The explicit isolated-network/bootstrap-with-privilege-drop path now needs a passing matching run; configuration alone is not acceptance |
| Retained database | **Not applicable:** the owner confirmed “none” on 20 October 2026; existing databases are disposable. No retained-data inspection, repair, replacement or migration is needed or performed |

## Authorized operator procedure

1. The owner confirmed no retained database exists, so this candidate's retained-data gate is not applicable. If retained data is introduced later, identify its host/client owner and authorized target before applying the following procedure. Do not guess from ambient configuration or scan unrelated user data.
2. With an identified, authorized target, run read-only `DATABASE_URL="file:/absolute/approved.db" npm run db:lineage`. For a recognized legacy history, the repair inspection is also read-only: `npm run db:repair-lineage -- --inspect`. Keep path/metadata reports private; do not publish member records or diagnostics.
3. Review the actual history against [DATABASE_RECOVERY.md](DATABASE_RECOVERY.md). Any candidate-copy repair, offline client shutdown, installation, migration or restore needs a separately confirmed target and operating window. Disposable upgrade/rollback regression results do not constitute acceptance of retained data.
4. GitHub CLI access is restored. Inspect the Check workflow for the **exact published candidate SHA**, including namespace/privilege assertions; resolve failures and repeat before marking CI accepted. Do not paste tokens into chat or infer success from the workflow definition.

Clean installation/downloads and advisory checks occur outside the [offline workload boundary](OFFLINE_VERIFICATION.md). Keep all unrelated duplicate files and the stash preserved and excluded from the candidate. A successful macOS run does not certify Linux, live Google OAuth/TLS, standalone hosting, protected off-volume/timed restore or a pilot launch. Those remain P2D–E operator/provider gates.
