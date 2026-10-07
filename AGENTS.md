<!-- AGENTS.md — session-start pointer. AI tooling (Claude Code / Codex / Copilot) auto-loads this.
     House law (ADR-013): it POINTS to the docs; it never re-states them — one debt, one row,
     one summary, one manifest, all derived. -->

# Tech Foundry — before touching anything, read, in this order:

1. `docs/prompts/master.md` — the **18 standing rules** (house law, any session).
2. `docs_v2/llms.txt` → `## NOW` — where we are *right now* (derived: last day, branch, open debts, next).
3. `docs_v2/debt.md` — what's owed and to which *trigger* (one row per debt; never a date).
4. *Then* the code: `apps/taskflow/py/` (FastAPI kitchen) + `apps/taskflow/ts/` (Fastify/Hono kitchen) — **never** share code across the kitchens (the parity wall, ADR-001; the golden matrix in `py/tests/` is the parity source of truth).

**The v1 plan** lives at `docs/roadmaps/v4/master.md` (§1–§15: phases, stacks, OSS map) — v1-era history; read for *plan shape* only. For *current position*, `## NOW` is authoritative (v1's §16 froze at "through Day 8-9"). `docs/` is read-only from the v2 era on (ADR-013).

**Invariants no single doc owns** (kept to ≤4 lines; the owner is named):
- Docs and code disagree → **code wins**; then fix the doc the same day. *(owner: ADR-013 — docs are derived from code; no ADR owns this line yet)*
- A due date without a trigger is a lie — the ledger holds triggers, not dates. *(owner: `docs_v2/debt.md`)*
- `docs/scraps/` is a tomb — never read or cite from it. *(rule 15)*
- Stage, show the diff, propose the message — **never `git commit`**. *(rule 13)*

**Glossary** (rule 16's restaurant): kitchen = a language track · door = Auth0 · cellar = Postgres · cashier = Razorpay · badge = JWT · golden matrix = the test both kitchens must pass.

*Promotion: this file → repo root. It is the thing a new agent session reads first, every day, for free.*
