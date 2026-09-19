# Foundry Roadmap — Master Reference

> **Raw Transcript**: `/home/ratnesh-murugesan/.vscode-insiders/tmp/tmp_vscode_1/foundry_conversations.txt` (12,189 lines, 462KB, 44 conversations with full Q&A)
> **Raw JSON**: `foundry-roadmap-raw-chats.json` (17MB, 44 conversations from Copilot Chat)
> **Last Updated**: 2025-01-XX
> **Purpose**: Survives workspace switches. Say "Read `/memories/foundry-roadmap.md`" to restore full context.

---

## 1. WORKSPACE STRUCTURE

```
foundry/
├── tech-foundry/              → Technical projects (Taskflow, 5-domain apps, infrastructure)
├── entrepreneur-foundry/      → Real business operations (Taskflow, real customers, real revenue)
└── proprietor-foundry/        → Learning experiments, sandbox, try-fail-learn (zero stakes)
```

**Location**: `/media/ratnesh-murugesan/PRO/Professional/ratnesh-vault/repos/foundry/`

**Naming Decision**: User chose `foundry` (not `solo`, `lab`, `garage`). Implies craftsmanship, multiple products, forging effort. Publicly credible: "Built at Foundry."

**3-Category Rationale** (CONV_35-36):
- `proprietor-foundry/` = Lab mode. Zero stakes. Try-fail-learn. Experiments with pricing models, content strategies, new tech. "What happens if I try this?"
- `entrepreneur-foundry/` = Production mode. Real money, real reputation. Taskflow with real customers, real Stripe/Razorpay. "This needs to work."
- `tech-foundry/` = Technical foundation. Shared infrastructure, domain apps, Taskflow code.

**Lab vs Production Pattern**: Like staging vs production for business learning. Companies spend millions on staging. You're doing it with folders.

---

## 2. SOLOSTACK PLATFORM ARCHITECTURE

**Vision**: Magic system design to create any web application with production-grade level, solo developer, 10+ year lifespan.

**3-Tier System** (CONV_18):
1. **Shared Foundation** — Core packages, infrastructure, Docker Compose, observability
2. **App Templates** — Domain-specific apps (Identity, SaaS, Marketplace, Fintech, Analytics) built on foundation
3. **Automation & Operations** — CI/CD, deployment, monitoring, business ops

**Monorepo Structure** (CONV_21, revised in CONV_41-43):
```
solo-stack/
├── packages/
│   ├── core/              → Framework-agnostic domain primitives (Entities, Value Objects, Repositories)
│   ├── infrastructure/    → Database adapters, message brokers, cache clients, external service clients
│   ├── common/            → Shared utilities, error classes, logging, config
│   └── ui/                → Shared UI components, design system
├── apps/
│   ├── identity/          → Identity & Platform (Auth, Users, RBAC) — ROOT DOMAIN
│   ├── saas/              → SaaS Subscription Management
│   ├── marketplace/       → Marketplace (Buyer-Seller)
│   ├── fintech/           → Fintech (Double-Entry, Audit Trails)
│   └── analytics/         → Analytics (Event Streaming, Dashboards)
├── infra/                 → Docker Compose, Terraform, Kubernetes manifests
└── tooling/               → ESLint, Prettier, TypeScript config shared
```

**Tech Stack** (CONV_21, CONV_41-43):
- **Framework**: Fastify ONLY (user explicitly said "stick to Fastify only", no NestJS, no framework swapping)
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm
- **Monorepo Tool**: Turborepo
- **ORM**: Drizzle ORM (TypeScript-first, type-safe SQL)
- **Database**: PostgreSQL 15+
- **Cache/Queue**: Valkey (Redis drop-in) + BullMQ
- **Validation**: Zod (runtime type validation)
- **API Gateway**: Traefik (edge routing, TLS)
- **Auth**: Auth0 (initially), custom JWT later
- **Payment**: Razorpay PRIMARY (India-compatible), Stripe optional later
- **Testing**: Vitest (unit), Playwright (E2E), Supertest (API)
- **CI/CD**: GitHub Actions

**Infrastructure Services** (CONV_41-43, 8 services in Docker Compose):
1. PostgreSQL 15 (Primary + 2 Replicas in production)
2. Valkey/Redis (Cache, Session, BullMQ)
3. MinIO (S3-compatible object storage)
4. Traefik (Reverse proxy, TLS, routing)
5. Prometheus (Metrics collection)
6. Grafana (Dashboards, visualization)
7. Loki (Log aggregation)
8. Mailpit (Email testing in dev)

