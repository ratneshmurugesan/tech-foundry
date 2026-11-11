# ADR-016 — One-command deploy: the Mac is the deployer, the street is the test

**Status:** Active
**Date:** 2026-11-11
**Deciders:** Ratnesh
**Supersedes:** — (day-06's ad-hoc AWS deploy steps; complements ADR-006/008/009)
**Related:** [ADR-006](../../docs/adrs/adr-006-docker-compose-dev.md) · [ADR-008](../../docs/adrs/adr-008-postgres-doorless.md) · [ADR-009](../../docs/adrs/adr-009-overlay-reset-removal.md) · [ADR-010](../../docs/adrs/adr-010-ci-zero-service.md) · [day-19 note](../notes/day-19-full-stack-deploy-2026-11-11-1528.md)

## Context

Through day-18 the restaurant had a *live* record (the $0 box, day-06) but no *runbook*: getting a change from the Mac onto the street was a handful of hand-typed ssh + compose steps, and the 2026-11-11 first run exposed the gap — hand-edits made *on the box* had silently diverged from the repo, and there was no single command that both shipped a change and *proved* it. The build ledger's next row was "full-stack deploy (single URL, reverse proxy, $0 VM)".

## Decision

### 1. One command, from the Mac, to the street
`deploy/deploy.sh` owns the whole path: preflight → sync the box to `origin/dev` → audit the env files → `compose up --build` → wait for health → **curl the public URLs from the Mac**. Exit 0 means the deploy is *proven from the street*, not assumed.

### 2. The box's tree is a deployment target, not a dev machine
The box does `git fetch && git reset --hard origin/dev` — never `pull`, never local edits. This is the fix for the 2026-11-11 dirty-tree incident (hand-edits on the box diverged from the repo). The gitignored env files are **audited, never written** — a missing key is a designed 503, not a deploy blocker (ADR-014/015 held).

### 3. The street is the test — the same gates as day-06, behind the Cloudflare front door
Four curls + one refusal: FE `/workspaces` → 200 (dining room), FE `/api/…` → 401 (proxy reached the TS counter, badge demanded), py `/` → 200, and the cellar `5432` **refused** (ADR-008 doorless, even from inside the box). Any miss = FAIL.

### 4. What this is *not*
**Not a CI/CD pipeline** — it runs from the Mac, with the Mac's key; the zero-service CI (ADR-010) still owns *verification*, this owns *deployment*. **Not blue/green** — `up --build` recreates in place; for a $0 box serving one human, the brief rebuild window is the right trade. **Not the Make-it-Right path** — multi-tenant RLS / K3s / Helm / GitOps (build ledger §5) will supersede this; when it does, this script retires.

## Consequences

- **Positive:** a change goes from the Mac to a *proven* street with one command; the street is the test, so "it deployed" is no longer a hope.
- **Positive:** the box can no longer silently diverge from the repo (reset-to-origin is deterministic); the env files stay hands-off.
- **Negative:** a deploy has a brief window where the web is rebuilding (in-place, not blue/green). Accepted for a $0 box serving one human.
- **Negative / debt:** this is a *human-driven* deploy (your Mac, your key). It will be superseded by the Make-it-Right path (K3s/Helm/GitOps) — *revisit-when: that path lands.*

## References

- [ADR-006](../../docs/adrs/adr-006-docker-compose-dev.md) — the compose chart this builds
- [ADR-008](../../docs/adrs/adr-008-postgres-doorless.md) — the cellar-door refusal the street proof asserts
- [ADR-009](../../docs/adrs/adr-009-overlay-reset-removal.md) — the prod overlay (`!reset`) this `up` applies
- [ADR-010](../../docs/adrs/adr-010-ci-zero-service.md) — the CI this deliberately is *not*
- [deploy/README.md](../../../apps/taskflow/deploy/README.md) — the runbook
- [day-19 note](../notes/day-19-full-stack-deploy-2026-11-11-1528.md)
