# Deterministic offline verification

Updated 19 October 2026. These controls apply to verification children, not the normal application or the machine's firewall. See [the evidence ledger](IMPLEMENTATION_CHECKS.md) for actual runs and [dependency decisions](DEPENDENCY_REVIEW.md) for the separate online audit.

## Run the strict boundary

Use Node 24 and install the locked dependencies, Prisma engines and Chromium **before** entering isolation:

```sh
npm ci
npm run db:generate
npx playwright install chromium
npm run verify:offline -- probe
ENABLE_AUTO_CONFERENCE_SYNC=1 npm run verify:offline -- check
ENABLE_AUTO_CONFERENCE_SYNC=1 BROWSER_APP_ENV=local npm run verify:offline -- browser
BROWSER_SERVER_MODE=production BROWSER_APP_ENV=local npm run verify:offline -- browser tests/browser/signin.spec.ts tests/browser/p2b.spec.ts tests/browser/p2c.spec.ts tests/browser/offline.spec.ts
```

`check` includes generation, lint, typecheck, all service tests and the production build. Build once before a production browser run; do not run build and browser servers concurrently against the same checkout. Dependency installation, browser/engine downloads, advisory checks and deliberately authorized live-source checks are outside this offline boundary. Missing cached dependencies must fail, not trigger a permitted download.

On macOS the launcher uses the available `/usr/bin/sandbox-exec` to deny child outbound IP traffic except loopback. On Linux it requires `unshare` (util-linux), `ip` (iproute2), and permitted private user/network namespaces; it enables loopback only inside the new namespace. Recovery tests also need `lsof`. Unsupported platforms, unavailable isolation or a failed external-IP denial probe stop the command: there is no unconfined retry. The macOS mechanism is platform-dependent/deprecated, so verify availability on the target host. Linux workflow configuration is not proof of a successful remote run.

Before loading the JavaScript guard, a raw TCP probe to reserved documentation address `192.0.2.1:443` must receive a kernel denial/unreachable error. A timeout, successful connection or unexpected error fails. This is one boundary check, not a packet capture or proof that every native network API was exercised.

## Layers and limits

- The existing database wrapper creates only its own private disposable database, substitutes synthetic auth configuration, and forces the scheduler/fixture opt-ins off regardless of the parent shell. Retained databases are not test targets.
- A Node preload denies DNS lookups/resolution, fetch, TCP/TLS/HTTP/HTTP2 and UDP before outbound requests. It propagates through ordinary Node children/workers. Offline test/build mode permits Unix-domain IPC but no IP connection. Browser mode permits Node connections to the fixture's loopback port 3100, with fixed loopback DNS responses only.
- Chromium uses an owned loopback deny proxy with only the literal fixture IP/port bypassed, external name resolution disabled and QUIC disabled. The proxy never forwards HTTP or CONNECT. Service workers are blocked. Shared Playwright fixtures protect both default and manually created contexts, reject non-fixture HTTP/WebSocket destinations and record disallowed requests, including redirected destinations. Node-based Playwright API requests use the exact-port Node guard directly, because Playwright's own proxy bypass cannot express a port constraint. Direct Playwright invocation without the harness refuses.
- Every denied Node/browser attempt is recorded, even if application/tooling code catches the exception. Normal workloads must leave the ledger empty. Deliberate negative probes use separate private ledgers and assert the expected denial; those are not hidden workload exceptions.
- Telemetry and update notifiers are disabled. Next.js 16.4's separate `experimental.agentUpgrade` advisory reminder is disabled only for guarded verification; its ambient override is cleared. Ordinary development retains the default security reminder. Audits are recorded separately instead of weakening the offline policy.
- Next 16.4 also unconditionally fetches npm version tags for its development indicator, with no offline switch. Only in guarded development-browser children, the preload replaces that exact internal tooling function with `{ installed: "16.4.0", staleness: "unknown" }` before server startup. It checks the pinned version/export shape and fails on an unsupported upgrade. No package file or global fetch exception is used; no current/safe-version claim is fabricated. A regression proves the fixture never calls fetch. This is an explicit test fixture, not security-advisory clearance.

The preload and browser hooks are cooperative regression controls, not a sandbox against malicious same-user code that deliberately removes hooks, changes its environment, writes to the ledger or bypasses the harness. The OS layer contains native/subprocess external IP traffic. On macOS it permits loopback generally; the cooperative Node/browser layers narrow the intended destination to the fixture. This is not a whole-host firewall, universal local-service isolation, production egress policy or live-provider acceptance test.

Ordinary `npm test`, `npm run build` and `npm run test:e2e` use the same database/preload/browser controls, but **do not establish OS-level isolation**. Use `verify:offline` for release evidence. Native children are not covered by the Node hook alone.

## Evidence handling

The owned `0700` temporary proof directory contains `0600` marker and attempt files. Attempts contain only API category and PID—never destinations, credentials, headers, query strings or bodies. A caught denial still fails the wrapper. Successful runs remove their own proof; failures retain it and print its path for operator inspection. Disposable test databases are removed independently. Proof retention is temporary OS storage, not a durable audit archive; record the candidate revision, command, runtime, status and counts in the release record.

The repository workflow requests pinned npm, full/omit-dev advisory gates, strict Linux checks and development/focused-production browsers. Registry/download steps precede the offline boundary. The 20 October dependency remediation has zero current findings; still require clean-install exact-candidate evidence, a matching successful Linux CI run and actual retained-lineage acceptance. These controls do not authorize deployment, retained-data changes or pilot invitations.