**Production Architecture** (CONV_11, CONV_41-43, 10 microservices on EKS):
1. **API Gateway** — Kong (rate limiting, auth, routing, GraphQL Federation)
2. **Identity Service** — Auth, Users, RBAC, SSO
3. **SaaS Service** — Subscriptions, Billing, Usage tracking
4. **Marketplace Service** — Listings, Orders, Escrow
5. **Fintech Service** — Double-Entry Bookkeeping, Audit Trails, Financial Compliance
6. **Analytics Service** — Event Streaming, Real-time Dashboards, CQRS Read Models
7. **WebSocket Gateway** — Real-time updates, presence
8. **Message Broker** — SQS + DLQ + SNS (event-driven)
9. **Search Service** — Elasticsearch (full-text, aggregations)
10. **Notification Service** — Email, Push, SMS (multi-channel)

**Production Data Layer**:
- PostgreSQL with PgBouncer (connection pooling)
- Primary + 2 Read Replicas
- Valkey/Redis Cluster (cache, sessions, queues)
- Elasticsearch (search, logs)
- S3 + Glacier (object storage, backups)

**Production Observability**:
- OpenTelemetry + Jaeger (distributed tracing)
- Prometheus + Grafana + Alertmanager (metrics)
- structlog + Loki (structured logging)
- New Relic + Sentry (APM, error tracking)
- GrowthBook (feature flags)
- Gubbi (visual regression)

**Production Deployment**:
- ArgoCD GitOps
- Canary Deployments
- Kubernetes (EKS)

---

## 3. FIVE DOMAINS FINALIZED

### Domain 1: Identity & Platform (ROOT)
- **Purpose**: Auth, Users, RBAC, SSO — everything else imports from here
- **Features**: User registration, login, OAuth2, JWT tokens, role-based access control, multi-tenancy
- **DDD Concepts**: Entities (User, Role), Value Objects (Email, PasswordHash), Bounded Context (Auth)
- **Dependencies**: None (root domain)

### Domain 2: SaaS Subscription Management
- **Purpose**: Trials, proration, churn, usage-based billing
- **Features**: Free/Pro/Enterprise plans, trial periods, proration on upgrades, dunning management, usage metrics
- **DDD Concepts**: Aggregates (Subscription), State Machines (trial → active → past_due → cancelled), Domain Events (subscription.created, payment.failed)
- **Dependencies**: Identity

### Domain 3: Marketplace (Buyer-Seller)
- **Purpose**: Listings, orders, escrow, reviews
- **Features**: Product listings, cart, checkout, order fulfillment, escrow payments, seller ratings, dispute resolution
- **DDD Concepts**: Sagas (order fulfillment with compensation), Aggregates (Order, Listing), Domain Events (order.placed, payment.authorized)
- **Dependencies**: Identity, SaaS (for seller subscriptions)

### Domain 4: Fintech (Double-Entry/Audit)
- **Purpose**: Double-entry bookkeeping, audit trails, financial compliance
- **OSS Model**: Lighthouse (deterministic audits), Streamlit (Protobuf communication)
- **DDD Concepts**: Entities (Transaction, Account), Value Objects (Amount), Event Sourcing (audit trail)
- **Infrastructure**: PostgreSQL (ACID), Redis (caching), SQS (notifications)
- **Dependencies**: Identity

### Domain 5: Analytics (Event Streaming/Dashboards)
- **Purpose**: Real-time event tracking, dashboards, CQRS read models
- **OSS Model**: Lighthouse audits, OpenHands observability
- **DDD Concepts**: CQRS (read models optimized for analytics), Event Sourcing (event streams), Aggregates (Dashboard, Metric)
- **Infrastructure**: PostgreSQL (event store), Elasticsearch (aggregations), Kafka/SQS (event streaming)
- **Dependencies**: Identity

---

## 4. 18-MONTH ROADMAP (7 PHASES)

**From CONV_21** — 18 months, 7 phases. User explicitly chose this timeline.

### Phase 1: Foundations (Months 1-3)
- Monorepo setup (pnpm + Turborepo)
- Docker Compose with 8 services
- Identity app scaffold (Fastify + Drizzle + Zod)
- PostgreSQL schema design
- Auth0 integration
- Basic CI/CD (GitHub Actions)
- **Cost**: $0-50/month

### Phase 2: IaC & Infrastructure as Code (Months 4-5)
- Terraform for AWS provisioning
- pgBackRest for backups
- RLS (Row-Level Security) in PostgreSQL
- Infrastructure testing (Terratest)
- **Cost**: $50-100/month

### Phase 3: Kubernetes & K3s (Months 6-7)
- K3s local cluster
- Helm charts for all services
- ArgoCD deep dive (GitOps)
- Ingress controllers
- **Cost**: $0-100/month

