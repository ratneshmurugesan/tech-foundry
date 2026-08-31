# ADR-001: Dual-Language Track (TypeScript + Python)

**Status**: Active
**Date**: 2026-08-12
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 1

## Context

The Foundry roadmap defines a solo developer building production-grade software with a 10+ year lifespan. Two languages dominate the modern web stack: TypeScript (frontend + full-stack) and Python (backend + AI/ML).

Choosing one is like running the restaurant every day for a decade with a single kitchen — you master that kitchen completely, but you never learn the second. The roadmap's answer is a **dual-language track**: learn every concept twice — once in each type system, back to back.

## Decision

- **TypeScript 60%** — depth, frontend, full-stack, Next.js, Drizzle ORM
- **Python 40%** — backend, async, FastAPI, Pydantic
- Same domain model, same patterns, two implementations side by side
- Folder structure: `apps/taskflow/ts/` and `apps/taskflow/py/` in parallel

## Consequences

**Positive**:
- Learning a concept in both systems is like translating the same story between two languages — the idea lands twice, and each version illuminates a different side (e.g., `interface` ↔ `BaseModel`, `Map` ↔ `dict`)
- Each layer keeps its natural home: the UI and full-stack layers run in TS, the backend and AI/ML layers run in Python
- Seeing one DDD concept through two mental models makes the model stick

**Negative**:
- Day 1 builds two runtimes instead of one — double the scaffolding before any domain code
- Two copies of the same recipe start to drift — a track drifts the moment it's updated alone, so both must stay in lockstep
- A slower start: two runtimes to configure instead of one

**Mitigation**:
- A "concept parity checklist" keeps the tracks honest — every file in `ts/` must have a counterpart in `py/`
- Day 1 installs the pattern once; later days just repeat the template
- The Python track may run a day behind when a topic is heavier there, but it must catch up before Phase 2

## References

- Roadmap §1: Vision & Workspace Structure — "Dual-Language Track"
- 12 OSS repos: Ghost (TS), Plane (Python), OpenHands (TS+Python) model this split
