# Day 04 — Full CRUD + Semantic Error Contract + Cascade

> Executed across Aug 19–26 (TS first, PY later). Day 3 preview committed to "12 endpoints per track, 24 total, watch out for cascade + validation". Delivered: 12 routes/track, one shared error contract, DB-level cascade, plus a deliberate deviation from the roadmap's "thin" bar (see ADR-007).

## Built

**TypeScript track** (Fastify 5 + Drizzle)

- [x] `ts/src/types.ts` — Added `Create*`/`Update*` interfaces per entity (12 total)
- [x] `ts/src/errors.ts` — New: `NotFoundError`, `ConflictError`, `DatabaseCrashError`
- [x] `ts/src/errorHandler.ts` — New: global `registerErrorHandler` — Zod 400 (with field details) → validation 400 → 404 → 409 → safe 500 (logged, sanitized)
- [x] `ts/src/server.ts` — 12 new routes (POST/GET:id/PATCH/DELETE × 3 entities) + per-route Zod schemas via `fastify-type-provider-zod`; 409 wired into workspaces POST, 404s thrown in routes; `PATCH` partial semantics
- [x] `ts/src/repository.ts` — `findAll*` list methods, `.update()/.delete()` with `.returning()`
- [x] `ts/src/db.ts` — FKs → `references(..., { onDelete: 'cascade' })` on both relations
- [x] `ts/package.json` — `zod@4.4.3`, `fastify-type-provider-zod@7.0.0`
- [x] `ts/tsconfig.json` — dropped `"*.ts"` from include (drizzle config not part of app build)

**Python track** (FastAPI + SQLAlchemy async) — mirrored the whole TS contract in `py/src/{types,errors,error_handlers,repository,server,models}.py`. `models.py` FKs gained `ondelete='cascade'`; `main.py` switched to `uvicorn.run("src.main:app", reload=True)`.

## Learned

- **Fastify 5 + Zod v4 need a version lockstep**: `@fastify/schema@v3` works with Fastify 5. `zod@^4.4.3` is the pairing.
- **The "one error contract" is worth more than it costs.** Identical 400/404/409/500 JSON on both ports means the same `curl` sequence and any client script can hit `:8000` or `:8001` unchanged. The dual-language track just earned a real parity win.
- **`PATCH` is a semantics bug magnet.** The TS `patch_project` route validated a *workspace* (not the project) before a workspace change — a copy-paste of the workspace route, force-unwrapping an optional field. Partial update on an entity with an FK is the day's core DDD-adjacent trap: "which field am I moving, and does that *destination* exist?" The answer both trackers settled on: validate the *destination*, but only when that field is actually in the payload.
- **Cascade = one line in the schema, zero lines in the service.** `{ onDelete: 'cascade' }` / `ondelete='cascade'` replaces an entire multi-statement transaction. Roadmap said "no transactions" — the database gave us the safe behavior anyway. That's the point of pushing invariants down.
- **Global exception handlers double-edged**: they make 500s safe, but they also make *your own* Python bugs (NameError, NoneType) look like "something unexpected". The server log is the only truth.
- **`ON DELETE CASCADE` requires the constraint to exist in the live DB.** PY's `Base.metadata.create_all()` *creates* tables but does not *alter* existing `FOREIGN KEY` constraints — Day 3's tables keep the old non-cascade FK until the DB is rebuilt. Drizzle's `db:push` does reconcile DDL. This is a concrete ADR-005 negative, now with real teeth.
- **`z.infer` vs interface duplication**: TS now keeps Zod schemas (`server.ts`) *and* TS interfaces (`types.ts`) for every Create/Update/Read type. Two sources of truth. Phase 2: `export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>`.

## Broke & Fixed

