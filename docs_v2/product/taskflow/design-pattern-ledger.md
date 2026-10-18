# TaskFlow — Design Pattern Ledger

> **What this is**: a *stable* reference of the design patterns actually **in use** in the TaskFlow app — and, for each, the *why* and the *swap story* (what you can replace later, and which seam makes that swap cheap). It is the third taskflow companion: `taskflow-product.md` is the *what/why* (stable spec), `taskflow-build.md` is the *sequence* (build ledger), and this file is the *how it's built* (the patterns holding the shape together).
>
> **How to read it**: every entry answers three questions — *what pattern, why it's here, and what it lets you swap*. The **swap story** is the point of the whole doc: a pattern earns its place by making a *future* change cheap, not by looking tidy today. Entries are grouped by the restaurant layer they live in.
>
> **Grounded, not aspirational**: each entry cites the real file in **both** kitchens. Where a swap has *already happened* (not just *could* happen), it says so. The parity wall (ADR-001) means every in-use pattern below exists in **both** `py/` and `ts/` and is held in place by the golden matrix — so a pattern is only "in use" when it survives in both kitchens.

## The restaurant (rule 16)

kitchen = a language track · door = Auth0 · cellar = Postgres · cashier = Razorpay · badge = JWT · golden matrix = the test both kitchens must pass

---

## At a glance

| Pattern | Seam (where) | Why (one line) | Swap story (one line) |
|---|---|---|---|
| Layered architecture | `server` → `repository` → `db` → `models` | routes never touch SQL; each layer has one job | swap the HTTP framework or the DB without touching the layer below |
| Composition root | `server.py` (wiring) · `main.py` (launch) | all object creation + middleware + handlers in one place | rewire any component by editing one file |
| Middleware pipeline | `AuthenticateBadgeMiddleware` → `AuthorizeMiddleware` | cross-cutting door-then-hook, out of the routes | add/reorder a concern (rate-limit, logging) without touching a route |
| Cache-aside | `_jwks_cache` in `auth.py` | don't hit Auth0's JWKS on every request | swap the cache (memory→Redis) behind the same read |
| Adapter (badge reader) | `verify_badge` + `_public_key` in `auth.py` | one choke point turns a JWT into a trusted `sub` | swap Auth0 for any JWKS IdP behind the same door |
| Dependency injection (by parameter) | `assert_role(..., find_membership)` | the decision takes its one read as an argument | stub the read in tests; swap the membership source for free |
| Strategy | `assert_role` (pure) | the whole permission decision is one swappable function | swap RBAC→ABAC→plan-gate by replacing one function |
| Table-driven dispatch | `ROLE_RANK` · `minRoleFor` · `ALLOWED_DOMAINS` · `PUBLIC_PATHS` | policy lives in data, not branches | add a role / route / tenant by adding a row |
| Repository | `PostgresRepository` | data access behind one class | **already swapped** InMemory→Postgres; swap again without touching routes |
| Unit of Work | `get_session` · `save_workspace_with_owner` | one session per op; multi-row writes in one tx | change the transaction strategy in one place |
| DTO / anti-corruption layer | `types.py` (wire) vs `models.py` (ORM) | the API shape and the DB shape are different types | change the schema or the API independently; the bridge is the only coupling |
| Error envelope contract | `errors.py` → `error_handlers.py` | one fixed JSON shape for every failure | change internal handling / logging without breaking the client contract |
| Fail-closed defense | `auth.py` dispatch | any doubt → 401, never a silent pass | swap the IdP and the safe posture travels with the seam |
| Test double / seam | `assert_role` + ADR-010 zero-service | the suite runs with no real services | swap the test infra freely; the seam is the door into it |
| Golden master / characteristic test | the golden matrix (`py/tests` + `ts/tests`) | both kitchens must pass the *same* matrix | swap a kitchen's internals; the matrix catches drift |
| Adapter (architecture) | the parity wall, ADR-001 | two kitchens, one behavioral contract | run either kitchen; the contract is the invariant |
| Pure-function core | `assert_role` · `map_fail_reason` · `_is_jws` · `minRoleFor` | the hard logic has no hidden I/O | trivially testable, trivially swappable |
| State machine | `transition`/`transitionState` in `razorpay.py`/`razorpay.ts` | the subscription lifecycle is rules about what may change to what | add a transition/state by adding a table row; the webhook day (16b) wires the rest |

---

