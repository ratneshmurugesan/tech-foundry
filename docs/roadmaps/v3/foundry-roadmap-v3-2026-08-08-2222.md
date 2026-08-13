# Foundry Roadmap v3 — Complete Master Plan

> **Generated**: 2026-08-08
> **Purpose**: Single source of truth. Survives workspace switches. Say "Read `roadmaps/v3/foundry-roadmap-v3-2026-08-08-2222.md`" to restore full context.
> **Consolidates**: v1 (architecture, decisions, CNCF) + v2 (OSS analysis, Phase 1 deep dive, Taskflow, business psychology)
> **Location**: `roadmaps/v3/foundry-roadmap-v3-2026-08-08-2222.md`

---

## 1. Vision & Workspace Structure

**Vision**: Build a complete software engineering business as a solo developer — from learning fundamentals to production-grade infrastructure to real revenue — with a 10+ year lifespan.

```
foundry/
├── tech-foundry/              → Technical projects (Taskflow, 5-domain apps, infrastructure)
│   └── taskflow/              → Linear clone SaaS (Phase 1 project)
├── entrepreneur-foundry/      → Real business operations (Taskflow, real customers, real revenue)
└── proprietor-foundry/        → Learning experiments, sandbox, try-fail-learn (zero stakes)
```

**3-Category Rationale**:
- `proprietor-foundry/` = Lab mode. Zero stakes. Experiments with pricing, content, new tech.
- `entrepreneur-foundry/` = Production mode. Real money, real reputation, real Stripe/Razorpay.
- `tech-foundry/` = Technical foundation. Shared infrastructure, domain apps, Taskflow code.

**Dual-Language Track**: TypeScript 60% (depth, frontend, full-stack), Python 40% (backend, async, FastAPI). Same concepts, two type systems.

---

## 2. SoloStack Platform Architecture

**Vision**: Magic system to create any web application at production-grade level, solo developer, 10+ year lifespan.

**3-Tier System**:
1. **Shared Foundation** — Core packages, infrastructure, Docker Compose, observability
2. **App Templates** — Domain-specific apps built on foundation
3. **Automation & Operations** — CI/CD, deployment, monitoring, business ops

**Monorepo Structure**:
```
solo-stack/
├── packages/
│   ├── core/              → Framework-agnostic domain primitives
│   ├── infrastructure/    → Database adapters, message brokers, cache clients
│   ├── common/            → Shared utilities, error classes, logging, config
│   └── ui/                → Shared UI components, design system
├── apps/
│   ├── identity/          → Auth, Users, RBAC — ROOT DOMAIN
│   ├── saas/              → Subscription Management
│   ├── marketplace/       → Buyer-Seller
│   ├── fintech/           → Double-Entry, Audit Trails
│   └── analytics/         → Event Streaming, Dashboards
├── infra/                 → Docker Compose, Terraform, K8s manifests
└── tooling/               → ESLint, Prettier, TypeScript config shared
```

**Tech Stack** (final decisions):
| Layer | Choice | Why |
|---|---|---|
| Framework | Fastify (TS), FastAPI (Python) | User said "Fastify only" for TS; FastAPI for Python auto-OpenAPI |
| Runtime | Node.js 20+ | LTS, async/await, massive ecosystem |
| Package Manager | pnpm (TS), uv (Python) | Fast, disk-efficient |
| Monorepo | Turborepo | Caching, task orchestration |
| ORM | Drizzle ORM | TypeScript-first, type-safe SQL, no magic |
| Database | PostgreSQL 15+ | JSONB, RLS, full-text, extensions |
| Cache/Queue | Valkey + BullMQ | Open-source Redis fork |
| Validation | Zod (TS), Pydantic (Python) | Runtime type validation |
| API Gateway | Traefik | Edge routing, TLS |
| Auth | Auth0 → custom JWT | Fast start, learn later |
| Payment | Razorpay PRIMARY | India-compatible |
| Testing | Vitest, Playwright, Pytest | Unit, E2E, Python tests |
| CI/CD | GitHub Actions | Free, integrated |

**Infrastructure Services** (8 in Docker Compose):
1. PostgreSQL 15 (Primary + 2 Replicas in production)
2. Valkey/Redis (Cache, Session, BullMQ)
3. MinIO (S3-compatible object storage)
4. Traefik (Reverse proxy, TLS, routing)
5. Prometheus (Metrics collection)
6. Grafana (Dashboards, visualization)
7. Loki (Log aggregation)
8. Mailpit (Email testing in dev)

