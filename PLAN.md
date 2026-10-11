# Delivery plan: trusted academic network

Updated: 11 October 2026 · Baseline: `3a0f40a` plus working changes · Status: P0–P1B implemented locally; P1C onward remains planned.

This plan applies the café project's small-pilot, source-verification, hosting-aware approach to the IIM PhD/FPM network. Architecture and the source-inspected baseline are in [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md). Estimates below are planning windows for one implementer with part-time curation; exit criteria control release, not the calendar.

## Scope and sequence

Pilot: approved membership, consent-based profiles/directory, a curated conference catalogue, private attendance coordination, and basic curator tools. Proposed scale: 15–25 consenting members and 10–20 verified events. No real members have been recruited or verified by this planning task.

Keep the current Next.js application as the working default. Decide hosting before provisioning. If PHP/MySQL shared hosting is required, scope the alternative described in the overview and re-estimate the implementation; keep the same privacy and acceptance criteria.

The implementation decision is now a single Node 24 server with persistent SQLite, retaining the existing data stack while adding migrations and isolated checks. See [HOSTING_DECISION.md](docs/HOSTING_DECISION.md). Vendor/domain/budget/operator assignment, real OAuth callbacks and backup restoration remain pre-P2 gates. This milestone provisions no live infrastructure.

## Completed local milestone: P0 through P1B

- P0: npm-only install and portable lockfile, Node baseline, fixed ignore rules, environment template, migration/seed/admin commands, isolated checks, CI workflow and hosting decision.
- P1A: verified Google identity, pending/rejected/approved/suspended membership, admin review/audit, session-derived RSVP, private roster and fresh role/ownership checks.
- P1B: self-service controlled profiles, private-by-default consent, searchable/filterable/paginated directory, recipient-reviewed contact requests, immediate withdrawal, and account deletion.

[Implementation checks](docs/IMPLEMENTATION_CHECKS.md) record the evidence and limitations. The phase requirements below remain the acceptance contract; their imperative wording does not mean completed local work must be repeated. Live-provider/hosting verification is explicitly still outstanding.

| Phase | Indicative window | Depends on | Accountable roles |
| --- | --- | --- | --- |
| P0: reproducible foundation | Week 1 | Repository inspection | Implementer; operator for hosting decision |
| P1: trusted membership and core flows | Weeks 2–4 | P0 | Implementer; membership reviewer; event curator |
| P2: controlled pilot release | Week 5, or when ready | P1 and all release checks | Operator and pilot coordinator |
| P3: reviewed event ingestion | Weeks 6–8, conditional | Successful P2 and active curator | Implementer and curator |
| P4: academic collaboration | Week 9 onward, conditional | Pilot demand and an owner for each workflow | Implementer and moderators |

People must be assigned to these roles before pilot launch. One person can fill several roles; deployment and data-review responsibilities must still be explicit.

## P0 — Establish a reproducible foundation

Outcome: another maintainer can run and validate the prototype against an isolated database, with a recorded hosting decision.

1. Inspect package/config compatibility, both lockfiles, and the optional `prisma skills sync` postinstall hook. Repair NUL-contaminated `.gitignore` database patterns and prove effective exclusions. Choose one package manager and supported runtime; record the reason before removing redundant files. Prevent optional tooling from obscuring setup failures.
2. Create a safe `.env.example` and actual setup commands. Replace `GETTING_STARTED.md` placeholders: its proposed PostgreSQL backend, `npm run migrate`, and template-copy command do not describe today's checkout. Reconcile its Node 18+ claim with the lockfile's Next requirement of Node >=20.9 and current runtime support.
3. Specify development/test/staging/production database separation. If PostgreSQL is selected, update Prisma configuration, commit migrations, and rehearse conversion of any retained local data. Back up local databases and preserve the existing Git stash; do not apply or discard it as part of setup.
4. Separate synthetic seeding from verified event import. Add an environment guard and repeatable seed entry point. Ensure build and CI cannot seed or mutate production.
5. Add CI for deterministic dependency installation, Prisma validation/generation, lint, typecheck, production build against isolated fixtures where necessary, and critical workflow tests. Review `generateStaticParams` database access and current caching configuration before deciding the build/runtime boundary.
6. Record host capabilities, domain choice, budget, operator, backup/restore facilities, and secret handling. Keep unresolved account-specific facts explicitly unknown.

