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

EXPOSE 8000

CMD ["pnpm", "dev"]