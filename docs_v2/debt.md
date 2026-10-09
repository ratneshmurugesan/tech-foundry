# Debt ledger — the *single* source of truth for deferred work

> Every ADR / note / prompt that defers something writes **one row here** and *links* it —
> it never re-states the due date (ADR-013, rule 1).
> **Statuses**: `open` → `claimed(day-N)` → `done` (link note) / `dropped` (link ADR + why).
> *Unowed* rows carry a concrete **revisit-when**, never a date — dates lie; triggers don't.
> (The 11a/11b/11c dates of 2026-09-30 and the 12a–12e date of 2026-10-10 in the 2026-10-01
> rehearsal are re-anchored on 2026-10-03, day-13: day-11/12 never happened, and neither
> date was derivable — exactly the rot this file exists to stop.)

| Debt | Deferred on | Why deferred | Owed to | Status |
|------|-------------|--------------|---------|--------|
| **6d** — CI `tsc --noEmit` on the TS track | day-6 (deploy) | day was deploy | — | `dropped` — superseded by ADR-011 (CI zero-service; both tracks type-check in it) |
| **6e** — README live-URL banner | day-6 | day was deploy | — | `dropped` — the live URL *is* in the README now |
| **11a** — TS `workspaces` table | day-10 (ADR-012) | scope bleed (door + authorizer were the day) | the A.0 `get_workspaces` fixture, or the workspace-migration day — whichever turns red first | `done` — [day-10 note](../docs/notes/day-10-workspace-ownership-rbac-2026-09-29-1552.md); the TS `workspaces` table + scoped `findWorkspacesFor` list route landed day-10/11 (ADR-012); the scope leak (finding a) closed in the day-11 closeout |
| **11b** — `plan_tier` column | day-10 (ADR-012) | scope bleed | the razorpay day (needs the column to sell a plan) | `done` — [day-14 note](notes/day-14-razorpay-checkout-2026-10-09-1708.md); `plan_tier` (free / starter) landed on `workspaces` both tracks — system-managed, not on create/update; the last open precondition, so 12a→12e is unblocked |
| **11c** — `is_admin` → `role='owner'` migration | day-10 (ADR-012) | scope bleed + DDL risk | the razorpay day (same reason: 11b and 11c ship together or the checkout's roles are a lie) | `done` — [day-10 note](../docs/notes/day-10-workspace-ownership-rbac-2026-09-29-1552.md); `role` (owner/member) lives in `workspace_members` both tracks (ADR-012); no `is_admin` in the codebase |
| **12a→12e** — razorpay checkout (TS 12a/12c/12d + py 12b/12e; env, keyring, golden 15 cases, docs) | day-12 prompt (2026-10-01) | day-12 never happened; all three preconditions (11a/11b/11c) now closed — the checkout is unblocked | the roadmap's razorpay row (v4 plan said day-12–13; re-sequenced — the roadmap will say where) | `claimed` — the day-12 prompt is the *plan*; this is the *ledger* |
| **14a** — the ADR-008 live-URL banner for the README | day-8 (Auth0) | day was the door, not the docs | the next README EOD touch | `open` — one line, still unclaimed |
| **14b** — the ADR-011 live-URL banner for the README | day-8 (Auth0) | day was the door, not the docs | — | `dropped` — ADR-011 is superseded by ADR-012's door (both banners collapse into one) |


**Format for every new row** (one line, no more): `**id** — what | deferred-on (day+ADR) | why (one clause) | owed-to (a roadmap *row* or a trigger — never a date) | status`.

---
*Lineage note:* the 2026-09-30 `test_docs_v2` rehearsal draft of this file listed 19 rows; on promotion the 12a–12e block (5 rows) folded into one ledger line, and 6d/6e/14b were `dropped` per the table — 8 rows survive, **none carry a due date**.
