#!/usr/bin/env zsh
#
# Day 4 — Error Contract + Cascade (smoke_test_day_04-error-contract.sh)
#
# Smoke test for the ADR-007 contract: shared 400/404/500 JSON shapes,
# parent-reference 404s, DELETE 204, and live DB-level cascade —
# asserted against BOTH server tracks (TS :8000, PY :8001) for parity.
#
# Usage:
#   zsh apps/taskflow/smoke_tests/smoke_test_day_04-error-contract.sh
#   TS_BASE=http://localhost:8000 PY_BASE=http://localhost:8001 ./... (env also works)
#
# Requires the two servers to be running. Needs `jq`.
# Written for zsh (the shebang) — invoke as `zsh <script>` or run directly.

TS_BASE=${1:-"http://localhost:8000"}
PY_BASE=${2:-"http://localhost:8001"}
RND=00000000-0000-4000-8000-000000000000
FAILS=0

type -p jq >/dev/null || { echo "jq is required"; exit 2; }

http() { # $1=method $2=path $3=json(optional) -> sets CODE, FULLBODY (for jq), BODY (truncated display)
  if [[ -n "$3" ]]; then
    RESP=$(curl -s -m 8 -w $'\n%{http_code}' -X "$1" "$BASE$2" -H 'content-type: application/json' -d "$3")
  else
    RESP=$(curl -s -m 8 -w $'\n%{http_code}' -X "$1" "$BASE$2")
  fi
  CODE=${RESP##*$'\n'}
  FULLBODY=${RESP%$'\n'*}
  BODY=$FULLBODY
  [[ ${#BODY} -gt 160 ]] && BODY="${BODY:0:160}..."
}

check() { # $1=label $2=expected status
  if [[ "$CODE" == "$2" ]]; then
    echo "PASS  $1  (got $CODE)  $BODY"
  else
    echo "FAIL  $1  (expected $2, got $CODE)  $BODY"
    FAILS=$((FAILS + 1))
  fi
}

suite() { # $1=label $2=base
  local label=$1
  BASE=$2
  echo
  echo "=== $label ($BASE) ==="

  # -- Workspaces ---------------------------------------------------------
  http POST /workspaces '{"name":"verify-alpha"}'
  check "01 create workspace                -> 201" 201
  local WS=$(jq -r '.id' <<<"$FULLBODY")

  http POST /workspaces '{"name":"x"}'
  check "02 short name                      -> 400" 400

  # -- Missing resources ----------------------------------------------------
  http GET    /projects/$RND
  check "03 GET missing project             -> 404" 404

  http DELETE /projects/$RND
  check "04 DELETE missing project          -> 404" 404

  # -- Parent-reference validation -------------------------------------------
  http POST /projects "{\"workspace_id\":\"$RND\",\"name\":\"lonely project\"}"
  check "05 project into missing workspace  -> 404" 404

  http POST /projects "{\"workspace_id\":\"$WS\",\"name\":\"real project\"}"
  check "06 create real project             -> 201" 201
  local PID=$(jq -r '.id' <<<"$FULLBODY")

  http PATCH /projects/$PID "{\"workspace_id\":\"$RND\"}"
  check "07 PATCH into missing workspace    -> 404" 404

  http PATCH /projects/$PID '{"name":"renamed ok"}'
  check "08 PATCH name-only                 -> 200" 200

  # -- Issues ---------------------------------------------------------------
  http POST /issues "{\"project_id\":\"$RND\",\"title\":\"missing parent\"}"
  check "09b issue into missing project     -> 404" 404

  http POST /issues "{\"project_id\":\"$PID\",\"title\":\"cascade witness issue\"}"
  check "09 create issue                    -> 201" 201
  local IID=$(jq -r '.id' <<<"$FULLBODY")

  # -- Cascade (the point of this whole note) ---------------------------------
  http DELETE /workspaces/$WS
  check "10 delete workspace                -> 204" 204

  local left_projects left_issues
  left_projects=$(curl -s -m 8 "$BASE/projects" | jq '[.[] | select(.workspace_id == "'"$WS"'")] | length')
  left_issues=$(curl -s -m 8 "$BASE/issues" | jq '[.[] | select(.id == "'"$IID"'")] | length')
  if [[ "$left_projects" == "0" ]]; then echo "PASS  11 cascade: projects of deleted ws are gone"; else echo "FAIL  11 cascade: $left_projects project(s) survived ws delete"; FAILS=$((FAILS + 1)); fi
  if [[ "$left_issues" == "0" ]]; then echo "PASS  12 cascade: child issue is gone"; else echo "FAIL  12 cascade: issue still present after ws delete"; FAILS=$((FAILS + 1)); fi
}

suite "TS :8000" "$TS_BASE"
suite "PY :8001" "$PY_BASE"

echo
if [[ $FAILS -eq 0 ]]; then
  echo "=== ALL CHECKS PASSED on both servers ==="
  exit 0
else
  echo "=== $FAILS check(s) FAILED (see above) ==="
  exit 1
fi
