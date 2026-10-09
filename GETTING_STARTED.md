# Getting Started: Building the PhD Alumni Network

This document outlines what is required to initiate the project, the technical architecture, and the immediate next steps for a new developer or contributor.

## 1. Project Prerequisites & Requirements

### Technical Stack (Proposed for Phase 1 MVP)
To maintain low development effort while ensuring high scalability, the following stack is recommended:
*   **Frontend:** React (Next.js) or Vue.js - for a responsive, fast user interface.
*   **Backend:** Node.js (Express) or Python (Django/FastAPI) - lightweight and easy to iterate.
*   **Database:** PostgreSQL (for relational data like user profiles and directory) or MongoDB.
*   **Authentication:** Firebase Auth or Auth0 (must support custom email domain gating for `.ac.in` / `.edu`).
*   **Hosting/Deployment:** Vercel (Frontend) and Render/Heroku (Backend).

### Operational Needs
*   **Initial User Base:** A seed list of 50-100 highly engaged alumni and current scholars to test the MVP.
*   **Moderation Plan:** A protocol for verifying alumni status (e.g., manual cross-referencing with LinkedIn or university directories) before granting platform access.

## 2. Immediate Next Steps (Phase 1 Execution)

### Step 1: Database Schema Design (The Shadow Directory)
Design the foundational user schema. Essential fields should include:
*   `user_id`, `name`, `email`
*   `current_institution`, `current_title` (e.g., Assistant Professor)
*   `research_domain` (e.g., Information Systems, OB/HR)
*   `methodological_expertise` (Tags)
*   `open_to_chat` (Boolean)

### Step 2: Implement Gated Authentication
Set up the auth flow. The system must reject non-academic emails or route them to a manual approval queue. This is critical for establishing the "high-trust" environment.

### Step 3: Build the Conference Tracker MVP
*   Create a simple CRUD interface for academic events.
*   Allow users to "RSVP" or indicate they are attending.
*   Implement a basic comment/thread feature for coordination on each event page.

## 3. Contribution Guidelines
*   Keep features strictly aligned with the phased rollout. Do not build Phase 3 features (like complex matching algorithms) until Phase 1 is stable.
*   Prioritize data privacy. Academic placements and R&R documents are sensitive; ensure robust access controls.
