# ADR-010: CI Ships Cellarless — the Gate Tests the Counter, Never the Cellar

**Status**: Active
**Date**: 2026-09-16
**Phase**: Phase 1 — Make It Work, Sprint 1, Day 7
**Supersedes**: None (relates to ADR-001 parity, ADR-005 Postgres ORM, ADR-007 error contract, ADR-008 doorless cellar)

## Context

The Day-7 inspector — the GitHub Actions job in `.github/workflows/ci.yml` — is supposed to visit the restaurant on every push. The question the day forced: **what part of the restaurant is the visit allowed to look at?**

The kitchens now cook against the cellar (ADR-005: `PostgresRepository`, which replaced the in-memory kitchen on Day 3), so the obvious reading was that the inspecting Python job must *bring a cellar along*. Three facts closed that reading:

1. **The v1 suite asserts on the counter, not the cellar.** Both test files exercise the *contract* surface — validation rejections (400 + `details`), static routes, and the receptionist's *no-cellar* script (the opaque 500 envelope, ADR-007). The one test that touches the cellar does so to require its **failure**: `test_db_down_maps_to_hidden_500` asserts the exact envelope emitted when the connection dies. A *healthy* cellar makes that test red.
2. **A live cellar cannot even be stood up under the visit yet.** The app creates its tables in FastAPI's startup event (`init_db()` → `create_all`); the in-process client (`httpx ASGITransport`) never fires that event. With a `services: postgres` runner service, the first query would 500 on *missing tables* — red for the very reason the service was added, plus the service's cost on top.
3. **Free-tier cost hygiene is a stated value** (the workflow's own comment on the `concurrency` cancel block). The Day-7 bar in roadmap v4 is "`pytest` + `tsc --noEmit` on push" — a gate, not a laboratory.

**Alternatives considered** (and why each failed):

- *`services: postgres` in the job* — the "obvious" CI. Fails on facts 1 and 2 above: it breaks the one deterministic 500 test, buys no data coverage, and adds an image pull and a readiness race to a gate that needs neither.
- *Skip the DB-touching tests in CI* (marker / `-m "not db"`) — saves a service we do not need by skipping the *most* valuable tests: the 500 envelope is ADR-007's entire point, and the cellar is the one subsystem the receptionist must never improvise on.
- *A shared or host-bound Postgres* — the cellar door all over again; ADR-008 bricked that door for the building, and CI is part of the building.
- **Zero-service, dead cellar** — chosen.

## Decision

1. **No database enters the gate, in either kitchen.** `test-py` = `uv sync --frozen` → `uv run pytest -q`, with **no** `services:` block (the job carries a comment in the workflow naming this ADR as the reason for the absence). `test-ts` = `pnpm install --frozen-lockfile` → `pnpm exec tsc --noEmit` → `pnpm exec vitest run`, where the suite talks to Fastify through the in-process `app.inject` — no listener, no service, same rule.
2. **The no-cellar path is made *reproducible*, not assumed.** `py/tests/conftest.py` points `DATABASE_URL` at `postgresql+asyncpg://postgres:postgres@127.0.0.1:9/taskflow` — **port 9**, IANA "discard": a port nothing on a bare runner can be listening on. The connection is *guaranteed* to be refused, so the receptionist's no-cellar script is asserted on **every** push, deterministically, forever — including after the live-cellar upgrade eventually arrives (the cellar-down state is a real production state, and its script stays pinned either way).
3. **The gate's scope is declared as contract-only.** This ADR and the Day-7 bar say the gate guards *types* (`tsc --noEmit`) and the *contract* (status codes + exact ADR-007 envelopes). It does **not** guard data behavior; that bar belongs to Phase 2 (roadmap v4: 80%+ coverage, Deepening 1).

## Consequences

**Positive**

- **The gate cannot fail environmentally.** No image pull, no readiness wait, no pool race — the flake class that makes service-backed CI flaky is absent by construction. A green run means the *code* is green; a red run means the *code* is red. And the visit is short enough that a solo dev actually waits for it.
- **The 500 script is pinned in exactly the state it would least likely be tested.** Service-backed CI exercises the *healthy* cellar; the receptionist's no-cellar script only runs when something is broken. Point the cellar pipe into a dead pit and the script runs *every* time — the one failure mode the production receptionist has no discretion over (cellar unreachable at request time) is asserted on every push.
- **Parity stays airtight (ADR-001).** Both kitchens are inspected under the *same* rule: in-process client, zero infrastructure, exact-version installs off the committed lockfiles (`uv sync --frozen` / `pnpm install --frozen-lockfile` — the lockfile is the receipt in both kitchens). The parity wall has no "but the PY job is different" seam.
- **The doorless rule (ADR-008) reaches its limit case.** A doorless cellar was about the build's host ports; a cellarless CI needs no port at all. The rule reads identically in both documents: *no host port that no runtime consumer uses*.

**Negative**

- **Data behavior is unguarded.** A regression that silently mis-saves a row or drops a cascade sails through a green gate; only the counter's scripts are policed. That is the stated price — the gate that also runs the cellar is Phase 2's job, not Day 7's (roadmap v4 Phase 1 explicitly skips test *coverage* as a quality bar, while still demanding a gate that runs).
- **One test family is welded to the gate design.** The 500 tests *require* a dead cellar; a future `services: postgres` added without re-homing those tests turns green to red for no reason. The dependency runs in both directions between gate and suite — recorded here so neither side changes blindly.
- **A `127.0.0.1:9` reads like a hack** to anyone who has not read this ADR — the exact kind of line the next person "cleans up" into a flaky 5432.

**Mitigation**

- The rationale is written **where the trick lives**: `conftest.py`'s `DATABASE_URL` line now carries a comment naming ADR-010 and the why (guaranteed connection-refused), and the `ci.yml` `test-py` job already carries the same one-liner. Temptation and explanation sit side by side — the same "comment where the door used to be" pattern ADR-008 used for the port.
- The no-DB tests are *named* as no-DB tests in their own bodies (`test_db_down_maps_to_hidden_500`; the TS inject block comments its no-DB failure surface), so the future upgrade knows which tests to re-home rather than which to delete.

**Deprecation/Upgrade**

- **The gate gains a cellar the day the suite stops being contract-only.** The trigger is the first test that asserts on *data* behavior (a save persists, a cascade fires — the data leg of ADR-007, which v1's gate deliberately does not police). That commit must bring three things *together*, or the gate goes red for no reason: (1) `services: postgres` plus a readiness wait, (2) table creation **inside the test world** — call `init_db()`/`create_all` from the fixture, because today it lives in the startup event the in-process client never fires (the load-bearing gap this ADR's cellar-less world papers over), and (3) re-homing of the no-DB tests. That is Phase 2 "make it right" work (roadmap v4, Deepening 1, Weeks 7-10) — explicitly *not* a Day 7 deliverable.
- The no-DB envelope tests **survive** that upgrade: cellar-down is a production state, and the receptionist's script for it is asserted with or without a cellar.
- **Parity watch (unresolved by this ADR, queued)**: the PY kitchen *forces* its cellar-less world with the dead port-9 URL; the TS kitchen *assumes* it (its default `DATABASE_URL` points at `localhost:5432`, where a bare `ubuntu-latest` runner happens to listen on nothing — true today, but an environmental fact, not a guarantee). The first day the TS tests change should pin TS to the same forced-dead-URL discipline, so both kitchens' 500 tests are deterministic rather than luck-based.

## References

- Roadmap v4 Day 7 row ("`pytest` + `tsc --noEmit` on push") and its "What you skip" note: Phase 1 skips unit-test *coverage* as a quality bar, but "make it work" still demands a gate that runs on push.
- `.github/workflows/ci.yml` — `test-py` step comment; `apps/taskflow/py/tests/conftest.py` — the port-9 `DATABASE_URL`; `apps/taskflow/py/tests/test_errors.py` — `test_db_down_maps_to_hidden_500`; `apps/taskflow/ts/tests/types.test.ts` — the no-DB `app.inject` contract block.
- ADR-001 (dual-language track — parity), ADR-005 (Postgres ORM — why the kitchen consumes the cellar per request), ADR-007 (error contract — the envelope asserted), ADR-008 (the doorless cellar this extends to CI).
- IANA "discard" = port 9: https://www.iana.org/assignments/service-names/service-names.xhtml — the chosen victim of the dead-cellar trick.
