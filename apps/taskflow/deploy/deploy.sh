#!/usr/bin/env bash
# =============================================================================
# deploy.sh — one-command deploy: Mac -> $0 box -> street
#
#   ./deploy.sh            # deploys origin/dev to the box, proves it from here
#   DRY_RUN=1 ./deploy.sh  # runs every step EXCEPT the mutating ones
#                           # (no git reset, no compose up) — safe rehearsal
#
# What it does, in one line:
#   the box's ~/tech-foundry is reset to origin/dev, the prod chart
#   (base + ADR-008/009 overlay) is rebuilt and re-`up`ped, and the
#   public URLs are curl'd from THIS machine — the street is the test.
#
# What it does NOT do (house law, rule 13):
#   it never commits, never pushes, never touches the gitignored .env
#   files. It only VERIFIES they exist (Section 5) — a missing RAZORPAY
#   key is a designed 503, not a deploy blocker.
#
# The box model (day-06, ADR-008):
#   postgres  — cellar, NO host port (doorless; 5432 must be refused)
#   taskflow-ts — counter, 8000 (the web proxy's target)
#   taskflow-py — counter, 8001 (serves the /webhooks/razorpay door)
#   taskflow-web — dining room, 3000 (behind the taskflow-fe tunnel)
#   db-push   — one-shot schema owner, exits 0, `restart: no`
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# SECTION 0 — configuration (override any of these from the environment)
# -----------------------------------------------------------------------------
# Every fact about the deployment target lives here and NOWHERE ELSE.
# A new box = new values here; the steps below never change.
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/Tech/vault/docs/aws-cloud/foundry-taskflow-app.pem}"
BOX_HOST="${DEPLOY_HOST:-ubuntu@ec2-13-222-127-242.compute-1.amazonaws.com}"
# `~` on purpose: this path must expand on the BOX, not on this Mac. The box()
# calls below interpolate it into the remote command string UNquoted, so the
# box's own shell does the tilde expansion. (A `$HOME` default would silently
# point at the Mac's home — the 2026-11-11 first-run bug.)
BOX_REPO="${DEPLOY_REPO:-~/tech-foundry}"             # repo checkout ON the box
APP_DIR="apps/taskflow"                               # compose project root (relative)
BOX_APP="$BOX_REPO/$APP_DIR"                         # ...made absolute: ssh lands in ~,
                                                     # so every box command cds here
BRANCH="${DEPLOY_BRANCH:-dev}"                        # what the box resets to
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
HEALTH_TIMEOUT="${DEPLOY_HEALTH_TIMEOUT:-300}"       # seconds to wait for healthy
DRY_RUN="${DRY_RUN:-0}"

# The street — what the public sees (Cloudflare in front, tunnels behind).
FE_URL="${DEPLOY_FE_URL:-https://taskflow-fe.ratnesh-foundry.space}"   # web + /api proxy
MAIN_URL="${DEPLOY_MAIN_URL:-https://taskflow.ratnesh-foundry.space}"   # py kitchen

# -----------------------------------------------------------------------------
# SECTION 1 — helpers (one voice for output, one way to die)
# -----------------------------------------------------------------------------
c() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
say()  { printf '%s\n' "$(c 1 "==> $*")"; }          # section banners
step() { printf '  %s\n' "$*"; }                     # sub-steps
warn() { printf '  %s\n' "$(c 33 "WARN: $*")"; }
die()  { printf '\n%s\n' "$(c 31 "FAIL: $*")" >&2; exit 1; }

# box — run a command ON the box. BatchMode: never hang on a password prompt.
box() {
  ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$BOX_HOST" "$@"
}

# expect_code <url> <expected-http-code> <label>
# The street-gate idiom from day-06: curl from OUTSIDE the block and assert
# the exact code. 000 (no answer) always fails.
expect_code() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1" || echo 000)
  if [[ "$code" == "$2" ]]; then
    step "OK   $3 -> $code"
  else
    die "$3 -> got $code, expected $2"
  fi
}

