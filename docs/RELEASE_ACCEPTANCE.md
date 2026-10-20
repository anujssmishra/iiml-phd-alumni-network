# P2C release-candidate acceptance

Updated 20 October 2026. This checklist does not authorize deployment or changes to retained data. The candidate branch is `codex/p2c-release-verification`; its exact SHA and post-commit clean-clone results are reported in the release handoff.

| Gate | Evidence/status |
| --- | --- |
| Dependency remediation | Zero full/omit-dev findings; [captured audit and scoped compatibility contract](DEPENDENCY_REVIEW.md) |
| Local strict verification | 120 service/integration cases, generation, lint/typecheck and production build passed on the working tree; post-commit clean install/browser runs are separately required |
| Matching Linux CI | Workflow includes pinned npm, audit gates, OS isolation and both browser modes. Successful execution is not established by configuration alone. CLI login is invalid, connector/browser cannot access the private repository; restore access to inspect the actual candidate run |
| Retained database | No exact target/operator identified. Await the owner's absolute path or explicit confirmation that no retained database exists. No inspection, repair, replacement or migration was performed |

## Authorized operator procedure

1. Identify the retained database and host/client owner, or explicitly mark this gate not applicable because no retained database exists. Do not guess from ambient configuration or scan unrelated user data.
2. With an identified, authorized target, run read-only `DATABASE_URL="file:/absolute/approved.db" npm run db:lineage`. For a recognized legacy history, the repair inspection is also read-only: `npm run db:repair-lineage -- --inspect`. Keep path/metadata reports private; do not publish member records or diagnostics.
3. Review the actual history against [DATABASE_RECOVERY.md](DATABASE_RECOVERY.md). Any candidate-copy repair, offline client shutdown, installation, migration or restore needs a separately confirmed target and operating window. Disposable upgrade/rollback regression results do not constitute acceptance of retained data.
4. Restore GitHub CLI access with `gh auth login -h github.com`, or reconnect the GitHub connector to this repository. Do not paste tokens into chat. Inspect the Check workflow for the **exact published candidate SHA**, including private namespace availability; resolve failures and repeat before marking CI accepted.

Clean installation/downloads and advisory checks occur outside the [offline workload boundary](OFFLINE_VERIFICATION.md). Keep all unrelated duplicate files and the stash preserved and excluded from the candidate. A successful macOS run does not certify Linux, live Google OAuth/TLS, standalone hosting, protected off-volume/timed restore or a pilot launch. Those remain P2D–E operator/provider gates.
