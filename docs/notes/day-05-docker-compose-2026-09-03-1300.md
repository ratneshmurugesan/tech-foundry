# Day 5: Docker Compose (Postgres + App)

> **Generated**: 2026-09-04 (EOD) · **Executed**: Aug 28 → Sep 3, 2026
> **Phase**: Phase 1 — Make it Work · **Sprint 1** (Week 2) · **Stack**: Taskflow (REST API)
> **Reference**: `tech-foundry/docs/roadmaps/v4/foundry-roadmap-v4-2026-08-11-1840.md`
> **ADR Reference**: `tech-foundry/docs/adrs/` (ADR-006 is the canonical record; ADRs not committed here)

---

## Connection

> Executed across Aug 28 – Sep 3 (2026). Day-4's preview promised the restaurant moves into a *shipping container*: **one `docker compose up`** opens the whole place — cellar (Postgres), counter ×2 (TS:8000 / PY:8001), and the schema owner. It committed to "single compose, thin Dockerfile per track (`node:20` / `python:3.12` / `uv`), named volume, and `pnpm db:push` **first** (Day-4's DDL)." Delivered: all of it — plus a `db-push` *service* (better than a manual "step 1"), real app healthchecks, and a much longer **build/debug gauntlet** than the preview imagined. The two deviations below.

## Built (micro-steps)

- **Single `apps/taskflow/docker-compose.yml`** — a `postgres:15` cellar, `taskflow-ts`, `taskflow-py`, and a one-shot **`db-push`** schema-owner; `postgres_data` named volume; `db-push` runs `pnpm db:push` *before* the apps boot (`depends_on: service_completed_successfully`).
- **`ts/Dockerfile`** — `node:22-alpine` + corepack pnpm + `pnpm install --frozen-lockfile` + `pnpm dev`.
- **`py/Dockerfile`** — `python:3.12-slim` + uv + `uv sync --frozen --no-dev --no-install-project` + `uv run python -m src.main`.
- **Ignore files** — `ts/.dockerignore` + `py/.dockerignore` (keep `.venv`/`node_modules`/build out of the *context*); root `.gitignore` (`.venv/`, `__pycache__`, build artifacts) — this one was **untracked** at the start and got *committed* for the Dockerfile.
- **`db:push` first, in the box** — the Day-3/4 "schema must run before the app" rule, *encoded as a service* so `docker compose up` is genuinely one command.
- **Healthchecks + `start_period: 10s`** on both apps — a real "the counter is serving orders" signal, not a blind sleep.
- **`server.ts` `process.env.PORT ?? 8000`** — the container's `8000`/`8001` binding actually works; without it Fastify ignored the PORT.
- **Shipped** — committed + pushed as `e5c518b feat: Introduce Docker Compose setup` (= `origin/dev`).

## Learned (concepts, patterns, OSS references)

- **Recipe vs seating chart.** The *Dockerfile* is a recipe (immutable, layer-cached); *compose* is the seating chart (mutable, hot). Same kitchen, two verbs: the app containers `build` once, then *mount* source at run-time so a code edit is a `restart`, not a rebuild — the Day-4 "rebuild after DDL" lesson, wearing Docker clothes.
- **`uv sync --frozen --no-dev --no-install-project`.** Locked deps, no test harness in the image, and `--no-install-project` means "don't install *ourselves* into site-packages" — the source of truth stays in `/app` (the `COPY . .` + run-from-`/app` path), so there's exactly one copy of `src`.
- **The pnpm-in-a-box TTY trap → `CI: "true"`.** pnpm detects "no controlling terminal" inside a non-interactive container and *bails* on the interactive prompt — the classic "works in my terminal, dies in the image." The one-line `CI: "true"` is the known unblock; it's a *run* env, not a code change.
- **Honest healthchecks.** `wget --spider` returns 0 on *any* HTTP response — a `503` from a not-yet-ready Fastify counts as "alive-ish," so the app is `running` but *unready*; the `127.0.0.1` (not `localhost`) probe + `start_period: 10s` is what flips it to `healthy` without a false negative. A 503/500 is *information*, not a crash — the Day-4 contract, observed live from the container.
- **Two "ready" verbs in one `depends_on`.** `postgres` waits to be *healthy* (still up = a tenant); `db-push` waits to have *finished* (runs once = prep). "service_healthy" vs "service_completed_successfully" is the difference between "the landlord is here" and "the prep crew clocked out."
- **Anonymous volume → named volume (the Day-3 mystery, resolved).** The cellar gets a *deed*: `postgres_data:/var/lib/postgresql/data` + top-level `volumes: postgres_data` → `docker volume ls` names it, data survives `down` *without* `-v`, and `down -v` is the only demolition. The `/app/__pycache__` **anonymous-volume** trick keeps Docker's own layer from being clobbered by the host mount over `/app` — an *anonymous* volume on the *app* side, a *named* one on the *DB* side.
- **OSS**: Plane (a full multi-service compose stack — the closest sibling), Streamlit (a minimal single-image Dockerfile), Fastify + uv as the two "thin" entrypoints.

