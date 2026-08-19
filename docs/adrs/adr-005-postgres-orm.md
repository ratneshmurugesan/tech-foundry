# ADR-005: PostgreSQL + ORM (Drizzle + SQLAlchemy)

**Status**: Active
**Date**: 2026-08-19
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 3
**Supersedes**: ADR-002 (In-Memory Repository)

## Context

Day 3 of Sprint 1 calls for replacing in-memory storage with a real database. The roadmap specifies PostgreSQL. The dual-language track means we need one ORM per language — each with different ecosystems, async models, and community conventions.

The decision has two axes: which database, and which ORM/driver per track.

## Decision

- **Database**: PostgreSQL 15 — single shared instance via Docker Compose, `postgres:postgres` credentials, port 5432
- **TypeScript ORM**: Drizzle ORM with `postgres.js` driver — schema-first, type-safe SQL-like queries, zero runtime overhead
- **Python ORM**: SQLAlchemy 2.x async with `asyncpg` — mature, `async_sessionmaker` pattern, Pydantic bridge for API responses

Both tracks share the same PostgreSQL instance — same schema, same data, same connection string. The only difference is the client-side abstraction layer.

### Schema Strategy (temporary)

- **TS**: Drizzle `db:push` — schema inferred from TypeScript definitions, pushed directly to DB
- **Python**: SQLAlchemy `init_db()` with `Base.metadata.create_all()` — tables created at app startup

No migration tooling yet. Alembic is installed (`uv add --dev alembic`) but deferred to a later day.

## Consequences

**Positive**:
- One database to learn — PostgreSQL is the roadmap's long-term choice, no swap later
- Drizzle generates types from schema — TypeScript gets compile-time safety for queries
- SQLAlchemy async is production-proven — used by FastAPI ecosystem extensively
- Shared DB means both tracks can query the same data — useful for comparison
- `postgres.js` is a single package with native async/await — no pool config needed
- SQLAlchemy's `async_sessionmaker` + `expire_on_commit=False` gives us clean async sessions

**Negative**:
- Drizzle `db:push` is not suitable for production — no migration history, no rollback
- SQLAlchemy `create_all()` can't alter existing tables — schema changes require manual SQL or Alembic
- Both tracks must stay in sync — if TS adds a column, Python needs it too
- Connection pooling is implicit (handled by drivers) — less control over pool size

**Mitigation**:
- Sprint 1 is "make it work" — auto-create is fine for a solo dev with 3 tables
- Alembic is already installed for the Python track — migration tooling will be added when needed
- The repository pattern isolates ORM queries from the service layer — swapping ORMs is possible
- Deepening Pass 1 (Weeks 7-10) is reserved for infrastructure hardening

## Key Patterns Learned

- **Drizzle**: `pgTable()` to define schema, `db.select().from().where(eq())` to query, `.returning()` to get inserted rows
- **SQLAlchemy async**: `create_async_engine()` + `async_sessionmaker` + `expire_on_commit=False`, all session methods must be `await`ed
- **Pydantic bridge**: `Model.model_validate(row)` converts SQLAlchemy rows to Pydantic types
- **Session lifecycle**: async sessions must be explicitly closed in `finally:` blocks to prevent connection leaks

## References

- ADR-002: In-Memory Repository (superseded)
- Roadmap §Sprint 1: "PostgreSQL, basic schema" — Day 3
- 12 OSS repos: Plane (PostgreSQL + Prisma), Ghost (PostgreSQL + Knex), Streamlit (SQLite → PostgreSQL)
