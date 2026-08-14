# Day 01 — Types and Async

## Built

- [x] `ts/package.json` — pnpm project config, tsx for dev, TypeScript 5.5 strict
- [x] `ts/tsconfig.json` — ES2022 target, ESM modules, strict mode enabled
- [x] `ts/src/types.ts` — Workspace, Project, Issue interfaces (Entities with identity)
- [x] `ts/src/ids.ts` — `generateId()` via `crypto.randomUUID()` (Value Object)
- [x] `ts/src/repository.ts` — `InMemoryRepository<T>` with async findAll/findById/save/delete
- [x] `ts/src/main.ts` — Entry point: create → save → query flow
- [x] `py/pyproject.toml` — uv project, pydantic>=2.0, Python 3.12+
- [x] `py/src/__init__.py` — Package marker
- [x] `py/src/types.py` — Workspace, Project, Issue Pydantic models with status validator
- [x] `py/src/ids.py` — `generate_id()` via `uuid.uuid4()`
- [x] `py/src/repository.py` — `InMemoryRepository[T]` with async methods
- [x] `py/src/main.py` — Entry point with `asyncio.run(main())`

## Learned

- **Entity vs Value Object**: Entities (Workspace, Project, Issue) have identity via `id`. Value Objects (the id itself) are defined by attributes, not identity. This is the atomic DDD building block every repo starts with.
- **Dual-language type mapping**:
  - TS `interface` → Python `Pydantic BaseModel` (runtime validation vs compile-time)
  - TS `Date` → Python `datetime`
  - TS `crypto.randomUUID()` → Python `uuid.uuid4()`
  - TS `async/await` → Python `async/await` (same keyword, different event loop)
  - TS `undefined` → Python `None`
- **Repository pattern**: Abstracting persistence behind `save/find/delete` means Day 3's PostgreSQL swap only touches the repository internals, not the business logic in `main.ts/main.py`.
- **Async from day one**: Even in-memory repos use `async`, so transitioning to real DB calls (asyncpg/Drizzle on Day 3) is a one-line change inside the method body — no signature changes needed.

## Broke & Fixed

No issues encountered.

## Blocked / Deferred

- **Deferred to Day 3**: PostgreSQL schema, Drizzle ORM, real persistence layer.
- **Deferred to Deepening 1**: ULID/nanoid ID generation swap (current `uuid4` is sufficient for learning).
- **Carried forward**: In-memory repositories will be replaced with PostgreSQL-backed repos on Day 3.

## Commands Run

| Command | Track | Outcome |
|---|---|---|
| `pnpm install` | TS | ✅ Dependencies installed, lockfile created |
| `pnpm dev` | TS | ✅ 6 log lines printed, "COMPLETE" |
| `npx tsc --noEmit` | TS | ✅ Zero type errors, clean exit |
| `uv venv` | Python | ✅ Virtual environment created |
| `uv sync` | Python | ✅ pydantic installed, lockfile created |
| `uv run python -m src.main` | Python | ✅ 5 log lines printed, "COMPLETE" |

## ADRs Created

- ADR-001: Dual-language track — TypeScript 60%, Python 40%, same concepts two type systems
- ADR-002: In-memory repository — async-first from day 1, prepares for PostgreSQL swap
- ADR-003: ID generation strategy — `uuid4` for now, ULID/nanoid in Deepening 1

## Preview of Next day

**Day 2: API Skeleton** — Wrap today's in-memory repos behind HTTP endpoints.
- **Concepts**: REST routes, request/response cycle, framework routing (FastAPI decorators, Fastify route registration)
- **Files**: `ts/src/server.ts` (Fastify app), `py/src/server.py` (FastAPI app), new `main.ts`/`main.py` entry points
- **Prerequisites**: Install `fastify` (npm) and `fastapi` + `uvicorn` (pip/uv) before starting
- **Connection**: Today's `InMemoryRepository` becomes the data layer behind each endpoint — same `findAll`/`findById`/`save` calls, now triggered by HTTP requests instead of `main()`

## Notes