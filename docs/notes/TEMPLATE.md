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
day-XX-[topic]-[yyyy-mm-dd-hhmm].md
```

- `XX` is a zero-padded day number (01, 02, 03...)
- `topic` is a brief kebab-case descriptor
- Example: `day-01-xxxxx`

---

## Template

Copy the block below as `day-XX-[topic].md`:

```markdown
# Day XX — [Topic Title]

## Built

What was actually built today? List each file or component with checkboxes.

## Learned

What concepts, patterns, or OSS references did you encounter?

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

> **Tip**: To reconstruct your real command history (not what you think you ran), cross-reference your shell history:
> ```bash
> # Get all commands from today with timestamps
> START=$(date -d "YYYY-MM-DD 00:00:00" +%s)
> END=$(date -d "YYYY-MM-DD 23:59:59" +%s)
> grep -aE "^: [0-9]+:0;" ~/.zsh_history | awk -F: -v start="$START" -v end="$END" \
>   '$2 >= start && $2 <= end {cmd=$3; gsub(/\\$/,"",cmd); print $2, cmd}' | \
>   while read ts cmd; do dt=$(date -d "@$ts" "+%H:%M"); echo "$dt | $cmd"; done
> ```
> Collapse repetitive retries into grouped entries. Keep the story, drop the noise.
> Look for commands executed within /media/ratnesh-murugesan/PRO/Professional/ratnesh-vault/repos/foundry/ is possible



## Preview of Next day

Brief overview of what tomorrow covers so you can prepare mentally:
- **What's being built**: Name the day's topic and the main deliverable
- **Concepts**: New patterns, frameworks, or DDD concepts you'll encounter
- **Files**: New files you'll create or existing files you'll modify
- **Prerequisites**: Dependencies to install, services to start, or setup steps before beginning
- **Connection**: How today's work feeds into tomorrow (e.g., "today's repository becomes tomorrow's data layer")


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

