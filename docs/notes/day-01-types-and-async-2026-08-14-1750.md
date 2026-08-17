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

### Python Environment Hell (09:04 – 09:32)
Spent 28 minutes just getting a working Python venv + pydantic. The chain:

| Attempt | Command | Why it failed |
|---|---|---|
| 1 | `python -m pip install pydantic` | No `python` binary on Ubuntu |
| 2 | `python3 -m pip install pydantic` | pip not installed |
| 3 | `python3 -m venv .` | Missing `python3.12-venv` package |
| 4 | `sudo apt install python3.12-venv` | Got it, but pip still broken |
| 5 | `sudo apt install python3-pip` | Still not working |
| 6 | `sudo apt install python3-full` | Still broken |
| 7 | `sudo apt install python3-venv python3-full -y` | **Finally worked** |
| 8 | `python3 -m venv .venv` → `source .venv/bin/activate` → `pip install pydantic` | ✅ Working |

Then **ripped it all out** (`deactivate`, `rm -rf bin include lib lib64 pyvenv.cfg`) to switch to `uv`.

**Lesson**: Ubuntu ships Python without venv or pip by default. The one-liner that works: `sudo apt install python3-venv python3-full -y`.

### Switching from pip to uv (12:26 – 13:22)

| Struggle | What happened |
|---|---|
| Old venv cleanup | `rm -rf bin include lib lib64 pyvenv.cfg` repeated 3+ times across different dirs |
| `pip install .` / `pip install -e .` | Failed — no `pyproject.toml` existed yet |
| uv installation | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| uv learning loop | `uv venv` → `uv sync` → `uv run python3 -m src.main` repeated 4 times, fixing imports each iteration |
| Final working run | `uv run python3 -m src.main` ✅ |

**Lesson**: `uv` completely replaces pip + venv. `uv venv` creates the env, `uv sync` reads `pyproject.toml` and installs deps, `uv run` executes within the env. No `source activate` needed.

### TypeScript Track Setup (13:54 – 15:08)

| Struggle | What happened |
|---|---|
| pnpm not installed | `npm i -g pnpm` |
| `pnpm init` + deps | `pnpm install -D tsx typescript` |
| tsx not found | Tried `npx i -g tsx`, `npx install -g tsx`, finally `npm install -g tsx` |
| esbuild native build blocked | `pnpm approve-builds esbuild` (pnpm requires explicit approval for native builds) |
| Full nuke restart | `rm -rf node_modules pnpm-lock.yaml && pnpm install` |
| Store prune | `pnpm store prune` |
| TypeScript generic type error | `Property 'id' does not exist on type 'T'` — `InMemoryRepository<T>` needed `T` constrained to `{ id: string }` |
| Final working run | `pnpm dev` ✅ |

**Lesson**: pnpm's `approve-builds` for native dependencies is a gotcha. The `pnpm store prune` command cleans up orphaned packages from the global store. Generic repo type constraint was the main code bug.

### TypeScript Generic Type Error
`Property 'id' does not exist on type 'T'` in `InMemoryRepository<T>`.
**Fix**: Added type constraint `T extends { id: string }` so `findById` can safely access `.id` on generic type parameter.

### Python Type Mismatch
`id: UUID = str(uuid4())` — the type annotation said `UUID` but the default was a `string`. Pydantic silently coerced it, but it was misleading and would break if strict validation was enabled.
**Fix**: Changed to `id: str = Field(default_factory=lambda: str(uuid4()))` — type and value now match. Also fixed `created_at: datetime = datetime.now` → `Field(default_factory=datetime.now)` (calling the function vs referencing it).

### Repository API Drift
Python `delete(entity: T)` took a full entity object, while TypeScript `delete(id: string)` took just an ID string. The tracks were supposed to mirror each other.
**Fix**: Aligned Python to `delete(id: str)` — both tracks now have identical signatures.

