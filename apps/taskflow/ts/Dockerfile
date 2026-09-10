FROM node:22-alpine
# FROM node:22-bookworm-slim

WORKDIR /app

## Install git, python, and full compilation toolchains
# RUN apk add --no-cache libc6-compat git
# RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
# RUN apt-get update && apt-get install -y \
#     git \
#     build-essential \
#     python3 \
#     && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile

# RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

# 5b — Gate ② for the TS track: bake a *verified* compile into the image.
# `pnpm build` (NOT a bare `tsc`) — the container shell's PATH has no local tsc;
# pnpm resolves its own. The prod *run* still uses tsx (runs src), so the baked
# dist is a build-health proof / artifact, not what the app loads at runtime.
RUN pnpm build

EXPOSE 8000

CMD ["pnpm", "dev"]