**Production Architecture** (10 microservices on EKS):
1. API Gateway — Kong (rate limiting, auth, routing, GraphQL Federation)
2. Identity Service — Auth, Users, RBAC, SSO
3. SaaS Service — Subscriptions, Billing, Usage tracking
4. Marketplace Service — Listings, Orders, Escrow
5. Fintech Service — Double-Entry, Audit Trails, Compliance
6. Analytics Service — Event Streaming, Dashboards, CQRS
7. WebSocket Gateway — Real-time updates, presence
8. Message Broker — SQS + DLQ + SNS (event-driven)
9. Search Service — Elasticsearch (full-text, aggregations)
10. Notification Service — Email, Push, SMS

---

## 3. Five Domain Templates

Each template maps to real OSS patterns from the 12-repo analysis.

### Template 1: SaaS (Subscriptions)
- **OSS Model**: Ghost (content + admin API separation), Plane (multi-tenant workspaces)
- **DDD**: Entities (Subscription, Invoice), State Machine (subscription lifecycle)
- **Infrastructure**: Auth0, Stripe/Razorpay, PostgreSQL, SQS for webhooks

### Template 2: E-Commerce (Orders/Sagas)
- **OSS Model**: Hoppscotch (service-oriented DI), Discourse (Sidekiq jobs)
- **DDD**: Aggregates (Order), Sagas (order fulfillment), Outbox pattern
- **Infrastructure**: PostgreSQL, Redis, SQS, MinIO for images

### Template 3: Fintech (Double-Entry/Audit)
- **OSS Model**: Lighthouse (deterministic audits), Streamlit (Protobuf)
- **DDD**: Entities (Transaction, Account), Event Sourcing (audit trail)
- **Infrastructure**: PostgreSQL (ACID), Redis, SQS

### Template 4: Healthcare (HIPAA/Privacy)
- **OSS Model**: Zulip (documentation as code), OpenHands (security-first)
- **DDD**: Bounded Contexts (Patient, Provider), Aggregates (Appointment)
- **Infrastructure**: PostgreSQL (encryption), MinIO (encrypted), Auth0 (RBAC)

### Template 5: Content Platform (Publishing/Versioning)
- **OSS Model**: Ghost (content API), Discourse (Onebox), Mermaid (DSL)
- **DDD**: Entities (Post, Version), State Machine (draft → published)
- **Infrastructure**: PostgreSQL, Redis, MinIO, SQS

---

## 4. 30-Month Roadmap (7 Phases)

### Phase 1: Foundations (Months 1-4) — $0/month
| Month | Topic | Project |
|---|---|---|
| 1 | TypeScript/Python depth, typing, async | Taskflow typed config + service layer |
| 2 | Testing fundamentals (unit, integration, E2E) | 80+ unit, 20+ integration, 10+ E2E tests |
| 3 | REST APIs, OpenAPI, Auth0 | 20+ endpoints, documented, authenticated |
| 4 | PostgreSQL, migrations, multi-tenancy | Full DB schema, asyncpg, Alembic |

### Phase 2: IaC & DevOps (Months 5-8) — $0/month
| Month | Topic | Project |
|---|---|---|
| 5 | Docker, multi-stage builds | Dockerize Taskflow |
| 6 | Terraform, Oracle Free Tier | Provision VM |
| 7 | GitHub Actions, CI/CD | CI with mock-dependency pattern |
| 8 | GitOps, ArgoCD | Auto-deploy on merge |

### Phase 3: Kubernetes (Months 9-12) — $0/month
| Month | Topic | Project |
|---|---|---|
| 9 | K3s on Oracle, Helm | Deploy Taskflow to K3s |
| 10 | Ingress, Traefik | Traefik routing |
| 11 | Service mesh, mTLS | mTLS between services |
| 12 | Horizontal scaling | Auto-scale Taskflow |

### Phase 4: Cloud Services (Months 13-16) — $0-30/month
| Month | Topic | Project |
|---|---|---|
| 13 | Auth0, OAuth | Auth for Taskflow |
| 14 | Razorpay/Stripe, payments | Payment flow |
| 15 | SQS, async workers | Email queue |
| 16 | S3/MinIO, file storage | File upload |

