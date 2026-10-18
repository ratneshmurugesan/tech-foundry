# Day 15 — Razorpay checkout (debt 12a→12e): the counter gets a cashier, the ledger gets a plan, the two roles learn their prices

> One-line: the money path goes live on both kitchens — create order → verify payment, the plan
> state machine, and the plan→role link — with the code *written and green*, not just planned.

## What shipped

- **Cashier** — `py/src/razorpay.py` + `ts/src/razorpay.ts`: `verify_signature`/`verifySignature`
  (the one real-code seam) + order-create over the existing HTTP client (REST, zero new deps — Decide-5a).
- **Ledger** — the `plans` table on both tracks (`py/src/models.py` `PaymentPlansModel`, `ts/src/db.ts`):
  `id`, `workspace_id` (UNIQUE), `state` (CHECK, 4 states), `razorpay_order_id` (string), `created_at`.
  Created by `create_all` on startup — **no migration** (the app has no migration tool; the spec's
  alembic/Drizzle line was stale — code wins, ADR-013).
- **Two routes** — `POST /workspaces/{id}/billing/checkout` (owner-only; mints a pending `trial` plan,
  no state change) + `POST /workspaces/{id}/billing/verify` (recomputes the sig; on match `trial→active`
  + `plan_tier→starter`; on mismatch `400 VerificationError`).
- **Plan→role** — the `plan_tier` input inside `assert_role`/`assertRole`: `free` member read-only,
  `starter` member may write. No third role (Decide-4).
- **Fail-closed** — unkeyed → `503 ServiceUnavailable` `"Razorpay is not configured"` (Decide-3).

## The decisions (ADR-014)

| Decide | Choice | Why |
|---|---|---|
| 5 — dep | REST over `fetch`/`httpx` + pure `verifySignature` | zero new deps; CI stubs the day-08 JWKS seam; the SDK is a fat external + two to keep parity |
| 6 — live tenant | a `rzp_test_` key is present (local `.env`, gitignored) | enables the local round-trip; CI stays key-less; live round-trip is a named debt |
| 3 — unkeyed | `503` fail-closed over a faked 201 | never mint a fake paid plan |
| 4 — plan→role | tier gates the member ladder (effective rank lift) | a derived privilege, not a third role |
| 7 — state machine | wire only `trial→active`; the rest named-not-wired | `active→past_due` / `past_due→active` / `any→canceled` ship with the webhook day |

## What I learned

- **The parity wall is where the real cost is.** The signature verify and the state machine are *pure* — but writing them twice (Python `hmac`/`hashlib` + TS `node:crypto`) and getting the two kitchens to agree on the *exact* `400` string and the *exact* state set is the actual work. The golden matrix (`test_razorpay.py` ↔ `razorpay.test.ts`) is what turns "they agree" from a hope into a *test*.
- **"Code wins" bit.** The day-12 spec said "migrations (alembic/Drizzle) for the plans table." The code has **no migration tool** — `init_db()` runs `create_all`. So the `plans` table is created on startup, no migration. I followed the code (ADR-013) and noted the divergence here rather than silently "fixing" the spec.
- **A derived privilege, not a third role.** The plan→role link (Decide-4) is *not* a new role — it's the `plan_tier` input inside the existing `assert_role` rank comparison. The key-ring's shape is untouched; the tier just lifts a free member's effective rank. That kept the ADR-012 contract (two `403` strings) byte-identical on both kitchens.
- **Zero-dep held the line.** REST over `fetch`/`httpx` + a pure `verifySignature` meant no new dependency in either kitchen, and CI stays key-less (ADR-010) — the same seam the day-08 JWKS cache used.

## What's left (the debts this day names)

- **Live Razorpay round-trip** — needs the `rzp_test_` key in a running env; a named debt in ADR-014,
  not a CI test (ADR-010 keeps CI key-less). *Revisit-when: the first real charge.*
- **Webhook-driven transitions** — `active→past_due`, `past_due→active`, `any→canceled` are named in the
  state machine but not wired; they ship with the webhook day.

## The bar (both green, zero services)

- [x] `uv run pytest -q` (PY) — green, incl. the new `test_razorpay.py`
- [x] `pnpm test` (TS) — green, incl. the new `razorpay.test.ts`
- [x] `tsc --noEmit` (TS) — clean
- [x] existing ADR-012 / ADR-007 / ADR-011 suites still green (untouched)
