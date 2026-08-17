# ADR-001: Dual-Language Track (TypeScript + Python)

**Status**: Active
**Date**: 2026-08-12
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 1

## Context

The Foundry roadmap defines a solo developer building production-grade software with a 10+ year lifespan. Two languages dominate the modern web stack: TypeScript (frontend + full-stack) and Python (backend + AI/ML).

Rather than picking one and missing the other, the roadmap proposes a **dual-language track** — every concept taught twice, in both type systems.

## Decision

- **TypeScript 60%** — depth, frontend, full-stack, Next.js, Drizzle ORM
- **Python 40%** — backend, async, FastAPI, Pydantic
- Same domain model, same patterns, two implementations side by side
- Folder structure: `apps/taskflow/ts/` and `apps/taskflow/py/` in parallel

## Consequences

**Positive**:
- Deeper understanding through comparison (e.g., `interface` ↔ `BaseModel`, `Map` ↔ `dict`)
- Can choose the right tool per layer (TS for UI, Python for AI integration)
- Two mental models for the same DDD concept reinforces learning

**Negative**:
- 2x the initial scaffolding overhead
- Risk of drift between tracks if not maintained in lockstep
- Slower Day 1 velocity (two runtimes to configure)

**Mitigation**:
- Keep a "concept parity checklist" — every file in `ts/` has a counterpart in `py/`
- Day 1 establishes the pattern; subsequent days follow the template
- Python track can lag by 1 day if needed, but must catch up before Phase 2

## References

- Roadmap §1: Vision & Workspace Structure — "Dual-Language Track"
- 12 OSS repos: Ghost (TS), Plane (Python), OpenHands (TS+Python) model this split