## The door (`auth.py` / `auth.ts`)

### Fail-closed defense
- **Where**: `AuthenticateBadgeMiddleware.dispatch` — no token → 401; stranger tenant (not in `ALLOWED_DOMAINS`) → 401; unknown `kid` re-fetches *once*, then 401; any unexpected exception → 401 "Signature verification failed". The comment is explicit: *"fail-closed, never a silent pass."*
- **Why**: an auth seam that fails *open* is a hole. Every ambiguity in the badge path resolves to rejection.
- **Swap story**: the whole posture lives inside the door. Swap Auth0 for any JWKS-signing IdP and the fail-closed behavior travels with the seam — you never re-litigate "what happens on doubt" per route.

### Cache-aside
- **Where**: `_jwks_cache: dict[str, dict] = {}` — *"bare-domain → {kid: jwk}. Re-fetches exactly once on an unknown kid."* `verify_badge` reads the cache, and only on a miss for a `kid` does it re-fetch.
- **Why**: verifying a badge must not hit the network on every request; key rotation is the only reason to re-fetch.
- **Swap story**: the cache is a plain dict behind two reads (`_jwks_cache.get` / `_fetch_jwks`). Swap in-process memory for a shared cache (Redis) without touching the verify logic.

### Adapter (the badge reader)
- **Where**: `verify_badge(token, tenant, audience) -> dict` + `_public_key(jwk)` (JWK `n`/`e` → a key PyJWT can verify with). One function converts an opaque JWT into a trusted claim dict.
- **Why**: the rest of the app only ever sees `request.state.user` (a dict with `sub`). It never knows *how* the badge was read.
- **Swap story**: this is the seam that lets the door be Auth0 today and a different IdP tomorrow. The middleware, the authorizer, and the routes all depend on the *output shape* (`sub`), not on Auth0.

## The hook (`authorize.py` / `authorize.ts`)

### Dependency injection (by parameter)
- **Where**: `assert_role(workspace_id, sub, min_role, find_membership: Callable[[str, str], Awaitable[WorkspaceMember | None]])`. The docstring: *"the caller passes the one membership read… This is the unit-test seam of the middleware below — tests stub `find_membership` and get the ladder, cellars apart."* The middleware calls `assert_role(ws_id, sub, min_role, repo.find_membership)`.
- **Why**: the permission decision depends on exactly one I/O read. Making that read a *parameter* (not a hidden `self.repo` call) is what makes the decision testable without a database.
- **Swap story**: tests stub `find_membership` (see `test_authorize.py` / `authorize.test.ts`) and exercise the entire ladder with zero services. Swap the membership source (DB → cache → a different store) and only the *injection site* changes, never the decision.

### Strategy
- **Where**: `assert_role` is a **pure** function — no request object, no HTTP, no session of its own. Its entire output contract is two 403 shapes (`NOT_A_MEMBER`, `REQUIRES_OWNER`).
- **Why**: the "who may do this" policy is isolated as a single replaceable unit.
- **Swap story**: this is the seam the day-15 plan-gate will use. Swap the RBAC rank comparison for a plan-aware decision (or ABAC) by replacing *one* function — the middleware, the routes, and the tests keep their shape.

### Table-driven dispatch
- **Where**: `ROLE_RANK = {"member": 1, "owner": 2}` (a rank table, compared as `ROLE_RANK[role] < ROLE_RANK[min_role]` — not a nested if/elif). `minRoleFor(method, path)` maps route shape → minimum role. `ALLOWED_DOMAINS` and `PUBLIC_PATHS` are allowlist sets.
- **Why**: policy-as-data. A branch per role/route would grow combinatorially; a row does not.
- **Swap story**: add a role, a gated route, or a trusted tenant by **adding a row**, not a branch. The day-12 prompt's Decide-1 was literally "a table, not branches."

### Middleware pipeline (chain of responsibility)
- **Where**: `server.py` — `app.add_middleware(AuthorizeMiddleware)` then `app.add_middleware(AuthenticateBadgeMiddleware)`. Starlette prepends, so the *last* added (`AuthenticateBadge`) is outermost and runs **first**: the door, then the hook.
- **Why**: cross-cutting concerns (identity, then authorization) run for every request without any route knowing they exist.
- **Swap story**: insert a rate-limiter, a request-logger, or a tenant-router by adding one `add_middleware` line. Routes stay clean.

## The cellar (`repository.py` + `db.py` + `models.py`)