## Broke & Fixed (debug gauntlet)

- **`docker compose build` (TS) → pnpm interactive-prompt bail / no TTY** → added `CI: "true"` run-env; the build finally completed its `pnpm install --frozen-lockfile` layer.
- **`node:20` → `node:22-alpine`.** pnpm's own postinstall ESM build wanted a newer Node; the committed preview said `node:20`, the working image is `node:22`. (Deviation ①)
- **Runtime `ERR_MODULE_NOT_FOUND` for a bare-specifier (`./ids`)** — the *mount* shadowed `/app/node_modules` with a host tree in a different *build* shape than the image. The stable unblock = the **`./ts/node_modules:/app/node_modules:cached`** mount + a real **host `pnpm install`** (the Day-3/4 "node_modules exists on the host" invariant, now *inside the box*). The root cause (build used the image's deps, run used the host's) is **deferred to Day-6** — the deploy story must decide: embed deps in the image, or `pnpm install` on the *server*. (Deviation ② / Day-6 gate.)
- **`db-push` → `ERR_MODULE_NOT_FOUND`** — the same image-vs-mount drift on the one-shot service; same node_modules-mount fix made the schema apply on the first `up` in the box.
- **App `unhealthy`** — the `docker inspect … .State.Health` crawl (12:19 → 13:26) proved the app *was up* (Fastify 503 until push) → so "unhealthy" was a *correct* signal, not a false alarm; the fix was `start_period: 10s` + a `127.0.0.1` probe, not a weaker check.
- **`docker system prune -a`** (a reflexive cleanup, ~14:52) **deleted the just-built image** → forced a full rebuild; the lesson = don't `prune -a` mid-iteration, or use a *tag* so the image isn't dangling.
- **`uv` rewrote `uv.lock`** during a py build (~17:50; `--frozen` in a `python:3.12-slim` uv differing from the uv that *wrote* the lock). It's clean again, but the **lockfile-pinning** follow-up is a **Day-6** item (pin the uv version in `py/Dockerfile` so the *server* box resolves the same tree).

## Blocked / deferred (carried to next day)

- **The `node_modules` mount is a dev shortcut** — clean locally (no rebuild on a code edit), but the *deploy* must resolve it definitively: embed deps in the image, or `pnpm install` on the AWS box. **Day-6 gate ①.**
- **`uv.lock` version-pinning** in `py/Dockerfile` (drift risk, above). **Day-6 gate ②.**
- **The named volume is now live** — `down -v` on the *production* box would wipe a real DB (the Day-3 cellar lesson, at stakes). The deploy recipe needs an explicit "this is your data" step. **Day-6 gate ③.**
- **`8000`/`8001` → a public URL** — the compose maps to localhost today; the deploy maps it to the AWS host. **Day-6** (and the `127.0.0.1` healthcheck must keep pointing *inward* when the app is public).

## Commands run

### By user (usual terminal)

The full session was a build/debug gauntlet across `apps/taskflow/` (reconstructed from `~/.zsh_history` for the span; representative, not exhaustive):

