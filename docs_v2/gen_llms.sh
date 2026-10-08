#!/usr/bin/env sh
# gen_llms.sh — regenerates docs_v2/llms.txt from the docs_v2 tree.
# Run:  sh docs_v2/gen_llms.sh [DOCS_DIR] [OUT_FILE]
#   DOCS_DIR  defaults to the directory this script lives in (docs_v2/)
#   OUT_FILE  defaults to <that dir>/llms.txt — ONE committed artifact.
#             (The old `llms.txt.preview` is retired: a second file holding
#              the same data is exactly the rot pattern — one output only.)
#
# Design: the ONLY hand-maintained content is the SUMMARY + DOCMAP + LEGACY
# blocks below (free text in THIS script, never in llms.txt). Everything under
# "ADRs / Day notes" is derived from filenames and Status lines —
# never hand-written, hence never fabricatable. The hand-written llms.txt of
# 2026-09-21 (a ULID summary for a uuid4 ADR, a link to a file that did not
# exist) is what this file replaced.
#
# EOD, last step:  sh docs_v2/gen_llms.sh   (1 second; idempotent)

set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
DOCS="${1:-$HERE}"
OUT="${2:-$HERE/llms.txt}"

{
  echo "# Taskflow"
  echo

  cat <<'SUMMARY'
> A dual-language restaurant: two independent kitchens (TS/Fastify, Python/FastAPI)
> cook the same API contract behind one door (Auth0) and an external cashier
> (Razorpay), sharing only Postgres and the public contract — never each other's code.
> Docs carry WHY / DECIDED / NEXT-OWED-TO / DEBT; the code is the WHAT.
>
> **Read order:** `README.md` (below) → `../docs/prompts/master.md` (the 18 rules)
> → the latest note + its ADR + the roadmap's Next row → then *code*.
SUMMARY
  echo

  # ── NOW — the derived position. The only section of this file that *changes* between
  #    runs — and it can never be hand-written (the hand-written predecessor, v1 roadmap
  #    §16 "last updated 2026-09-25", rotted in a week; a derived one can't).
  #    Inputs: the newest notes/ filename + debt.md's Status column + git + the
  #    roadmap's §16 Next row. All of these already exist for the EOD ritual;
  #    NOW costs no new ritual, only their parsing.
  echo "## NOW"
  echo "*(derived on every run — never hand-edited)*"
  last=$(ls "$DOCS"/notes/day-*.md 2>/dev/null | sort | tail -1)
  if [ -n "$last" ]; then
    b=$(basename "$last" .md)
    nnum=$(printf '%s' "$b" | sed -E 's/^day-([0-9]+)-.*/\1/')
    nlab=$(printf '%s' "$b" | sed -E 's/^day-[0-9]+-//; s/-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}$//')
    ndte=$(printf '%s' "$b" | sed -E 's/^(.*)-([0-9]{4}-[0-9]{2}-[0-9]{2})-[0-9]{4}$/\2/')
    echo "- last: day-$nnum ($ndte — $nlab) → notes/$b.md"
  else
    echo "- last: none yet"
  fi
  branch=$(git -C "$DOCS" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
  head1=$(git -C "$DOCS" log -1 --format='%h %s' 2>/dev/null || echo '?')
  dirty=$(git -C "$DOCS" status --porcelain 2>/dev/null | wc -l | tr -d '[:space:]')
  echo "- git: $branch · HEAD $head1 · $dirty uncommitted path(s)"
  bt=$(printf '\140')    # a backtick via octal — none appears raw inside the awk program below
  open=$(awk -F'|' -v bt="$bt" '/^\|/ && $6 ~ /open|claimed/ { id=$2; gsub(/[*]/, "", id); gsub(bt, "", id); sub(/^ +/, "", id); if (split(id, A, " ") > 0) { if (s != "") s = s " · "; s = s A[1] } } END { print s }' "$DOCS"/debt.md 2>/dev/null || true)
  if [ -n "$open" ]; then
    echo "- open debts: $open → debt.md (triggers, not dates)"
  else
    echo "- open debts: none"
  fi
  # The "next" always derives from the roadmap's §16 Next row (EOD step 4 keeps it
  # alive every day). v2 drafts no day+1 prompt file, so there is no
  # "prompt file" branch — the old fallback path is now the only path. Copy the row's
  # *own words* — a pointer, never a re-derivation (ADR-013 rule 2); if the section
  # moved and nothing parses, degrade to a bare pointer.
  nextrow=$(awk '/^## 16\./ { f = 1; next } f && /^## [0-9]/ { exit } f && /^[0-9]+\. / { sub(/^[0-9]+\. */, ""); gsub(/\*/, ""); gsub(/`/, ""); print; exit }' "$DOCS/../docs/roadmaps/v4/master.md" 2>/dev/null | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')
  if [ -n "$nextrow" ]; then
    echo "- next: $nextrow … → roadmap §16 (../docs/roadmaps/v4/master.md)"
  else
    echo "- next: → roadmap 'Current Status & Next' (../docs/roadmaps/v4/master.md) — its first numbered row is the day"
  fi
  echo

  cat <<'DOCMAP'
## Docs map (everything in this tree)
- [README](README.md): what lives where + the EOD procedure
- [daily-flow](daily-flow.md): your daily operating sheet — the full cycle (kickoff → work → closeout) in one file
- [debt](debt.md): *the* debt ledger — one row per debt; grep this to see what's open
- [roadmap](../docs/roadmaps/v4/master.md): the single living roadmap — one line per day; *grep for NEXT*
- [AGENTS.md](../AGENTS.md): the session-start pointer (rules 1/4) — a new agent session reads this first
DOCMAP
  echo

  echo "## ADRs (newest first — *status tells you whether it's still law*)"
  for f in "$DOCS"/adrs/adr-*.md; do
    [ -f "$f" ] || continue
    b=$(basename "$f" .md)            # the untouched name — number & slug cut out of it, never rebuilt from parts
    num=$(printf '%s' "$b" | sed -E 's/adr-([0-9]+)-.*/\1/')
    slug=$(printf '%s' "$b" | sed -E 's/adr-[0-9]+-//')
    status=$(grep -m1 'Status' "$f" | tr -d '*' | sed -E 's/^>[ ]*//; s/^[[:space:]]*Status[[:space:]]*:[[:space:]]*//' | cut -d'·' -f1 | sed 's/[[:space:]]*$//')
    [ -z "$status" ] && status="?"
    printf '%s|%s|%s|%s\n' "$num" "$slug" "$b" "$status"
  done | sort -t'|' -k1,1nr | while IFS='|' read -r n s b st; do
    echo "- [ADR-$n $s](adrs/$b.md): *status: $st*"
  done
  echo

  echo "## Day notes (newest first)"
  for f in "$DOCS"/notes/day-*.md; do
    [ -f "$f" ] || continue
    b=$(basename "$f" .md)
    date=$(printf '%s' "$b" | sed -E 's/^(.*)-([0-9]{4}-[0-9]{2}-[0-9]{2})-[0-9]{4}$/\2/')
    label=$(printf '%s' "$b" | sed -E 's/-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}$//')
    printf '%s|%s|%s\n' "$date" "$label" "$b"
  done | sort -t'|' -r | while IFS='|' read -r d l b; do
    echo "- [$l](notes/$b.md): *$d*"
  done
  echo

  # Standing notes — not day-scoped (no `day-NN-…-date-time` name, so the
  # section above's glob skips them; this section is their only listing).
  echo "## Standing notes"
  found=0
  for f in "$DOCS"/notes/*.md; do
    [ -f "$f" ] || continue
    case "$f" in */day-*) continue ;; esac
    b=$(basename "$f" .md)
    echo "- [$b](notes/$b.md)"
    found=1
  done
  [ "$found" = 1 ] || echo "- (none yet)"
  echo

  cat <<'LEGACY'
## v1-era history — docs/ (read-only; touch it only when a past decision is needed)
- [ADRs](../docs/adrs/): the pre-v2 decision log — read *one on demand*, never in bulk
- [day notes](../docs/notes/) · [day prompts](../docs/prompts/)
- [master prompt (the 18 rules)](../docs/prompts/master.md): read on *any* session
- [scraps](../docs/scraps/README.md): the user's private backup — *do not* read or cite unprompted
LEGACY

  # Code section — DERIVED existence check, deliberately not heredoc: a static link to a
  # file can rot (the hand-written manifest of 2026-09-21 linked files that did not
  # exist). A check prints *MISSING* instead, so an absent target is *visible as absent*
  # rather than a silent dead link.
  # The link paths are relative to llms.txt (i.e. $DOCS), so the probe joins $DOCS,
  # not the repo root — `../apps` is one hop, from docs_v2.
  code_link() { # $1=relative path  $2=label  $3=note
    if [ -e "$DOCS/$1" ]; then
      echo "- [$2]($1): $3"
    else
      [ -n "$4" ] && echo "- [$2]($1): $3 — *MISSING ($4)*" || echo "- [$2]($1): $3 — *MISSING*"
    fi
  }
  echo
  echo "## Code — where the *what* lives (docs carry WHY/DECIDED/DEBT; the code is the source of the rest)"
  code_link '../apps/taskflow/py/src/'           "py kitchen"    "FastAPI — main.py composition root, auth.py, db.py, repository.py"
  code_link '../apps/taskflow/ts/src/'           "ts kitchen"    "Fastify/ESM — server.ts composition root, auth.ts, db.ts"
  code_link '../apps/taskflow/py/tests'          "golden matrix" "the *parity-by-test* source of truth — read before touching either kitchen's auth"
  code_link '../apps/taskflow/scripts/smoke.sh'  "smoke tests"   "the live-door tests (ADR-009)"  "deleted 2026-10-05 on purpose — docs-generation test artifact; regenerate, don't restore"
  code_link '../apps/taskflow/deploy/'           "deploy"        "env template + prod compose (ADR-006)"
  code_link '../.github/workflows/ci.yml'        "CI"            "the zero-service golden-matrix gate (ADR-010)"
} > "$OUT"

echo "wrote $OUT"
