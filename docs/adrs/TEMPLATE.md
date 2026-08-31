# ADR Template & Conventions

Architectural Decision Records capture **why** we made a technical decision, not just **what**.

## When to Create

Create an ADR when:
- A non-trivial architectural choice is made (tech stack, patterns, naming, structure)
- A temporary shortcut is taken with a planned upgrade path
- A decision deviates from the current roadmap

Skip ADRs for trivial choices (indentation style, variable naming) — those go in day notes.

## Naming Convention

```
adr-NNN-short-title.md
```

- `NNN` is a zero-padded sequential number (001, 002, 003...)
- `short-title` uses kebab-case, 2-5 words max
- Example: `adr-001-dual-language-track.md`

## Status Lifecycle

```
Proposed → Active → Superseded → Deprecated
```

- **Active**: Current decision, in use
- **Superseded**: Replaced by a newer ADR (link to the successor)
- **Deprecated**: No longer in use, kept for historical reference

---

## Writing Standard

ADR prose reads **story first, terms in place** — a non-technical reader should get the *idea* from the picture, then the technical terms confirm it. Applies to Context, Decision, and Consequences prose:

- **Open with the picture** — one sentence an outsider can visualize.
- **Then the terms, verbatim** — the exact technical terms (names, versions, commands) immediately after, unchanged. The picture hangs the idea; the terms are the receipt.
- **One idea per bullet** — max ~2 sentences per bullet. If a bullet carries two ideas, split it.
- **Analogies from everyday life, never from other tech** — no "it's like X library".

**Metaphor discipline** — the Foundry story is a *serialized* one: same restaurant, same cast, a new event each ADR and day.

1. **The spine is the restaurant**: pictures of a *project state* (Context, Decision, Consequences) are told through that same restaurant — never through a house, a building, a parcel, or any other new venue.
2. **Fixed cast — same words, always, so ADR 005 and a Day 12 note read as one story**:

   | Foundry concept | Restaurant role |
   |---|---|
   | two language tracks | the two kitchens |
   | API layer | the counter |
   | routes / schemas | the menu |
   | repository | the kitchen (front of house never looks inside) |
   | Postgres DB | the cellar — dry storage below the kitchen |
   | ORM | the translator (reads every menu, writes one order) |
   | IDs | the ticket number |
   | tests / e2e | the test diner |
   | error contract | the receptionist |
   | migrations / DDL | the renovator |
   | Docker / deploy | the restaurant on a pallet (ships as a unit; the block around it changes) |
   | auth | the back-of-house door |

3. **Parts are possessive; pictures are local.** Structural words — *foundation, cellar, walls, shelving* — are *parts of the restaurant* ("the restaurant pours its own foundation"), never a rival protagonist. Bug- and mechanism-level pictures (a witness, a lock, a stamp) are *one-off garnish*: they may vary per incident, because the reader already knows the spine is the restaurant.

**Don't story-ify the receipts**: command blocks, version pins, dates, file paths, the Status line, table rows, References lists — those stay exact. The picture goes *around* them, never inside them.

**Worked example** (from Day 4, Taskflow — `create_all` vs `db:push`):

> **Before:** `PY Base.metadata.create_all() creates tables but does not ALTER existing FK constraints — FK/cascade changes require docker compose down -v && up -d + db:push.`
> **After:** `Python's startup is a first-time renovator: in year one it built the restaurant happily, but it will not remodel — so the moment we changed the walls (the cascade FKs), the only way in was to raze the place (down -v) and open a new one. (Drizzle, the TS side, does remodel — db:push was all it needed.)`

Same facts, same commands, same terms — but now there's a picture to hang the idea on.

---

## Template

Copy the block below as `adr-NNN-short-title.md`:

```markdown
# ADR-XXX: [Decision Title]

**Status**: Active | Superseded | Deprecated | Proposed
**Date**: YYYY-MM-DD
**Phase**: Phase [N] — [Phase Name], Sprint/Deepening [N], Day/Week [N]
**Supersedes**: ADR-XXX (if replacing a previous decision)

## Context

Write this section story-first (see Writing Standard above) — the picture of *why this moment hurt*, then the exact terms.

- What problem are we solving?
- What constraints exist (budget, timeline, solo dev, OSS references)?
- What alternatives were considered?
- Which of the 12 OSS repos model this pattern?

## Decision

What is the change we're proposing or have agreed to?
- Be specific: tool names, versions, folder paths, naming conventions.
- If dual-language, state both TS and Python choices.
- If temporary (Day 1 shortcut), state the upgrade path.

## Consequences
Story-first bullets (see Writing Standard above) — each trade-off gets a picture first, the terms right after.


**Positive**:
- What gains do we get?

**Negative**:
- What trade-offs do we accept?

**Mitigation**:
- How do we reduce the negative impact?

**Deprecation/Upgrade**:
- When and how will this decision be revisited?
- What ADR will supersede this one?

## References

- Roadmap section this decision relates to
- OSS repos that model this pattern
- External docs, blog posts, or specs
- Related ADRs (ADR-XXX, ADR-YYY)
```

## Existing ADRs

| ADR | Title | Status |
|---|---|---|

