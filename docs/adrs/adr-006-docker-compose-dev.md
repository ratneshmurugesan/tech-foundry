# ADR-006: Docker Compose for Local Development

**Status**: Active
**Date**: 2026-08-19
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 3

## Context

The database is a tenant that needs housing — PostgreSQL must run *somewhere* for local development: installed natively on the host, as a managed cloud DB, or in a container the repo itself can build or throw away. Each has tradeoffs for a solo dev working on a 10+ year project.

## Decision

Put the tenant in a self-contained room the repo can build anywhere:
use **Docker Compose** to run PostgreSQL as a local container:
- `postgres:15` image, mounted at `0.0.0.0:5432`
- `postgres:postgres` credentials, database `taskflow`
- Health check: `pg_isready -U postgres` every 10s
- Single `docker-compose.yml` in `apps/taskflow/` shared by both TS and Python tracks

Two tenants, one well — both language tracks connect to the same container: same DB, same data, different taps (TS: 8000, Python: 8001).

## Consequences

**Positive**:
- A tenant, not a renovation — no PostgreSQL packages ever touch the host OS
- The room comes off a stamp — any clone of the repo can `docker compose up -d` and get the same setup
- Tearing it down is deliberate — `docker compose down` demolishes the room; `up` rebuilds it fresh
- Two tenants, one well — both tracks share one DB instance, so comparisons draw from the same water
- The tenant rings before entering — the health check keeps the app from starting before the DB is ready

**Negative**:
- The prerequisite moves up a floor — instead of installing PostgreSQL natively, every developer must install Docker (acceptable for this project)
- The well has an unmarked cellar — no *named* volume in compose yet; data lifecycle follows the **anonymous** volume Docker auto-creates from the postgres image's `VOLUME` declaration: `down` keeps it, `down -v` / `prune` wipe it (see Field Notes for the correction)
- Containers add a whisper of latency — slightly slower than native PostgreSQL; negligible for dev, not a concern yet

**Mitigation**:
- The shed gets a neighbor — Roadmap Sprint 1 Day 5 ("Docker Compose (Postgres + app)") dockerizes the app containers too
- The shed becomes a proper building — Deepening Pass 1 (Weeks 7-10): proper Docker images, volume mounts, production-ready compose

## Field Notes (Day 3 → 4)

- The "no volume" state is an **anonymous volume** auto-created by the postgres image's `VOLUME` instruction — data survives `down`, dies with `down -v` / `docker system prune`, and is invisible in `compose config`. The Day 3 note's "data is lost on `docker compose down`" was wrong; the compose file has never declared a volume. **Day 5 decision pending: switch to a named volume** so the behavior is explicit, visible, and survives the app containers coming on board.
- **Stable reset recipe** (verified repeatedly 08-21 → 08-24): `docker compose down` → `up` → `pnpm db:push`. Safe even against an existing DB — push is idempotent. Use the `down -v` variant whenever a schema/DDL change must actually apply (Day 4's cascade FK required it, because `create_all` can't ALTER).
- **Verify-from-inside**: `docker compose exec -T postgres psql -U postgres -d taskflow -c '\d projects'` is the ground truth for live constraints when client behavior is suspicious.

## References

- Roadmap §Sprint 1: "Docker Compose (Postgres + app) — `docker compose up` starts everything"
- 12 OSS repos: Streamlit (Docker basics), Plane (full Docker Compose stack)
