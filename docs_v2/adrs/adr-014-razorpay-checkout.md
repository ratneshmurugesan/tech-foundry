# ADR-014 — Razorpay checkout: the counter gets a cashier, the ledger gets a plan, the two roles learn their prices

**Status:** Active
**Date:** 2026-10-15
**Deciders:** Ratnesh
**Supersedes:** — (builds on ADR-011 door, ADR-012 key-ring, ADR-007 receptionist, ADR-003 ticket numbers)
**Related:** [ADR-011](../../docs/adrs/adr-011-auth0-badge-reader.md) · [ADR-012](../../docs/adrs/adr-012-workspace-ownership-rbac.md) · [ADR-007](../../docs/adrs/adr-007-crud-error-contract-cascade.md) · [ADR-003](../../docs/adrs/adr-003-id-generation-strategy.md) · [day-15 note](../notes/day-15-razorpay-checkout-2026-10-18-1921.md)

## Context

The restaurant already has a back-of-house door (ADR-011) and a key-ring that decides
who may do what in each room (ADR-012). It has a price on the wall — `workspaces.plan_tier`
(`free` / `starter`) — but nothing reads that price to change behaviour. A customer who
pays has no way to pay, and the moment they did, the two roles on the key-ring would
still mean the same thing whether or not money had moved.

This ADR adds the **cashier** (Razorpay) above the door and key-ring, a **ledger** that
records each customer's subscription lifecycle, and the one line that ties the price to
the key-ring: *the moment a payer exists, the two roles become the two products.*

## Decision

### 1. The cashier sits above the door and key-ring — it reuses their `sub`

The two billing routes (`POST /workspaces/{id}/billing/checkout`, `POST /workspaces/{id}/billing/verify`)
are gated by the existing ADR-012 authorizer to **owner only**. A stranger is stopped at
the door (401, ADR-011) and a non-owner before any money moves (403, ADR-012). The door,
the key-ring, the 401/403 contracts, and the lighthouse set are **untouched** — the
cashier stands in line behind them, not beside them.

### 2. One plan row per workspace — a ledger, not a price tag

A new `plans` table (both kitchens) records the **subscription lifecycle**; the existing
`workspaces.plan_tier` column keeps the **tier**. They are distinct: *tier = what you
bought* (`free`/`starter`), *state = where the subscription is in its life*.

`plans` columns: `id` (uuid, ours — ADR-003), `workspace_id` (FK, **UNIQUE** — one plan
per workspace), `state` (`trial`/`active`/`past_due`/`canceled`, a CHECK constraint — not
a DB enum, ADR-011 parity), `razorpay_order_id` (**a string, not a uuid** — the one honest
exception to ADR-003: Razorpay's id belongs to Razorpay, we only record it), `created_at`.

### 3. The state machine is pure — the unit-testable heart

`transition(state, event)` is a pure function (no network, no cellar). **Wired today:**
`trial → active` (via a *verified* payment). **Named but not wired today** (the webhook
day): `active → past_due`, `past_due → active`, `any → canceled`. `canceled` is terminal.
The pure function is the seam both kitchens' tests drive, cellars apart.

### 4. The signature verify is the one real-code seam — real, on both tracks

`verify_signature(order_id, payment_id, amount, secret, signature)` recomputes Razorpay's
client-side payment signature — `HMAC_SHA256(f"{order_id}|{payment_id}", key_secret)` —
and compares in constant time. This is the day's one genuinely-new real function, like the
day-08 JWKS reader. On a match the plan goes `trial → active` and `workspaces.plan_tier`
becomes `starter`; on a mismatch the route returns **`400 VerificationError`**
(`"payment signature did not verify"`).

### 5. The plan→role link — a derived privilege, not a third role

The authorizer's ladder check gains **one input** (the workspace's `plan_tier`) to lift a
`member`'s *effective* rank: on `free` a member is read-only; on `starter` a member may
write. It is a **derived privilege from the tier, not a third role row** — the ladder stays
`member < owner`, and the lift lives *inside* `assert_role`/`assertRole` so the
pure-function shape survives. No third role is invented.

### 6. Fail-closed when unkeyed — never mint a fake paid plan

When `RAZORPAY_KEY_ID` is absent, both routes return **`503 ServiceUnavailable`**
(`"Razorpay is not configured"`) — the no-key lighthouse of ADR-011, mirrored. We never
mint a fake paid plan when unkeyed.

### 7. The Razorpay dependency — REST over `fetch`, not the SDK

We call Razorpay's REST API over the existing HTTP client (`httpx` in PY, `fetch` in TS)
plus the pure `verify_signature` — **zero new dependencies**. CI stubs the same seam the
day-08 JWKS reader already stubs, so the zero-service gate (ADR-010) holds. The official
`razorpay` SDK in both tracks was rejected: a fat external the gate must fake, and two SDKs
to keep shape-parity across the parity wall (ADR-001).

## Consequences

- **Positive:** the money path is real and testable end-to-end on both kitchens with zero
  services; the price on the wall finally changes behaviour; the two roles earn their
  prices.
- **Positive:** the new `plans` table is created by `create_all` on startup — **no
  migration tool** (the app has none; the spec's "alembic/Drizzle migration" line was
  stale — code wins, ADR-013).
- **Negative / debt:** the **live Razorpay round-trip** is a named debt, not a test. The
  local happy-path needs a `rzp_test_` key (present in the gitignored local `.env`); CI
  stays key-less. *Revisit-when: the first real charge.*
- **Negative:** the plan→role lift means a `member` on a `starter` workspace passes
  owner-gated checks — a real behaviour change. It is gated on the *system-managed* tier
  (only the checkout writes it), so it cannot be self-granted.

## References

- [ADR-011](adr-011-auth0-badge-reader.md) — the door (badge reader, 6-string 401, fail-closed)
- [ADR-012](adr-012-workspace-ownership-rbac.md) — the key-ring (the `assert_role` ladder)
- [ADR-007](adr-007-crud-error-contract-cascade.md) — the receptionist (the envelope; `VerificationError` 400, `ServiceUnavailable` 503)
- [ADR-003](adr-003-id-generation-strategy.md) — the ticket numbers (we own the uuids; the one string exception)
- [day-14 note](../../docs_v2/notes/day-14-razorpay-checkout-2026-10-09-1708.md) — the `plan_tier` precondition
- [debt ledger](../../docs_v2/debt.md) — `12a→12e`
