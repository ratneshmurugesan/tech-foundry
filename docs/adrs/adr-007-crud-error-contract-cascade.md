# ADR-007: CRUD Layer — Semantic Error Contract + Database Cascade

**Status**: Active
**Date**: 2026-08-26
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 4
**Supersedes**: None (adds to ADR-005)

## Context

Day 3 left the Taskflow building with windows but no doors — the routes could read, but visitors could not create, change, or delete anything. Day 4 installs the remaining 3 letters of CRUD: POST, PATCH (partial update), DELETE — for all 3 entities, on both tracks (12 new routes per track, 24 total). With visitors able to come and go, three cross-cutting questions had answers:

1. **How do errors reach the client?** Day 3 routes returned raw data or nothing — a building with no one at the door. Mutations need a front desk: status codes (201, 204, 400, 404, 500) and a *consistent* JSON shape, so a single client could talk to both servers.
2. **What about the day-3 preview's watch-outs?** It explicitly flagged cascade deletes, parent validation ("can't create issue without a project"), and partial updates. The prompt preview suggested *application-level* cascade (the worker walks the list in order and deletes the children in the service layer).
3. **The roadmap says "how thin"** — a bare shell: no validation beyond "field exists", no error messages beyond 500. We deliberately went beyond the bare shell. This ADR records that deviation, per rule 11.

**Alternatives considered**:

- *App-level cascade* (the worker walks the floors in order — issues → projects → workspace) vs *DB-level `ON DELETE CASCADE`* (pull the load-bearing floor and the ones above fall with it) → chose DB-level.
- *Fastify's native AJV* hand-written JSON Schema vs *Zod v4 + `fastify-type-provider-zod`* → chose Zod (single readable schema object per route, version-pinned to Fastify 5).
- *Per-route try/catch only* (Day 3 pattern — a private phone in every room) vs *global error handler* (a single front desk) → chose global handler as the single choke point, with routes throwing typed errors.

## Decision

1. **One error contract, both tracks.** The front desk runs the same script in both languages — identical JSON shape:
   - `400` → `{ statusCode: 400, error: "Bad Request", message: "Validation failed", details: [{ field, message }] }` — TS: `ZodError` branch in a global `setErrorHandler`; PY: `RequestValidationError` handler.
   - `404` → `NotFoundError` → `{ statusCode: 404, error: "Not Found", message: <specific> }`
   - `409` → `ConflictError` → wired but **unused** (reserved for Phase 2 duplicate rules, per ADR-003 territory)
   - `500` → sanitized message, full trace logged internally. TS: error-handler fallback branch; PY: universal `exception_handler(Exception)` with `exc_info` logging.
2. **Validation** — passports inspected at the door, before anyone enters:
   - TS: `zod@4.4.3` + `fastify-type-provider-zod@7.0.0` (new deps), per-route `{ body, params, response }` schemas, compilers set globally. `types.ts` interfaces kept in parallel.
   - PY: Pydantic Create/Update models with `min_length=3`, status enum validator; PATCH uses `model_dump(exclude_unset=True)` + repository-level `None` filtering for partial updates.
3. **DB-level cascade** — demolition by physics, not by work order. `ON DELETE CASCADE` on both FKs in both schemas — TS: `references(..., { onDelete: 'cascade' })` in `db.ts`; PY: `ForeignKey(..., ondelete='cascade')` in `models.py`. Repositories stay single-table deletes.
4. **Deviation from roadmap (recorded)**: the blueprint said a bare shell, and we built the doors anyway — the "thin" bar was consciously exceeded. Field validation and semantic error messages are the day's learning deliverables. The CRUD *routes* themselves still have no transaction logic, keeping close to thin.

## Consequences

**Positive**:
- One bell tone: one error shape across both languages — same client code works against `:8000` (Fastify) and `:8001` (FastAPI)
- The desk points at the exact broken window: field-level 400 details support Linear-style form error UX already
- Demolition by physics: cascade lives in the database — repositories never enumerate children, no multi-statement deletes, no application-level transaction yet
- The front desk swallows the panic: an *uncaught* framework/ORM error can never leak internals (PY logs `exc_info`, returns opaque 500)
- An empty office with the phone already installed: `ConflictError` is pre-wired for Phase 2

**Negative**:
- **The front desk smooths out the screams** (bug-swallowing 500s): PY's universal `Exception` handler means a pure Python bug (e.g., the `{id}` NameError latent in `create_issues` message f-string) surfaces as a generic 500, not a crash. Same for TS. Debugging from the client is guesswork; only the server log reveals the truth.
- **The recipe card and the menu are printed separately** (duplicated types in TS): `types.ts` interfaces exist in parallel with Zod schemas in `server.ts` — the two can drift.
- **Some doors check the guest list, the front desk doesn't** (parent validation is inconsistent): PY `create_issues` checks the parent exists (but the bug above), while no TS route and PY `create_project` check — a bad `workspace_id` hits the FK constraint and becomes a 500, not a 404.
- **Tape over the crack** (non-null assertions): `updatedWorkspace!` papers over `find-then-update` races that can't actually happen today (single request) but will in concurrency.
- **A first-time housebuilder can't renovate** (PY `create_all()` cannot apply the new FK constraint to Day 3's existing tables) — cascade is silently not in effect on the Python side until the DB is rebuilt.

**Mitigation**:
- Raze the block and rebuild the house (`docker compose down -v` → `up -d`) so both tracks' cascade constraints are live; `pnpm db:push` is the TS side getting the renovation.
- Teach the front desk the residents' names (Day 4.5/Deepening 1): map FK `IntegrityError` → 404 with the *parent's* name in the message; fix the `create_issues` NameError and the `"q"` typo in `delete_issues`.
- Remove the private phones (Deepening 1): delete the now-redundant per-route try/catch — the global handler covers everything; routes only keep the 404-after-fetch.
- Print the menu from the recipe card (Phase 2): derive TS interfaces via `z.infer` to kill the `types.ts` duplication.

**Deprecation/Upgrade**:
- The old doorman is being retired: PY `@app.on_event("startup")` → FastAPI `lifespan` context manager (deprecation warning already emitted; deferred, per rule 8)
- The building code moves into the blueprint: schema strategy stays ADR-005 (`db:push` / `create_all`); cascade is now expressed *in the schema*, so it survives strategy swaps
- The phone in the empty office stays unhooked until a caller appears: `ConflictError` handler stays until Phase 2 duplicate rules exist

## References

- Roadmap v4 Sprint 1, Day 4 ("CRUD operations — no transactions, thin") and Day 3 note preview (cascade + validation watch-outs)
- ADR-001 (dual-language track), ADR-005 (PostgreSQL + ORM)
- OSS: Linear (form-level 400 details), Ghost (mutation structure), Plane (REST error envelope)
- Fastify `setErrorHandler` + `fastify-type-provider-zod`; FastAPI `app.exception_handler`
