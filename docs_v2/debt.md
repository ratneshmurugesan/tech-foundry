# Debt ledger — the *single* source of truth for deferred work

> Every ADR / note / prompt that defers something writes **one row here** and *links* it —
> it never re-states the due date (ADR-013, rule 1).
> **Statuses**: `open` → `claimed(day-N)` → `done` (link note) / `dropped` (link ADR + why).
> *Unowed* rows carry a concrete **revisit-when**, never a date — dates lie; triggers don't.
> **Prune on close**: when a row flips to `done` or `dropped`, remove it from this table (its resolution lives in the note/ADR it links). The ledger holds *open* work only.

| Debt | Deferred on | Why deferred | Owed to | Status |
|------|-------------|--------------|---------|--------|
| **14a** — the ADR-008 live-URL banner for the README | day-8 (Auth0) | day was the door, not the docs | the next README EOD touch | `open` — one line, still unclaimed |
| **16a** — live Razorpay round-trip (a real `rzp_test_` order + webhook against a running env) | day-15 (ADR-014) | needs the key in a running env (ADR-010 keeps CI key-less) | the first real charge | `open` — a local bar, not a CI test |
| **16c** — idempotent checkout: `mint_plan`/`mintPlan` re-points an existing `trial` plan at the new order instead of inserting a 2nd row | day-16 (ADR-015) | a workspace that checks out twice has two `trial` rows, so manual `verify` 400s on the newer order | a workspace observed with >1 plan row, or the first real double-checkout in prod | `open` — the day-16 first-row fix stops the 500; this removes the duplicate rows |


**Format for every new row** (one line, no more): `**id** — what | deferred-on (day+ADR) | why (one clause) | owed-to (a roadmap *row* or a trigger — never a date) | status`.

---
*Lineage note:* 2026-10-19 cleanup — 8 closed/dropped rows (6d, 6e, 11a, 11b, 11c, 12a→12e, 14b, 15a) removed; their resolution is recorded in the day notes and ADRs they link. 2026-10-22 — **16b** (webhook-driven plan transitions) closed by day-16 / ADR-015 (the state machine is fully wired; the *live* remainder folds into 16a, which already names the webhook). 2026-11-01 — **16c** (idempotent checkout) opened: the day-16 first-row fix stops the verify 500 but leaves duplicate `trial` rows, so a re-checkout can still 400 the manual `verify`. 3 open rows remain, **none carry a due date**.
