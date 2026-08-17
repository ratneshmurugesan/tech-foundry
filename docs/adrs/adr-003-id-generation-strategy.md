# ADR-003: ID Generation Strategy — Day 1 Shortcut

**Status**: Active (temporary — upgrade planned for Phase 2)
**Date**: 2026-08-12
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 1

## Context

Every entity needs a unique identifier. The choice of ID strategy affects:
- Uniqueness guarantees (collision risk)
- Sortability (can you order by creation time?)
- Index performance (monotonic vs random)
- Database storage size

## Decision

**Day 1 (make it work)**:
- **TypeScript**: `crypto.randomUUID()` — native Node.js API, collision-resistant, no extra deps
- **Python**: `str(uuid4())` — standard library, collision-resistant, no extra deps

Both tracks converged on the same strategy. The original plan for a timestamp-based TS ID was abandoned in favor of consistency.

**Phase 2 (make it right, Deepening 1)**:
- **Both tracks**: ULID (Universally Unique Lexicographically Sortable Identifier)
- ULIDs are: 128-bit, sorted by time, URL-safe, language-agnostic
- TypeScript: `ulid` package on npm
- Python: `ulid` package on PyPI

## Consequences

**Day 1 trade-offs**:
- Both tracks use uuid4 — collision-resistant but NOT sortable
- Consistency between tracks is achieved from day one
- The ULID upgrade path remains the same for Phase 2

**ULID upgrade benefits**:
- Single ID format across both languages
- Time-sorted — new entities have higher IDs (better for DB indexes)
- 1.2 million ULIDs per millisecond without collision
- 26-character string, same size as UUID (36 char) but shorter

## References

- Roadmap §5 DDD: "Entities + Value Objects — Sprint 1 (Day 1)"
- ULID spec: https://github.com/ulid/spec
- 12 OSS repos: Most use UUID v4; ULID is the modern improvement