### Phase 4: Cloud Native (Months 8-9)
- AWS EKS migration
- Managed PostgreSQL (RDS)
- Managed Redis (ElastiCache)
- S3 + Glacier for storage
- SES for email
- **Cost**: $100-300/month

### Phase 5: Distributed Systems (Months 10-12)
- Multi-tenancy patterns (schema-per-tenant, discriminator columns)
- Saga patterns for cross-service transactions
- Event-driven architecture (SQS + DLQ + SNS)
- GraphQL Federation
- WebSocket Gateway
- **Cost**: $300-500/month

### Phase 6: Fintech & Analytics (Months 13-15)
- Fintech: Double-entry bookkeeping, audit trails, financial compliance
- Analytics: Event streaming, real-time dashboards, CQRS read models
- Elasticsearch for aggregations
- Kafka/SQS for event streaming
- **Cost**: $500-700/month

### Phase 7: Production Hardening (Months 16-18)
- Performance optimization (eBPF profiling)
- Multi-region deployment
- Disaster recovery (RPO/RTO targets)
- Security hardening (secrets rotation, Vault)
- FinOps (cost optimization)
- **Cost**: $700-1000/month

---

## 5. DDD PRODUCTION ADOPTION SPECTRUM

**From CONV_19** — what to use when, production adoption rates:

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

## 6. BACKEND MONOREPO STUDY (10 MICROSERVICES)

**From CONV_0-5** — Systematic analysis of a production backend monorepo:

### Services Analyzed:
1. **Campaign API** — Python FastAPI, asyncpg, Pydantic validation
2. **Investment API** — Java Spring Boot, MySQL, JPA
3. **Document API** — Python FastAPI, S3 storage, PDF generation
4. **Document Worker** — Python Celery, background tasks, PDF processing
5. **Log API** — Node.js Express, Elasticsearch, log aggregation
6. **Marketing API** — Python FastAPI, email campaigns, analytics
7. **Notification v2** — Node.js, WebSocket, push notifications
8. **Storage v2** — Node.js, S3, file uploads, presigned URLs
9. **User Service** — Python FastAPI, Auth0, JWT tokens
10. **Pulse Backend** — Java Spring Boot, real-time metrics

### Critical Findings (Architecture Audit, CONV_6):
- 🔴 CRITICAL: Hardcoded RSA keys in config files, root containers in Dockerfiles
- 🟠 HIGH: Spring Boot 2.3 (EOL), no distributed tracing, no health checks
- 🟡 MEDIUM: Manual kubectl deployments, no DLQ for message queues, no Docker Compose
- 🟢 LOW: Static JS bundles, no contract testing, no performance benchmarks

### Cross-Cutting Patterns (CONV_1-5):
**Backend Architecture**:
- FastAPI with async/await (Python services)
- Express with async handlers (Node services)
- Pydantic for request/response validation
- Custom error classes with `code`, `message`, `details`

**Database**:
- PostgreSQL (asyncpg) for Python services
- MySQL (JPA) for Java services
- Connection pooling with `min_size=1, max_size=10`
- Migrations with Alembic (Python), Flyway (Java)

**DevOps**:
- Docker multi-stage builds
- GitHub Actions CI/CD
- Manual kubectl apply (no GitOps)
- No infrastructure as code (pre-Terraform)

**Containerization**:
- Root containers (🔴 security issue)
- No health checks in Dockerfiles
- No `.dockerignore` files

**Security**:
- Hardcoded secrets (🔴 critical)
- No secrets rotation
- Auth0 for auth, no SSO
- No rate limiting on all endpoints

**Testing**:
- Pytest for Python services
- Jest for Node services
- No E2E tests
- No integration tests with real database

**Messaging**:
- SQS for async tasks
- No DLQ (dead letter queues)
- No idempotency keys

**Observability**:
- Basic console logging
- No structured logging (structlog)
- No distributed tracing (OpenTelemetry)
- No metrics (Prometheus)

**Configuration**:
- Environment variables
- No config validation at startup
- No feature flags

---

## 7. COMPONENT SWAP RECOMMENDATIONS (15 SWAPS)

**From CONV_7** — Production-grade upgrades:

