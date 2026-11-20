# ============================================================================
# TaskFlow — PY kitchen (FastAPI) — Dockerfile
# ----------------------------------------------------------------------------
# WHAT : the image that runs the Python kitchen — FastAPI + SQLAlchemy/asyncpg
#        against the cellar (Postgres), listening on port 8001.
# WHY  : ADR-001 parity wall — the py kitchen is a SEPARATE image from the ts
#        kitchen. They share the cellar and the golden matrix (py/tests/),
#        never code. This image is the py side of that wall.
# HOW  : dev  — docker-compose.yml `taskflow-py`: ./py bind-mounted over /app
#        (host code hot; the host .venv carries the dev group), run `uv run
#        python -m src.main` (uvicorn, reload=True).
#        prod — docker-compose.prod.yml drops the mount (the baked image IS the
#        tree) and runs `uv run uvicorn src.main:app` (no watch/reload).
#        Ordering: `db-push` + `cellar-setup` must finish first (depends_on).
#        Health: GET /health (public path, no DB dependency).
# INVAR: 1) uv pinned to the version that WROTE py/uv.lock (Gate ②) — a newer
#         uv can re-interpret the lock and quietly drift the resolved tree.
#        2) --frozen: the lock is the truth; no re-resolution at build time.
#        3) --no-dev: only the runtime dep group is baked; `uv run` re-syncs
#         the env at boot, so the dev-group uvicorn lands on first start.
#        4) .dockerignore keeps .venv/__pycache__/*.pyc out of the context.
# ============================================================================

# Base image: CPython 3.12 (pyproject: requires-python >=3.12) on Debian slim —
# small, and glibc (not musl) so native wheels (asyncpg, cryptography) install
# and load cleanly.
FROM python:3.12-slim

# 5c — Gate ② (the real one): pin uv to the exact version that *wrote* py/uv.lock.
# `uv sync --frozen` is only faithful with the same reader; a newer uv can
# re-interpret/reformat the lock and quietly drift the resolved tree. 0.11.26 = your
# host's `uv --version` (the tool your lock was recorded with).
# (Low level: pip into the system python; --no-cache-dir keeps the layer lean.)
RUN pip install --no-cache-dir "uv==0.11.26"

# Working dir for everything below; compose bind-mounts ./py over this exact
# path in dev, so /app must be the kitchen's root.
WORKDIR /app

# Layer-cache trick: copy the manifest + lock BEFORE the source, so a
# source-only edit doesn't bust the (expensive) dependency-install layer.
# `uv.lock*` is a glob so a fresh clone without the lock still builds.
COPY pyproject.toml uv.lock* ./

# BuildKit-optimized form (caches uv's download dir across builds); kept
# commented because a plain `docker build` without BuildKit rejects --mount.
# RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev
# Install the locked tree into /app/.venv. --frozen = never re-resolve;
# --no-dev = skip the dev group (uvicorn/pytest/alembic — `uv run` tops it up
# at boot); --no-install-project = don't pip-install the local package itself
# (the app runs from source, and the dev bind-mount would shadow it anyway).
RUN uv sync --frozen --no-dev --no-install-project

# Now copy the actual source (src/, tests/, ...) on top of the cached deps.
COPY . .

# Declare the listen port (informational; compose publishes 8001:8001).
EXPOSE 8001

# Dev entry: `uv run` activates the .venv, then `python -m src.main` boots
# uvicorn with reload (src/main.py). Compose `command:` overrides this in prod
# (`uv run uvicorn src.main:app`) — the image default is the dev one.
CMD ["uv", "run", "python", "-m", "src.main"]