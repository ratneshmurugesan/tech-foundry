# Day Notes Template & Conventions

Day notes capture **what happened** during each day's execution — the build log for the Foundry journey.

## When to Create

After completing each day's work, create a note capturing:
- What was built (files, components, micro-steps)
- What was learned (concepts, patterns, OSS references)
- What broke and how it was fixed (debugging notes)
- What's blocked or deferred (carried to next day)
- Commands run and their outcomes (for reproducibility)

## Naming Convention

```
day-XX-[topic].md
```

- `XX` is a zero-padded day number (01, 02, 03...)
- `topic` is a brief kebab-case descriptor
- Example: `day-01-types-and-async.md`, `day-03-postgres-schema.md`

---

## Template

Copy the block below as `day-XX-[topic].md`:

```markdown
# Day XX — [Topic Title]

## Built

What was actually built today? List each file or component with checkboxes.

- [ ] TypeScript track: file1.ts, file2.ts
- [ ] Python track: file1.py, file2.py
- [ ] Infrastructure: docker-compose.yml, .env

## Learned

What concepts, patterns, or OSS references did you encounter?
- DDD concept applied (Entity, Value Object, Aggregate, Bounded Context, etc.)
- Dual-language mapping (TS concept ↔ Python equivalent)
- OSS reference (which of the 12 repos models this pattern)
- New tool or library learned

## Broke & Fixed

What went wrong and how was it resolved?
- Error encountered (include the error message if helpful)
- Root cause analysis
- Fix applied
- Lesson learned (so it doesn't happen again)

If nothing broke, write "No issues encountered."

## Blocked / Deferred

What couldn't be completed today and why?
- What's blocked (external dependency, missing knowledge, tooling issue)?
- What's deferred (intentionally saved for a later phase)?
- What's carried forward to the next day?

## Commands Run

Key commands executed today, with outcomes. Include for reproducibility.

- `pnpm install` → installed 45 packages
- `uv sync` → resolved 12 dependencies
- `docker compose up -d` → postgres started on port 5432

## ADRs Created

List any ADRs created or updated today.
- ADR-XXX: [title] — [brief reason]
- If no ADRs were needed, write "No architectural decisions today."

## Notes

Free-form notes, observations, or anything that doesn't fit above.
- Prompt file used: `tech-foundry/docs/prompts/2026-08-12-1750.md`
- Roadmap reference: `tech-foundry/docs/roadmaps/v4/foundry-roadmap-v4-2026-08-11-1840.md`
- Any deviations from the planned day
- Ideas for future days
```

---

## Existing Notes

| File | Day | Topic |
|---|---|---|