### Phase 5: Distributed Systems (Months 17-20) — $0-50/month
| Month | Topic | Project |
|---|---|---|
| 17 | Outbox pattern | Reliable event publishing |
| 18 | Sagas, distributed transactions | Order saga |
| 19 | Circuit breakers, resilience | Resilient Taskflow |
| 20 | CQRS, read models | Analytics dashboard |

### Phase 6: Production Hardening (Months 21-24) — $0-50/month
| Month | Topic | Project |
|---|---|---|
| 21 | Observability (Prometheus/Grafana/Loki) | Full stack monitoring |
| 22 | Security, secrets management | Secrets rotation |
| 23 | Performance engineering | Performance budgets |
| 24 | Disaster recovery, backups | Backup/restore drill |

### Phase 7: Advanced (Months 25-30) — $0-50/month
| Month | Topic | Project |
|---|---|---|
| 25 | Event sourcing | Audit trail system |
| 26 | Multi-tenancy depth | Multi-tenant SaaS |
| 27 | AI integration, MCP servers | AI assistant |
| 28 | Protocol design | Custom protocol |
| 29 | Plugin architectures | Plugin system |
| 30 | Open source release | Release SoloStack |

**Total Cost**: $0-50/month. All within Oracle Free Tier + free tiers of SaaS tools.

---

## 5. DDD Production Adoption Spectrum

| Concept | Adoption | When to Use |
|---|---|---|
| Entities + Value Objects | 100% everywhere | Every domain model |
| State Machines | 95%+ | Subscriptions, content lifecycle, order status |
| Aggregates | 70% | Complex business logic with consistency boundaries |
| Bounded Contexts | 80% | Microservice boundaries, domain separation |
| Domain Events | 75% | Event-driven communication between services |
| Outbox Pattern | 50% growing | Reliable event publishing (transactional outbox) |
| Sagas + Compensation | 40% | E-commerce, Marketplace (order fulfillment) |
| CQRS | 15-20% | High-scale read-heavy (Social feeds) |
| Event Sourcing | 5-10% | Fintech, Healthcare, Legal audit trails |
| Hexagonal Architecture | 2% | Academic, overkill for solo dev |

**DDD Learning Track** (12 months, parallel to infrastructure):
1. Month 1-2: Domain Modeling (Entities, Value Objects)
2. Month 3-4: Aggregates & Bounded Contexts
3. Month 5-6: Domain Events & Outbox Pattern
4. Month 7-8: Saga & Compensation Patterns
5. Month 9-10: CQRS & Event Sourcing
6. Month 11-12: Multi-tenancy Patterns

---

## 6. Backend Monorepo Study (10 Microservices)

### Services Analyzed:
1. **Campaign API** — FastAPI, asyncpg, Pydantic, Redis cache, SQS, Gatekeeper RBAC
2. **Investment API** — FastAPI, SQLAlchemy, SQS Command/Event pattern, New Relic
3. **Document API** — FastAPI, S3 storage, PDF generation, Swagger docs
4. **Document Worker** — SQS priority queues, Pipeline pattern, graceful shutdown
5. **Log API** — FastAPI, GrowthBook feature flags, centralized logging
6. **Marketing API** — FastAPI, SQS consumer, Cron jobs, Granian ASGI
7. **Notification v2** — FastAPI, SQS worker, email templates
8. **Storage v2** — FastAPI, rate limiting (SlowAPI), file storage abstraction
9. **User Service** — FastAPI, JWT, bcrypt, SendGrid, Redis, Cron jobs
10. **Pulse Backend** — Spring Boot 2.3 (Java 8), Spring Data JPA, Envers audit

### Critical Findings:
- 🔴 Hardcoded RSA keys, root containers in Dockerfiles
- 🟠 Spring Boot 2.3 (EOL), no distributed tracing, no health checks
- 🟡 Manual kubectl deployments, no DLQ, no Docker Compose
- 🟢 Static JS bundles, no contract testing, no performance benchmarks

### Cross-Cutting Patterns:
- MVC / Layered: Controllers → Services → CRUD/Repository → Database
- Event-Driven: AWS SQS for inter-service communication (5+ services)
- Worker Pattern: 5 services have background workers
- Repository Pattern: CRUD layer in all Python services
- 12-Factor: Config via env vars, backing services, disposable workers
- Async-First: All Python services use async/await

