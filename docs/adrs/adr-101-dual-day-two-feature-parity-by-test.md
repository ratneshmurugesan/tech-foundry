# ADR-101: A dual day ships ≤ 2 features, and parity is proven by a test

> **Series**: ADRs in the **1xx range are process / method** decisions (how we work); `0xx` stays with technical decisions the roadmap owns. **This is the first 1xx ADR.** (Day-12's live-Razorpay debt keeps 013 — no collision.)

**Status**: Active (written in ADR-lite — the first) · **Date**: 2026-10-03
**Deciders**: user + AI · **Supersedes**: the standing "1 feature per dual day" DoD carried in the day prompts (referenced via ADR-007's *unified-DoD*). **ADR-007's error-contract Decision is untouched.**

## Picture

The chit is the slip the kitchen fills to swear a plate is done. The dual-day plan quietly piled **six dishes on one ticket** — the *entire* authorization layer (authorizer + the role ladder + the `workspace_members` table + list-scoping, dual-track). So every shift the kitchen cooked all six, then **spent its overflow *re-proving* all six by hand — after the fact.** This ADR tightens the chit and moves the proof to *the pass.*

## Decision (one policy, four facets)

1. **WIP ≤ 2.** A session ships *at most two* shippable features. A *feature* = **one decision, applied in both kitchens, each with its test.** Hard cap (kanban WIP limit): the roadmap's next row is a *later day*, never a later *part of today.*
2. **Parity by test.** "The two kitchens agree" is proven by a **shared golden-fixture test** — the *same* request asserts the *same* response in both — so a divergence turns the fast, doorless suite **red on the first pass.** This **replaces the parity wall's hand-reading**, which is exactly what *missed* the TS-scope leak (the day-10 finding (a)). Pull: **Discourse TurboTests** (always-green, local, fast) + **Pact / consumer-driven contracts.**
3. **Budgeted doorless tax.** The un-CI-able 403s (the ADR-012 cellar-less invariant) carry a named **`doorless tax:`** line in the DoD; the *fast* layer carries the load, a *hand-picked* local smoke covers the badged tail. The long tail is **expected, never discovered** — it stops costing a *de-couple* at closeout.
4. **ADR-lite.** A routine dual-track learning day closes with the *lighter* ADR (in `TEMPLATE.md`); the full ADR template is reserved for a rare hard call (the ADR-012 shape).

## The bar (a session is **done** when)

```
≤ 2 features   and, EACH:   [TS test green] ∧ [PY test green] ∧ doorless ∧ one decision
∧ parity attested by a TEST (not by reading one kitchen into the other)
∧ a doorless-tax line if any security change
∧ 1 note ∧ 1 ADR-lite ∧ 1 next-prompt   +   2 commits (code / docs)
```

## Two kitchens

TS + PY both assert the **same golden fixture.** The fixture lives in each track's `tests/` (`tests/golden/<feature>.json`), git-tracked, kept byte-identical by a `scripts/` sync step — shared by *convention*, not by cross-kitchen import.

## OSS pull

**Plane** ships *one module per PR* (thin vertical slice) · **Discourse TurboTests** (the suite must *always* pass, off-grid, fast) · **Frappe** (a feature is a pluggable *seam*, swappable without a rewrite) · **pairing** (human = the *decision*, made once; machine = the *application*, 2× — the *mechanical* half the AI does in one pass, then the contract test closes parity).

## Cut & debt

**Kept the two habits the audit *proved* were working** and sharpened them instead of discarding: the **reader/authorizer split** (the authorizer is a pure function → 5 s offline) and the **parity wall as a *guard*** (it *caught* a real cross-workspace leak) — ADR-101 makes that guard *cheap* (WIP-2 + parity-by-test). **Carries forward:** the golden-fixture harness is **day-12 Task A.0** (the next prompt stands it up first).
