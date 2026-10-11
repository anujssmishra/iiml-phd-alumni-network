---
name: community-platform-planning
description: "Adapt a reference project's architecture and operating approach into an evidence-based overview and phased delivery plan for a community directory, event catalogue, or membership platform. Use for café-style project blueprints and IIM PhD/FPM network planning or roadmap updates; not for unrelated coding tasks."
---

# Community platform planning

Turn an existing repository and a reference project into a usable architecture/handoff and an executable roadmap. This skill carries the café discovery project's editorial, provenance, small-pilot, and hosting-aware approach; it does not prescribe its PHP runtime to every project.

## Read the relevant context

Read [the reference pattern](references/cafe-pattern.md) when adapting or rebuilding a plan. For this alumni network, also read [IIM project context](references/iiml-context.md), then inspect the current repository's `PROJECT_OVERVIEW.md`, `PLAN.md`, applicable `AGENTS.md`, package/config files, routes, auth, schema, and seed logic. The dated context is an inspection aid, not authority over newer code or user choices.

Use supplied handoffs as design evidence. If the original temporary café file is gone, the bundled reference preserves the planning method; do not require it to exist. Do not copy its domain, credentials, dataset, implementation claims, or operational status into another project.

## Establish what is real

- Record repository/revision and inspection date. Separate **observed**, **proposed**, **unverified**, and **deferred** behavior in plain language.
- Inspect end-to-end flows: a button is not a feature, a schema field is not a directory, OAuth is not authorization, and a seed record is not a verified listing.
- Reconcile documentation with code. Record unrun checks as unrun; do not claim install/build/deployment success from source inspection.
- Identify the first meaningful adoption risk: for a member network this often means identity, consent, private rosters, and acting on the correct user's behalf. For a public catalogue it may mean source quality and editorial control.

## Adapt the architecture

Apply the reference's functional separation, relational integrity, source/date/reviewer provenance, editorial operation, accessible server-rendered reading, and small pilot. Map each principle to a concrete feature or release criterion in the target domain.

Preserve the existing stack by default when it can serve the user's constraints. If PHP/MySQL shared hosting is required, make migration a visible alternative or selected track with feature parity, data transfer, authorization tests, rollback, and revised estimates. Verify provider/runtime claims against current official sources before making infrastructure recommendations. Do not infer access to another project's hosting account.

Separate public facts from personal/member-only information. In the IIM context, guest-first conference discovery does not permit public profiles, attendance, academic contact details, or unpublished documents. Place authorization at server-side reads and writes, not only navigation.

## Produce maintainable deliverables

Normally update or create two files, reusing existing equivalents when appropriate:

1. `PROJECT_OVERVIEW.md`: purpose; current versus target stack; architecture, directory structure, and request flow; data models and integrity; pilot data and provenance; security/privacy; deployment/restore; future roadmap and unresolved decisions. Keep proposed paths visibly distinct from existing ones.
2. `PLAN.md`: a reproducibility baseline, trusted core workflows, a gated pilot, then justified automation and advanced collaboration. Each phase states its outcome, dependencies, owner roles, concrete work, acceptance evidence, and uncertainties. Dates and cohort sizes are estimates or targets, never invented achievements.

Link them from the repository entry point. Preserve useful earlier ambitions by mapping them to revised phases or explaining deferral. Correct or flag misleading setup claims without presenting unimplemented commands as executable instructions. Avoid creating multiple copies of the same maintained plan inside the skill.

Include a hosting decision, development/staging/production separation, demo/real data separation, backup and restore rehearsal, release verification, and protection for sibling deployments when a shared account is relevant. Keep document uploads or other sensitive advanced workflows behind a proportionate design and validation gate.

End with the next smallest implementation slice and observable completion evidence. For the IIM prototype, re-check whether reproducibility and a session-backed RSVP/private roster remain the first useful slice.

## Scope and quality checks

A planning request authorizes planning artifacts and relevant read-only inspection. It does not itself authorize rewriting the runtime, deploying, provisioning paid services, seeding real people, sending invitations, or publishing private documents. An implementation request can authorize relevant changes; preserve the user's actual scope rather than automatically stopping at planning.

Verify local links, source claims, proposed/current labels, and consistency between overview and plan. Ask another agent for an independent evidence or scenario review when it can materially improve a complex plan. Run application checks only when relevant and within scope; documentation-only planning does not need a production database or fresh dependency installation.

In the handoff, link the resulting artifacts, state the chosen/default stack, identify material unresolved decisions, and say what validation actually ran. Keep the skill's reusable method separate from the project's changing implementation status.
