# ADR-004: HTTP Framework Choice (Fastify + FastAPI)

**Status**: Active
**Date**: 2026-08-17
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 2
**Supersedes**: None

## Context

Day 2 wraps the in-memory repositories behind HTTP endpoints so they can be `curl`ed from outside — the notebook needs a front door. One framework choice per language track, balancing three needs: auto-generated API docs (a solo dev has no one to ask, and no spare hours to hand-maintain a document that lies), async-first design (Day 1 committed to the async pattern; the HTTP layer shouldn't fight it), and ecosystem maturity (a 10+ year project needs a framework that will still be around).

## Decision

- **TypeScript**: Fastify — route registration via `app.get()`, schema validation built-in, auto Swagger docs via `@fastify/swagger`
- **Python**: FastAPI — decorator-based routes `@app.get()`, Pydantic integration native, auto OpenAPI/Swagger docs

Both frameworks are the restaurant's front of house: the same counter, opened in two different kitchens — async-first, automatic API documentation, request validation via schemas. Both also publish a machine-readable map of every route — the API documents itself, so the door is never unlocked by guesswork.

## Consequences

**Positive**:
- Auto-generated Swagger/OpenAPI docs — the API documents itself every time a route changes; a solo dev with no one to ask never maintains a hand-written document that lies
- Both frameworks are async-native — Day 1's async pattern flows straight into the HTTP layer, no rewrite to sync
- FastAPI's Pydantic integration means our existing `BaseModel` types work directly as request/response validators — the same types, now the front desk
- Fastify is the fastest Node.js HTTP framework (benchmarks), aligns with roadmap's "make it fast" phase
- Both sit on large, active ecosystems — not orphan tools

**Negative**:
- Fastify's plugin system has a learning curve — you must learn to register plugins before routes, like a key that has to be in the lock before the door can open (order matters)
- FastAPI is younger than Flask/Django — a 10+ year project runs on its pace, with some enterprise tooling gaps
- Both are newer than Express/Django — stability risk for a project meant to outlast them

**Mitigation**:
- Day 2 uses only basic GET routes — a small door, minimal surface area
- Deepening 2 (Weeks 11-14) is reserved for infrastructure decisions — a framework swap is still possible then
- The repository pattern isolates business logic from the HTTP layer — a framework swap touches only `server.ts`/`server.py`; the domain is not nailed to the door

## References

- Roadmap §8 Decision Framework: "Fastify (TS), FastAPI (Python)" — already decided
- 12 OSS repos: Campaign API (FastAPI), Hoppscotch (custom + Auth0), Streamlit (custom server)
- Backend Monorepo Study: 8 of 10 services use FastAPI — proven pattern
