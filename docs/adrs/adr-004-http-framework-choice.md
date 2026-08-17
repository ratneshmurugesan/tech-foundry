# ADR-004: HTTP Framework Choice (Fastify + FastAPI)

**Status**: Active
**Date**: 2026-08-17
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 2
**Supersedes**: None

## Context

Day 2 requires wrapping our in-memory repositories behind HTTP endpoints. We need an HTTP framework for each language track. The decision needs to balance: auto-generated API docs (critical for a solo dev), async-first design (we're using async from Day 1), and ecosystem maturity.

## Decision

- **TypeScript**: Fastify — route registration via `app.get()`, schema validation built-in, auto Swagger docs via `@fastify/swagger`
- **Python**: FastAPI — decorator-based routes `@app.get()`, Pydantic integration native, auto OpenAPI/Swagger docs

Both frameworks share architectural DNA: async-first, automatic API documentation, request validation via schemas.

## Consequences

**Positive**:
- Auto-generated Swagger/OpenAPI docs — critical for solo dev who can't maintain separate API docs
- Both frameworks are async-native, matching our Day 1 async repository pattern
- FastAPI's Pydantic integration means our existing `BaseModel` types work directly as request/response validators
- Fastify is the fastest Node.js HTTP framework (benchmarks), aligns with roadmap's "make it fast" phase
- Both have large ecosystems and active communities

**Negative**:
- Fastify's plugin system has a learning curve (need to register plugins before routes)
- FastAPI is younger than Flask/Django — some enterprise tooling gaps
- Both frameworks are relatively new compared to Express/Django (stability risk for a 10+ year project)

**Mitigation**:
- Day 2 uses only basic GET routes — minimal surface area
- Deepening 2 (Weeks 11-14) is reserved for infrastructure decisions — framework swap is possible then
- The repository pattern isolates business logic from the HTTP layer — swapping frameworks only touches `server.ts/server.py`

## References

- Roadmap §8 Decision Framework: "Fastify (TS), FastAPI (Python)" — already decided
- 12 OSS repos: Campaign API (FastAPI), Hoppscotch (custom + Auth0), Streamlit (custom server)
- Backend Monorepo Study: 8 of 10 services use FastAPI — proven pattern
