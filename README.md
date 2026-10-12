# IIM PhD & FPM Alumni Network

An independent, community-led network for IIM PhD/FPM scholars and alumni: reviewed membership, consent-based academic discovery, and conference attendance coordination. Official institutional endorsement is not established.

Updated 12 October 2026; inspected `a05f216` on `master`, after merging nine GitHub commits. This is a local development project, not a verified production release.

## Current status

| Area | What exists | Acceptance status |
| --- | --- | --- |
| Foundation and membership | Node/npm setup, migrations, Google identity checks, membership review, roles and private sessions | P0–P1B previously passed local checks at `cfd165e`; merged revision needs revalidation |
| Profiles and directory | Own-profile editing, private opt-in directory, search/filter/pagination, contact acceptance, withdrawal and deletion | Implemented; live OAuth/staging still unverified |
| Conferences | Public catalogue and detail pages, search/date filters/pagination, private RSVP, curator create/publication/delete and member suggestions | P1C substantially implemented, but security, provenance, upgrade and correction-flow gaps remain |
| Ingestion | URL extraction/diffs, manual reconciliation, batch import, cron endpoint and startup scheduler | P3 prototype exists early; not accepted for unattended operation |
| Collaboration | Co-authorship board, mentorship, housing/travel coordination and R&R document vault | Future work; not implemented products |

## Start here

- [Next-step plan](PLAN.md): ordered hardening work, owners, dependencies and acceptance gates.
- [Project overview](PROJECT_OVERVIEW.md): current architecture, data and public/private boundaries.
- [Setup guide](GETTING_STARTED.md): commands and their current side effects.
- [Verification record](docs/IMPLEMENTATION_CHECKS.md): historical passes versus current inspection findings.
- [Hosting decision](docs/HOSTING_DECISION.md): persistent Node/SQLite baseline and operational requirements.
- [Reusable planning skill](skills/community-platform-planning/SKILL.md): café-inspired planning method; project status stays in these documents.

## Important before running

The merged application automatically starts conference ingestion in non-test Node runtimes. The seed is **not harmless demo setup**: it deletes demo-marked events and upserts 27 hard-coded conference editions as published, non-demo records. The URL quick-fetch action also lacks its own authorization check. Do not expose this revision or run its app/seed/sync commands against retained data before the [H1–H3 safety gates](PLAN.md#h1--close-ingestion-entry-points-and-unattended-writes) are complete.

A `sourceCheckedAt` value or “Verified” label does not prove the event dates, travel details or doctoral-consortium claims were checked against an official source. This planning pass did not verify those facts externally or inspect the live/local member database.

## Product direction

The first useful release is a small, private academic community with a trustworthy public conference catalogue. Membership approval is separate from mailbox verification; personal-email alumni can apply. Research affiliations remain self-reported. Contact introductions reveal only an explicitly supplied reply address after acceptance.

Later collaboration features should follow demonstrated demand and an operating owner. Dataset sharing requires contributor rights; an R&R vault requires separate permission, anonymization, storage, download-authorization and retention design. Do not describe these future capabilities as already available.

## Technical baseline

Next.js 16.4 / React 19.3 / TypeScript, Node 24/npm, Prisma 6.19.3 with SQLite, Google-only NextAuth database sessions, Tailwind/PostCSS and explicit Webpack dev/build. The selected deployment is one persistent Node server with separate database volumes and secrets per environment; no vendor, domain or deployment is selected by this document.

This update changes documentation and planning only. Existing local edits, duplicate backup files and the earlier Git stash are preserved.
