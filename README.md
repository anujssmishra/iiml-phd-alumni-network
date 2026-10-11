# IIM PhD & FPM Alumni Network

A specialized, high-trust digital ecosystem designed exclusively for Fellow Programme in Management (FPM) scholars and PhD alumni of the Indian Institutes of Management (IIMs).

Current status: P0–P1B implemented locally: reviewed Google identity, membership administration, self-service profiles, a consent-based private directory, contact introductions, and session-backed attendance. Curated event publishing, ingestion, collaboration boards and document uploads remain future phases. No production deployment or live OAuth verification is claimed.

Start with [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for the inspected architecture and café-inspired operating approach, and [PLAN.md](PLAN.md) for implementation phases and release gates. The reusable [community-platform-planning skill](skills/community-platform-planning/SKILL.md) captures the planning method.

## The Core Problem
Most institutional alumni portals are built around the PGP (MBA) experience—focusing heavily on corporate placements, startup fundraising, and generic batch reunions. 

A PhD scholar's trajectory is fundamentally different. Their career currency relies on:
1. Research co-authorships and methodological collaborations.
2. Navigating rigorous peer reviews (Revise & Resubmit cycles) at FT50 and ABS 4/4* journals.
3. Academic placements at premier institutes (IIMs, IITs, or global universities).
4. Networking at major global conferences (e.g., ECIS, ICIS, AOM, InCIS).

This project shifts the focus from mass corporate networking to high-value, closed-door academic collaboration.

## Core Modules Overview

### 1. The "Shadow" Academic Directory
A searchable directory mapping alumni to their current universities. Crucially, it includes an "Open to Chat" toggle, allowing early-stage scholars to privately inquire about department work culture, teaching loads, and tenure realities before accepting placement offers.

### 2. The Global Conference Tracker
A geo-tagged event board for coordinating meetups at major academic conferences. It allows current scholars to split Airbnbs, share transit, or set up informal coffee chats with alumni already established in the global academic community.

### 3. Co-Authorship & Data-Sharing Board
A classifieds-style forum where researchers list their methodological strengths (e.g., fsQCA, Latent Dirichlet Allocation, advanced econometrics) or proprietary datasets, and post "Looking for Collaborator" requests to fill specific research gaps.

### 4. Revise & Resubmit (R&R) Vault
A highly secure, anonymized cloud repository where successful alumni donate their "Response to Reviewers" documents. This provides current scholars with invaluable structural templates for handling brutal peer reviews.

## Technical Architecture

The code uses Next.js App Router / React / TypeScript, Node 24/npm, Prisma with SQLite and committed migrations, and Google-only NextAuth database sessions. Mailbox verification is separate from administrator-reviewed doctoral membership. Private reads and writes check current membership, role, ownership and consent.

The selected baseline is a single persistent Node server with SQLite, documented in [the hosting decision](docs/HOSTING_DECISION.md). PostgreSQL or PHP/MySQL would require a separately tested migration. Start with [local setup](GETTING_STARTED.md); see [implementation checks](docs/IMPLEMENTATION_CHECKS.md) for verification and remaining release gates.