Exit criteria: a fresh clone follows the revised setup guide; migrations and synthetic seed work on an empty isolated database; the chosen CI checks pass; production secrets are absent from source/build output; the operator can explain the intended deployment. Record command outcomes, not merely commands to run.

## P1 — Implement trusted membership and useful core flows

Outcome: individually authenticated, approved members can manage their own profiles and attendance with private data protected.

### P1A: identity and authorization (first)

- Remove the shared mock RSVP identity and source the actor only from the authenticated session.
- Extract shared auth configuration; establish provider verified-email checks and normalized exact-domain handling. Keep login identity separate from approved doctoral/alumni membership.
- Implement pending/approved/rejected/suspended membership and member/curator/admin roles. Support a reviewed alumni path for people without current academic mailboxes; record evidence type, reviewer, and date with minimal retained data.
- Protect member reads, server actions, and curator operations; check ownership and current membership at the data/service boundary. Review caching, static generation, prefetch, and serialization of private fields.
- Implement sign-in/out, pending/rejected states, and clear access-denied behavior. Keep any enabled OAuth provider fully tested; defer a second provider if it lacks reliable verification evidence.

Exit criteria: guest, pending member, suspended member, approved member, curator, and admin scenarios pass. Member A cannot act as Member B. A forged/direct request cannot bypass the UI; suspension takes effect for an already signed-in account. Public content contains no private roster/profile fields.

### P1B: profiles and private directory

- Add self-service profile editing for institution/title, programme/batch where supplied, research domains, and method tags. Implement bounded input validation and controlled tags.
- Add consent and directory visibility, default private. Preserve `open_to_chat = false` until the member opts in; do not make email public when they enable it.
- Build search/filter/pagination for approved members. Show only consented profile fields and a last-confirmed date; distinguish self-reported affiliation from verified membership.
- Add a moderated contact-request or other explicitly agreed contact mechanism, with withdrawal, correction, and deletion flows. Do not advertise private messaging until it exists.

Exit criteria: members can edit only their own profile; private and withdrawn profiles disappear from permitted search results and caches; search/filter/pagination work; keyboard and mobile checks cover editing and discovery.

### P1C: curated conferences and private RSVP

- Extend event schema with edition identity, start/end dates, timezone, optional CFP deadline, source URL, checked date, reviewer, publication state, and demo flag.
- Implement curator event CRUD, member suggestions, correction review, publication, and archival. Wire or remove the currently inert “Suggest Event” control.
- Validate sources and links; separate upcoming/past events and add accessible search/filter/pagination and clear empty/error states.
- Implement idempotent attendance intent and cancellation with the existing user/event uniqueness constraint. Define the considering/attending distinction and roster visibility. Update both catalogue and detail data when permitted counts change.
- Re-check seed fixtures against official organizer information before promotion to the pilot catalogue. Do not assign journal rankings to conferences automatically.

Exit criteria: curated publication requires provenance; duplicate/repeated RSVP submissions cannot create duplicate rows or flip an intended action unexpectedly; nonexistent/archived event rules are consistent; members see only permitted attendance; guests see event facts without names or private attendance counts.

## P2 — Validate and release a controlled pilot

Outcome: a small consented community can use the application and an operator can recover it.

1. Curate the proposed 10–20-event dataset and invite the proposed 15–25-member cohort through the coordinator. Recruitment and messages require their own execution authorization; the plan does not send invitations.
2. Correct feature claims and metadata; publish plain-language membership, visibility, event-curation, correction, and support information. Avoid suggesting official institutional endorsement without authorization.
3. Run access, ownership, concurrent/repeated RSVP, private-cache, input-validation, and curator-publication tests. Exercise the same authorization boundaries through direct requests.
4. Check keyboard focus, form labels, errors, empty states, mobile layout, slow connections, and core server-rendered reading. Test any no-JavaScript claims before making them. Remove or justify third-party asset requests.
5. Deploy to staging; verify OAuth callback/secret configuration, HTTPS, private cookies/responses, safe errors, migrations, and health checks.
6. Rehearse database restore and application rollback. Test proposed recovery targets: at most 24 hours of data loss and four hours to restore. If these are not feasible, agree and document realistic targets before release.
7. Prepare the production runbook and exact release revision for authorized deployment. Keep sibling applications/domains/data isolated. Verify the deployment before recording it as live.