| Current | Swap To | Reason |
|---|---|---|
| uvicorn | Granian | Faster, Rust-based ASGI server |
| Redis | Valkey | Open-source Redis fork (post-ACL change) |
| SQS basic | SQS + DLQ + SNS | Reliable messaging with dead letter handling |
| SendGrid | AWS SES | Cost-effective, native AWS integration |
| boto3 (sync) | aiobotocore | Async AWS SDK for non-blocking calls |
| Sentry only | OpenTelemetry + Sentry | Distributed tracing + error tracking |
| console logging | structlog | Structured JSON logs for Loki |
| GrowthBook in-memory | GrowthBook + Redis cache | Feature flag performance |
| python-jose | pyjwt | Actively maintained JWT library |
| slowapi (in-memory) | slowapi + Redis | Distributed rate limiting |
| Spring Boot 2.3 | Spring Boot 3.4 | EOL → current stable |
| Java 8 | Java 21 | LTS with virtual threads |
| MySQL | PostgreSQL | Feature parity across services |
| Direct connections | PgBouncer | Connection pooling for PostgreSQL |
| pip | uv | Faster dependency management |
| Hardcoded secrets | AWS Secrets Manager + rotation | Security critical |

---

## 8. DECISION FRAMEWORK

**From CONV_8-9** — How to choose tech components:

**Process**: Problem → Requirements → Candidates → Trade-offs → Selection

### API Framework Decision:
- **Problem**: Need fast, type-safe, async API framework
- **Requirements**: Auto-OpenAPI, Pydantic validation, async/await, middleware
- **Candidates**: FastAPI, Flask, Django REST Framework, Starlette
- **Trade-offs**: FastAPI wins on auto-OpenAPI + Pydantic + async
- **Selection**: FastAPI (Python), Fastify (TypeScript)

### Database Decision:
- **Problem**: Need relational DB with JSON support, full-text search
- **Requirements**: ACID, JSONB, RLS, connection pooling, mature ecosystem
- **Candidates**: PostgreSQL, MySQL, SQLite, CockroachDB
- **Trade-offs**: PostgreSQL wins on JSONB, RLS, full-text, extensions
- **Selection**: PostgreSQL 15+

### ORM Decision:
- **Problem**: Need type-safe database queries
- **Requirements**: TypeScript-first, no magic, SQL visibility, migrations
- **Candidates**: Drizzle ORM, Prisma, TypeORM, Knex
- **Trade-offs**: Drizzle wins on performance, type safety, no magic
- **Selection**: Drizzle ORM

### Validation Decision:
- **Problem**: Runtime type validation for API inputs
- **Requirements**: TypeScript types, error messages, nested objects
- **Candidates**: Zod, Yup, Joi, class-validator
- **Trade-offs**: Zod wins on DX, type inference, error messages
- **Selection**: Zod

### ASGI Server Decision:
- **Problem**: Need production-grade ASGI server
- **Requirements**: HTTP/2, WebSocket, high concurrency, low latency
- **Candidates**: uvicorn, Granian, Hypercorn, Daphne
- **Trade-offs**: Granian wins on Rust core, performance
- **Selection**: Granian (production), uvicorn (dev)

### Cache Decision:
- **Problem**: Need in-memory cache, session store, message broker
- **Requirements**: Pub/sub, streams, Lua scripts, clustering
- **Candidates**: Redis, Valkey, KeyDB, Dragonfly
- **Trade-offs**: Valkey wins on open-source, Redis compatibility
- **Selection**: Valkey

---

## 9. CNCF LANDSCAPE DEEP-DIVE

**From CONV_12-13** — ~500+ projects, 6 categories with 20+ key projects:

### Category 1: Provisioning
- **Terraform** — IaC, AWS/GCP/Azure providers
- **Pulumi** — IaC in programming languages
- **Crossplane** — Kubernetes-native IaC
- **Ansible** — Configuration management

### Category 2: Runtime
- **containerd** — Container runtime
- **Crun** — Fast container runtime
- **Firecracker** — MicroVMs
- **gVisor** — Sandbox container runtime

### Category 3: Orchestration & Management
- **Kubernetes** — Container orchestration
- **K3s** — Lightweight Kubernetes
- **OpenShift** — Enterprise Kubernetes
- **Rancher** — Kubernetes management

### Category 4: API Definition & Development
- **Kong** — API Gateway
- **APISIX** — API Gateway
- **Envoy** — Edge/Service proxy
- **Linkerd** — Service mesh

### Category 5: Observability & Analysis
- **OpenTelemetry** — Distributed tracing
- **Prometheus** — Metrics collection
- **Grafana** — Dashboards
- **Jaeger** — Tracing backend
- **Loki** — Log aggregation
- **FluentBit** — Log forwarding

### Category 6: Platform
- **ArgoCD** — GitOps
- **Flux** — GitOps
- **Vault** — Secrets management
- **Istio** — Service mesh

**4 Biggest Gaps** (for solo dev):
1. OpenTelemetry (distributed tracing)
2. Prometheus/Grafana (metrics)
3. ArgoCD/Flux (GitOps)
4. Vault (secrets management)