---

## 7. Component Swap Recommendations (15 Swaps)

| Current | Swap To | Reason |
|---|---|---|
| uvicorn | Granian | Faster, Rust-based ASGI |
| Redis | Valkey | Open-source Redis fork |
| SQS basic | SQS + DLQ + SNS | Reliable messaging |
| SendGrid | AWS SES | Cost-effective, native AWS |
| boto3 (sync) | aiobotocore | Async AWS SDK |
| Sentry only | OpenTelemetry + Sentry | Distributed tracing |
| console logging | structlog | Structured JSON logs |
| GrowthBook in-memory | GrowthBook + Redis | Feature flag performance |
| python-jose | pyjwt | Actively maintained |
| slowapi (in-memory) | slowapi + Redis | Distributed rate limiting |
| Spring Boot 2.3 | Spring Boot 3.4 | EOL → current |
| Java 8 | Java 21 | LTS with virtual threads |
| MySQL | PostgreSQL | Feature parity |
| Direct connections | PgBouncer | Connection pooling |
| pip | uv | Faster dependency management |

---

## 8. Decision Framework

**Process**: Problem → Requirements → Candidates → Trade-offs → Selection

### Key Decisions Made:
| Decision | Choice | Rationale |
|---|---|---|
| API Framework | FastAPI (Python), Fastify (TS) | Auto-OpenAPI, Pydantic/Zod validation, async |
| Database | PostgreSQL 15+ | JSONB, RLS, full-text, extensions |
| ORM | Drizzle ORM | TypeScript-first, type-safe SQL, no magic |
| Validation | Zod (TS), Pydantic (Python) | Runtime type validation, DX |
| ASGI Server | Granian (prod), uvicorn (dev) | Rust core, performance |
| Cache | Valkey | Open-source, Redis compatible |
| Payment | Razorpay PRIMARY | India-compatible, Stripe optional |
| Auth | Auth0 → custom JWT | Fast start, learn later |

---

## 9. CNCF Landscape Deep-Dive

**6 Categories, 20+ Key Projects**:

| Category | Key Projects |
|---|---|
| Provisioning | Terraform, Pulumi, Crossplane, Ansible |
| Runtime | containerd, Crun, Firecracker, gVisor |
| Orchestration | Kubernetes, K3s, OpenShift, Rancher |
| API/Proxy | Kong, APISIX, Envoy, Linkerd |
| Observability | OpenTelemetry, Prometheus, Grafana, Jaeger, Loki, FluentBit |
| Platform | ArgoCD, Flux, Vault, Istio |

**4 Biggest Gaps** (for solo dev):
1. OpenTelemetry (distributed tracing)
2. Prometheus/Grafana (metrics)
3. ArgoCD/Flux (GitOps)
4. Vault (secrets management)

**3-Phase Adoption**:
- Phase 1: Prometheus + Grafana (Month 6)
- Phase 2: OpenTelemetry + Jaeger (Month 12)
- Phase 3: ArgoCD + Vault (Month 18)

---

## 10. Mindset Framework: "Think in Layers, Decide at Boundaries"

### 10 Layer Model:
| Layer | Mental Model | Decision Framework |
|---|---|---|
| Frontend | User experience, performance perception | Time-to-value < 90 seconds |
| Backend | Business logic, data flow | Framework-agnostic domain, adapter pattern |
| Database | Data integrity, query patterns | PostgreSQL-first, RLS for multi-tenancy |
| Messaging | Event-driven, async communication | SQS + DLQ + SNS for reliability |
| Infrastructure | Provisioning, scaling | Terraform → K3s → EKS progression |
| Observability | Metrics, logs, traces | OpenTelemetry + Prometheus + Grafana + Loki |
| Security | Threat modeling, zero trust | Auth0 → custom JWT, secrets rotation |
| Operations | CI/CD, deployment, incidents | ArgoCD GitOps, canary deployments |
| Business | Revenue, retention, growth | Pricing psychology, feature framing |
| Learning | Skill acquisition, compounding | Dual-language (TS 60%, Python 40%) |

---

## 11. 12 OSS Repos Analyzed + 7 Universal Patterns

