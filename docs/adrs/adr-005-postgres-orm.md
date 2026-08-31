# ADR-005: PostgreSQL + ORM (Drizzle + SQLAlchemy)

**Status**: Active
**Date**: 2026-08-19
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 3
**Supersedes**: ADR-002 (In-Memory Repository)

## Context

Day 3 of Sprint 1 burns the in-memory notebook and moves the data into a building with proper shelves — PostgreSQL, per the roadmap. The dual-language track means two foremen for the same building: one ORM per language, each with its own ecosystem, async model, and community conventions.

The decision has two axes: which database, and which ORM/driver per track.

## Decision

- **Database**: PostgreSQL 15 — one building, shared by both tracks, run via Docker Compose with `postgres:postgres` credentials on port 5432
- **TypeScript ORM**: Drizzle ORM with `postgres.js` driver — schema-first, type-safe SQL-like queries, zero runtime overhead: the foreman writes plain SQL and TypeScript keeps the ledger of what's allowed
- **Python ORM**: SQLAlchemy 2.x async with `asyncpg` — mature, `async_sessionmaker` pattern, Pydantic bridge for API responses

Both tracks walk into the same building with the same key — same schema, same data, same connection string. Drizzle stays close to the concrete (SQL), SQLAlchemy brings full-architect machinery (ORM mapping, sessions). The difference is the client-side abstraction, the *client-side* only.

### Schema Strategy (temporary)

- **TS**: Drizzle `db:push` — the TypeScript definitions *are* the blueprint, pushed straight to the building (no drawings kept on file — the code is the record)
- **Python**: SQLAlchemy `init_db()` with `Base.metadata.create_all()` — the building is inspected at app startup and missing shelves are built, but existing shelves are never remodeled

No migration tooling yet. Alembic is installed (`uv add --dev alembic`) but deferred to a later day.

## Consequences

**Positive**:
- One database to learn — PostgreSQL is the roadmap's long-term choice; the foremen argue over the blueprint, but they agreed the *building* stays
- Drizzle generates types from schema — a self-writing ledger: a typo in a query column is caught at compile time, not when the courier arrives empty-handed
- SQLAlchemy async is production-proven — the FastAPI house style for a decade
- Shared data — both tracks cook from the same pantry; their queries see the same rows, and the kitchen bump is a genuine cross-track integration test for free
- `postgres.js` is one package with native async/await — no pool configuration needed on the TS side
- SQLAlchemy's `async_sessionmaker` + `expire_on_commit=False` gives clean, explicit async sessions — the Pydantic bridge (`model_validate`) is then the waiter between kitchen and table

**Negative**:
- Drizzle `db:push` is not suitable for production — the ledger has no audit trail: no migration history, no rollback, only the current state
- SQLAlchemy `create_all()` is a renovator who only builds what does not exist — it never remodels; a schema change needs manual SQL until Alembic arrives, and the sledgehammer (drop and rebuild) is the whole kit today
- Two ledgers, no inspector — the same 3 tables written twice; add a column in one ledger and forget the other, and every read on that side returns `None` (a shelf that exists in only one ledger)
- Connection pooling is implicit (the drivers run their own pool) — less control over pool size today; headroom while one laptop uses the building, a moving target once it is shared

**Mitigation**:
- Three tables is disposable — while the building holds only 3 shelves, the sledgehammer (drop + rebuild) is acceptable; the rule until Alembic lands: change a track, rebuild the database
- Two ledgers need one inspector — Deepening 1 (Weeks 7-10): Alembic for the Python ledger, Drizzle migrations for the TS ledger, and a schema-diff check in CI reconciles the two
- The repository pattern keeps the domain out of the building — a foreman swap touches `repository.ts`/`repository.py` only
- The database stays local-only (`127.0.0.1:5432`) — Deepening 4 (Weeks 15-18) is where the building moves onto the network; then only the doorknob (the connection string, already an environment variable on both tracks) changes

## Key Patterns Learned

- **Drizzle**: `pgTable()` to define schema, `db.select().from().where(eq())` to query, `.returning()` to get inserted rows
- **SQLAlchemy async**: `create_async_engine()` + `async_sessionmaker` + `expire_on_commit=False`, all session methods must be `await`ed
- **Pydantic bridge**: `Model.model_validate(row)` converts SQLAlchemy rows to Pydantic types
- **Session lifecycle**: async sessions must be explicitly closed in `finally:` blocks to prevent connection leaks

## Field Notes (Day 3 → 4)

- **The Drizzle journal is throwaway local state.** `drizzle-kit push` writes snapshots under `./drizzle/` (the `out` config). It is not source — added to `.gitignore` (Day 4). If the DB drifts unrepairable, the working reset sequence is: drop the schema's tables, `rm -rf drizzle/`, `pnpm db:push` — `src/db.ts` is the source of truth and regenerates both journal and tables. (Session 08-24 reconstruction: the *drop* step required a temp drizzle config with an empty table list + `push --force`, because **`drizzle-kit drop` does not exist** in kit 0.22 and there was no `db:drop` script.)
- **DDL authority differs by track.** TS schema changes take effect only after `pnpm db:push` against the *running* DB; PY schema changes take effect only after a full container rebuild (since `create_all()` doesn't ALTER). The Day 4 cascade FK needed exactly one of each — the asymmetry is the reason the shared-DB setup keeps biting.

## References

- ADR-002: In-Memory Repository (superseded)
- Roadmap §Sprint 1: "PostgreSQL, basic schema" — Day 3
- 12 OSS repos: Plane (PostgreSQL + Prisma), Ghost (PostgreSQL + Knex), Streamlit (SQLite → PostgreSQL)
