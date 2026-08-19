# ADR-006: Docker Compose for Local Development

**Status**: Active
**Date**: 2026-08-19
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 3

## Context

PostgreSQL needs to run somewhere for local development. Options: install PostgreSQL natively, use a managed cloud DB, or containerize it. Each has tradeoffs for a solo dev working on a 10+ year project.

## Decision

Use **Docker Compose** to run PostgreSQL as a local container:
- `postgres:15` image, mounted at `0.0.0.0:5432`
- `postgres:postgres` credentials, database `taskflow`
- Health check: `pg_isready -U postgres` every 10s
- Single `docker-compose.yml` in `apps/taskflow/` shared by both TS and Python tracks

Both language tracks connect to the same container — same DB, same data, different ports (TS: 8000, Python: 8001).

## Consequences

**Positive**:
- Zero native installation — no PostgreSQL packages on the host OS
- Reproducible — any clone of the repo can `docker compose up -d` and get the same setup
- Easy to reset — `docker compose down` tears everything down, start fresh
- Both tracks share one DB instance — consistent data for comparison
- Health check ensures the app doesn't start before the DB is ready

**Negative**:
- Docker dependency — developer must have Docker installed (acceptable for this project)
- No persistent volume yet — data is lost on `docker compose down` (will add `volumes:` when needed)
- Slightly slower than native PostgreSQL — negligible for dev, not a concern yet

**Mitigation**:
- Roadmap Sprint 1 Day 5: "Docker Compose (Postgres + app)" — full Dockerization of app containers too
- Deepening Pass 1 (Weeks 7-10): proper Docker images, volume mounts, production-ready compose

## References

- Roadmap §Sprint 1: "Docker Compose (Postgres + app) — `docker compose up` starts everything"
- 12 OSS repos: Streamlit (Docker basics), Plane (full Docker Compose stack)
