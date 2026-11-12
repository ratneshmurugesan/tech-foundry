# Day 20 (2026-11-12) — parity hardening: the lighthouse lands, the 409 string is pinned

**Built** (2 features, both kitchens, each with its test):

- **A — the 409 string is now a pinned contract.** Fixed the PY `ConflictError` default typo
  (`"Resource already exisits"` → `"Resource already exists"`) and added a golden-matrix test
  asserting the *exact* string in **both** kitchens (`py/tests/test_errors.py` +
  `ts/tests/errors.test.ts`). A future re-typo in either kitchen turns the fast suite red.
- **B — the lighthouse is real.** Registered the `/health` route in both kitchens. It was a
  *ghost*: present in `PUBLIC_PATHS` and documented in ADR-006/011, but never wired into the
  server. Both now answer `200 {"status":"ok"}` with no badge (the door + key-ring both skip
  public paths); tested in `py/tests/test_health.py` + `ts/tests/health.test.ts`.

**Found while working → debt, not fixed today (rule 18, ≤2 features):**

- **20a** — the members-POST route is a *real* parity crack: PY invites `body.user_id`+`role`
  (409 on duplicate); TS invites the caller's `sub`, no role, no duplicate check. Silent in the
  golden matrix (it exercises read/list routes, not this write path).
- **20b** — ADR-006 says the compose healthcheck probes `/health`; the actual compose probes `/`
  (root) for both kitchens. Docs and code disagree on the liveness target.
- **20c** — TS `plan_tier` is a plain `string`; PY is a `Literal("free","starter")`. A third tier
  added to the PY `Literal` is a compile error there but silently accepted in TS.

**Baselines:** PY **69** (67+2) · TS **80** (78+2) · `tsc --noEmit` clean. (The pre-change TS
baseline was 78, not the 79 the day-18 lineage recalled — one test had drifted out since.)

**Next owed to:** **20a** — the members-POST parity crack is the one finding that's a real
wire-level divergence in a *shipped* route, so it leads. Then the Make-it-Right arc
(multi-tenant RLS, K3s/Helm/GitOps) per build ledger §5.