### Repository
- **Where**: `PostgresRepository` — *"replaces InMemoryRepository."* Every read/write in the app goes through this class (`find_workspace_by_id`, `save_workspace_with_owner`, `find_membership`, …).
- **Why**: the routes depend on a *data-access interface*, not on SQLAlchemy.
- **Swap story**: this swap **already happened** — ADR-002 (in-memory) → ADR-005 (Postgres), with the routes untouched. That's the pattern proven in practice, not on paper. Swap in another store later the same way.

### Unit of Work (session-per-request)
- **Where**: `db.get_session()` — *"Each request gets its own session — no shared state."* `save_workspace_with_owner` does `flush()` (parent row) → `add` (member row) → `commit()` in **one** transaction — *"no orphan-creator window."*
- **Why**: multi-row writes must be atomic; a shared session would leak state across requests.
- **Swap story**: the transaction boundary is localized to the repository method. Change the strategy (e.g., split into two txns, or add a savepoint) in one method, not across the app.

### DTO / anti-corruption layer
- **Where**: `types.py` (Pydantic wire models: `Workspace`, `CreateWorkspace`, `UpdateWorkspace`, …) is a *different type* from `models.py` (SQLAlchemy: `WorkspaceModel`, …). The bridge is `model_config = ConfigDict(from_attributes=True)` — *"the bridge between SQLAlchemy models and Pydantic API types"* — and `repository` returns `Workspace.model_validate(row)`.
- **Why**: the database schema and the API contract evolve on different clocks. Keeping them as separate types means a schema change doesn't silently reshape the API.
- **Swap story**: change the DB columns or the JSON shape **independently**; the only coupling is the `model_validate` bridge. Note `update_workspace(id, changes: dict)` takes *"a plain dict, never the pydantic model"* — the route does `body.model_dump(exclude_unset=True)`, so even the update path keeps the two layers apart.

## The wire (`server.py` + `errors.py` + `error_handlers.py`)

### Composition root
- **Where**: `server.py` builds `app`, adds both middlewares, calls `register_error_handlers(app)`, and instantiates `repo = PostgresRepository()`. `main.py` is deliberately trivial — it only launches uvicorn on `src.server:app`.
- **Why**: all object creation and wiring lives in one file. Nothing else in the app says "make a repository" or "add the auth middleware."
- **Swap story**: rewire any component (a new repository, a new middleware, a different handler set) by editing **one** file. The `lifespan` context manager is the single startup/shutdown seam (`init_db()` on start).

### Error envelope contract
- **Where**: `errors.py` defines domain exceptions (`NotFoundError`, `ConflictError`, `DatabaseCrashError`, `UnauthorizedError`, `ForbiddenError`), each carrying a `.message`. `error_handlers.py` maps each to one fixed JSON shape `{statusCode, error, message}` with the right HTTP code, plus a universal 500 fallback that logs the traceback but returns an opaque message.
- **Why**: the client sees **one** failure shape no matter what broke. The six-string auth contract (ADR-011) and the two 403 strings (ADR-007) are *fixed strings on purpose* — parity requires byte-identical messages on both kitchens.
- **Swap story**: change how errors are logged, add a `requestId` field, or split the 500 handling — the client contract (the envelope keys) is stable. The contract is the seam; the internals are swappable.

### Layered architecture
- **Where**: the whole file layout — `server` (HTTP) → `repository` (data access) → `db` (connection/session) → `models` (tables), with `types`/`errors`/`ids`/`constants` as the shared seams.
- **Why**: each layer has one job and depends only on the layer below it. A route never imports `db` or `models`.
- **Swap story**: this is what lets the parity wall work at all — because the layers are clean, the *same* layering can be re-expressed in a second language (the TS kitchen) and still behave identically.

## The counter (the cashier — `razorpay.py` / `razorpay.ts`)

### State machine
- **Where**: `transition(state, event)` (PY) / `transitionState(state, event)` (TS) — a pure function over the four plan states (`trial` / `active` / `past_due` / `canceled`). The `verify` route calls it: `trial→active` on a matched signature, then upserts the plan row and re-checks the role. The DB `CHECK` constraint is the *last* line of defense — a bad state is a `500`, not a silent bad row.
- **Why**: the subscription lifecycle is a set of *rules about what may change to what* — exactly the shape a state machine models. Keeping it pure means the interesting logic (the transitions) is testable with zero services, and the two kitchens hold the *same* table.
- **Swap story**: add a transition (or a new state) by adding a row to the table — the `verify` route, the DB constraint, and the tests keep their shape. The webhook day (16b) wires the remaining edges (`active→past_due` / `past_due→active` / `any→canceled`) into the same table.

