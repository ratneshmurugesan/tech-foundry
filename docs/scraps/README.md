# Taskflow — Linear clone SaaS

**Phase**: Sprint 1 — Make it Work (Weeks 1-2)
**Dual Track**: TypeScript (`ts/`) + Python (`py/`)
**Roadmap**: See `../../../roadmaps/v4/master.md`

## Structure

```
taskflow/
├── ts/                    # TypeScript track (Fastify)
│   ├── src/
│   │   ├── config/        # Plan config, typed settings
│   │   ├── routes/        # API route handlers
│   │   ├── db/            # Drizzle ORM schema, migrations
│   │   └── services/      # Business logic, in-memory → DB
│   ├── package.json
│   └── tsconfig.json
├── py/                    # Python track (FastAPI)
│   ├── src/
│   │   ├── config/        # Plan config, Pydantic models
│   │   ├── routes/        # API route handlers
│   │   ├── db/            # asyncpg connections, schema
│   │   └── services/      # Business logic, in-memory → DB
│   └── pyproject.toml
└── infra/                 # Docker Compose, deploy scripts
```

## Day-by-Day Checklist

- [ ] Day 1: TS + Python basics, plan config
- [ ] Day 2: API skeleton (in-memory)
- [ ] Day 3: PostgreSQL schema
- [ ] Day 4: CRUD operations
- [ ] Day 5: Docker Compose
- [ ] Day 6: Deploy to Oracle / AWS
- [ ] Day 7: GitHub Actions CI
