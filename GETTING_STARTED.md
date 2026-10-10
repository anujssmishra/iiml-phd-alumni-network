# Getting Started: Local Development & Setup

This document outlines the technical prerequisites, database schema, and steps to spin up the PhD Alumni Network locally.

## Prerequisites
- Node.js (v18+) or Python (3.10+) depending on chosen backend.
- PostgreSQL installed and running locally.
- Git for version control.

## 1. Database Schema Design (MVP)

### Table: `users`
The core identity table.
- `user_id` (UUID, Primary Key)
- `full_name` (String)
- `institutional_email` (String, Unique)
- `phd_batch_year` (Integer)
- `current_institution` (String)
- `academic_title` (String, e.g., "Assistant Professor")
- `research_domain` (String, e.g., "Information Systems", "Strategy")
- `methodological_expertise` (Array of Strings)
- `open_to_chat` (Boolean, Default: False)

### Table: `conferences`
The automated event tracker table.
- `conference_id` (UUID, Primary Key)
- `acronym` (String, e.g., "ECIS 2026")
- `full_name` (String)
- `location` (String)
- `start_date` (Date)
- `cfp_deadline` (Timestamp)
- `tier_rating` (String, e.g., "ABDC A*", "ABS 4")

## 2. Authentication Flow
To maintain a high-trust network, the MVP uses a strict gateway:
1. User signs in via Google OAuth or Magic Link.
2. System checks if the email ends in a recognized academic domain (`@iiml.ac.in`, `@iima.ac.in`, etc.).
3. If valid, the profile is created. If invalid, the account is routed to a `pending_manual_review` table.

## 3. Running the Project (Placeholder commands)
```bash
# Clone the repo
git clone https://github.com/YourUsername/iim-phd-alumni-network.git

# Install dependencies
npm install  # or pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Add your local PostgreSQL connection string to .env

# Run database migrations
npm run migrate

# Start the development server
npm run dev
```
