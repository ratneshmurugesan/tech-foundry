# Day Notes Template & Conventions

Day notes capture **what happened** during each day's execution — the build log for the Foundry journey.

## When to Create

- What was built (files, components, micro-steps)
- What was learned (concepts, patterns, OSS references)
- What broke and how it was fixed (debugging notes)
- What's blocked or deferred (carried to next day)
- Commands run by user (using usual terminal) and by me (using hidden terminal)  and their outcomes (for reproducibility)

## Naming Convention

```
day-XX-[topic]-[yyyy-mm-dd-hhmm].md
```

- `XX` is a zero-padded day number (01, 02, 03...)
- `topic` is a brief kebab-case descriptor
- Example: `day-01-xxxxx`

---

## Writing Standard

Note prose reads **story first, terms in place** — a non-technical reader gets the *idea* from the picture, then the technical terms confirm it. Applies to Built, Learned, Broke & Fixed, and Notes prose:

- **Open with the picture** — one sentence an outsider can visualize.
- **Then the terms, verbatim** — the exact technical terms (names, versions, commands) immediately after, unchanged. The picture hangs the idea; the terms are the receipt.
- **One idea per bullet** — max ~2 sentences per bullet. If a bullet carries two ideas, split it.
- **Analogies from everyday life, never from other tech** — no "it's like X library".

**Metaphor discipline** — the Foundry story is a *serialized* one: same restaurant, same cast, a new event every day.

1. **The spine is the restaurant**: every picture of a *project state* — Built intros, Previews, ADR Context/Decision — is told through that same restaurant. Never through a house, a building, a parcel, or any other new venue.
2. **Fixed cast — use the same words, day after day, so Day 10 and Day 1 read as one story**:

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

3. **Parts are possessive; pictures are local.** Structural words — *foundation, cellar, walls, shelving* — are *parts of the restaurant* ("the restaurant pours its own foundation"), never a rival protagonist. Bug- and mechanism-level pictures (a witness, a lock, a stamp) are *one-off garnish*: they may change per incident, because the reader knows the spine is the restaurant.

**Don't story-ify the receipts**: Commands Run, file paths, version pins, dates, error messages (quoted verbatim in Broke & Fixed), table rows — those stay exact. The picture goes *around* them, never inside them.

