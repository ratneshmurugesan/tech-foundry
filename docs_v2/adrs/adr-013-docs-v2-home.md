# ADR-013 (ADR-lite): `docs_v2` is the v2-era docs home; the ledger is one row; the manifest is generated

**Status**: Active · **Date**: 2026-10-03 · **Deciders**: user + AI · **Supersedes**: the `test_docs`/`test_docs_v2` throwaway-sandbox pattern

## Picture
Five days after the last note, the docs tree is *rotting on a clock*: a hand-written `llms.txt` fabricates a ULID decision and links to a nonexistent file; the debt ledger's own rows assert a `(2026-10-10)` date that arrived and lied. The 2026-09-30 rehearsal found both defects and proposed the fix in a **throwaway directory that was never committed**. This ADR promotes that directory to the real home.

## Decision
1. **One write-side home.** New-era docs go to `docs_v2/` (`notes/ adrs/ prompts/` + `debt.md` + `llms.txt`). `docs/` is **read-only v1-era history**: it is *linked* from `../docs/`, never copied — a copy is a second source of truth, and the second copy always rots first.
2. **One row per debt.** Anything deferred writes a row in `debt.md` and *links* the row from the ADR/note. A due date never appears as prose: it is `open` / `claimed(day-N)` / `done (link note)` / `dropped (link ADR + why)`, or *unowed* with a concrete revisit trigger. One row cannot drift.
3. **The manifest is derived.** `gen_llms.sh` regenerates `llms.txt` from filenames + `Status:` lines; the only hand-maintained content is the summary blocks *inside the script*, and there is **one** output file (no `.preview` twin — a twin is just slow rot).

## Consequences
- **Positive:** a session learns "what's open + where to read" from two files; a stale manifest is possible, a *wrong* one is not; EOD is a 5-step, ≈5-minute ritual with no 25-step choreography.
- **Negative / tax:** two top-level doc trees (`docs/`, `docs_v2/`) for ~one transition day — readers must know `docs/` is history. Accepted: the v2 era is real (ADR-101 was wired into all six v1 files; day-12's prompt ran under it for 5 days), so it gets a real home rather than a fourth scratch dir. When v1's last readers go cold, `docs/` gains a one-line "superseded by docs_v2" banner; the tree itself is never merged.
