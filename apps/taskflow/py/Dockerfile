FROM python:3.12-slim

# 5c — Gate ② (the real one): pin uv to the exact version that *wrote* py/uv.lock.
# `uv sync --frozen` is only faithful with the same reader; a newer uv can
# re-interpret/reformat the lock and quietly drift the resolved tree. 0.11.26 = your
# host's `uv --version` (the tool your lock was recorded with).
RUN pip install --no-cache-dir "uv==0.11.26"

WORKDIR /app

COPY pyproject.toml uv.lock* ./

# RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

EXPOSE 8001

CMD ["uv", "run", "python", "-m", "src.main"]