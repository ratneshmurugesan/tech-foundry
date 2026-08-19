# ADR-002: In-Memory Repository for Phase 1

**Status**: Superseded by ADR-005
**Date**: 2026-08-12
**Superseded**: 2026-08-19 (Day 3 — PostgreSQL + ORM)
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 1-2

## Context

"Make it work" phase has a clear bar: it runs, correct output, you can curl it. The roadmap explicitly says **"No tests, no elegance, no optimization"** for Weeks 1-6.

A real database adds: installation, connection strings, migrations, connection pooling, async drivers — all before writing a single line of domain logic.

## Decision

Use **in-memory collections** as the persistence layer for Days 1-2:
- **TypeScript**: `Map<K, V>` — native, type-safe, O(1) lookup
- **Python**: `dict[str, T]` — native, O(1) lookup

Each service owns its own collection (no shared database).

The `save()` method includes a simulated async delay (`setTimeout` in TS, `asyncio.sleep` in Python) to mimic real I/O latency. This ensures the async pattern is exercised even with in-memory storage.

## Consequences

**Positive**:
- Zero setup — no database installation, no connection strings
- Instant startup — no waiting for PostgreSQL to boot
- Focus on domain logic — entities, services, CRUD operations
- Validates the service layer design before adding I/O complexity

**Negative**:
- Data lost on restart — acceptable for "make it work" phase
- No cross-entity queries — each service is isolated (intentional limitation)
- Must be **completely replaced** on Day 3 with PostgreSQL + Drizzle/asyncpg

**Deprecation Schedule**:
- Day 3: Replace with PostgreSQL + proper schema (3 tables)
- Day 3: Replace `Map`/`dict` with Drizzle ORM / asyncpg queries
- Service API surface stays the same — only the internal storage changes

## References

- Kent Beck: "Build the wrong thing first — it's SUPPOSED to be ugly"
- Hoppscotch: Uses in-memory stores for fast dev startup
- Roadmap Sprint 1 Day 2: "Taskflow API skeleton (in-memory, no DB)"