### Batch 1:
| Repo | Stack | Key Pattern | What to Learn |
|---|---|---|---|
| **Ghost** | Node.js, Express, Bookshelf, MySQL | Content API + Admin API separation | i18n, migrations, cursor pagination |
| **Plane** | Python, Django REST, PostgreSQL, Celery | Multi-tenant via `workspace_id` | Django signals, domain-driven apps |
| **Zulip** | Python/Django + Tornado, TypeScript frontend | Custom test harness with module mocking | Documentation as code, custom tooling |
| **Storybook** | TypeScript, Vite, Webpack, multi-framework | Framework-agnostic core + adapters | Plugin architecture, monorepo at scale |
| **Playwright** | TypeScript, browser protocols (CDP) | Protocol-first design, self-hosting tests | Protocol abstraction, meta-testing |
| **Mermaid** | TypeScript, D3.js, Langium parser | DSL per diagram type, deterministic layouts | Grammar as code, visual testing |

### Batch 2:
| Repo | Stack | Key Pattern | What to Learn |
|---|---|---|---|
| **Hoppscotch** | TypeScript, fp-ts, Auth0, Tauri | `Either` error handling, service DI | Functional patterns, in-memory testing |
| **Streamlit** | Python, uv+hatch, Protobuf | Protobuf communication, custom exceptions | Python packaging, `uv` ecosystem |
| **Lighthouse** | Node.js, plugin architecture | Deterministic audits, rules as code | Plugin systems, reproducible scoring |
| **Discourse** | Ruby on Rails, PostgreSQL, Sidekiq | 100+ tables, fabricators, TurboTests | Complex schema, parallel test runner |
| **Puppeteer** | TypeScript, CDP, Mocha | Protocol-first, custom test runner | Browser automation, sandbox testing |
| **OpenHands** | TypeScript + Python, uvx, MCP | **Mock-LLM E2E** (GOLD STANDARD) | Production-fidelity testing, AI agents |

### 7 Universal Patterns:
| Pattern | Repos | Lesson |
|---|---|---|
| **Protocol-first design** | Playwright, Puppeteer, Streamlit, OpenHands | Define protocol before implementation |
| **Mock-dependency testing** | OpenHands, Hoppscotch, Lighthouse, Discourse | Mock only external deps, test real code |
| **Feature-organized tests** | 8/12 repos | Tests mirror source OR organized by feature |
| **Plugin architecture** | Lighthouse, Discourse, Streamlit, OpenHands, Storybook | Design extensibility from day 1 |
| **Deterministic algorithms** | Mermaid, Lighthouse, Puppeteer | Same input → same output |
| **Documentation as code** | 7/12 repos | AGENTS.md, CONTRIBUTING.md in repo |
| **Framework-agnostic cores** | Storybook, Playwright, Hoppscotch, OpenHands | Thin core + framework adapters |

---

## 12. Taskflow — Linear Clone SaaS

**Positioning**: "Project management that doesn't suck for non-engineers." Not "another Linear."

**Target Markets**:
- Marketing teams who need sprint planning
- Design teams who need issue tracking
- Small agencies who need client workspaces
- Open source projects who need free tier

**Why Taskflow First?**:
- CRUD + relationships → exercises JOINs, indexing
- Roles + permissions → exercises RBAC
- Subscriptions → exercises Stripe/Razorpay later
- Keyboard-driven UI → exercises TypeScript frontend depth