**Diagrams are receipts too, and they must render.** Inline diagrams in day notes render in **Mermaid** (` ```mermaid ` blocks) — native on GitHub, VS Code, Obsidian, and any static site with a Mermaid plugin, so the diagram travels with the *note itself*. No hosted images, no external viewers. The day's diagram lives in a **Request / Response Flow** section (see Template below), opened with the standard `Format note` callout, followed by one or more `###`-headed blocks, each with a picture-first subtitle ("The happy path — ...", "The six-string contract — ...") and the diagram underneath. Rules, kept verbatim because the parser is exact:

- **Sequence diagrams (`sequenceDiagram`) — keep every label plain.** No `<>`, `{}`, `;`, parens, em-dashes, or arrows *inside* participant aliases or message text. If the truth wears punctuation (a header value like `<jwt>`, a return like `{ sub } → request.user`), reword it into words: `Bearer jwt`, `OK sub status maps to request.user`.
- **Flowcharts — quote anything fiddly.** Every node/edge label containing `()`, `<br/>`, commas, guillemets, or a leading `:` goes in double quotes: `A["cellar (Postgres) 15"]`, `D -->|"no env"| X`.
- **The word `end` in all lowercase breaks a diagram** (flowchart keyword collision) — capitalize it (`End`) or avoid it.
- **Parse-check before writing it into a note** — don't eyeball. Throwaway dir, two commands (~15s):
    ```bash
    mkdir -p /tmp/mermaid-check && cd /tmp/mermaid-check && npm init -y && npm i mermaid jsdom
    ```
    …plus a six-line script that extracts each `mermaid` block from the note and calls `mermaid.parse(code)` under a JSDOM `window`/`document`/`navigator`. Every block must return OK (see Day 8's *Broke & Fixed* for the first time a block failed, and why).

**Worked example** (from Day 4, Taskflow — `create_all` vs `db:push`):

> **Before:** `PY Base.metadata.create_all() creates tables but does not ALTER existing FK constraints — FK/cascade changes require docker compose down -v && up -d + db:push.`
> **After:** `Python's startup is a first-time renovator: in year one it built the restaurant happily, but it will not remodel — so the moment we changed the walls (the cascade FKs), the only way in was to raze the place (down -v) and open a new one. (Drizzle, the TS side, does remodel — db:push was all it needed.)`

Same facts, same commands, same terms — but now there's a picture to hang the idea on.

**Page envelope — the same shape on every day.** Each note opens and reads in a fixed rhythm so Day 10 and Day 3 read as one book:

- **TL;DR first.** Directly under the `# Day XX` title, after a `---`, a `**TL;DR**` block: 3–6 short bullets that let a skimmer *get the day* without reading it. Lead with what was built, then status (test counts / green-red), then the one headline gotcha or named debt. Bullets are still story-first + terms-in-place — but compressed to a glance.
- **`---` between every major `##` section.** The horizontal rule is the beat between chapters; it is the visual separator the TL;DR relies on.
- **Section order is fixed; presence is conditional.** Keep the order in the Template below. Omit a section only when the day genuinely has none (e.g. no request/response surface → the Flow section says "No diagram today." rather than vanishing; a blocked day keeps **Blocked / Deferred**, a clean day may fold it into **Outcome**). Never reorder.

---

## Template

Copy the block below as `day-XX-[topic].md`:

````markdown
# Day XX — [Topic Title]

---

**TL;DR**
- [3–6 skimmable bullets: what was built → status (test counts / green-red) → the one headline gotcha or named debt. Story-first + terms-in-place, but compressed to a glance.]

---

## Built

What was actually built today? List each file or component with checkboxes. For each item: the everyday picture, then the technical terms in place (see Writing Standard above).

## Learned

What concepts, patterns, or OSS references did you encounter? Write these story-first (see Writing Standard above) — picture first, exact terms right after.

---

## Broke & Fixed

What went wrong and how was it resolved? Render as a table — one row per bug — with a **Picture** column (the everyday one-liner) and a **Lesson that outlives the day** line beneath it.
- Error encountered (include the error message verbatim if helpful)
- Root cause analysis (story-first: what broke, *as a picture*, then the exact mechanism)
- Fix applied (the exact commands — kept verbatim)
- Lesson learned (so it doesn't happen again)

If nothing broke, write "No issues encountered."

---

## Blocked / Deferred

What couldn't be completed today and why? (Fold into Outcome in a clean day, but never omit the beat.)
- What's blocked (external dependency, missing knowledge, tooling issue)?
- What's deferred (intentionally saved for a later phase)?
- What's carried forward to the next day?

---

## Request / Response Flow

> 🔩 **Format note.** Rendered below in **Mermaid** — the de-facto inline-diagram format for `.md` files: native on GitHub, VS Code, Obsidian, and any Jekyll/Hugo/Astro static site with a `mermaid` plugin, so the diagram follows the *note itself* without a hosted image. (Alternatives in the box at the bottom, should you ever want to swap.)

One or more `###`-headed diagrams, each subtitle story-first ("The happy path — reader engages the kitchen"). Follow the Mermaid rules in the Writing Standard above — and parse-check every block (see Day 8). If the day's work has no request/response surface worth drawing, write "No diagram today."

**Alternatives box** (keep at the very bottom of the section, for day 8+ readers):

| Format | Where it renders | Why you might swap |
|---|---|---|
| Mermaid (default) | GitHub, VS Code, Obsidian, any site with a plugin | the standing choice |
| PlantUML | any site with a plugin / hosted | richer UML shapes |
| Excalidraw (JSON embed) | dedicated pages | hand-drawn tone |
| Hosted image (PNG) | anywhere | zero renderer dependency, but the diagram no longer travels with the note |

---

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

---

## Outcome

The day's net state, story-first — what is now true and *invariant* (and therefore safe to build on), and what is **named and declared as deferred debt** rather than left flaky. Bullets, not prose. (A clean day may fold Blocked / Deferred here; a blocked day keeps it a distinct section above.)

---

## ADRs Created

List any ADRs created or updated today, as a table (ADR | Decision | Status) with a link to each.
- ADR-XXX: [title](../adrs/adr-XXX-….md) — [decision in one line]
- If no ADRs were needed, write "No architectural decisions today."

---

## Preview: Day XX+1 — [Topic]

Story-first overview of what tomorrow covers — the everyday picture of the day, then the technical topics in place (see Writing Standard above):
- **What's being built**: Name the day's topic and the main deliverable
- **Concepts**: New patterns, frameworks, or DDD concepts you'll encounter
- **Headline gotcha**: the day's risk, named before it hits
- **Files**: New files you'll create or existing files you'll modify
- **Prerequisites**: Dependencies to install, services to start, or setup steps before beginning
- **Connection**: How today's work feeds into tomorrow (e.g., "today's repository becomes tomorrow's data layer")

---

## Notes

Free-form notes, observations, or anything that doesn't fit above (story-first prose, see Writing Standard above). Include the fixed footer receipts:
- Prompt file used: `tech-foundry/docs/prompts/day-XX-[slug]-[date].md` (name of TODAY's prompt, or `master.md` if the day ran from the rules file directly)
- Roadmap reference: `tech-foundry/docs/roadmaps/v4/master.md`
- README touched: yes — *which touchpoint* (Journey Map flip / dates caption / ADR row / Learning Ledger / up-next swap / app card) and the diff went into the closeout commit; or **no change today** (a valid outcome)
- Any deviations from the planned day
- Ideas for future days
````

---

## Existing Notes

Format column: **new** = already carries the TL;DR envelope + `---` beats + Request/Response Flow (this template). **legacy** = predates the envelope; content is current, structure is the older shape.

| File | Day | Topic | Format |
|---|---|---|---|
| `day-01-types-and-async-2026-08-14-1750.md` | 1 | Types & Async | new |
| `day-02-api-skeleton-2026-08-17-1750.md` | 2 | API Skeleton | new |
| `day-03-postgres-orm-2026-08-19-1750.md` | 3 | Postgres + ORM | new |
| `day-04-crud-error-contract-cascade-2026-08-26-1800.md` | 4 | CRUD, Error Contract, Cascade | new |
| `day-05-docker-compose-2026-09-03-1300.md` | 5 | Docker Compose (Postgres + App) | new |
| `day-06-aws-deploy-2026-09-11-1718.md` | 6 | AWS Deploy | new |
| `day-07-ci-2026-09-15-1151.md` | 7 | CI | new |
| `day-08-auth0-badge-reader-2026-09-21-1710.md` | 8 | Auth0 Badge Reader | new |

