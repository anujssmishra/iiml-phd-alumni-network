# IIM PhD/FPM project context

Use only when working on `iiml-phd-alumni-network` or a clearly identified successor. Repository identity: `anujssmishra/iiml-phd-alumni-network` on GitHub. Do not bind the skill to one machine's checkout path.

## Product intent

An academic network for IIM PhD/FPM scholars and alumni: consent-based alumni discovery, conference attendance coordination, then co-authorship, mentorship, and potentially an anonymized R&R document vault. A proposed initial cohort is IIM Lucknow; expansion requires evidence and moderation capacity. Official institutional endorsement is not established.

## Inspection anchors, 10 October 2026 at revision 3a0f40a

Re-inspect these before applying an old finding:

- `package.json`, `next.config.ts`: Next.js App Router application; two lockfiles and build/cache/tooling choices need reproducibility checks.
- `prisma/schema.prisma`: SQLite; `User`, OAuth models, `Conference`, `ConferenceAttendee`; unique user/event relation. PostgreSQL is proposed, not configured.
- `src/app/api/auth/[...nextauth]/route.ts`: Google/LinkedIn configuration with `.ac.in`/`.edu` suffix sign-in logic. No explicit provider email-verification or approved-membership workflow in this baseline.
- `src/app/conferences/[id]/page.tsx`: hard-coded shared RSVP actor, public roster query/render, build-time conference lookup, detail revalidation. These are priority inspection targets, not forever-open findings.
- `src/app/conferences/page.tsx`: unfiltered list and attendee counts; inert suggestion button.
- `src/app/page.tsx`: product claims for gated access and directory exceed implemented flows.
- `prisma/seed.ts`: three event fixtures, not independently verified data; no source-check timestamps or review state.
- `.gitignore`: NUL bytes in database patterns; `git check-ignore` did not match the development database and sample SQLite paths. Repair before database setup.
- `GETTING_STARTED.md`: legacy proposed setup; no tracked `.env.example` or `npm run migrate` script in the baseline. Node 18+ claim differs from the Next lockfile requirement of >=20.9. No tracked CI/test/migration history at inspection.

## Domain distinctions that matter

An academic-domain login is not doctoral affiliation or approved membership. Alumni may lack academic email access; a reviewable alternative is needed. Approval, suspension, ownership, and role checks belong on server reads and writes, including direct requests and caches.

Public conference facts can coexist with private profiles and attendance. “Open to Chat” is opt-in willingness to receive contact, not permission to publish an email address. Verification evidence and unpublished documents are separate, more sensitive data.

Journal rankings must not be mechanically treated as conference rankings. Event edition, official source, check date, timezone, correction history, and curator review matter more than speculative prestige tags.

Real profiles require consent. Keep demo identities separate; confirm official event facts before publishing fixtures. Preserve the existing schema's RSVP uniqueness through any runtime/database migration.

## Finding the current plan

In the active checkout, read `PROJECT_OVERVIEW.md` and `PLAN.md`; their maintained revisions supersede this baseline. Do not reproduce the full roadmap here. Typical order: reproducible setup, identity and consent, directory and curated conferences, controlled pilot, reviewed ingestion, then separately scoped collaboration/vault work. PHP/MySQL is a conditional track if the user requires that hosting environment; Next.js retention is the current planning assumption, not an irreversible policy.
