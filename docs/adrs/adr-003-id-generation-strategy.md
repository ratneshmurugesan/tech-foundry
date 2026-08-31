# ADR-003: ID Generation Strategy — Day 1 Shortcut

**Status**: Active (temporary — upgrade planned for Phase 2)
**Date**: 2026-08-12
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 1

## Context

Every entity gets a ticket number, and how you print the tickets changes three things:

- Uniqueness guarantees (collision risk) — can two tickets ever carry the same number?
- Sortability (can you order by creation time?) — do higher numbers mean newer tickets?
- Index performance (monotonic vs random) — does the mail carrier knock in order, or at random?
- Database storage size — how wide is the number plate?

## Decision

**Day 1 (make it work)**:
- **TypeScript**: `crypto.randomUUID()` — native Node.js API, collision-resistant, no extra deps
- **Python**: `str(uuid4())` — standard library, collision-resistant, no extra deps

A UUID is like a lottery ticket: guaranteed unique, but the numbers are scrambled — tickets sell in no particular order, so you can't tell from the number which was sold first. Both tracks converged on the same strategy; the original plan for a timestamp-based TS ID was abandoned in favor of consistency.

**Phase 2 (make it right, Deepening 1)**:
- **Both tracks**: ULID (Universally Unique Lexicographically Sortable Identifier) — the same guarantee, but a serial number stamped with its date of birth: still unforgeable, *and* newer numbers always sort after older ones
- ULIDs are: 128-bit, sorted by time, URL-safe, language-agnostic
- TypeScript: `ulid` package on npm
- Python: `ulid` package on PyPI

## Consequences

**Day 1 trade-offs**:
- Both tracks use uuid4 — collision-resistant but *not* sortable: safe lottery tickets, with no built-in sense of order
- Both tracks mint the same ticket from day one — consistency for free
- The switch to the ULID "stamp" stays the same plan for Phase 2

**ULID upgrade benefits**:
- One number format runs the whole restaurant in both languages
- Time-sorted — like a ticket stamped with its print date, new entities get higher IDs (kinder to DB indexes: the mail carrier can knock in order)
- 1.2 million ULIDs per millisecond and still no collision — the stamp counter never overflows in practice
- 26 characters versus the UUID's 36 — a shorter number plate, same uniqueness guarantee

## References

- Roadmap §5 DDD: "Entities + Value Objects — Sprint 1 (Day 1)"
- ULID spec: https://github.com/ulid/spec
- 12 OSS repos: Most use UUID v4; ULID is the modern improvement
