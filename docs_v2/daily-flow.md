# daily-flow.md — your daily operating sheet

> The whole day, in one file. Read this once; then it's muscle memory.
> ~8 min of ritual per day. The rest is cooking.

---

## The cycle

```
┌─────────────────────────────────────────────────────────────────┐
│  MORNING (kickoff) — ~3 min, just READ                          │
│                                                                 │
│  1. Open the repo. Say:                                         │
│     "Read tech-foundry/AGENTS.md"                               │
│  2. The agent reads: AGENTS.md → llms.txt NOW → latest note     │
│  3. You tell it what to build today (or it tells you from       │
│     the roadmap row)                                            │
│                                                                 │
│  → No writing. No prompt file. No "draft tomorrow."             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  MIDDAY (the work) — the actual coding                          │
│                                                                 │
│  ≤ 2 shippable features (rule 18: a feature = 1 decision,       │
│  both kitchens, each with its test)                             │
│                                                                 │
│  This is where 90% of your time goes. The ritual is 10%.        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  EVENING (closeout) — ~5 min, the 5 EOD steps                   │
│                                                                 │
│  1. Note   — 3–5 lines: built / didn't / decisions / debt       │
│  2. ADR    — only if a real decision was made (12 lines)        │
│  3. Debt   — one row in debt.md (flip status or add)            │
│  4. Roadmap— one line in v4/master.md §16                       │
│  5. Manifest— `sh docs_v2/gen_llms.sh`                          │
│                                                                 │
│  Then: git add -A → agent shows diff + proposes message         │
│  YOU commit.                                                    │
│                                                                 │
│  → This *is* the next day's kickoff. The note's "Next owed to"  │
│    + the roadmap row + the manifest = tomorrow's context.        │
│    There is no separate "draft tomorrow" step.                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The key insight: closeout *is* kickoff

You don't do "closeout then kickoff" as two separate acts. The v2 closeout
**generates** the next day's kickoff as a side effect:

| What you write at closeout | What tomorrow's kickoff reads |
|---|---|
| Note's *Next owed to* line | "Here's what's next" |
| Roadmap §16 row (updated) | "Here's the plan" |
| `sh gen_llms.sh` | "Here's the manifest (NOW section)" |

So tomorrow morning you just **read** — 3 minutes, no writing. The writing
already happened last night.

---

## Your actual daily sequence (one-liner)

> **Read 3 min → Code all day → Write 5 min → Commit**

Total ritual overhead: **~8 min/day** (3 + 5). That's the whole cost.
Everything else is the actual work.

---

## Practical tips to stay in budget

- **Don't over-write the note.** 3–5 lines. "Built X, Y. Decided Z (ADR-016).
  Debt 12a→12e still open." Done. If you find yourself writing a paragraph,
  you're re-deriving instead of recording.
- **ADR only for *code/tech* decisions.** If you just built what the roadmap
  said, no ADR. Doc-format or process changes get a line in the note — never
  an ADR file. The step is "only if" — skipping it is valid.
- **The manifest is a script.** You type `sh docs_v2/gen_llms.sh`. You don't
  hand-edit `llms.txt`. If it looks wrong, the *input* (note/roadmap) was
  wrong, not the script.
- **Commit is your act.** The agent stages + proposes. You type the commit.
  30 seconds.

---

## The time budget (where the minutes go)

| Phase | v1 (old) | v2 (now) | Saved |
|-------|----------|----------|-------|
| Kickoff | ~10–15 min (read all notes in order) | ~3 min (read manifest) | ~7–12 min |
| Work | same | same | — |
| Closeout | ~25–40 min (7-section note + README scan + draft prompt) | ~5 min (5 steps) | ~20–35 min |
| **Total ritual** | **~35–55 min** | **~8 min** | **~27–47 min/day** |

Over a 10-day sprint: **~5–8 hours** of ritual reclaimed. And the gap
*widens* each day because v1's kickoff cost grew with the note count while
v2's doesn't (O(1) vs O(N)).

---

## Restaurant framing

The chef (you) walks in, reads the specials board (3 min), cooks (all day),
writes tonight's specials on the board (5 min), locks up. Tomorrow they walk
in, read the board, cook.

No one "drafts tomorrow's menu." The board *is* the menu. The specials board
is `llms.txt`. The act of writing it is `sh gen_llms.sh`. The specials
themselves are the roadmap row + the note's *Next owed to*.

v1 was a restaurant that, every night, hand-wrote tomorrow's menu from
scratch, re-read every past guest's order ticket in sequence, and re-checked
the whole chalkboard by hand. v2 just stamps the board.

---

## What lives where (quick reference)

| File | Role | You touch it when… |
|------|------|--------------------|
| `AGENTS.md` (repo root) | Session-start pointer | You say "read AGENTS.md" each morning |
| `llms.txt` | The manifest (generated) | You never edit it; you run the script |
| `gen_llms.sh` | The generator | You run it at EOD step 5 |
| `debt.md` | The debt ledger | EOD step 3 (one row) |
| `notes/day-NN-…` | Today's note | EOD step 1 (3–5 lines) |
| `adrs/adr-NNN-…` | A decision | EOD step 2 (only if a decision) |
| `../docs/roadmaps/v4/master.md` | The roadmap | EOD step 4 (one line) |
| `daily-flow.md` | This file | Read once; then it's muscle memory |

---

## The one rule that makes all of this work

**Docs and code disagree → code wins; then fix the doc the same day.**

The manifest is derived from filenames and `Status:` lines. The debt ledger
is one row per debt. The note is 3–5 lines. None of them *think* — they
*copy*. A stale copy is still better than a wrong re-derivation. That is why
the EOD step is a script, not a memory.