Release gate: every criterion above passes with recorded evidence, the identity/roster blockers are closed, no real-member fixture data leaks into source or public pages, and an operator/curator is assigned. Unfinished collaboration features are clearly deferred in product copy.

Suggested pilot evaluation after two weeks: at least 10 of the initial members complete consented profiles, at least five members use RSVP successfully, all published events have current provenance, and no known access-control defect remains open. These are proposed go/no-go targets, not usage claims. The coordinator reviews support burden and feedback before expanding toward 50–100 members.

## P3 — Automate ingestion after manual curation works

Outcome: reduce curator effort while preserving traceable, correct conference facts.

- Select organizer feeds or other suitable sources only after checking access terms and data quality. WikiCFP/Apify remain candidates from the original plan, not assumed integrations.
- Store source identifiers, fetched/checked timestamps, edition identity, source URL, and change history. Dedupe by organizer/edition identity and canonical source, not name alone.
- Import into a review queue. Preserve human overrides; surface conflicts, cancellations, and deadline extensions for curator approval.
- Schedule bounded, retry-safe ingestion with logs and failure notifications once a real scheduling host is selected. Keep failures from removing existing published records.
- Add timezone-correct deadline views. Show stale/unknown states; avoid countdowns implying an unverified date is authoritative.
- Consider conference-specific classification only with a reviewed applicable source and year; do not derive it from journal ranking tables.

Exit criteria: repeated imports are idempotent; duplicate editions, deadline changes, cancellations, partial source failures, and curator overrides are exercised on fixtures; an unsuccessful job leaves the approved catalogue intact; a curator can inspect and revert a bad import.

## P4 — Add academic collaboration when demand is demonstrated

Start with a moderated co-authorship board: member-owned posts, research/method tags, expiry, reporting, opt-in contact, and deletion. Extend into mentorship only with consent on both sides and an operating owner. Never publish proprietary datasets or claim transfer rights merely because a member offers them.

The R&R vault is a separate workstream. Before implementation, document contributor permissions, anonymization review, prohibited sensitive content, private storage, per-download authorization, malware/file-type/size checks, audit scope, retention/deletion, and recovery. Its release gate includes direct-download denial for unauthorized users and review of actual anonymized sample documents. No real unpublished files are part of the initial pilot.

Success measures: aggregate opt-in matches and voluntary reports of useful collaboration, without exposing private activity. Maps, housing coordination, private messaging, and automated matching require their own evidence of demand and moderation/support plan.

## Continuity with the previous roadmap

| Earlier ambition | Updated location / change |
| --- | --- |
| High-trust foundation, directory, conferences | P0 and P1; correct current prototype gaps before launch |
| Seed 50–100 people | P2 starts smaller with consent; grow only after pilot feedback |
| CFP ingestion and scheduled upserts | P3 after a working curator workflow and provenance model |
| ABDC/ABS/CORE tier filtering | Review applicability first; no automatic journal-to-conference inference |
| Co-authorship, R&R vault, mentorship | P4 with separate consent, file-security, and operating gates |
| Analytics and handoff | P2 onward; minimal aggregate signals and maintained runbook |

## Next implementation slice

Start P1C with event provenance and curator-controlled draft/publication states, followed by suggestions, corrections and upcoming/past filters. The RSVP identity and roster protections needed by P1A are already implemented; the remaining event lifecycle/curation work is not complete. P1C has not been started beyond those prerequisite protections.

Update this plan and the overview after each completed phase with the revision, evidence, unresolved items, and next smallest useful milestone. A planning document, checklist, or skill installation does not mark implementation tasks complete.
