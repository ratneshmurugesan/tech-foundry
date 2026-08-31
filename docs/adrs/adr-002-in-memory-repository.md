# ADR-002: In-Memory Repository for Phase 1

**Status**: Superseded by ADR-005
**Date**: 2026-08-12
**Superseded**: 2026-08-19 (Day 3 — PostgreSQL + ORM)
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 1-2

## Context

"Make it work" phase has a clear bar: it runs, correct output, you can curl it. The roadmap explicitly says **"No tests, no elegance, no optimization"** for Weeks 1-6.

A real database walks in like an uninvited guest: installation, connection strings, migrations, connection pooling, async drivers — all before a single line of domain logic is written. For now, the data lives in a paper notebook: fast, no setup, and it evaporates on restart, which is exactly the bar "make it work" sets.

## Decision

Use **in-memory collections** as the persistence layer for Days 1-2:
- **TypeScript**: `Map<K, V>` — native, type-safe, O(1) lookup
- **Python**: `dict[str, T]` — native, O(1) lookup

Each service keeps its own private notebook — no shared file cabinet until Day 3.

The `save()` method slows down on purpose — a simulated async delay (`setTimeout` in TS, `asyncio.sleep` in Python), like a deliberately sluggish courier — so the async pattern gets exercised even though the "storage" is in memory.

## Consequences

**Positive**:
- Zero setup — no database installation, no connection strings
- Instant startup — no waiting for PostgreSQL to boot
- Focus on domain logic — entities, services, CRUD operations
- Validates the service layer design before adding I/O complexity

**Negative**:
- The notebook burns on restart — data is gone, acceptable for "make it work"
- No cross-entity queries — one notebook per service, no way to join them (intentional limitation)
- On Day 3 the notebook is **completely replaced** with the file cabinet — PostgreSQL + Drizzle/asyncpg

**Deprecation Schedule**:
- Day 3: the notebook is swapped for the file cabinet — PostgreSQL with a proper schema (3 tables)
- Day 3: `Map`/`dict` lookups become Drizzle ORM / asyncpg queries
- The customer-facing window stays — only the warehouse behind it changes (service API surface unchanged)

## References

- Kent Beck: "Build the wrong thing first — it's SUPPOSED to be ugly"
- Hoppscotch: Uses in-memory stores for fast dev startup
- Roadmap Sprint 1 Day 2: "Taskflow API skeleton (in-memory, no DB)"