**3-Phase Adoption Plan**:
- Phase 1: Prometheus + Grafana (Month 6)
- Phase 2: OpenTelemetry + Jaeger (Month 12)
- Phase 3: ArgoCD + Vault (Month 18)

---

## 10. MINDSET FRAMEWORK

**From CONV_14** — "Think in Layers, Decide at Boundaries"

### 10 Layer Model:
1. **Frontend** — Mental model: User experience, performance perception. Decision framework: Time-to-value < 90 seconds.
2. **Backend** — Mental model: Business logic, data flow. Decision framework: Framework-agnostic domain, adapter pattern.
3. **Database** — Mental model: Data integrity, query patterns. Decision framework: PostgreSQL-first, RLS for multi-tenancy.
4. **Messaging** — Mental model: Event-driven, async communication. Decision framework: SQS + DLQ + SNS for reliability.
5. **Infrastructure** — Mental model: Provisioning, scaling. Decision framework: Terraform → K3s → EKS progression.
6. **Observability** — Mental model: Metrics, logs, traces. Decision framework: OpenTelemetry + Prometheus + Grafana + Loki.
7. **Security** — Mental model: Threat modeling, zero trust. Decision framework: Auth0 → custom JWT, secrets rotation.
8. **Operations** — Mental model: CI/CD, deployment, incident response. Decision framework: ArgoCD GitOps, canary deployments.
9. **Business** — Mental model: Revenue, retention, growth. Decision framework: Pricing psychology, feature framing.
10. **Learning** — Mental model: Skill acquisition, knowledge compounding. Decision framework: Dual-language (TS 60%, Python 40%).

---

## 11. 12 OSS REPOS ANALYZED + 7 UNIVERSAL PATTERNS

**From CONV_21, CONV_41** — Deep analysis of 12 open-source projects:

### Batch 1:
1. **Ghost** — Content CMS. Monorepo, Knex migrations, cursor pagination, OpenAPI specs, VCR cassettes for testing
2. **Plane** — Project management. Django REST Framework, asyncpg, multi-tenancy with `workspace_id`, Alembic migrations
3. **Zulip** — Chat platform. Custom test harness, email testing fixtures, transactional test databases
4. **Storybook** — UI component library. `tsup` builds, Chromatic visual regression, plugin architecture
5. **Playwright** — E2E testing. `tsconfig` with project references, self-tests with Playwright, 500+ E2E tests
6. **Mermaid** — Diagramming. Table-driven tests, deterministic parsing algorithms, grammar as code

### Batch 2:
7. **Hoppscotch** — API client. `fp-ts.Either` error handling, Auth0 + NextAuth, in-memory Supabase for testing
8. **Streamlit** — Python web apps. `uv` + `hatch` builds, Protobuf communication, custom exceptions
9. **Lighthouse** — Web performance. Plugin architecture, deterministic audits, audit rules as code
10. **Discourse** — Forum platform. 100+ tables, fabricators for test data, TurboTests parallel runner, 50+ indexes
11. **Puppeteer** — Browser automation. Mocha E2E tests, protocol-first design, custom test runner
12. **OpenHands** — AI coding agent. Mock-LLM E2E testing (GOLD STANDARD), 3 web servers for testing, path-based CI change detection

### 7 Universal Patterns:
1. **Protocol-first design** — Playwright, Puppeteer, Streamlit, OpenHands. Define protocol before implementation.
2. **Mock-dependency testing** — OpenHands mock-LLM server. Real stack, mocked external dependency.
3. **Feature-organized tests** — 8/12 repos. Tests organized by feature, not by type.
4. **Plugin architecture** — Lighthouse, Discourse, Streamlit, OpenHands, Storybook. Extensible cores.
5. **Deterministic algorithms** — Mermaid, Lighthouse, Puppeteer. Same input → same output.
6. **Documentation as code** — 7/12 repos. OpenAPI specs, AGENTS.md, READMEs in repo.
7. **Framework-agnostic cores** — Storybook, Playwright, Hoppscotch, OpenHands. Core logic independent of framework.

---

## 12. TASKFLOW — LINEAR CLONE SaaS

**From CONV_28-29** — First real SaaS app to build.

### Positioning:
"Project management that doesn't suck for non-engineers."
- Target: marketing teams, design teams, small agencies, open source projects
- NOT "another Linear" — Linear is for software teams
- Psychological hooks: ownership bias (workspaces), identity reinforcement (keyboard shortcuts), trust (clean UI), reciprocity (free tier), scarcity (usage limits)

### Domain Model:
- Workspaces (multi-tenant root)
- Projects (within workspace)
- Issues (title, status, assignee, priority)
- Users (roles: owner/admin/member/viewer)
- Plans (free/pro/enterprise with limits)

