# TaskFlow — Build

> **Status**: Draft · **Date**: 2026-10-10 · **Owner**: user + AI · **App**: #1 of the foundry
> **The ledger** — how we build it + prove it's right. *This* doc drives the roadmap (state + sequence).
> **Companion**: `taskflow-product.md` — the *spec* (what it is, who it's for, why it feels good). Read that first for the *why*; this is the *how*.
> **Grounded in**: `apps/taskflow/py/` + `apps/taskflow/ts/` (the two kitchens), `docs_v2/debt.md` (what's owed), `docs/roadmaps/v4/master.md` §16 (current position)
> **House rule honored**: where this doc and the code disagree, **the code wins** — then fix the doc the same day (ADR-013).

---

## 1. The access story (the load-bearing part)

Three layers, in order. **A request must clear all three.** *(Grounded in `auth.py`/`authorize.py` + the TS twins.)*

### 1.1 The door — Auth0 badge reader (ADR-011)
- One **global** choke point (a single door, not per-room doors).
- Verifies the JWT against the tenant's **JWKS** (cached; re-fetches *exactly once* on an unknown `kid`).
- **Fail-closed**: any verification problem → `401`, never a silent pass.
- **Doorless mode**: if `AUTH0_DOMAIN` is unset, the door opens (local dev / CI).
- **Six fixed 401 strings** (the contract; identical on both kitchens): `No token provided`, `Malformed token`, `Token expired`, `Wrong audience`, `Wrong issuer`, `Signature verification failed`.
- **Tenant allowlist**: a per-request `x-tenant-domain` override is untrusted input — a stranger tenant fails closed.

### 1.2 The key-ring — RBAC authorizer (ADR-012)
- **Two roles, rank-ordered**: `member` (rank 1) < `owner` (rank 2). A *ladder*, so a third role can slot in later without reshaping the logic.
- **One pure decision function** (`assert_role`) — no HTTP, no session of its own; the caller hands it the single membership read. This is the unit-test seam (cellars apart).
- **Two fixed 403 strings** (the contract; identical on both kitchens): `Not a member of this workspace`, `Requires the owner role`.
- **Middleware-only enforcement** — the routes stay clean; the *shape* of enforcement is decided in one place.

### 1.3 The gate table (what each route requires)

| Route | Method | Minimum role | Notes |
|---|---|---|---|
| `/` | GET | public | lighthouse / health |
| `/workspaces` | GET | — (scoped) | returns **only the caller's** workspaces |
| `/workspaces` | POST | — (creator) | creator is **minted `owner`** in one transaction |
| `/workspaces/{id}` | GET | member | |
| `/workspaces/{id}` | PATCH | owner | |
| `/workspaces/{id}` | DELETE | owner | cascades |
| `/workspaces/{id}/members` | POST | owner | invite; `409` if already a member |
| `/workspaces/{id}/members` | GET | member | empty list = `200 []`; missing workspace = `404` |
| `/projects` | GET | — (scoped) | **only the caller's** projects (walks `project → workspace`) |
| `/projects/{id}` | GET | member | |
| `/projects/{id}` | PATCH | owner | moving to another workspace must name an existing one |
| `/projects/{id}` | DELETE | owner | |
| `/issues` | GET | — (scoped) | **only the caller's** issues (walks `issue → project → workspace`) |
| `/issues/{id}` | GET | member | |
| `/issues/{id}` | PATCH | owner | |
| `/issues/{id}` | DELETE | owner | |

> **The scoping invariant** (the day-10 finding, now a standing golden-matrix test): a *badged* user sees **only their own** workspaces/projects/issues on **both** kitchens (8000 == 8001); a *stranger with a valid badge* (a member of a *different* workspace) gets **`[]`** on all three list routes.

---

## 2. The plan & the money (the seam, and the next build)

This is where TaskFlow stops being a toy and becomes a *business*. It has two parts — **one shipped, one next.**

### 2.1 Shipped: the plan tier column
`workspaces.plan_tier` exists on **both** tracks (`free | starter`, default `free`). It is the *data* half of the story. **What it does not yet do**: nothing reads it to change behavior. The role ladder and the plan tier are *present but not yet coupled*.

### 2.2 The intent (the day-10 contract, do not lose it)
> *"the moment a payer exists, the two roles become the two products."*

- **Free tier** → a workspace's `member` is **read-only**.
- **Paid (starter) tier** → a workspace's `member` **may write**.

The RBAC layer was *built to unlock exactly this*. The next build wires **plan tier → role capability**, so the money story *compounds* instead of the two decoupling.

### 2.3 Next: the plan state machine + Razorpay checkout (debt 12a→12e)
The full subscription lifecycle, modeled on **Ghost's content-states**:

```
trial  →  active  →  past_due  →  canceled
          ↑___________|  (recovered)
```

- **Create order** → **verify payment** (Razorpay; HMAC/SHA-256 signature check — a *pure* function, faked in tests).
- **The cashier sits *above* the door and the key-ring** — it reuses the *same* `sub` the authorizer reads and the *same* ADR-012 authorizer, so a stranger is stopped at the door (`401`) and a non-owner before the money leaves (`403`). The reader, the door, the 401/403 contracts, and the lighthouse set stay **untouched**.
- **The testable core is pure** (no network, cellar): the state machine transitions + the signature verify. The *live* round-trip (real order, real webhook) is the local bar — the **named debt** class, mirroring ADR-011's live-JWKS.

---

## 3. The error contract (ADR-007)

Fixed strings, identical on both kitchens. This is a *contract* — a client can depend on the exact message.

| Status | When | Message(s) |
|---|---|---|
| `401` | door fails | the **six** strings in §1.1 |
| `403` | key-ring fails | `Not a member of this workspace` · `Requires the owner role` |
| `404` | resource absent | `… does not exist` (entity-specific) |
| `409` | duplicate | e.g. `User … is already a member of this workspace` |
| `500` | cellar crash | `Database op failed internally` (the original error is logged, never leaked) |

**Envelope shape** (both kitchens): `{"statusCode": <n>, "error": "<Name>", "message": "<fixed string>"}`.

**The dead-cellar rule** (ADR-008): a database failure is a **500 with a fixed string** — never a stack trace, never a silent empty. The cellar can die; the contract doesn't.

---

## 4. Architecture & the parity wall

The thing that makes TaskFlow *the foundry's proving ground* rather than just another CRUD app.

- **Two kitchens, one dish (ADR-001).** Python/FastAPI (`py/`) and TypeScript/Fastify+Hono (`ts/`) implement the *same* routes, *same* error strings, and — *intended* — the *same* response shapes. **Never** share code across the kitchens. (One known wire-level gap: see the callout below.)
- **The golden matrix is the source of truth for parity.** A shared fixture (same request → same response JSON) that **both** tracks assert. A drift turns the fast suite **red** — parity is *tested*, not *re-read*.
- **The cellar** (ADR-005, ADR-008): Postgres, via SQLAlchemy (PY) / Drizzle (TS). Doorless by default; the dead-cellar 500 is the contract.
- **CI ships cellar-less and key-less** (ADR-010): the *payable* and *auth* tests are the **pure** shape only (state machine, signature verify, role ladder) — no live Razorpay, no live JWKS, no Postgres in CI.
- **Deploy**: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` on a $0 Free-Tier VM (the live record is an AWS `a1`-class box, `us-east-1`).

> **⚠️ Known parity gap (found while writing this doc, 2026-10-09).** The *type-layer* golden matrix is green on both kitchens, but the *wire* layer has drifted and the matrix does not exercise it. The Python kitchen serializes its full pydantic models (a workspace → `{ id, name, plan_tier, created_at }`); the TypeScript kitchen serializes through **zod response schemas** written before `created_at` / `plan_tier` existed and never updated — `workspaceSchema` is `{ id, name }`, and `projectSchema` / `issueSchema` / `workspaceMemberSchema` all omit `created_at`. Because the app sets `setSerializerCompiler`, Fastify **strips** those fields, so the two kitchens return **different JSON** for every resource. This breaks the "byte-identical / 8000 == 8001" claim at the wire layer and is **silent in CI** (the golden matrix asserts the type *definitions*, which still agree — not the zod *serializer*). The fix is small (add `created_at` to the four zod schemas, `plan_tier` to `workspaceSchema`) but it touches the parity wall, so it is logged here and belongs in the debt ledger — until it lands, the kitchens are *type*-identical, not *wire*-identical.

```mermaid
flowchart LR
  subgraph client["Client"]
    C["browser / curl"]
  end
  subgraph kitchen["One kitchen (PY or TS) — two exist, must agree"]
    DOOR["Door<br/>Auth0 badge reader"]
    KEYS["Key-ring<br/>RBAC authorizer"]
    ROUTE["Waiter<br/>routes"]
    CHEF["Chef<br/>business logic"]
    CASH["Cashier<br/>Razorpay (next)"]
  end
  CELLAR[("Cellar<br/>Postgres")]
  C -->|Bearer jwt| DOOR --> KEYS --> ROUTE --> CHEF --> CELLAR
  ROUTE -.-> CASH
```

---

## 5. What's built vs. what's next (honest state, 2026-10-09)

| Capability | State |
|---|---|
| CRUD: workspaces, projects, issues | ✅ shipped, both kitchens |
| Auth0 door (badge reader, six 401s, fail-closed) | ✅ shipped |
| RBAC key-ring (owner/member ladder, two 403s) | ✅ shipped |
| Multi-tenant scoping (see only your own) | ✅ shipped, golden-matrix guarded |
| **Wire-level response parity** (identical JSON, both kitchens) | ⚠️ gap — TS zod schemas drop `created_at` (and `plan_tier` on workspace); silent in CI (see §4 callout) |
| Plan tier column (`free`/`starter`) | ✅ shipped (data only) |
| **Plan tier → role capability** (free=read-only, paid=write) | ⏳ next (the day-10 contract) |
| **Plan state machine** (trial→active→past_due→canceled) | ⏳ next (pure, testable) |
| **Razorpay checkout** (create order, verify payment) | ⏳ next (debt 12a→12e) |
| Webhook / subscription lifecycle (live) | ⏳ named debt (live-Razorpay class) |
| UI in a browser (Sprint 3) | ⏳ ahead |
| Multi-tenant RLS, K3s/Helm/GitOps (Make it Right) | ⏳ ahead |

---

## 6. Open questions (rule 16 — named, not assumed)

1. **Plan-tier coupling point**: does the tier gate *writes* at the **authorizer** (a third rank step) or at the **route** (a capability check)? The day-12 prompt leans *authorizer* (Decide-4) — confirm before building.
2. **Razorpay key**: does a key exist in any env you control? (The foundry does *not* create Razorpay accounts — that's your call.)
3. **Tier semantics**: is `starter` the only paid tier, or the first of a ladder? (Affects whether `plan_tier` is an enum or a rank.)
4. **Home of the spec**: resolved 2026-10-10 — the PRD was split into this file (`taskflow-build.md`, the ledger) and `taskflow-product.md` (the spec), both under `docs_v2/product/`. `docs/` is read-only v1 history, so `docs_v2/` is the home.
5. **The wire-level parity gap** (§4 callout): fix the TS zod response schemas now (add `created_at` to all four, `plan_tier` to `workspaceSchema`) and extend the golden matrix to assert the *serialized* response — or is the matrix meant to stay type-layer-only and the wire gap tracked purely in the debt ledger?