## The proof (the golden matrix)

### Test double / seam (ADR-010 zero-service)
- **Where**: the `assert_role` parameter-injection seam (above) + the test set — `py/tests/` (`test_auth`, `test_authorize`, `test_errors`, `test_health`, `test_ids`, `test_types`) and the mirrored `ts/tests/`. The authorizer's docstring names it: *"tests stub `find_membership` and get the ladder, cellars apart."*
- **Why**: CI must run with **zero** services (ADR-010) — no Postgres, no Auth0. The seams make the interesting logic testable in isolation.
- **Swap story**: swap the test runner, the assertion library, or add a service-backed integration tier without touching the unit seams. The seam is the door into the test suite.

### Golden master / characteristic testing
- **Where**: the golden matrix — the *same* behavioral tests in both kitchens (`test_types.py` ↔ `types.test.ts`, `test_authorize.py` ↔ `authorize.test.ts`, …). AGENTS.md names it *"the parity source of truth."*
- **Why**: "the two kitchens behave the same" is a *claim* that needs a *proof*. The matrix is that proof — a drift in either kitchen turns the fast suite red.
- **Swap story**: change either kitchen's internals freely; the matrix is the tripwire that says "you broke parity." This is the pattern that makes the dual-language track *safe* rather than *risky*.

### Adapter (the architecture) — the parity wall
- **Where**: the entire `ts/` kitchen mirrors `py/` file-for-file (`auth`, `authorize`, `constants`, `db`, `errorHandler`, `errors`, `ids`, `main`, `repository`, `server`, `types`), and the TS comments say so explicitly (*"Mirrors py `authorize.py::assert_role`… byte-for-byte"*).
- **Why**: ADR-001 — two independent implementations of one behavioral contract, so a language/framework bet is never load-bearing.
- **Swap story**: at the highest level, the two kitchens are *interchangeable adapters* of the same contract. You can run either; the contract (the golden matrix) is the invariant that makes the swap meaningful.

---

## On the horizon (roadmap-fed — *not yet built*)

These are patterns the roadmap **will** introduce. They are listed here so the ledger has a forward edge; they are *not* "in use" until the day lands and the matrix proves them in both kitchens.

- **Event / observer** — the "money event" (the moment a tier flips) as a named seam. The **state machine** it drives is now *in use* (see "The counter" above); the *event bus* that would let other components subscribe to a tier flip is still a *planned* subscription point, not a live one — it ships with the webhook day (16b).

> **Rule for this section**: a pattern moves from *horizon* to *in use* only when it (a) is built in **both** kitchens and (b) is held by the golden matrix. Until then it stays here, honest about being a plan.
>
> **Maintenance (standing rule)**: this move is **EOD step 5** in `docs_v2/daily-flow.md` — *"only if a new pattern landed, move it horizon→in-use."* It is a deliberate, one-at-a-time update (ADR-013: code wins, then fix the doc the same day), not an auto-tracked living doc. If a day lands a pattern and the ledger isn't updated, the ledger is silently stale.

## Deliberately *not* used (the boundaries)

Naming what we're **not** doing is as useful as naming what we are — it stops a future session from "improving" a boundary into a regression.

- **No DI container.** Dependency injection is by *explicit parameter* (`assert_role`), not a container/framework. Swapping to a container is a choice, not a current fact.
- **No ORM migrations.** `init_db()` runs `create_all` on startup. There is no migration tool yet; that's a boundary, not an oversight to silently "fix."
- **No CQRS.** One repository serves reads and writes together (with specialized read methods like `find_workspace_id_for`). Splitting read/write models is a future option, not a current seam.
- **No event bus / message queue.** The money event is a *planned* seam (above); there is no live pub/sub today.
- **No route registry / plugin system.** Routes are explicit decorators on the composition root. A dynamic route table would be a change to the composition-root pattern, not an extension of it.

---

*Companion docs: `taskflow-product.md` (the spec) · `taskflow-build.md` (the sequence). This ledger is the "how" — stable like the spec, but it grows one entry at a time as the roadmap lands new patterns and the matrix proves them in both kitchens.*
