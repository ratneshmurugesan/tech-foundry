# Day 01 — Types & Async

## Built

- [ ] TypeScript track: `types.ts`, `service.ts`, `main.ts`
- [ ] Python track: `models.py`, `service.py`, `main.py`

## Learned

- DDD: Entity vs Value Object — Entity has identity (`id`), VO has attributes only
- Dual-language mapping: TS `interface` ↔ Python `BaseModel`, TS `class` with static factory ↔ Pydantic with `field_validator`
- Factory pattern: encapsulate entity creation so validation happens at construction time
- In-memory repository: the "make it work" persistence layer (`Map` in TS, `dict` in Python)
- Async/await: TS `setTimeout` promise wrapper ↔ Python `asyncio.sleep` — same concept, different runtime

## Broke & Fixed

- **Error**: Initial Day 1 output violated Rule 3 ("Never write actual code") — provided runnable code instead of pseudocode
- **Root cause**: Prompt rules weren't enforced before generation
- **Fix**: Rewrote all files as step-by-step pseudocode with numbered micro-steps, keeping architecture rationale and OSS references intact
- **Lesson**: Pseudocode must describe *what* and *why*, not provide copy-paste code

## Blocked / Deferred

- Actual file creation deferred until user implements from pseudocode
- ID generation (timestamp-based) deferred upgrade to ULID/nanoid for Phase 2 (per ADR-003)
- Database layer deferred to Day 3
- HTTP server deferred to Sprint 2 (Day 2)
- Tests deferred to Deepening 1 (Week 7)

## Commands Run

- `git push -u origin master` → successful push to origin

## ADRs Created

- [ADR-001](../adrs/adr-001-dual-language-track.md): Dual-Language Track (TS 60%, Python 40%) — permanent roadmap pillar
- [ADR-002](../adrs/adr-002-in-memory-repository.md): In-Memory Repository for Phase 1 — temporary, superseded Day 3
- [ADR-003](../adrs/adr-003-id-generation-strategy.md): ID Generation Strategy — Day 1 shortcut, ULID upgrade in Deepening 1

## Notes

- Prompt file: `tech-foundry/docs/prompts/2026-08-12-1750.md`
- Roadmap reference: `tech-foundry/docs/roadmaps/v4/master.md`
- Key rule learned: Rule 3 ("Never write actual code unless explicitly asked") must be enforced before generating day content
