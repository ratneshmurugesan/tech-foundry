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

## Template

Copy the block below as `adr-NNN-short-title.md`:

```markdown
# ADR-XXX: [Decision Title]

**Status**: Active | Superseded | Deprecated | Proposed
**Date**: YYYY-MM-DD
**Phase**: Phase [N] — [Phase Name], Sprint/Deepening [N], Day/Week [N]
**Supersedes**: ADR-XXX (if replacing a previous decision)

## Context

What is the situation requiring evaluation?
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