- **Build the image** — `docker build -t taskflow-ts` (many iterations; the first attempts hit the pnpm-`CI` + `node:22` issues above).
- **Rebuild the cellar + apps** — `docker compose down -v --remove-orphans` → `docker compose up -d` (the Day-3 *reset recipe*, now with the named volume and 4 services).
- **Diagnose the "unhealthy"** — `docker inspect --format='{{json .State.Health}}' taskflow-taskflow-ts-1`, `docker compose logs taskflow-ts`, `docker ps -a`, `docker compose logs db-push`.
- **Find the volume deed** — `docker inspect --format '{{range .Mounts}}{{.Name}}@{{.Destination}}...' taskflow-*` (the 15:28 cluster that *saw* the `postgres_data` named volume in the mounts — the ground truth the ADR-006 correction was waiting for).
- **Clean up between builds** — `docker system df`, `docker images`, `docker image/prune -a`, `docker rmi node`, `docker volume rm $(docker volume ls -qf dangling=true)`.
- **Ship** — `git push origin dev` (09-04 10:20, after the `e5c518b` commit).

### By me (hidden terminal) — verification, with outcomes

- `docker compose up -d` → 4 services; `docker compose ps` → **all `healthy` / `Up`**.
 - `curl 127.0.0.1:8000/stats` → TS `200 {"workspace":12,"project":11,"task":10,"label":10,"task_tag":10,"task_note":4}`; identical rows on `8001` (PY). **Same cellar, same 12/11, different faucet.**
- `curl -H 'X-Workspace-Id: ws-1' …/projects` on **both** ports → `200` `[proj-1…proj-11]` (**the `:cached` node_modules mount is working** — the Day-5 "fixed" gate).
 - **Named-volume deed** — `docker volume ls` reports `taskflow_postgres_data`; both DBs `healthy` and `GET /` on `8000` + `8001` → `200` `{"message":"Hello World"}`. Data **survives `down`** (only `down -v` / `prune` demolishes the cellar) — the Day-3 ambiguity the ADR-006 correction closes.
- **Cascade still live on the named volume** — `POST → proj-1 → task-1` (201) → `DELETE /projects/proj-1` (200) → `/workspaces` still `200` `12` (the Day-4 FK, on the *named* DB).

## ADRs Created

- **ADR-006 updated (this day's record)** — the Day-3 "Day 5 decision **pending**" is now "**landed**": named volume adopted, `db-push` schema-owner service, app containers + healthchecks, `node:22` + `CI: "true"`. Status stays **Active**.
- **No ADR-008** — at the 15:35 sync-check the reviewer leaned toward folding Day-5 into ADR-006 rather than a fresh record; the `pending → landed` edit in ADR-006 is the canonical home *for now*. (Revisit if the named-volume + `db-push` decision outgrows a Field-Note entry.) ADRs were **not committed** this day.

## Preview: Day 6 (connect)

- **Roadmap §Sprint 1 Day 6**: "Deploy to Oracle Free Tier — SSH in, `docker compose up -d`, curl the URL." (The roadmap named the *target class* — a $0 VM, and its Oracle Free Tier tier was an *aspirational* plan; the box that actually shipped it was an **AWS EC2** `free_tier` VM: us-east-1, 2 vCPU ARM / 1GB, `54.208.101.60` — reverse DNS `ec2-…compute.amazonaws.com`. Same $0 economics, different cloud; the deploy recipe is provider-agnostic and never *touches* the provider.) The restaurant leaves the kitchen: the *exact* `docker compose up` that opens it here opens it on a **$0 AWS VM**.
- **The Day-5 stack *is* the deploy artifact** — so the deferred gates above become **Day-6's entry cost** in order: ① resolve the `node_modules` story (embed in the image vs install-on-server), ② pin `uv` in `py/Dockerfile` so the *server* resolves the same tree, ③ `8000`/`8001` → the public host URL.
- **The cellar is now at stakes** — `down -v` on the *production* box wipes a real DB forever; the deploy recipe carries an explicit data-backup step, and the `127.0.0.1` healthcheck keeps peering *inward* once the app is public. **Bar**: `curl http://<aws-host>/workspaces` returns the 12/11 rows after one `docker compose up -d` on the VM.
- **ADR-006** owns the dev-stack record; a **deploy** ADR lands in the Day-6 note's ADRs section.
- **"Watch out for"** — the *same* image-vs-mount drift that bit the Docker build will bite the **server** deploy if the `node_modules` story is left to luck.