# -----------------------------------------------------------------------------
# SECTION 2 — preflight (fail fast, before anything mutates)
# -----------------------------------------------------------------------------
say "Preflight"
[[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY"
step "ssh key: $SSH_KEY"

# The box deploys ORIGIN/$BRANCH, not your working tree. If local and remote
# tips differ, the deploy would ship something you haven't pushed — say so.
cd "$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
local_tip=$(git rev-parse --short HEAD)
remote_tip=$(git ls-remote origin "refs/heads/$BRANCH" | cut -c1-7)
step "local $BRANCH tip: $local_tip | origin/$BRANCH tip: ${remote_tip:-<none>}"
[[ "$local_tip" == "$remote_tip" ]] || warn "origin/$BRANCH ($remote_tip) != local ($local_tip) — the box will deploy the REMOTE tip. Push first if you meant local."
[[ -n "$remote_tip" ]] || die "origin has no $BRANCH branch — nothing to deploy"

box "echo reachable" >/dev/null || die "cannot reach $BOX_HOST"
box "command -v docker" >/dev/null || die "no docker on the box"
step "box reachable, docker present"

# -----------------------------------------------------------------------------
# SECTION 3 — sync (the box's tree becomes exactly origin/$BRANCH)
# -----------------------------------------------------------------------------
# `fetch` + `reset --hard` instead of `pull`: deterministic. The box is a
# deployment target, not a development machine — its tree has no business
# holding local edits (the 2026-11-11 dirty-tree incident is why this exists:
# hand-edits on the box silently diverged from the repo).
say "Sync box to origin/$BRANCH ($remote_tip)"
if [[ "$DRY_RUN" == "1" ]]; then
  step "DRY_RUN: skipping git fetch + reset"
else
  box "cd $BOX_REPO && git fetch origin $BRANCH && git reset --hard origin/$BRANCH && git rev-parse --short HEAD" \
    | step "box now at"
fi

# -----------------------------------------------------------------------------
# SECTION 4 — env-file audit (verify only; the files are gitignored secrets)
# -----------------------------------------------------------------------------
# The compose chart references three env files, all `required: false` by
# design (ADR-014/015): a missing file must never block an `up`. But a
# missing file means a designed degradation, so the deploy REPORTS it:
#   .env / web/.env.local  missing -> login + checkout can't be configured
#   ts/.env / py/.env      missing -> money routes fail closed to 503
say "Env-file audit (gitignored — never touched, only checked)"
box "cd $BOX_APP && for f in .env web/.env.local ts/.env py/.env; do
      if [[ -f \$f ]]; then echo \"present  \$f\"; else echo \"ABSENT   \$f\"; fi; done" \
  | while read -r line; do
      step "$line"
      # if, not `[[ ]] && warn`: under set -e + pipefail a bare `&&` list
      # that ends on a false test would sink the whole pipeline (and the
      # day) the moment the last env file happens to be `present`.
      if [[ "$line" == ABSENT* ]]; then
        warn "a designed degradation is live (see docker-compose.yml header)"
      fi
    done

# -----------------------------------------------------------------------------
# SECTION 5 — build + up (the whole restaurant, one command)
# -----------------------------------------------------------------------------
# base chart + prod overlay (ADR-008/009): the overlay's `!reset []` vetoes
# every dev mount, so the baked images ARE the trees. `--build` re-bakes on
# source change; unchanged layers are cached, so a no-op deploy is cheap.
say "Build + up (base + prod overlay)"
if [[ "$DRY_RUN" == "1" ]]; then
  step "DRY_RUN: skipping compose up"
else
  # Stream the box's output; a build failure must surface verbatim.
  box "cd $BOX_APP && docker compose $COMPOSE_FILES up -d --build"
fi

# -----------------------------------------------------------------------------
# SECTION 6 — health wait (compose's own healthchecks are the source of truth)
# -----------------------------------------------------------------------------
# Every long-lived service declares a healthcheck in the base chart; db-push
# is one-shot (`restart: no`) and "healthy" for it means exited with code 0.
# We poll `docker compose ps --all` until the whole table is green, or the
# timeout trips. Two compose quirks shape the matching below:
#   • container NAMES carry the project prefix + index: the web service
#     `taskflow-web` runs as container `taskflow-taskflow-web-1`. So we
#     match the service name as a SUBSTRING of the line, never anchored.
#   • plain `ps` hides exited containers — `--all` is required to see
#     db-push at all once it has done its one job.
say "Waiting for health (timeout ${HEALTH_TIMEOUT}s)"
if [[ "$DRY_RUN" == "1" ]]; then
  # Rehearsal: the box was NOT synced (section 3 skipped), so the running
  # containers may predate chart changes in your working tree — e.g. the
  # web healthcheck added alongside this script is absent from a box that
  # sits at an older commit, and a blocking wait would burn the full
  # HEALTH_TIMEOUT against a stack a REAL run would recreate anyway. Take a
  # single snapshot; the real run does the polling loop below.
  step "DRY_RUN: status snapshot (no blocking wait)"
  box "cd $BOX_APP && docker compose $COMPOSE_FILES ps --all --format '{{.Name}} {{.State}} {{.Health}}' 2>/dev/null" \
    | sed 's/^/  /'
else
  deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
  while :; do
    status=$(box "cd $BOX_APP && docker compose $COMPOSE_FILES ps --all --format '{{.Name}} {{.State}} {{.Health}}' 2>/dev/null")
    ok=1
    for svc in postgres taskflow-ts taskflow-py taskflow-web; do
      grep "$svc" <<<"$status" | grep -q "running healthy" || ok=0
    done
    grep "db-push" <<<"$status" | grep -qE "exited|running" || ok=0
    # "exited" alone proves nothing — a FAILED db-push also exits. The exit
    # code is the verdict: 0 = schema pushed, anything else = red. `-aq`
    # (not `-q`): plain `ps` hides exited containers, which is exactly the
    # state db-push ends in — without -a the verdict would be unobtainable.
    dbpush_code=$(box "cd $BOX_APP && docker inspect --format '{{.State.ExitCode}}' \$(docker compose $COMPOSE_FILES ps -aq db-push) 2>/dev/null" || echo "?")
    [[ "$dbpush_code" == "0" || "$dbpush_code" == "?" ]] || ok=0
    if [[ "$ok" == "1" ]]; then
      step "all green"
      break
    fi
    if (( $(date +%s) > deadline )); then
      step "$status"
      die "stack not healthy within ${HEALTH_TIMEOUT}s"
    fi
    sleep 5
  done
fi

# -----------------------------------------------------------------------------
# SECTION 7 — street proof (curl from THIS machine; the street is the test)
# -----------------------------------------------------------------------------
# Same gates as day-06, upgraded to the Cloudflare front door:
#   FE /workspaces   200 — the dining room answers (Next prerender)
#   FE /api/...      401 — the proxy reached the TS counter, which demanded a badge
#   main /           200 — the py counter answers
#   box :5432        refused — the cellar is doorless (ADR-008), even from inside
say "Street proof"
expect_code "$FE_URL/workspaces"        200 "dining room ($FE_URL/workspaces)"
expect_code "$FE_URL/api/workspaces"    401 "proxy->TS counter (badge demanded)"
expect_code "$MAIN_URL/"                200 "py counter ($MAIN_URL/)"
if box "nc -z localhost 5432" 2>/dev/null; then
  die "cellar door is OPEN on the box — ADR-008 violated"
else
  step "OK   cellar doorless (5432 refused on the box)"
fi

# -----------------------------------------------------------------------------
# SECTION 8 — summary (the receipt)
# -----------------------------------------------------------------------------
say "Deployed"
step "commit : $remote_tip (origin/$BRANCH)"
step "dining : $FE_URL"
step "py     : $MAIN_URL"
step "webhook: $MAIN_URL/webhooks/razorpay (Razorpay must point here)"
step "the restaurant is open."