### Tech Stack:
- Frontend: TypeScript (React/Vue later)
- Backend: Python (FastAPI, asyncpg, Pydantic)
- Database: PostgreSQL
- Auth: Auth0
- Testing: Vitest (TS), Pytest (Python), Playwright (E2E)
- Tooling: uv (Python), ruff, mypy, tsup (TS)

### Phase 1 Scope (Months 1-4):
| Month | Deliverable |
|---|---|
| 1 | Typed config system (TS) + service layer (Python). No DB yet. Dual-language track. |
| 2 | Full test suite: 80+ unit, 20+ integration, 10+ E2E |
| 3 | REST API: 20+ endpoints, OpenAPI docs, Auth0 auth |
| 4 | PostgreSQL schema, migrations, asyncpg, multi-tenancy |

### Week 1 Plan (Dual-Language, CONV_29):
| Day | TypeScript (Morning) | Python (Afternoon) | Concept Transfer |
|---|---|---|---|
| 1 | Primitives, `unknown` vs `any`, strict mode | Variables, data types, `def`, `if/for/while` | Both are dynamically runnable, statically checkable |
| 2 | Discriminated unions, narrowing with `switch` | `typing.Literal`, `match/case` (Python 3.10+) | Same pattern: `type: "created"` narrows shape |
| 3 | Generics, `Partial/Omit/Pick` | `TypeVar`, `TypedDict`, `dataclasses` | Generic constraints → `TypeVar(bound=...)` |
| 4 | `satisfies`, `as const`, `readonly` | `typing.final`, `dataclass(frozen=True)` | Immutability patterns |
| 5 | Build: Taskflow config (TS) — plans, limits, features | Build: Taskflow config (Python) — Pydantic models | Same domain, two type systems |
| 6-7 | Mini-project: type-safe plan validator | Mini-project: Pydantic plan validator | Compare error messages, DX |

### Resources (CONV_29):
**TypeScript**:
- TypeScript Handbook — Types, Strict Property Checks
- Total TypeScript — Discriminated Unions (free)
- TS Handbook — Generics, Utility Types
- TS Blog — `satisfies` Keyword
- TypeScript Playground

**Python**:
- Python Tutorial — Control Flow
- PEP 484 — Type Hints
- Pydantic V2 Docs — BaseModel
- Python Docs — Literal Types, Structural Pattern Matching
- uv docs, ruff docs, mypy docs

**Both**:
- Linear app (sign up free, use for 1 hour, note UI patterns)
- Linear API Docs (study API design)
- HTTPie or Postman (for testing APIs)

### Taskflow Skeleton Structure (CONV_28):
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

---

## 13. DUAL-LANGUAGE LEARNING STRATEGY

**From CONV_27** — TypeScript 60%, Python 40%, asymmetric learning.

### Rationale:
- User knows TypeScript, doesn't know Python
- 5/12 OSS repos are Python (Plane, Zulip, Streamlit, OpenHands backend, mock servers)
- FastAPI's auto-OpenAPI + Pydantic validation is unmatched
- Python is the AI/ML language (needed later)
- JS + Python is the most hireable combo

### Transfer Effect (Months 2-4):
- TypeScript `async/await` → Python `async/await` (identical syntax)
- TypeScript `interface` → Python `Pydantic BaseModel` (same validation concept)
- TypeScript `vi.mock()` → Python `unittest.mock.patch()` (same mocking idea)
- TypeScript `describe/it` → Python `class TestClass / def test_()` (same structure)

### Cognitive Cost:
- Month 1: Learning two languages (painful)
- Months 2-4: Learning one concept twice (reinforces)

### Decision Matrix:
| If you... | Choose |
|---|---|
| Have 2+ hours/day | Both — Month 1 is hard, Months 2-4 are rewarding |
| Have 1 hour/day | TypeScript-first, Python later |
| Want to read all 12 OSS repos deeply | Both — can't understand Plane or OpenHands backend without Python |
| Want a working API ASAP | TypeScript-only — faster to first endpoint |
| Plan to use AI/ML tools later | Both — Python is the AI language |
| Want maximum job market flexibility | Both — JS + Python is the most hireable combo |

### Python Learning Path (~2 weeks to productive):
1. Syntax (variables, functions, classes) — 2 days
2. Typing + Pydantic — 3 days
3. `asyncio` + `asyncpg` — 4 days
4. `pytest` + `ruff` + `mypy` — 3 days
5. FastAPI — 3 days (trivial if you know REST from TypeScript)

---

## 14. LEARNING PROCESS (YOU RESEARCH, I VERIFY)

