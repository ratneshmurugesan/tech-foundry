# ADR-010: CI's Zero-Service Test Boundary (Doorless, DB-Free)

**Status**: **Active** | Supersedes: None (extends ADR-008's doorless policy to the CI surface; asserts ADR-007's error contract in CI) | Date: 2026-09-15

---

## Context

CI is the first place the house runs with **no human in the room**, so it must run against **zero external services**. The v1 stack behind the counter is **real Postgres** (ADR-005) and the compose is already **doorless** (ADR-008: no public ports); the one shape the house has been *closing* is a service a test must be *behind*. The day-7 note also told a slightly false story — it cited the **dead** ADR-002 in-memory repository and said gated tests are "skipped"; neither is true. This ADR sets the real boundary.

---

## Decision

1. **CI runs zero external services.** `ci.yml` opens no `services:` block and no doors — it extends ADR-008's doorless policy from the compose world onto the test surface itself (free, portable, and it can't rot on a dead service; a red is a *real* red).
2. **The v1 suites are DB-free by construction — no test is skipped, and there is no in-memory repository.** ADR-005 (real Postgres) is not gated out; it is simply *not required* by the surface CI guards:
   - **PY** — `tests/conftest.py` points the app at an **unroutable** loopback (`127.0.0.1:9`, never-listening) *before* importing it, then runs in-process over `httpx`'s `ASGITransport`. The repo-touching test (`GET /workspaces`) **expects** the refused connection → `DatabaseCrashError` → the ADR-007 **hidden 500**; the health/400/404 and `ids` tests need no DB at all. So the **error contract is proven deterministically with no live database**.
   - **TS** — `postgres()` is lazy: `initDb()` lives in `main.ts` and is *not* imported by tests, so `getDb()` throws; the contract test treats that throw as the **expected** 500, and the error-class, `ids`, Zod, health, and 400 tests are pure.
3. **Both kitchens prove the same contract shape, by different mechanisms** (ADR-001: *same concepts, not the same test count*). PY proves the hidden-500 via an unroutable-URL connection *failure*; TS proves the *identical* 500 via the `getDb()` guard.
4. **Real Postgres round-trips are deferred to Phase 2 "make it right"** (the roadmap's Week-7/8 "Database testing" bar). Until then CI guards the **smoke surface** — health, validation (400), IDs, and the error-contract envelope — on *both* tracks; 6 (PY) / 10 (TS) tests, **0 skipped**, green in 0.02–0.3 s.

---

## Consequences

- ✅ **Guarded for free, forever:** the ADR-007 hidden-500 + the 400 envelope are *asserted in CI*, not just documented — on both kitchens.
- ✅ **Zero rot surface:** no service lifecycle, no `uv`/postgres version coupling inside the runner; the pnpm supply-chain pin (day-7) is the only moving part.
- ❌ **CI does not yet prove real data flows.** "The deploy works" is a *smoke* bar, not a *data* bar — the named Phase-2 gap.
- ❌ The two tracks stay **honest-asymmetric** (ADR-001): same contract-shape, different mechanism and different test count (6 vs 10); never silently pretend the counts match.
- **Corrects the day-07 note:** drop the **dead** ADR-002 reference and the "skipped" wording; the real mechanism is doorless (ADR-008) + unroutable-DB in-process tests, with **nothing skipped**.

---

**Created 2026-09-15** during Day 7 (CI + tests + the pnpm supply-chain wall) — Day 12 of the Foundry. See `docs/notes/day-07-ci-2026-09-15-1151.md` (note), `.github/workflows/ci.yml`, `apps/taskflow/py/tests/conftest.py`, `apps/taskflow/ts/tests/`. Supersedes none; extends ADR-008 (doorless) onto CI and asserts ADR-007 (error contract) there; amends the CI/test surface only. Referenced by ADR-011 (next).
