# ADR-017 — Cellar RLS: the cellar locks its own shelves, the door hands it your badge

**Status:** Active
**Date:** 2026-11-19
**Deciders:** Ratnesh
**Supersedes:** — (complements ADR-012's RBAC; the app-level hook stays, the cellar gains its own lock)
**Related:** [ADR-012](../../docs/adrs/adr-012-workspace-ownership-rbac.md) · [ADR-008](../../docs/adrs/adr-008-postgres-doorless.md) · [ADR-003](../../docs/adrs/adr-003-id-generation-strategy.md) · [day-22 note](../notes/day-22-cellar-rls-2026-11-19-1346.md)

## Context

Through day-21 the restaurant trusted its *staff* to keep the shelves honest: "see only your own rows" was enforced by the app's hook (`assert_role` / `assertRole`, ADR-012) — the front of house checking the badge before the kitchen reaches for a tray. That is the right first line, but it is a *single* line: any code path that forgets to call the hook (a new route, a forgotten filter, a raw query) silently hands one tenant's rows to another. The build ledger's next row was **multi-tenant RLS** — the Make-it-Right arc's first step — and the fix is to move the lock *down into the cellar itself*, so the shelves stay honest even if the staff forgets.

## Decision

### 1. The cellar enforces isolation, not the app
Postgres **Row-Level Security** is armed on all five tables (`workspaces`, `workspace_members`, `projects`, `issues`, `payment_plans`). Each policy scopes a row to the caller's memberships. The app-level hook (ADR-012) is *kept* as the fast, friendly first line (the two `403` strings stay byte-identical); RLS is the *last* line — the same row-level guarantee the app promises, now enforced by the database.

### 2. The door stamps the badge; the session carries it
The door (`auth.py` / `auth.ts`) sets the verified `sub` into a per-request identity (PY `app_identity` contextvar · TS `AsyncLocalStorage`). The session opens with `set_config('app.current_user_id', …, false)` — session-scoped, so **every** statement in that session carries the caller's badge, and the policies read it via `app_uid()`. The app never writes `WHERE user_id = …` by hand; the row filter is a property of the connection.

### 3. A non-owner app role is what makes RLS bite
A new **`taskflow_app`** role — *not* superuser, *not* the table owner — is what both kitchens connect as. RLS binds everyone *except* the table owner, so `taskflow_app` is bound while `postgres` (superuser + owner) still bypasses for `db-push` / init / admin. That is why the tables use `ENABLE ROW LEVEL SECURITY`, **not** `FORCE` — `FORCE` would lock the owner out and break the renovator.

### 4. The `__doorless__` sentinel opens the shelves for the three callers that must
Doorless dev, the Razorpay webhook (no badge), and the **create-bootstrap** (`save_workspace_with_owner`) run under the `__doorless__` sentinel, which opens every policy. The bootstrap needs it: the workspace doesn't exist yet, so `is_member_of` is false and the `WITH CHECK` would reject both INSERTs. Fail-closed by default — an unset identity is `NULL`, and `NULL` matches no policy → **0 rows**, never a silent leak.

### 5. `ON_ERROR_STOP on` is load-bearing
A plain `psql -f` swallows errors and exits 0, so compose would believe `cellar-setup` "succeeded" with **no** policies armed. With `ON_ERROR_STOP on`, any failing statement aborts the script → non-zero exit → the apps never start against a half-locked cellar.

## Consequences

- **Positive:** isolation is now enforced *in the cellar* — a forgotten `WHERE` in a new route can no longer cross tenants; the guarantee survives the app.
- **Positive:** the app stops writing row filters by hand; the connection *is* the scope. The door already knew the badge; now the cellar does too.
- **Positive:** the owner still bypasses (`ENABLE`, not `FORCE`), so `db-push` / init / admin keep working untouched.
- **Negative:** a new DB role + a per-session `set_config` + a doorless sentinel are three new moving parts; the `__doorless__` path is a deliberate, named escape hatch that must stay small.
- **Negative / debt:** RLS is armed in dev via `cellar.sql` (a one-shot `cellar-setup` service). The Make-it-Right path (K3s/Helm/GitOps) must carry this same `cellar.sql` into the prod cellar — *revisit-when: that path lands.*

## References

- [ADR-012](../../docs/adrs/adr-012-workspace-ownership-rbac.md) — the app-level hook RLS now backs
- [ADR-008](../../docs/adrs/adr-008-postgres-doorless.md) — the doorless cellar this sentinel reuses
- [ADR-003](../../docs/adrs/adr-003-id-generation-strategy.md) — IDs are TEXT (ULID), so the helper params are `TEXT`, not `uuid`
- [cellar.sql](../../../apps/taskflow/cellar.sql) — the role, the helpers, the five policies, the arm
- [day-22 note](../notes/day-22-cellar-rls-2026-11-19-1346.md)
