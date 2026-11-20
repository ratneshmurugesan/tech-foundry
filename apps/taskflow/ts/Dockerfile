# ============================================================================
# TaskFlow — TS kitchen (Fastify) — Dockerfile
# ----------------------------------------------------------------------------
# WHAT : the image that runs the TypeScript kitchen — Fastify + Drizzle/postgres
#        against the cellar (Postgres), listening on port 8000.
# WHY  : ADR-001 parity wall — the ts kitchen is a SEPARATE image from the py
#        kitchen. They share the cellar and the golden matrix (py/tests/),
#        never code. This image is the ts side of that wall.
# HOW  : dev  — docker-compose.yml `taskflow-ts`: ./ts bind-mounted over /app
#        (+ node_modules :cached), run `pnpm dev` = tsx WATCH src/main.ts.
#        prod — docker-compose.prod.yml drops the mounts (the baked image IS the
#        tree) and runs `pnpm tsx src/main.ts` ONCE (no watcher).
#        One-shots: this same image also serves `db-push` (`pnpm db:push`);
#        `cellar-setup` (psql) must finish first. Health: GET /health.
# INVAR: 1) pnpm pinned to the `packageManager` field = the lockfile's writer
#         (Gate ②) — a fresh "latest" per build is the local/CI drift that
#         broke this before.
#        2) --frozen-lockfile: the lock is the truth; no re-resolution.
#        3) `pnpm build` is baked as a build-health proof — the run still uses
#         tsx on src, so dist/ is an artifact, not what loads at runtime.
#        4) .dockerignore keeps node_modules/dist/drizzle out of the context.
# ============================================================================

# Base image: Node 22 on Alpine (small, musl). The bookworm-slim line is the
# glibc fallback if a dep ever needs native binaries Alpine can't build.
FROM node:22-alpine
# FROM node:22-bookworm-slim

# Working dir for everything below; compose bind-mounts ./ts over this exact
# path in dev, so /app must be the kitchen's root.
WORKDIR /app

## Install git, python, and full compilation toolchains
# (Reference only — needed if a dep compiles native code at install. None of
#  this kitchen's runtime deps do, so the stock image suffices and these stay
#  off: fewer packages, smaller image, less attack surface.)
# RUN apk add --no-cache libc6-compat git
# RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
# RUN apt-get update && apt-get install -y \
#     git \
#     build-essential \
#     python3 \
#     && rm -rf /var/lib/apt/lists/*

# Layer-cache trick: manifest + lock first, so a source-only edit doesn't bust
# the (expensive) install layer. The `*` globs let a fresh clone build even
# before the lock/workspace files exist.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# (corepack's download prompt is already non-interactive in modern corepack;
#  compose also sets CI=true to bypass pnpm's TTY confirmation.)
# ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Pin = the `packageManager` field in package.json = the lockfile's writer.
# (NOT `@latest` — a fresh "latest" per image build is exactly the local/CI drift that broke this.)
# (Low level: corepack enables the pnpm shim, `prepare ... --activate` pins and
#  activates 11.24.0, then `pnpm install --frozen-lockfile` installs the locked
#  tree into node_modules without re-resolving.)
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate && pnpm install --frozen-lockfile

# (The unpinned alternative — `npm i -g pnpm` grabs whatever is "latest" today,
#  exactly the drift Gate ② bans. Kept as a warning, not an option.)
# RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Now copy the source (src/, tests/, ...) on top of the cached deps layer.
COPY . .

# 5b — Gate ② for the TS track: bake a *verified* compile into the image.
# `pnpm build` (NOT a bare `tsc`) — the container shell's PATH has no local tsc;
# pnpm resolves its own. The prod *run* still uses tsx (runs src), so the baked
# dist is a build-health proof / artifact, not what the app loads at runtime.
RUN pnpm build

# Declare the listen port (informational; compose publishes 8000:8000).
EXPOSE 8000

# Dev entry: `pnpm dev` = tsx WATCH src/main.ts (hot reload). Compose
# `command:` overrides this in prod (`pnpm tsx src/main.ts`, no watcher) and
# for the db-push one-shot (`pnpm db:push`) — the image default is the dev one.
CMD ["pnpm", "dev"]