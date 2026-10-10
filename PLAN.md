# Master Plan: Phased Development Roadmap

To ensure high adoption and prevent development fatigue, the network is built in three distinct phases. 

## Phase 1: High-Trust Foundation (Weeks 1-4)
**Goal:** Establish a secure, closed-network environment with immediate peer-to-peer utility. No complex APIs or workflows yet.

- **Week 1: Identity & Security**
  - Set up PostgreSQL schemas for `users`.
  - Implement Domain-Gated Authentication (only accepting `.ac.in` and `.edu` emails).
- **Week 2: The "Shadow" Directory**
  - Build the user profile creation flow (capturing research domains and methodologies).
  - Develop the searchable alumni directory with filtering by institution and domain.
- **Week 3: The Conference Meetup MVP**
  - Build a manual CRUD interface for adding upcoming academic conferences.
  - Add "RSVP / Attending" functionality for users to signal their presence at events.
- **Week 4: QA & Beta Launch**
  - Seed the database with 50-100 highly engaged FPM/PhD alumni and scholars.
  - Conduct a soft launch to gather initial UI/UX feedback.

## Phase 2: Data Automation Pipeline (Weeks 5-8)
**Goal:** Remove manual data entry by building an ingestion pipeline for global Call for Papers (CFPs).

- **Week 5: Ingestion Scripts**
  - Write Python scripts using `feedparser` to ingest RSS feeds from WikiCFP.
  - Alternatively, integrate Apify scrapers for targeted conference portals.
- **Week 6: The Tier-Filtering Engine**
  - Create static reference tables for ABDC, ABS, and CORE rankings.
  - Write regex matching logic to automatically tag incoming CFPs with their respective prestige tiers.
- **Week 7: Automated Upserts**
  - Deploy a weekly cron job (via GitHub Actions or Heroku Scheduler) to update the `conferences` database automatically (e.g., catching deadline extensions).
- **Week 8: Frontend Countdown Integration**
  - Build dynamic frontend components that display upcoming CFP deadlines with countdown timers.

## Phase 3: The Collaboration Engine (Weeks 9-12)
**Goal:** Launch the heavy workflows that directly impact academic output and placements.

- **Week 9: Co-Authorship Board**
  - Launch a classifieds-style board with robust tagging for methodological gaps and data-sharing.
- **Week 10: Revise & Resubmit (R&R) Vault**
  - Implement a secure file-upload and categorization system for anonymized R&R documents. 
  - Restrict download access based on user verification levels to protect unpublished data.
- **Week 11: Mentorship Matching**
  - Build opt-in workflows for final-year scholars preparing for the job market to match with junior faculty alumni.
- **Week 12: Analytics & Handoff**
  - Implement lightweight analytics to track active collaborations and directory usage.
  - Finalize documentation for future maintainers.