**From CONV_29** — Best way to learn.

### Protocol:
```
You say: "I finished Day 2 (discriminated unions)"
You show me: Code, tests, any errors you hit
I verify: Code review, point gaps, give next challenge
You iterate: Fix, resubmit
We move on: Day 3
```

### Rules:
1. Implement first, ask questions second
2. Show code, not descriptions
3. Agent is strict on types, strict on tests, lenient on style
4. If stuck >2 hours, ask — don't spiral
5. Research for 30 minutes, implement for 2.5 hours — learning happens in implementation

### Verification Checklist:
- ✅ Types strict: No `any`, no `# type: ignore`, no `Any`
- ✅ Tests exist: At least 3 test cases per function
- ✅ Errors handled: No unhandled exceptions, no uncaught promises
- ✅ Linting clean: `ruff` and `tsc` pass
- ✅ Concepts correct: Discriminated unions narrow, generics constrain

### Feedback Format:
- ✅ What's correct
- ⚠️ What needs improvement
- ❌ What's wrong
- 🔜 Next day's challenge

---

## 15. 4-MONTH DETAILED LEARNING PLAN

**From CONV_26** — Comprehensive curriculum with OSS validation.

### Month 1: Type Systems, Build Tools, Polyglot Basics
**Goal**: Learn TypeScript and Python type systems side by side. Build a polyglot skeleton project.

**Week 1: Type Systems** (detailed in CONV_26):
- Day 1-2: TypeScript types (primitives, `unknown` vs `any`, strict mode) + Python types (variables, `def`, `if/for/while`)
- Day 3-4: Discriminated unions (TS) + Literal/match-case (Python)
- Day 5-7: Mini-Project — Plan validator in both languages

**Week 2: Async & Ecosystem** (CONV_26):
- Day 1-2: `async/await` in both languages (identical syntax)
- Day 3-4: Build systems — `tsc`/`tsup`/`esbuild` vs `uv`/`hatch`/`poetry`
- Day 5-7: Mini-Project — Polyglot SaaS Skeleton (TS CLI + Python FastAPI)

**Week 3: Error Handling & Tooling** (CONV_26):
- Day 1-2: Custom error classes (OpenHands pattern) + Pydantic validation
- Day 3-4: Zod (TS) + Pydantic (Python) runtime validation
- Day 5-7: Mini-Project — Error-resilient API client (retry, timeout, circuit breaker)

**Week 4: Polyglot Interoperability** (CONV_26):
- Day 1-2: TypeScript build systems (`tsconfig.json` strict, `tsup`, project references)
- Day 3-4: Python build systems (`uv`, `pyproject.toml`, `hatch`)
- Day 5-7: Capstone — Taskflow skeleton (TS CLI + Python API, both tested, CI green)

### Month 2: Testing Fundamentals
**Goal**: Write tests that give confidence, not coverage numbers.

**Week 1: Unit Testing — TypeScript** (CONV_26):
- Vitest fundamentals (hoisted mocks, `vi.fn()`, `vi.spyOn()`)
- AAA pattern (Arrange, Act, Assert)
- Table-driven tests (Mermaid pattern)
- Factory functions for test data (Discourse fabricator pattern)

**Week 2: Unit Testing — Python** (CONV_26):
- Pytest fundamentals (fixtures, parametrization, `assert`)
- `pytest-asyncio` for async tests
- `unittest.mock` for mocking
- Factory fixtures

**Week 3: Integration Testing** (CONV_26):
- Test databases (Docker PostgreSQL, testcontainers)
- Transaction rollback per test
- Mocking external services (`respx` for Python, `msw` for TypeScript)
- VCR cassettes (Discourse pattern)

**Week 4: E2E Testing** (CONV_26):
- Playwright setup, browsers, page objects
- OpenHands mock-LLM E2E pattern (GOLD STANDARD)
- CI/CD for tests (GitHub Actions, caching)
- Coverage reports (`c8` for Node, `coverage.py` for Python)

### Month 3: REST APIs, OpenAPI Specs
**Goal**: Design and implement production-grade REST APIs.

**Week 1: API Design Principles** (CONV_26):
- Resource naming (nouns, not verbs)
- HTTP methods, status codes
- Pagination (offset, cursor, keyset)
- OpenAPI 3.1 specification (Ghost pattern)

**Week 2: FastAPI Implementation** (CONV_26):
- Route decorators, path/query/body parameters
- Pydantic models for validation
- Dependency injection (`Depends()`)
- Auth0 authentication, RBAC

**Week 3: API Testing, Error Handling** (CONV_26):
- `httpx.AsyncClient` for testing
- Custom exception handlers
- Standardized error responses (Ghost pattern)

