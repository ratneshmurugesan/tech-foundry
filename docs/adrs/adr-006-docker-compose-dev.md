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
- Health check: `pg_isready -U postgres` every 5s (the app healthchecks use `5s` too, with `start_period: 10s`)
- Single `docker-compose.yml` in `apps/taskflow/` — since Day 5 it also defines `taskflow-ts` + `taskflow-py` + a one-shot `db-push` schema owner, so one file = the whole restaurant

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
- The cellar has a deed — the named `postgres_data` volume is declared in the compose file, so the data lifecycle is explicit: `down` keeps it, `down -v` / `prune` wipe it (since Day 5; see Field Notes for the anonymous-volume correction that preceded it)
- Containers add a whisper of latency — slightly slower than native PostgreSQL; negligible for dev, not a concern yet

**Mitigation**:
- Day 5 (done) dockerized the app containers too, with a dev-mode `node_modules` host mount as the rebuild-avoidance shortcut — the *deploy* must resolve that definitively (embed deps in the image vs install-on-server); that is Day-6's first gate
- The room becomes the restaurant — Deepening Pass 1 (Weeks 7-10): production-ready compose and images (the named cellar volume already landed in Day 5)

## Field Notes (Day 3 → 4 → 5)

- The "no volume" state of Day 3 was an **anonymous volume** auto-created by the postgres image's `VOLUME` instruction — data survives `down`, dies with `down -v` / `docker system prune`, and is invisible in `compose config`. The Day 3 note's "data is lost on `docker compose down`" was wrong; the compose file had never declared a volume. **Day 5: decision landed** — the named `postgres_data:/var/lib/postgresql/data` volume is declared (with top-level `volumes: postgres_data`), so the behavior is explicit and `docker volume ls` names it; an earlier attempt at a secondary `taskflow-app-data` path did not work and is left commented in the compose.
- **Stable reset recipe** (verified repeatedly 08-21 → 08-24): `docker compose down` → `up` → `pnpm db:push`. Safe even against an existing DB — push is idempotent. Use the `down -v` variant whenever a schema/DDL change must actually apply (Day 4's cascade FK required it, because `create_all` can't ALTER).
- **Verify-from-inside**: `docker compose exec -T postgres psql -U postgres -d taskflow -c '\d projects'` is the ground truth for live constraints when client behavior is suspicious.

## Field Notes (Day 5)

- **The whole restaurant, one `up`** — the compose grew from 1 service to 4: postgres + `taskflow-ts` + `taskflow-py` + a one-shot `db-push` (`restart: "no"`) that the apps gate on with `depends_on: condition: service_completed_successfully`, so the Day-3/4 "schema first" rule is encoded as a service and `docker compose up -d` is genuinely one command.
- **Base images** — `node:22-alpine` (not the `node:20` previewed) + corepack pnpm; pnpm inside a non-interactive container needs `CI: "true"` in its run-env or it dies on the interactive prompt. Python: `python:3.12-slim` + uv, `uv sync --frozen --no-dev --no-install-project`, run via `uv run python -m src.main`; the Fastify app honours `PORT` via `process.env.PORT ?? 8000`.
- **Healthchecks** — `pg_isready` for postgres; `wget --spider http://127.0.0.1:8000/health` for the apps (`127.0.0.1`, never `localhost` — Docker DNS can return `::1`). `wget --spider` returns 0 on *any* HTTP response, including a not-yet-ready 503, so `start_period: 10s` is what prevents a false `unhealthy` during cold boot.
- **Source mounts, `:cached` node_modules** — both apps mount host `src/` over the image's, but `/app/node_modules` is *excluded* from the TS app mount and back-mounted from the host (`./ts/node_modules:/app/node_modules:cached`), which required a real host `pnpm install`; the py side keeps an **anonymous** `/app/__pycache__` volume so Docker's layer isn't clobbered by the host mount. The build-vs-mount dependency drift this creates (image deps vs host deps) is resolved for dev but is the **Day-6 deploy gate** (embed in image vs install-on-server).
- **`uv.lock` churn** — one py build inside the slim image rewrote `uv.lock` (the image's uv differed from the one that wrote the lock); the lock is clean again, but pinning the uv version in `py/Dockerfile` is the **Day-6 gate**.
- **Shipped** — `e5c518b feat: Introduce Docker Compose setup for Taskflow app` (compose + both Dockerfiles + `.dockerignore`s + `PORT` fix), pushed to `origin/dev`; the day-05 note is this record's companion.

## References

- Roadmap §Sprint 1: "Docker Compose (Postgres + app) — `docker compose up` starts everything"
- 12 OSS repos: Streamlit (Docker basics), Plane (full Docker Compose stack)
