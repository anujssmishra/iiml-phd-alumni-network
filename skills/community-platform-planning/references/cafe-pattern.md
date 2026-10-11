# Reference pattern: Café Discovery App

Derived from the user-supplied `PROJECT_OVERVIEW.md`, version 1.0.0, dated October 2026, originally read at `/private/tmp/cafe-discovery-handoff.AdofGi/PROJECT_OVERVIEW.md`. That path is historical provenance, not a runtime dependency. The source describes a deployed café pilot; its deployment and performance claims were not independently verified during this adaptation.

## Structure worth reusing

| Overview section | Information to provide for the new project |
| --- | --- |
| Executive summary | Audience, concrete problem, editorial/product principles, scope |
| Technical stack | Actual components, reasons, host constraints, current/proposed distinction |
| Architecture and request lifecycle | Entry points, private/public boundary, directory map, read and write flows |
| Schema and integrity | Relationships, unique keys, controlled statuses, validation and database constraints |
| Pilot dataset | Actual versus targeted counts, provenance, freshness, demo versus real records |
| Security | Threats relevant to real flows, credential isolation, safe failures, verification evidence |
| Deployment | Account-specific unknowns, packaging/runtime, data setup, release checks, rollback, sibling isolation |
| Roadmap | Next useful increments with dependencies and observable gates |

## Approach worth transferring

- Begin with one bounded community or location and a manually maintained useful catalogue.
- Record what was checked, when, against which source, and by whom. Allow unknown/unverified values and corrections. Do not promote seed data to verified production content without evidence.
- Treat editorial independence as a product rule: publish inclusion/ranking criteria and keep payment from determining visibility.
- Separate routing, data access, domain validation, and presentation using the target stack's idioms. Prefer limited dependencies with clear operational value.
- Make guest reading lightweight and accessible when the information is public. Preserve identity/consent boundaries when the target domain is private.
- Put integrity in schema and application checks; validate edge cases specific to the target domain rather than copying unrelated coordinate or pricing constraints.
- Let hosting capabilities inform architecture explicitly. A working migration in one project is not a universal reason to rewrite other projects.
- Package operational knowledge with the product: migrations, isolated secrets, safe seeds, CI, recoverable releases, and a named data maintainer.
- Add maps, personalization, automated ingestion, and community signals only after the simple pilot proves useful.

## Details not to inherit blindly

The source uses PHP/PDO/MySQL on shared hosting and lists 19 café records. Those technologies, counts, businesses, prices, domain names, account identifiers, runtime versions, and reported performance are project-specific.

The source discusses both private code above the public web root and deployment folders inside it. Resolve the target's actual document root and access controls explicitly: prefer private code/config outside the served tree, or prove direct access is denied where hosting constrains placement. An illustrative `.htaccess` claim alone is not evidence of effective protection.

The source's server-rendered, JavaScript-free reading is a useful accessibility objective; dynamic membership and authenticated writes need their own tested interaction design. Its broad privacy principle does not establish the target's retention, consent, or authorization policy.