**Week 4: API Documentation, Versioning** (CONV_26):
- Auto-generated Swagger UI, ReDoc
- URL versioning (Ghost pattern)
- Deprecation headers (Discourse pattern)

### Month 4: Database Design, PostgreSQL Depth
**Goal**: Design production-grade databases with PostgreSQL.

**Week 1: Relational Design, Normalization** (CONV_26):
- Schema design (Ghost, Plane, Discourse patterns)
- Alembic migrations (Plane pattern)
- Indexes (B-tree, GIN, GiST, BRIN)

**Week 2: Advanced PostgreSQL** (CONV_26):
- Complex queries (JOINs, CTEs, window functions)
- Indexing strategies (partial, composite, covering)
- `EXPLAIN ANALYZE` for query plans

**Week 3: asyncpg, Connection Pooling** (CONV_26):
- `asyncpg.create_pool()` with `min_size`, `max_size`
- PgBouncer for production (Discourse pattern)
- Transaction management

**Week 4: Data Modeling, Multi-Tenancy** (CONV_26):
- Discriminator column pattern (Plane, Hoppscotch)
- Row-Level Security (Hoppscotch, PostgreSQL RLS)
- JSONB, full-text search (Discourse pattern)

---

## 16. BUSINESS PSYCHOLOGY & CONTENT STRATEGY

**From CONV_29** — Selling features in SaaS.

### Psychological Patterns:
- **Workspaces** → Ownership bias ("This is MY territory")
- **Keyboard shortcuts** → Identity reinforcement ("I'm fast, I'm pro")
- **Clean UI** → Trust (aesthetic-usability effect)
- **Free tier** → Risk-free trial (reciprocity)
- **Usage limits** → Upgrade trigger (scarcity)
- **Time-to-value < 90 seconds** → Onboarding hook

### Content Strategy (CONV_41):
- Hybrid public approach (4 formats)
- Technical blog posts (learning journey)
- Architecture diagrams (Mermaid)
- Code snippets (OSS patterns)
- Video tutorials (future)

---

## 17. PAYMENT DECISIONS

**From CONV_41-43**:
- **Razorpay PRIMARY** — India-compatible, UPI support, local payment methods
- **Stripe OPTIONAL** — Later, for international expansion
- **Provider Abstraction** — Interface-based payment provider, swap without touching domain logic

---

## 18. NOSQL TIMING

**From CONV_41**:
- PostgreSQL-only for first 10 months
- Phased introduction of NoSQL (MongoDB for documents, Cassandra for time-series)
- Only when relational DB hits limits

---

## 19. CURRENT STATE

**As of CONV_44 (Fintech & Analytics restored)**:
- ✅ Workspace structure created (`foundry/` with 3 categories)
- ✅ 5 domains finalized (Identity, SaaS, Marketplace, **Fintech**, **Analytics**) — restored per CONV_21
- ✅ 24-month roadmap with 6 phases
- ✅ Tech stack locked (Fastify only, pnpm + Turborepo, Drizzle, PostgreSQL, Valkey, BullMQ, Zod)
- ✅ Payment decision (Razorpay primary, Stripe optional)
- ✅ Learning strategy (TS 60%, Python 40%, dual-language)
- ✅ Taskflow Week 1 plan ready (Day 1: TS primitives + Python syntax)
- ✅ Monorepo structure defined (packages/core, infrastructure, common, ui; apps/identity, saas, marketplace, fintech, analytics)
- ✅ Infrastructure services defined (8 services in Docker Compose)
- ✅ Production architecture defined (10 microservices on EKS)
- ✅ DDD adoption spectrum documented
- ✅ 12 OSS repos analyzed, 7 universal patterns extracted
- ✅ CNCF landscape deep-dive (6 categories, 20+ key projects)
- ✅ Backend monorepo study (10 microservices, critical findings)
- ✅ Component swap recommendations (15 swaps)
- ✅ Decision framework documented
- ✅ Mindset framework (10-layer model)
- ✅ Content strategy (4 formats, hybrid public)
- ✅ NoSQL timing (PostgreSQL first 10 months)
<!-- - ⏳ **NEXT**: Scaffold monorepo in `tech-foundry/` OR start Taskflow Week 1 Day 1 -->

**To restore context in new workspace**: Say "Read `/memories/foundry-roadmap.md` and continue."

**For microscopic detail on any topic**: Say "Go to `/memories/foundry-roadmap-raw-chats.txt` lines X-Y" for full conversation transcript.

**Raw transcript location**: `/home/ratnesh-murugesan/.vscode-insiders/tmp/tmp_vscode_1/foundry_conversations.txt` (12,189 lines, 462KB)