### TypeScript Fire-and-Forget
`main()` at the bottom of `main.ts` was called without `await`, meaning unhandled promise rejections would be silently swallowed.
**Fix**: Changed to `await main()` at top level.

## Blocked / Deferred

- **Deferred to Day 3**: PostgreSQL schema, Drizzle ORM, real persistence layer.
- **Deferred to Deepening 1**: ULID/nanoid ID generation swap (current `uuid4` is sufficient for learning).
- **Carried forward**: In-memory repositories will be replaced with PostgreSQL-backed repos on Day 3.

## Commands Run

### The Real Journey (chronological)

| Time | Command | Outcome |
|---|---|---|
| 09:04 | `python -m pip install pydantic` | ❌ No `python` binary |
| 09:06 | `sudo apt install python3.12-venv` | ✅ venv package installed |
| 09:30 | `sudo apt install python3-venv python3-full -y` | ✅ Full Python toolchain |
| 09:30 | `python3 -m venv .venv` → `source .venv/bin/activate` → `pip install pydantic` | ✅ Working (then ripped out) |
| 12:35 | `rm -rf bin include lib lib64 pyvenv.cfg` | Cleaned old venv (×3 across dirs) |
| 13:06 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | ✅ uv installed |
| 13:11 | `uv venv` → `uv sync` → `uv run python3 -m src.main` | ✅ Python track working (4 iterations) |
| 13:55 | `npm i -g pnpm` | ✅ pnpm installed |
| 13:58 | `pnpm init` → `pnpm install -D tsx typescript` | ✅ Project scaffolded |
| 14:00 | `npx tsc --init` | ✅ tsconfig.json created |
| 15:04 | `npm install -g tsx` | ✅ tsx installed globally |
| 15:06 | `rm -rf node_modules pnpm-lock.yaml && pnpm install` | ✅ Clean reinstall |
| 15:08 | `pnpm approve-builds esbuild` | ✅ Native build approved |
| 15:08 | `pnpm dev` | ✅ TS track working |
| 15:10 | `uv run python -m src.main` | ✅ Python track verified |
| 15:15 | `git push origin dev` | ✅ Pushed to GitHub |

### Final Working Commands (the ones that matter)

| Command | Track | Outcome |
|---|---|---|
| `pnpm dev` | TS | ✅ 6 log lines printed, "COMPLETE" |
| `npx tsc --noEmit` | TS | ✅ Zero type errors, clean exit |
| `uv venv` | Python | ✅ Virtual environment created |
| `uv sync` | Python | ✅ pydantic installed, lockfile created |
| `uv run python -m src.main` | Python | ✅ 5 log lines printed, "COMPLETE" |

## ADRs Created


| ADR | Decision | Status |
|---|---|---|
| [ADR-001](../adrs/adr-001-dual-language-track.md) | TypeScript 60% + Python 40% dual track | Active |
| [ADR-002](../adrs/adr-002-in-memory-repository.md) | In-memory `Map`/`dict` for Days 1-2, PostgreSQL on Day 3 | Active (temporary) |
| [ADR-003](../adrs/adr-003-id-generation-strategy.md) | uuid4 for Day 1, ULID planned for Phase 2 | Active (temporary) |

Both tracks use uuid4 from the start (`crypto.randomUUID()` in TS, `uuid4()` in Python). ULID is the planned upgrade for Phase 2.

## Preview of Next day

**Day 2: API Skeleton** — Wrap today's in-memory repos behind HTTP endpoints.
- **Concepts**: REST routes, request/response cycle, framework routing (FastAPI decorators, Fastify route registration)
- **Files**: `ts/src/server.ts` (Fastify app), `py/src/server.py` (FastAPI app), new `main.ts`/`main.py` entry points
- **Prerequisites**: Install `fastify` (npm) and `fastapi` + `uvicorn` (pip/uv) before starting
- **Connection**: Today's `InMemoryRepository` becomes the data layer behind each endpoint — same `findAll`/`findById`/`save` calls, now triggered by HTTP requests instead of `main()`

## Notes