| Problem | Where | Found by | Status |
|---|---|---|---|
| `create_issues` references `{id}` (not a param of this route) → NameError → swallowed 500 | `py/src/server.py` | me, Day 4 | ✅ Fixed → `{body.project_id}` (your uncommitted change) |
| `delete_projects` 0-deleted branch raised raw `Exception` → generic 500 instead of 404 | `py/src/server.py` | me, closeout re-verify | ✅ Fixed → `NotFoundError` |
| `create_projects` had no workspace parent check (a bad `workspace_id` 500s on FK blow-up, not 404) | `py/src/server.py` | me, closeout re-verify | ✅ Fixed — explicit lookup → 404 |
| `patch_projects` never validated a *new* `workspace_id` | `py/src/server.py` | me, closeout re-verify | ✅ Fixed — validates destination only when present in body |
| `delete_issues` 404 message contained the `"q"` placeholder | `py/src/server.py` | me, Day 4 | ✅ Fixed — now renders `Issue with ID {id}` |
| TS `patch_project` validated the *workspace* (wrong resource) and force-unwrapped the optional `workspace_id!` | `ts/src/server.ts` | me, Day 4 | ✅ Fixed — validates only when `workspace_id` is in the body, and reports the right entity |
| 2 of my original flags were **false positives** — `update_workspace` and the project routes *do* take `id` as a route param, so those f-strings were always bound | `py/src/server.py` | self-correction | ⚑ Retracted after diffing against git |
| Cascade FK not applied to existing Py tables (`create_all` doesn't ALTER) | `py/src/db.py` | Day 3 | ✅ Closed — DB rebuilt (`down -v` → `up -d`), cascade verified live on PY (checks 11+12) |
| 409 `ConflictError` unused (no duplicate rule defined) | both | — | ⚪ Intentional (Phase 2) |
| `@app.on_event` deprecation | `py/src/server.py` | — | ⚪ Deferred (lifespan, Phase 2) |
| TS `create_project` had no workspace parent check — a bad `workspace_id` hit the FK, got sanitized to a bare 500 (PY already 404s); TS `create_issue` had the same gap for `project_id` | `ts/src/server.ts` | me, final matrix run vs the now-correct PY | ✅ Fixed — parent lookup → 404, `404` added to response schemas. Both trackers now fully symmetric |

Net of the closeout pass: **five real code bugs were fixed** (three I missed the first time — the `Exception` raise, the missing `create_projects` parent check, the missing `patch_projects` destination check — plus two retracted false positives). The global 500 handler did its job by staying silent and safe, which is exactly why these were the hard ones to surface. The final verification pass then surfaced **one more real gap on the *other* track** — the asymmetry audit was exactly worth it — and the only open item left, the **DB rebuild**, is now closed and verified (below).

## Blocked / Deferred

- ~~**DB rebuild** to activate PY cascade + apply FKs (`docker compose down -v` → `up -d`)~~ — **DONE** (2026-08-26, closeout): rebuilt, both servers restarted, cascade verified live on both ports.
- The code-bug list above is **fully closed** as of the final verification pass; **nothing is open going into Day 5.**
- **Docker Compose for the app** is Day 5 — DB already has one (ADR-006). The live DB now genuinely cascades, so what we box is what we tested.
- `uvicorn --reload` watching `src` can crash on the mid-edit save of a big rewrite; use restarts for big changes. (The TS `tsx` track has *no* reload — after any `ts/src/*` edit, Ctrl-C + re-run `pnpm dev` or the running process is stale; the final matrix run caught a stale TS process once, which is exactly what 500-vs-404 drift looks like.)

## Commands Run

```bash
# Day 3 → Day 4 setup (rebuild to get cascade + fresh FKs)
docker compose down -v
docker compose up -d
pnpm db:push                       # applies TS cascade DDL
docker compose exec -T postgres psql -U postgres -d taskflow -c '\d projects'   # confirm ON DELETE CASCADE
```

```bash
# TS track (port 8000)
cd apps/taskflow/ts
pnpm install                       # zod + fastify-type-provider-zod
pnpm dev
```

```bash
# PY track (port 8001)
cd apps/taskflow/py
uv sync
uv run python -m src.main
```

**The 4-step verification (roadmap Day 4 "Verify")** — run against BOTH `:8000` and `:8001`:

```bash
# 1) create workspace
WS=$(curl -s -X POST localhost:8000/workspaces -H 'content-type: application/json' -d '{"name":"Acme"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
# 2) create project in it
PJ=$(curl -s -X POST localhost:8000/projects -H 'content-type: application/json' -d "{\"workspace_id\":\"$WS\",\"name\":\"API\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
# 3) create issue under it
IS=$(curl -s -X POST localhost:8000/issues -H 'content-type: application/json' -d "{\"project_id\":\"$PJ\",\"title\":\"Build login\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
# 4) update issue status
curl -s -X PATCH localhost:8000/issues/$IS -H 'content-type: application/json' -d '{"status":"closed"}'

# Cascade proof (Day 3 preview promise): delete workspace, children vanish
curl -s -X DELETE localhost:8000/workspaces/$WS   # expect 204
curl -s localhost:8000/projects                    # expect NOT to contain $PJ
curl -s localhost:8000/issues                     # expect NOT to contain $IS

# Error contract spot-checks
curl -s -X POST localhost:8000/workspaces -H 'content-type: application/json' -d '{"name":"x"}'   # 400 Bad Request + field detail (min_length 3)
curl -s localhost:8000/projects/00000000-0000-0000-0000-000000000000                              # 404 Not Found
```

**Expected end state**: workspace → project → issue created, issue updated, workspace delete cascates; 400/404 shapes identical on both ports. (Post-fix: the create-issue 500 is gone on PY 8001 — it is now a proper 201, matching TS 8000. The 500-sanitization lesson remains true: *when* a server-internal bug occurs, the client sees the generic envelope, never the traceback.)

### Session operations record (08-21 → 08-24 terminal history)

Pre-smoke-test sessions, reconstructed to keep the lessons out of scrollback:

- **Manual error probing (08-21, pre-fix)**: bad payloads hand-run before the contract existed — issue POST with `name` instead of `title` (the real create-issue bug), an unquoted `"status: "open"` (malformed-JSON typo), nonexistent + empty `workspace_id`, trailing-slash `GET /workspaces/`. These are exactly the cases checks 02–05 of the smoke test formalize; the 500s seen then are the pre-fix baseline the closeout proved gone.
- **Boot order** (repeated across 08-21/22/24): `docker compose up` → `pnpm db:push` → `pnpm dev` / `uv run python -m src.main` → verify GET. Mystery 500s after schema edits traced to a stale *DB* (push never ran) or a stale *process* (TS has no hot reload) — both look identical from the client. Rule: after any schema edit, `db:push` before starting the app.
- **TS reset saga (08-24)**: `npm drizzle-kit drop` → no such command; `pnpm db:drop` → no such script. Working reset: temp drizzle config w/ empty table list + `push --force` → `rm -rf drizzle/` → `pnpm db:push`. Recipe recorded in ADR-005 Field Notes.
- **`drizzle/` journal gitignored** today — push snapshots regenerate from `src/db.ts`.
- **Volume truth (correction in ADR-006)**: plain `docker compose down` kept data (postgres image's anonymous volume); only `down -v` wiped it. The ADR-006 "data is lost on down" line was wrong in both directions.

## ADRs Created

- **ADR-007** — `docs/adrs/adr-007-crud-error-contract-cascade.md` (CRUD layer: semantic error contract + DB cascade + roadmap "thin" deviation)

## Preview: Day 5 — Docker Compose

Roadmap: "Docker Compose — single service + Postgres; `docker compose up` starts everything."

- **Reference**: Streamlit Dockerfile + `uv` integration (~30 min)
- **Build**: `apps/taskflow/docker-compose.yml` → add the app service next to the existing Postgres (ADR-006); thin `Dockerfile` per track (`node:20` / `python:3.12`)
- **Concept**: containerizing *your* app vs the DB; healthchecks (`curl localhost:3000/workspaces`); env via compose (`DATABASE_URL`)
- **Dual-language**: two app services (`taskflow-ts:8000`, `taskflow-py:8001`) sharing the one Postgres
- **Watch out for**: switch the implicit anonymous volume to a **named volume** in compose — the session history shows data silently surviving `down` (and the reset recipe depending on it); when the app services join, the lifecycle must be explicit. Also: the stable boot order is `up` → `db:push` → app (ADR-006 Field Notes).
- ~~**Watch out for**: the cascade FK still needs a live DB rebuild~~ — **done and verified** (see Closeout below). The live DB genuinely cascades now, so what we box is what we tested.

**Day 5 is "it runs in a box". Day 4 was "it has correct behavior + a contract." Order matters: fix Day 4's red flags, then box Day 5.**

## Closeout — Final Verification (2026-08-26 18:00)

DB rebuilt (`down -v` → `up -d`), `pnpm db:push` re-applied, both servers restarted. The full matrix below was run against **both live servers** and is now a durable, re-runnable artifact under the new `smoke_tests/` convention: `apps/taskflow/smoke_tests/smoke_test_day_04-error-contract.sh` (per-day naming; see `smoke_tests/README.md`; `$1`/`$2` = TS/PY base URLs, defaults `:8000`/`:8001`, exits non-zero on any failure).

```
TS :8000   01 201✓  02 400✓  03 404✓  04 404✓  05 404✓  06 201✓  07 404✓
           08 200✓  09b 404✓  09 201✓  10 204✓  11 cascade✓  12 cascade✓
PY :8001   identical: all 13 checks PASS

=== ALL CHECKS PASSED on both servers ===   (26/26)
```

- 01–04: validation + missing-resource shape, both ports, byte-level status parity.
- 05/07/09b: the three parent-reference fixes — missing `workspace_id` on create, missing *destination* workspace on PATCH, missing `project_id` on issue create → clean 404s, neither port sanitizes into 500 anymore.
- 08: PATCH name-only (no FK field in body) is a 200 — the destination check correctly skips fields it isn't moving.
- 10–12: the day's actual point — delete workspace → 204, and its projects **and the child issue** are gone on **both** tracks. PY's cascade is now genuinely verified (the earlier "pass" was a harness artifact: my truncation clobbered the `jq` `.id` extraction, so the witness issue never existed — the *fixed* harness proves it).

**Day 4 is done.** Contract, cascade, and both tracks' quirks are all closed out. Nothing open going into Day 5.
