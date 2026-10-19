# IIM PhD & FPM Alumni Network

An independent, community-led network for IIM PhD/FPM scholars and alumni: reviewed membership, consent-based academic discovery and conference coordination. Institutional endorsement is not established.

Updated 19 October 2026 · Baseline `b404710` plus local P2A–P2B implementation.

## Current status

| Area | Implemented locally | Remaining gate |
| --- | --- | --- |
| Membership/directory | Google identity policy, reviewed membership, private profiles, consent-based introductions, deletion | Real OAuth/staging and release verification |
| Conference curation | Source-review publication gate, correction history, restore as draft, paginated queues and timezone-aware suggestions | Actual edition fact-checking for the pilot set |
| Attendance/calendar | Private My RSVPs cancellation after archive, participation privacy, date-only conference days, timed CFP deadlines and non-cached ICS | Deployed browser/provider acceptance |
| Development safety | No runtime fixture login; retired legacy tokens; guarded additive disposable fixtures | Inventory prior shared-environment fixture use |
| Recovery/automation | Backup/restore tools; URL fetching, cron execution and sync commands disabled throughout P2 | P2C migration/recovery/release proof; P3 automation controls |

P2A and P2B are implemented locally. **Next: P2C — prove migration histories, safe recovery and release verification**, followed by staging and an authorized small pilot.

## Start here

- [Delivery plan](PLAN.md): P2A–P2E outcomes, owners, dependencies and acceptance gates.
- [Project overview](PROJECT_OVERVIEW.md): architecture, models and privacy boundaries.
- [Setup and curator workflow](GETTING_STARTED.md): commands, fixture safeguards and review steps.
- [Verification record](docs/IMPLEMENTATION_CHECKS.md): actual local results and remaining release evidence.
- [Hosting decision](docs/HOSTING_DECISION.md): persistent Node/SQLite and operations.
- [Planning skill](skills/community-platform-planning/SKILL.md): reusable café-inspired method.

## Before running

`npm run db:fixtures` creates a fresh temporary database with fictional events and private synthetic profiles; it creates no OAuth accounts or sessions. Direct seeds require explicit opt-in and the marked temporary target, and preserve existing records/RSVPs. Application sign-in uses Google in every environment.

There are now **four migrations**. The new review migration returns earlier non-demo published listings to draft, preserving facts/RSVPs and recording their old publication state. They need explicit source review before republication. Retained databases still require P2C's backup and migration-lineage rehearsal; no retained database was migrated by this implementation.

URL fetching, real batch execution, cron execution and sync CLIs refuse throughout P2, even with an old enable flag. Catalogue import adds unreviewed drafts only and skips all existing IDs; `--publish` is rejected. A curator records the edition-specific source, change reason and review confirmation before publishing.

Calendar exports contain event facts only. Member roles/paper titles follow directory visibility consent; “My RSVPs” permits cancellation after archive without exposing archived facts or other attendees.

## Product and technical direction

Retain Next.js 16.4 / React 19.3 / TypeScript, Node 24/npm, Prisma 6.19.3 and SQLite on one persistent Node server. Hosting/vendor/domain choices, real OAuth, production recovery and release CI remain open.

The pilot target is a small consenting community and a manually verified catalogue. Later co-authorship, mentorship, dataset sharing and any R&R vault require separate demand, moderation and permission/storage design. Local duplicate files and the earlier stash remain preserved.
