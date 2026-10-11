# P0–P1B implementation checks

Updated 11 October 2026. This file records local checks, not deployment approval or a claim that real OAuth has been exercised.

## Scope

Implemented setup/migrations/CI, reviewed Google identity, live membership/role/ownership checks, independent RSVP, consented roster, profile editing, private directory, recipient-reviewed contact requests, withdrawal and account deletion. P1C event curation and later phases remain planned.

## Verification record

- A clean npm install from the regenerated cross-platform lockfile succeeded on Node 24.19.0.
- The isolated initial migration and 19 service/authentication tests passed, covering roles, direct service access, ownership, immediate suspension, profile validation, safe directory projection/search/pagination, independent/idempotent RSVP, consent and contact-email disclosure, withdrawal, deletion/cascades, schema constraints, safe seeding and first-admin bootstrap.
- The independent security review found and prompted a fix for mailto query injection. Strict email validation and encoded mailto addresses now have regression coverage.
- Production build and Chromium workflow results are being finalized; update this entry with their actual results before handoff.

## Release limits

- Real Google credentials were not supplied or used. Actual consent/callback/account-linking behavior must be verified with the configured provider before pilot release. Browser fixtures are isolated database sessions, not a runtime login bypass.
- No hosting service, production/staging database, domain, backup destination, administrator account, real member, invitation or deployment was created.
- Existing prototype data and the earlier Git stash are preserved. The initial migration has been verified on empty isolated databases; an existing database requires a backed-up, rehearsed upgrade.
- High-severity transitive dependency advisories remain documented in [HOSTING_DECISION.md](HOSTING_DECISION.md). They must be reviewed before exposing the pilot.
- Automated browser checks cover specific keyboard/mobile and privacy workflows; they are not a comprehensive accessibility certification or penetration test.
