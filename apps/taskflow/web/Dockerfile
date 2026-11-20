# ============================================================================
# TaskFlow — web (Next.js) — Dockerfile (multi-stage)
# ----------------------------------------------------------------------------
# WHAT : the image that serves the browser front door — Next.js on port 3000.
#        Stages: base (corepack) -> deps (npm ci) -> build (next build) -> run.
# WHY  : the web kitchen is the only client of the TS kitchen (BACKEND_URL
#        rewrites); the py kitchen is invisible to it. Auth0 (the door) is
#        wired in at BUILD time via NEXT_PUBLIC_* (see the ARG block below).
# HOW  : dev  — docker-compose.yml `taskflow-web`: ./web bind-mounted over /app
#        (node_modules + .next kept as anonymous volumes), run `npm run dev`.
#        prod — docker-compose.prod.yml drops the mounts and runs `npm start`
#        (= `next start`) ONCE. Build args come from compose `build.args`.
#        Health: probe /workspaces (prerendered 200), NOT / (client redirect).
# INVAR: 1) .next must stay in .dockerignore — see the note below (darwin cache).
#        2) NEXT_PUBLIC_* and BACKEND_URL are BUILD-TIME values (inlined at
#         `next build`) — hence ARG/ENV, not runtime env vars.
#        3) node_modules is NOT host-mounted in dev (musl image vs darwin
#         native binaries) — the image's `npm ci` is the source of truth.
# ============================================================================
# NOTE: .next must stay in .dockerignore. The dev chart bind-mounts ./web over
# /app, so any .next baked into the image would be shadowed by the HOST's
# darwin-built Turbopack cache (absolute paths, darwin native-binary requires)
# and every CSS transform 500s inside the linux container.

# Stage 0 — base: Node 22 on Alpine (small, musl) + corepack enabled so the
# package-manager shims exist for every later stage. (The web kitchen uses
# npm — package-lock.json — corepack here is future-proofing.)
FROM node:22-alpine AS base
RUN corepack enable

# Stage 1 — deps: install the locked tree in ISOLATION from the source, so a
# source-only edit doesn't bust this (expensive) layer.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` (NOT `npm install`): clean install of EXACTLY the lockfile — no
# re-resolution, no lockfile mutation. The lock is the truth (Gate ②).
RUN npm ci

# Stage 2 — build: compile the app into .next/ with the build-time env baked in.
FROM base AS build
WORKDIR /app
# Reuse the deps stage's node_modules instead of reinstalling.
COPY --from=deps /app/node_modules ./node_modules
# Source on top (.dockerignore already kept node_modules/.next/.env* out).
COPY . .
# NEXT_PUBLIC_* are inlined at build time. BACKEND_URL is ALSO build-time:
# next.config.ts rewrites are evaluated during `next build` and frozen into .next/
# — a runtime env var has no effect on `next start`. So it must be an ARG.
# (ARG = build-time input, supplied by compose `build.args`; the localhost:8000
#  default is the bare-metal fallback when built without args.)
ARG NEXT_PUBLIC_AUTH0_DOMAIN
ARG NEXT_PUBLIC_AUTH0_CLIENT_ID
ARG NEXT_PUBLIC_AUTH0_AUDIENCE
ARG BACKEND_URL=http://localhost:8000
# (ARG is invisible to the runtime — ENV copies each value into the image's
#  env so `next build` sees it, and the run stage inherits it.)
ENV NEXT_PUBLIC_AUTH0_DOMAIN=$NEXT_PUBLIC_AUTH0_DOMAIN
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID=$NEXT_PUBLIC_AUTH0_CLIENT_ID
ENV NEXT_PUBLIC_AUTH0_AUDIENCE=$NEXT_PUBLIC_AUTH0_AUDIENCE
ENV BACKEND_URL=$BACKEND_URL
# `next build`: compile pages, prerender, freeze the rewrites into .next/.
RUN npm run build

# Stage 3 — run: the final image. Copies the WHOLE built app (source +
# node_modules + .next) — `next start` needs the source tree, not just .next/.
FROM base AS run
WORKDIR /app
# Tells Next (and any deps) to take production code paths.
ENV NODE_ENV=production
COPY --from=build /app ./
# Declare the listen port (informational; compose publishes 3000:3000).
EXPOSE 3000
# Prod entry: `next start` serves the baked .next/. Compose dev overrides this
# with `npm run dev` (the dev server, hot reload).
CMD ["npm", "start"]
