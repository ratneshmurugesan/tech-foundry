# Foundry Day-by-Day Execution Prompt

> **Generated**: 2026-08-12
> **Purpose**: Master prompt for daily execution. Say "Read `tech-foundry/docs/prompts/master.md`" to restore full context.
> **Roadmap Reference**: `tech-foundry/docs/roadmaps/v4/master.md`
> **ADR Reference**: `tech-foundry/docs/adrs/` (roadmap-level decisions, not per-day)

---

## Rules for Every Day's Pseudocode

1. **Write complete pseudocode** using your intelligence — no-code, only words, bullet point sentences, short sized, unrepeated, with context aware colored words, max 120 words each with enhanced readability for all micro steps.

2. **Include detailed comments** for each task explaining the *why*:
   - Architecture rationale (3-category workspace, monorepo end state, dual-language track)
   - DDD concept being applied (Entity, Value Object, Aggregate, Bounded Context, etc.)
   - OSS reference (which of the 12 repos models this pattern)
   - Dual-language parallel (how the same concept maps between TypeScript and Python)

3. **Never write actual code** by yourself unless explicitly asked for it and write optimized pseudo code.

4. **Show the file and folder structure** you're proposing — never create any files or folders by yourself.

5. **Explain why each file or folder exists** w.r.t. our architecture as defined in the roadmap:
   - Why this location in the workspace (`tech-foundry/` vs `entrepreneur-foundry/` vs `proprietor-foundry/`)
   - Why this naming convention (snake_case vs camelCase, file extensions)
   - Why this separation of concerns (src/, tests/, infra/, etc.)

6. **Include scaffolding instructions** for both TypeScript and Python tracks so the code can run successfully:
   - **TypeScript**: `tsconfig.json`, `package.json`, `.gitignore`, `pnpm` install + run commands
   - **Python**: `pyproject.toml`, `__init__.py`, `.gitignore`, `uv` venv + sync + run commands

7. **Ensure all pseudocode is self-contained** — no missing imports, no undefined functions, no broken references:
   - If `generateId()` is called, define it
   - If a type is imported, show the import
   - If a module is required, show how it's installed
   - Every file must be independently runnable

8. **Add deprecation/upgrade notes** where relevant so I know what changes in are available to apply:
   - Example: FastAPI `on_event('startup')` → `lifespan` context manager
   - Example: uvicorn → Granian in Deepening 2
   - Example: in-memory arrays → PostgreSQL + Drizzle on Day 3

9. **End with a clear Day N bar** — what commands I run, what output I expect, how I know the day is complete.

10. **Include a preview of the next day** so I understand the progression and can prepare mentally.

11. **Create an ADR whenever an architectural decision is made** so that decisions are documented and deviations from the current roadmap are identified and evaluated. You write ADR with real experience, not theoretical guesses and ADR captures what actually happened, not what you planned. 
ADRs live separately in `tech-foundry/docs/adrs/` and are referenced by number (e.g., "per ADR-001") when relevant.

12. **After completing each day, log notes** in Markdown format at `tech-foundry/docs/notes/day-XX-[topic]-[yyyy-mm-dd-hhmm].md` capturing:
    - What was built (micro steps completed)
    - What was learned (concepts, patterns, OSS references)
    - What broke and how it was fixed (debugging notes)
    - What's blocked or deferred (carried to next day)
    - Commands run by user (using usual terminal) and by me (using hidden terminal) and their outcomes (for reproducibility)
    - ADRs Created
    - Preview of Next day

13. **Never commit code without asking** — show the diff and proposed commit message, then user will do the rest, never ask user for permision to commit, just leave code changes as is.

14. **Docs are the single source of truth — no duplication into agent memory.** Every verified pattern, gotcha, or decision gets written into `docs/` — an ADR for a decision/deviation, a day-note for a session lesson, a prompts rule for a standing process rule — and is *not* also re-stored in agent memory. If an ADR or day-note already owns a practice, do not duplicate it elsewhere (including memory). Agent memory holds only a tiny pointer to where docs live, never the content itself.

15. **`docs/scraps/` is the user's private backup — never read, modify, or promote from it.** Treat it as an inert archive: no edits, no deletions, no reviving its files into live docs or memory, and never cite it as authoritative. The only sanctioned action toward it is to leave it untouched.

16. General and important advice: 
 - Always create to-do list immediately according to your plan; keep track of them and update thier status appropriately - complete one by one quickly - after completeing each todo ask user to verify if required - then you move forward to next todo item; never loop back to completed todo item -  stop the continous verify-loop if you are in it and conclude.
 - Ask user plenty of questions before making assumptions, relying on guesswork, or when stuck in a verification loop.
 - Keep explanations crisp and concise.
 - Always explain technical terms using simple layman-term english that a 5-year old kid can understand and connect them to a restaurant analogy all the time. Keep explanations clear, practical, and easy to understand and avoid unnecessary fluff.

---

## Usage

Every day's prompt file lives in `docs/prompts/`, named `day-XX-[slug]-[yyyy-mm-dd-hhmm].md` (same stem family as the notes) or a dateless `master.md` for this rules file.

To start any day, say:
> "Read `tech-foundry/docs/prompts/day-XX-[slug]-[date].md` and `tech-foundry/docs/roadmaps/v4/master.md`, then give me what's next"

The AI will:
1. Load this prompt (rules)
2. Load the roadmap (context, phase, sprint, day definition)
3. Check all notes in order in tech-foundry/docs/notes/ to understand whats done and what day is next. compare previous day's preview of next day section to find a conenction between subsequent notes .
4. Generate the complete day breakdown following all 16 rules
5. After execution, generate the notes file at `tech-foundry/docs/notes/`
6. Day-close final step (before the closeout commit): draft **Day N+1's prompt file** at `tech-foundry/docs/prompts/day-XX-[slug]-[yyyy-mm-dd-hhmm].md`, built from the notes file's "Preview of Next Day" section + the roadmap's next row. It points back at this file (master) and carries the day-specific constraints (options to settle, ADR candidates, deliverables bar, next-day preview). Day notes + ADR + next prompt file are committed together in one closeout commit, so no session ends leaving the next day without its kickoff file.

---

## Notes Directory Structure

```
tech-foundry/docs/notes/
├── Day-01-xxxx.md
├── Day-02-xxxx.md
└── ...
```