**Reference**: [linear.app](https://linear.app) — sign up free, use it for a week, note every API call in DevTools.

### Domain Model:
```
Workspace (tenant root)
├── Members (User + Role)
├── Projects
│   └── Issues (title, status, priority, assignee, labels)
└── Settings (plan, billing, preferences)
```

### Phase 1 Scope (What You'll Build):
| Month | Deliverable |
|---|---|
| 1 | Typed config system (TS) + service layer (Python). No DB yet. |
| 2 | Full test suite: 80+ unit, 20+ integration, 10+ E2E |
| 3 | REST API: 20+ endpoints, OpenAPI docs, Auth0 auth |
| 4 | PostgreSQL schema, migrations, asyncpg, multi-tenancy |

**End of Month 4**: Working API for workspaces, projects, issues. Fully tested. Documented. Multi-tenant.

---

## 13. Phase 1 Deep Dive (Months 1-4, Microscopic)

### Month 1: Dual-Language Track

**Goal**: Write production-grade code in both languages without guessing. No `any`, no `# type: ignore`.

#### Week 1: Types & Syntax

| Day | TypeScript (Morning) | Python (Afternoon) | Concept Transfer |
|---|---|---|---|
| 1 | Primitives, `unknown` vs `any`, strict mode | Variables, data types, `def`, `if/for/while` | Both are dynamically runnable, statically checkable |
| 2 | Discriminated unions, narrowing with `switch` | `typing.Literal`, `match/case` (Python 3.10+) | Same pattern: `type: "created"` narrows shape |
| 3 | Generics, `Partial/Omit/Pick` | `TypeVar`, `TypedDict`, `dataclasses` | Generic constraints → `TypeVar(bound=...)` |
| 4 | `satisfies`, `as const`, `readonly` | `typing.final`, `dataclass(frozen=True)` | Immutability patterns |
| 5 | Build: Taskflow config (TS) — plans, limits, features | Build: Taskflow config (Python) — Pydantic models | Same domain, two type systems |
| 6-7 | Mini-project: type-safe plan validator | Mini-project: Pydantic plan validator | Compare error messages, DX |

**Resources**:
- TypeScript Handbook (free), "Total TypeScript" tutorials (free)
- Python 3.12 docs (free), PEP 484 (Type Hints), PEP 544 (Protocols)
- TypeScript Playground, Pydantic docs

#### Week 2: Async & Ecosystem

| Day | TypeScript | Python | Transfer |
|---|---|---|---|
| 1 | `async/await`, Promises, `Promise.all` | `async/await`, `asyncio.gather` | Identical syntax |
| 2 | Node event loop, streams | `asyncio` event loop, async iterators | Same event loop concept |
| 3 | `npm`, `package.json`, `tsup`/`esbuild` | `uv`, `pyproject.toml`, `hatch` | Package managers differ, concepts same |
| 4 | `tsc`, `tsconfig.json` strict flags | `ruff`, `mypy` strict, `pyproject.toml` | Linting + type checking |
| 5-7 | Build: Taskflow CLI (TS) — list plans, show limits | Build: Taskflow API skeleton (Python) — FastAPI "hello" | Same output, two runtimes |

#### Week 3: Error Handling & Tooling

| Day | TypeScript | Python | Transfer |
|---|---|---|---|
| 1 | Custom error classes, hierarchy | Custom exceptions, `raise`/`except` | Error as value vs error as flow |
| 2 | Zod runtime validation | Pydantic validation | Same concept: schema → validate → error |
| 3 | `try/catch`, `fp-ts.Either` | `try/except`, `returns.Either` | Error handling as type |
| 4 | `vitest` setup, `vi.mock()`, `vi.spyOn()` | `pytest` setup, `fixture`, `patch` | Test runners differ, patterns same |
| 5-7 | Test: config validator (10 tests) | Test: Pydantic models (10 tests) | Same assertions, different syntax |

#### Week 4: Integration & Build

| Day | TypeScript | Python | Transfer |
|---|---|---|---|
| 1 | `httpx`/`node-fetch` for API calls | `httpx.AsyncClient` for API calls | Same library (httpx exists for both) |
| 2 | Mock external APIs (`msw`) | Mock external APIs (`respx`) | HTTP mocking, same concept |
| 3 | GitHub Actions: Node cache, `npm ci` | GitHub Actions: `uv sync`, pytest | CI/CD is language-agnostic |
| 4 | Coverage: `v8`, `c8` | Coverage: `coverage.py` | Same metrics: line, branch, function |
| 5-7 | **Capstone**: Taskflow skeleton — TS CLI + Python API, both tested, CI green | | Polyglot project, both passing |

### Month 1 Capstone: Taskflow Skeleton

```
taskflow/
├── cli/                          # TypeScript
│   ├── src/
│   │   ├── plans.ts              # PlanConfig type, getPlanLimit()
│   │   └── index.ts              # CLI entry
│   ├── __tests__/
│   │   └── plans.test.ts         # 10+ Vitest tests
│   ├── package.json
│   └── tsconfig.json             # strict mode
│
├── api/                          # Python
│   ├── pyproject.toml            # uv, ruff, mypy
│   ├── src/taskflow/
│   │   ├── main.py               # FastAPI "hello"
│   │   ├── models.py             # Pydantic PlanConfig
│   │   └── services.py           # async get_plan_limit()
│   └── tests/
│       └── test_plans.py         # 10+ pytest tests
│
└── .github/workflows/
    └── test.yml                  # TS + Python, both green
```

**End of Month 1**: Two implementations of the same logic. Both typed. Both tested. Both in CI. You now speak both languages.

### Months 2-4: Same Domain, Both Languages

| Month | What You Build | TS Focus | Python Focus |
|---|---|---|---|
| 2 | Test suite depth | Vitest, Playwright E2E | Pytest, `pytest-asyncio`, `respx` |
| 3 | REST API | OpenAPI design, Swagger UI | FastAPI routes, Auth0, Pydantic |
| 4 | Database | Schema design, indexing | asyncpg, Alembic, multi-tenancy |

**Month 3-4 decision**: Pick **one** language for the API implementation. Python (FastAPI) if you want auto-OpenAPI + Pydantic. TypeScript (Hono) if you want one-language simplicity. Both are valid.

---

## 14. Week 1: Day-by-Day Implementation Plan

### Day 1: Primitives & Syntax

**TypeScript Track**:
- Read: [TS Handbook — Basic Types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
- Read: [TS Handbook — Strict Property Checks](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- Implement: `plan-config.ts` with `string`, `number`, `boolean`, `array` types
- Implement: `tsconfig.json` with `strict: true`
- Verify: `tsc --noEmit` passes with zero errors

**Python Track**:
- Read: [Python Tutorial — Control Flow](https://docs.python.org/3/tutorial/controlflow.html)
- Read: [PEP 484 — Type Hints](https://peps.python.org/pep-0484/)
- Implement: `plan_config.py` with Pydantic `BaseModel`
- Setup: `uv` project, `ruff` + `mypy`
- Verify: `ruff check` and `mypy src/` pass with zero errors

### Day 2: Discriminated Unions

**TypeScript Track**:
- Read: [Total TypeScript — Discriminated Unions](https://www.totaltypescript.com/tutorials/discriminated-unions)
- Implement: `PlanConfig` as discriminated union (`free` | `pro` | `enterprise`)
- Implement: `getPlanLimit()` with `switch` narrowing
- Verify: Type errors on invalid input

**Python Track**:
- Read: [Python Docs — Literal Types](https://docs.python.org/3/library/typing.html#typing.Literal)
- Read: [Python 3.10 — Structural Pattern Matching](https://docs.python.org/3/whatsnew/3.10.html)
- Implement: `PlanConfig` with `Literal["free", "pro", "enterprise"]`
- Implement: `get_plan_limit()` with `match/case`
- Verify: Both handle all 3 plan types; type errors on invalid input

### Day 3: Generics & Utility Types

**TypeScript Track**:
- Read: [TS Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- Read: [TS Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utils/utility-types.html)
- Implement: `Repository<T>` with `find`, `findById`, `create`
- Implement: `Pick`/`Omit`/`Partial` usage
- Verify: Generic repositories work with `Workspace`, `Project`, `Issue` types

**Python Track**:
- Read: [Python Docs — TypeVar](https://docs.python.org/3/library/typing.html#typing.TypeVar)
- Read: [Python Docs — TypedDict](https://docs.python.org/3/library/typing.html#typing.TypedDict)
- Implement: `Repository[T]` with `Generic[T]`
- Implement: `TypedDict` for partial configs
- Verify: Generic repositories work with same domain types

### Day 4: Immutability & Const

**TypeScript Track**:
- Read: [TS Blog — `satisfies` Keyword](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/#the-satisfies-operator)
- Implement: `as const`, `readonly`, `satisfies` for config objects
- Verify: Configs are immutable; type errors on mutation attempts

**Python Track**:
- Read: [Python Docs — dataclass frozen](https://docs.python.org/3/library/dataclasses.html)
- Read: [Python Docs — typing.final](https://docs.python.org/3/library/typing.html#typing.final)
- Implement: `@dataclass(frozen=True)`, `typing.final` for constants
- Verify: Configs are immutable; errors on mutation attempts

### Day 5-7: Capstone — Plan Validator

**Both Languages**:
- Build a plan validator combining discriminated unions, generics, immutability
- 10+ Vitest tests (TS), 10+ pytest tests (Python)
- GitHub Actions CI with both languages passing
- Both implementations produce identical output

**Deliverable**:
```typescript
// TypeScript: plans.ts
type PlanConfig =
  | { plan: "free"; features: { maxUsers: 1; maxProjects: 3 } }
  | { plan: "pro"; features: { maxUsers: 10; maxProjects: 25; billing: "monthly" | "annual" } }
  | { plan: "enterprise"; features: { maxUsers: -1; maxProjects: -1; billing: "annual"; sla: number } };

function getPlanLimit(config: PlanConfig, feature: "maxUsers" | "maxProjects"): number {
  return config.features[feature];
}
```

```python
# Python: models.py
from pydantic import BaseModel, Field
from typing import Literal

class FreePlan(BaseModel):
    plan: Literal["free"]
    max_users: int = Field(default=1)
    max_projects: int = Field(default=3)

class ProPlan(BaseModel):
    plan: Literal["pro"]
    max_users: int = Field(default=10)
    max_projects: int = Field(default=25)
    billing: Literal["monthly", "annual"] = "monthly"

class EnterprisePlan(BaseModel):
    plan: Literal["enterprise"]
    max_users: int = Field(default=-1)
    max_projects: int = Field(default=-1)
    billing: Literal["annual"] = "annual"
    sla: float = Field(default=99.9)

PlanConfig = FreePlan | ProPlan | EnterprisePlan
```

---

## 15. Business & User Psychology

**Why Taskflow?**: Linear has **1.1M users** and **$100M+ ARR**. The market exists. People pay for this.

**Positioning**: Taskflow isn't "another Linear." Taskflow is "project management that doesn't suck for non-engineers."

**Every feature serves a psychological need**:
| Feature | Psychological Need | Bias/Effect |
|---|---|---|
| Workspaces | "This is *my* territory" | Ownership bias |
| Keyboard shortcuts | "I'm fast, I'm pro" | Identity reinforcement |
| Clean UI | "I trust this tool" | Aesthetic-usability effect |
| Free tier | "I can try risk-free" | Reciprocity |
| Usage limits | "I should upgrade" | Scarcity |

**Business Frameworks**:
- **Positioning**: Say what you are in 5 words
- **Pricing**: Anchoring, tier design, decoy effect
- **Feature framing**: Outcome > feature ("ship faster" > "Kanban board")
- **Onboarding**: Time-to-value < 90 seconds
- **Retention**: Habit loops, weekly digest, fear-of-loss

**You're not building CRUD. You're building habits.**

---

## 16. Learning Process: "You Research, I Verify"

**This is the best way to learn. Period.**

```
You say: "I finished Day 2 (discriminated unions)"
You show me: Code, tests, any errors you hit
I verify: Code review, point gaps, give next challenge
You iterate: Fix, resubmit
We move on: Day 3
```

**Rules**:
1. You implement first, ask questions second
2. Show me code, not descriptions
3. I'll be strict on types, strict on tests, lenient on style
4. If you're stuck >2 hours, ask — don't spiral

**One correction**: Don't "research" for days. Research for 30 minutes, implement for 2.5 hours. **Learning happens in the implementation, not the reading.**

---

## 17. Current Status & Next Steps

### Where We Are (2026-08-08):
- ✅ 12 OSS repos analyzed (Ghost, Plane, Zulip, Storybook, Playwright, Mermaid, Discourse, Puppeteer, OpenHands, Hoppscotch, Streamlit, Lighthouse)
- ✅ 7 universal patterns extracted
- ✅ 30-month roadmap with 7 phases defined
- ✅ 5 domain templates with DDD patterns
- ✅ Taskflow project defined (Linear clone)
- ✅ Phase 1 deep dive (Months 1-4) with microscopic detail
- ✅ Week 1 day-by-day plan with resources
- ✅ Business psychology framework
- ✅ Learning process established

### What's Next:
1. **Scaffold Taskflow** — Create `tech-foundry/taskflow/` with dual-language structure
2. **Start Week 1 Day 1** — TypeScript primitives + Python Pydantic
3. **Day-by-day verification** — You implement, I review

### Pending Decisions:
- Time commitment pace (full pace / reduced / weekend warrior)
- Month 3-4 language choice (Python FastAPI vs TypeScript Hono)

---

*End of v3 roadmap. This document is the single source of truth for the Foundry journey.*