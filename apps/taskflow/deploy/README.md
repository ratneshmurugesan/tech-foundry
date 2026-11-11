# deploy — one command, Mac → $0 box → street

The restaurant's front-of-house runbook. One script owns the whole path:

```
./deploy.sh
```

runs on the **Mac**, over ssh, against the **$0 box** (the t3.small that
already runs the stack), and proves the result **from the street** — the
public URLs, curl'd from this machine. If the script exits 0, the deploy is
proven, not assumed.

| | |
|---|---|
| **What deploys** | `origin/dev` — the box's `~/tech-foundry` is reset to it. The working tree on the box is never the source of truth. |
| **What builds** | the prod chart: `docker-compose.yml` + `docker-compose.prod.yml` overlay (ADR-008/009) — `--build` re-bakes all four images (py, ts, web, db-push) |
| **What is never touched** | the gitignored env files (`.env`, `ts/.env`, `py/.env`, `web/.env.local`) — the box's copies are **audit-checked, never overwritten**. The box's tree is a git repo; `git reset --hard` leaves untracked/ignored files alone. |
| **What proves it** | four street curls + the cellar-door refusal, run from the Mac (see below) |

## The street (what the public sees)

| URL | What | Proof |
|---|---|---|
| `https://taskflow-fe.ratnesh-foundry.space/workspaces` | the dining room (web) — **the canonical entry URL** | 200 |
| `https://taskflow-fe.ratnesh-foundry.space/api/…` | the web's `/api` proxy → TS counter | 401 (badge demanded) |
| `https://taskflow.ratnesh-foundry.space` | the py counter (8001) | `/` → 200 |
| `https://taskflow.ratnesh-foundry.space/webhooks/razorpay` | the webhook door — **Razorpay must point here** | 405 (route exists) |
| `5432` on the box | the cellar's door — must be **refused** (ADR-008) | 000 |

**Known quirk — the root `/` answers 404 to non-JS clients.** The root page
is a client-side redirect (`page.tsx` → `redirect("/workspaces")`), which
Next serializes in a *prerender* as HTTP 404 + a `NEXT_REDIRECT` digest.
Browsers execute the digest and land on `/workspaces`; `curl` and other
non-JS clients see the 404. This is by design, not a broken deploy — and it
is why the web healthcheck probes `/workspaces`, never `/`.

## The six steps

1. **Preflight** — ssh key exists, local `dev` tip == `origin/dev` tip
   (you pushed what you think you deployed), box reachable, docker present.
2. **Sync** — box: `git fetch && git reset --hard origin/dev` (submodules:
   none). The box's tree becomes exactly `origin/dev`.
3. **Env audit** — the four gitignored env files must exist on the box.
   Read-only: the script never writes them.
4. **Build + up** — `docker compose -f … -f … up -d --build` (base + prod
   overlay; the ADR-008/009 `!reset` tags do the prod shaping).
5. **Health wait** — poll `compose ps` until postgres/ts/py/web are
   `running healthy` and `db-push` exited 0 (timeout 300s).
6. **Street proof** — the four curls above, from the Mac. Any miss = FAIL.

## Rehearsal mode

```
DRY_RUN=1 ./deploy.sh
```

runs every step **except** the two mutating ones (no `git reset` on the box,
no `compose up`). The health step degrades to a single status snapshot —
the box was not synced, so its running containers may predate chart changes
in your working tree, and a blocking wait would just burn the timeout.
Use it to shake out ssh/path/URL problems before a real run.

## Tunables (env overrides)

| var | default | meaning |
|---|---|---|
| `SSH_KEY` | `~/Tech/vault/docs/aws-cloud/foundry-taskflow-app.pem` | the key that opens the box |
| `BOX_HOST` | `ubuntu@ec2-13-222-127-242.compute-1.amazonaws.com` | the $0 box |
| `BOX_REPO` | `~/tech-foundry` | the repo clone on the box |
| `HEALTH_TIMEOUT` | `300` | seconds to wait for the stack to go green |
| `DRY_RUN` | `0` | `1` = rehearsal (no mutating steps) |

## What this is NOT

- **Not a CI/CD pipeline.** It runs from your Mac, with your key. The
  zero-service CI (ADR-010) still owns *verification*; this owns *deployment*.
- **Not blue/green.** `up -d --build` recreates containers in place; there is
  a brief window where the web is rebuilding. For a $0 box serving one
  human, that is the right trade.
- **Not the Make-it-Right path.** Multi-tenant RLS / K3s / Helm / GitOps
  (build ledger §5) will supersede this; when it does, this script retires.
