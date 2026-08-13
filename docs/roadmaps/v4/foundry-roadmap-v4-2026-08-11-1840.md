# Foundry Roadmap v4 — Make it Work, Make it Right, Make it Fast

> **Generated**: 2026-08-11
> **Purpose**: Single source of truth. Survives workspace switches. Say "Read `roadmaps/v4/foundry-roadmap-v4-2026-08-11-1840.md`" to restore full context.
> **Location**: `roadmaps/v4/foundry-roadmap-v4-2026-08-11-1840.md`

---

## Core Philosophy: "Make it Work → Make it Right → Make it Fast"

**Origin**: Kent Beck, Extreme Programming / TDD. 30+ years of evidence. Every senior engineer knows this phrase.

**The rule**: Follow the three phases in order. Don't skip "make it right." Don't go straight to "make it fast."

```
Phase 1: MAKE IT WORK (Weeks 1-6)
  └─ Get it running. No tests, no elegance, no optimization.
  └─ Bar: It returns correct output. You can curl it. A human can use it.
  └─ Mindset: "Build the wrong thing first — it's SUPPOSED to be ugly."

Phase 2: MAKE IT RIGHT (Weeks 7-20)
  └─ Refactor, add tests, proper DDD, clean architecture, infrastructure.
  └─ Bar: 80%+ test coverage, DDD patterns applied, deployed on K3s with GitOps.
  └─ Mindset: "Look at how OSS solved this. Apply their patterns."

Phase 3: MAKE IT FAST (Weeks 21-36)
  └─ Performance, caching, scaling, observability, production hardening.
  └─ Bar: p99 latency budgets, auto-scaling, full observability, DR drills.
  └─ Mindset: "Measure everything. Optimize what matters."
```

**Why this works**:
- "Make it work" has a clear bar: it runs, correct output, you can curl it.
- "Make it right → make it fast" gives two distinct quality bars with different goals.
- It's psychologically clean: you're not "shipping something broken", you're "making it work" — intentional.
- Every senior engineer knows this phrase. You can say it in interviews, code reviews, design docs.

**The #1 rule you'll violate**: People skip "make it right" and go straight to "make it fast." Your roadmap explicitly reserves Weeks 7-20 for "make it right." **That's the discipline.**

**This is how all 12 OSS repos actually grew**:
- Ghost: Made it work (blog) → Made it right (i18n, accessibility) → Made it fast (CDN, caching)
- Plane: Made it work (Linear clone) → Made it right (multi-tenant RLS, tests) → Made it fast (Celery workers, caching)
- OpenHands: Made it work (AI agent) → Made it right (mock-LLM E2E, MCP) → Made it fast (caching, streaming)
- Discourse: Made it work (forum) → Made it right (100+ tables, TurboTests) → Made it fast (Sidekiq, PostgreSQL tuning)

**OSS Reference Rule**: Look at an OSS pattern for 30 minutes, build the 80% version in 20% of the time, iterate in the next phase.

**The Full Arc**:
```
        MAKE IT WORK          MAKE IT RIGHT              MAKE IT FAST
    ┌─────────────────┐  ┌──────────────────────────┐  ┌─────────────────┐
    │ Sprint 1: API   │  │ Deepening 1: Quality     │  │ Deepening 4:    │
    │ Weeks 1-2       │  │ Weeks 7-10               │  │ Production      │
    │ Deployed URL    │  │ Tests, DDD, RLS          │  │ Weeks 21-28     │
    └─────────────────┘  └──────────────────────────┘  │ EKS, observ.    │
             │                  │                        │ security, DR    │
    ┌─────────────────┐  ┌──────────────────────────┐  └─────────────────┘
    │ Sprint 2: Auth  │  │ Deepening 2: Infra       │           ▲
    │ Weeks 3-4       │  │ Weeks 11-14              │  ┌─────────────────┘
    │ Sign up + pay   │  │ K3s, Helm, GitOps        │  │ Deepening 5:    │
    └─────────────────┘  └──────────────────────────┘  │ Advanced        │
             │                  │                        │ Weeks 29-36     │
    ┌─────────────────┐  ┌──────────────────────────┐  │ Event sourcing  │
    │ Sprint 3: UI    │  │ Deepening 3: Distributed │  │ CQRS, AI, OSS   │
    │ Weeks 5-6       │  │ Weeks 15-20              │  └─────────────────┘
    │ Real product    │  │ Microservices, SQS,      │
    │ in browser      │  │ Sagas, resilience        │
    └─────────────────┘  └──────────────────────────┘
```

**By week 2: deployed URL. By week 6: real product. By week 20: quality codebase. By week 36: production-grade.**

**Total timeline**: ~36 weeks (~9 months) to a production-grade, observable, scalable, open-source-ready product.

---

## 1. Vision & Workspace Structure

**Vision**: Build a complete software engineering business as a solo developer — from learning fundamentals to production-grade infrastructure to real revenue — with a 10+ year lifespan.

```
foundry/
├── tech-foundry/              → Technical projects (Taskflow, 5-domain apps, infrastructure)
│   └── taskflow/              → Linear clone SaaS (Build Sprint project)
├── entrepreneur-foundry/      → Real business operations (Taskflow, real customers, real revenue)
└── proprietor-foundry/        → Learning experiments, sandbox, try-fail-learn (zero stakes)
```

**3-Category Rationale**:
- `proprietor-foundry/` = Lab mode. Zero stakes. Experiments with pricing, content, new tech.
- `entrepreneur-foundry/` = Production mode. Real money, real reputation, real Stripe/Razorpay.
- `tech-foundry/` = Technical foundation. Shared infrastructure, domain apps, Taskflow code.

**Dual-Language Track**: TypeScript 60% (depth, frontend, full-stack), Python 40% (backend, async, FastAPI). Same concepts, two type systems.

---

## 2. SoloStack Platform Architecture (Reference — Build Thin First)

**Vision**: Magic system to create any web application at production-grade level, solo developer, 10+ year lifespan.

**Monorepo Structure** (this is the *end state* — you'll build a thin version first):
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

**Tech Stack**:
| Layer | Choice | Why |
|---|---|---|
| Framework | Fastify (TS), FastAPI (Python) | "Fastify only" for TS; FastAPI for Python auto-OpenAPI |
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

**Note**: Sprint 1 uses a *thin subset*: FastAPI + PostgreSQL + basic Docker. The rest comes in deepening passes.

---

## 3. Five Domain Templates (Reference — Build One at a Time)

Each template maps to real OSS patterns from the 12-repo analysis. You'll build the SaaS template first (Taskflow), then reference others as you expand.

### Template 1: SaaS (Subscriptions) ← BUILD THIS FIRST
- **OSS Model**: Ghost (content + admin API separation), Plane (multi-tenant workspaces)
- **Thin version**: Basic CRUD for Workspace → Project → Issue, single tenant
- **Deep version**: Full DDD, multi-tenancy with RLS, subscription lifecycle state machine

### Template 2-5: Build after SaaS is production-grade
- E-Commerce (Orders/Sagas) — reference Hoppscotch, Discourse
- Fintech (Double-Entry/Audit) — reference Lighthouse, Streamlit
- Healthcare (HIPAA/Privacy) — reference Zulip, OpenHands
- Content Platform (Publishing/Versioning) — reference Ghost, Discourse, Mermaid

---

## 4. Roadmap: Three Phases, Six Stages

### PHASE 1: MAKE IT WORK (Weeks 1-6) — $0/month
**Bar**: It runs. It returns correct output. A human can use it in a browser.
**Mindset**: "Build the wrong thing first. It's supposed to be ugly. The learning is in the rewrite."

### Sprint 1: Working API (Weeks 1-2)

| Day | What You Build | OSS Reference | Thin Version |
|---|---|---|---|
| 1 | TypeScript + Python basics (just enough) | — | Types, async, Pydantic models |
| 2 | Taskflow API skeleton (in-memory, no DB) | Hoppscotch (service DI) | 3 endpoints: list workspaces, list projects, list issues |
| 3 | Add PostgreSQL, basic schema | Plane (`workspace_id` pattern) | 3 tables: workspaces, projects, issues |
| 4 | CRUD operations, Drizzle/asyncpg | Ghost (migrations) | Create, read, update for all 3 entities |
| 5 | Docker Compose (Postgres + app) | Streamlit (Docker basics) | `docker compose up` starts everything |
| 6 | Deploy to Oracle Free Tier | — | SSH in, `docker compose up -d`, curl the URL |
| 7 | Basic GitHub Actions CI | — | `pytest` + `tsc --noEmit` on push |

**End of Sprint 1**: You have a URL that returns JSON. It's not secure, not tested, not pretty. But it's *deployed*. 🎉

**What you skip (for now)**: Tests, auth, payments, frontend, proper DDD, observability, multi-tenancy, proper Docker images, GitOps. All of this comes in Phase 2.

**What you learn**: Enough TypeScript/Python to be dangerous, basic PostgreSQL, Docker Compose, Oracle Free Tier, GitHub Actions.

---

### Sprint 2: Auth + Payments (Weeks 3-4)
**Goal**: Real users can sign up, log in, and pay. Thin but functional.

| Day | What You Build | OSS Reference | Thin Version |
|---|---|---|---|
| 8-9 | Auth0 signup/login | Campaign API (Gatekeeper RBAC) | Auth0 hosted login, JWT in requests |
| 10-11 | Workspace ownership, basic RBAC | Plane (workspace members) | Owner can invite, member can view |
| 12-13 | Razorpay checkout | — | Create order, verify payment |
| 14-15 | Razorpay webhooks | Document Worker (SQS consumer) | Handle payment success/failure |
| 16-14 | Deploy, test end-to-end manually | — | Sign up → create workspace → pay → unlock features |

**End of Sprint 2**: You have a deployable SaaS with auth and payments. Still no frontend, no tests. But a real user *could* use it via API.

**What you learn**: OAuth flows, JWT, Razorpay API, webhook handling, RBAC basics.

---

### Sprint 3: Frontend + Real Product (Weeks 5-6)
**Goal**: Something a human can actually use with a browser.

| Day | What You Build | OSS Reference | Thin Version |
|---|---|---|---|
| 17-18 | Next.js app, workspace list | Linear (clean UI) | List workspaces, create workspace |
| 19-20 | Project list, issue list | Linear (Kanban) | Board view with drag (basic) |
| 21-22 | Issue create/edit | Linear (keyboard-driven) | `Cmd+N` to create, basic form |
| 23-24 | Auth0 frontend integration | — | Login page, protected routes |
| 25-26 | Deploy full stack | — | Frontend + backend on Oracle, single URL |

**End of Sprint 3**: You have a real product. A human can sign up, create a workspace, manage issues, and pay. It's ugly and untested, but it *works end-to-end*.

**What you learn**: Next.js, frontend-backend integration, deployment of full stack.

**✅ PHASE 1 COMPLETE**: Something deployed, something usable, something you can show someone.

---

### PHASE 2: MAKE IT RIGHT (Weeks 7-20) — $0-30/month
**Bar**: 80%+ test coverage, DDD patterns applied, deployed on K3s with GitOps, multi-tenant with RLS.
**Mindset**: "Look at how OSS solved this. Apply their patterns. Every bug from Phase 1 teaches a concept."

### Deepening 1: Quality (Weeks 7-10)
**Goal**: Make what you built actually good. Add tests, proper DDD, multi-tenancy, basic observability.

| Week | What You Add | OSS Reference | Intermediate Concepts |
|---|---|---|---|
| 7 | Unit tests: 80+ tests | OpenHands (mock-dependency pattern) | Vitest, pytest, `vi.mock()`, `respx` |
| 8 | Integration + E2E: 30+ tests | Discourse (TurboTests), Playwright | Database testing, Playwright E2E |
| 9 | Proper DDD: Entities, Value Objects, Aggregates | Plane (domain-driven apps) | Bounded contexts, consistency boundaries |
| 10 | Multi-tenancy: RLS, workspace isolation | Plane (`workspace_id` everywhere) | PostgreSQL RLS policies, row-level security |

**What you learn**: Test patterns from OSS, DDD fundamentals, PostgreSQL RLS, proper domain modeling.

**Advanced concepts to explore**: Domain events, outbox pattern, state machines (save for Deepening 3).

---

### Deepening 2: Infrastructure (Weeks 11-14)
**Goal**: Make deployment proper. K3s, Helm, Traefik, GitOps.

| Week | What You Add | OSS Reference | Intermediate Concepts |
|---|---|---|---|
| 11 | Docker multi-stage builds | Streamlit (packaging) | Small images, proper layers |
| 12 | K3s on Oracle, Helm charts | — | Kubernetes basics, Helm templating |
| 13 | Traefik ingress, TLS | — | Reverse proxy, Let's Encrypt |
| 14 | ArgoCD GitOps | — | Auto-deploy on merge |

**What you learn**: Kubernetes, Helm, Traefik, GitOps, proper CI/CD pipelines.

**Advanced concepts to explore**: Service mesh (mTLS), horizontal pod autoscaling (save for Phase 3).

---

### Deepening 3: Distributed (Weeks 15-20)
**Goal**: Split monolith into services. Add messaging, resilience, sagas.

| Week | What You Add | OSS Reference | Advanced Concepts |
|---|---|---|---|
| 15-16 | Split: Identity service, SaaS service | Backend monorepo study (10 services) | Service boundaries, bounded contexts |
| 17 | SQS + DLQ + SNS | Document Worker (priority queues) | Reliable messaging, dead letter queues |
| 18 | Outbox pattern | Campaign API (event publishing) | Transactional outbox, exactly-once semantics |
| 19 | Sagas, compensation | E-commerce template (order fulfillment) | Distributed transactions, rollback |
| 20 | Circuit breakers, resilience | — | Retry policies, fallbacks, bulkheads |

**What you learn**: Microservice architecture, event-driven design, distributed transactions, resilience patterns.

**Advanced concepts to explore**: CQRS, event sourcing (save for Phase 3).

---

**✅ PHASE 2 COMPLETE**: Quality codebase, tested, proper architecture, deployed on K3s with GitOps.

---

### PHASE 3: MAKE IT FAST (Weeks 21-36) — $0-50/month
**Bar**: p99 latency budgets, auto-scaling, full observability stack, DR drills pass, event sourcing, CQRS, AI integration.
**Mindset**: "Measure everything. Optimize what matters. Stand on shoulders of the 12 OSS repos."

### Deepening 4: Production (Weeks 21-28)
**Goal**: Make it survive in the real world. Observability, security, performance, DR.

| Week | What You Add | OSS Reference | Advanced Concepts |
|---|---|---|---|
| 21-22 | EKS migration | — | Managed K8s, IAM roles, VPC |
| 23-24 | Full observability: OpenTelemetry, Jaeger, Prometheus, Grafana, Loki | CNCF landscape deep-dive | Distributed tracing, metrics, log aggregation |
| 25 | Security: Vault, secrets rotation | OpenHands (security-first) | Secrets management, zero trust |
| 26 | Performance: benchmarks, budgets | Lighthouse (deterministic audits) | Load testing, p99 latency |
| 27-28 | Disaster recovery: backup/restore | — | Point-in-time recovery, RTO/RPO |

**What you learn**: Cloud-native production, full observability stack, security hardening, disaster recovery.

---

### Deepening 5: Advanced (Weeks 29-36)
**Goal**: Master the hard stuff. Event sourcing, CQRS, plugins, AI, open source.

| Week | What You Add | OSS Reference | Advanced Concepts |
|---|---|---|---|
| 29-30 | Event sourcing | Lighthouse (audit trail) | Event store, projections, snapshots |
| 31-32 | CQRS, read models | Analytics template | Command/query separation, materialized views |
| 33-34 | AI integration, MCP servers | OpenHands (AI agents) | LLM tool use, MCP protocol |
| 35 | Plugin architecture | Storybook, Lighthouse (plugins) | Extensibility, hook systems |
| 36 | Open source release | All 12 repos (AGENTS.md, CONTRIBUTING.md) | Documentation as code, community setup |

**What you learn**: Event sourcing, CQRS, AI agent patterns, plugin systems, open source maintenance.

**✅ PHASE 3 COMPLETE**: Production-grade, observable, scalable, open source ready.

---

### Timeline Summary

| Phase | Stage | Duration | Bar Met | Cost |
|---|---|---|---|---|
| **MAKE IT WORK** | Sprint 1: API | Weeks 1-2 | Deployed URL, curl works | $0 |
| | Sprint 2: Auth+Pay | Weeks 3-4 | Users can sign up and pay | $0 |
| | Sprint 3: Frontend | Weeks 5-6 | Real product in browser | $0 |
| **MAKE IT RIGHT** | Deepening 1: Quality | Weeks 7-10 | 80%+ tests, DDD, RLS | $0 |
| | Deepening 2: Infra | Weeks 11-14 | K3s, Helm, GitOps | $0 |
| | Deepening 3: Distributed | Weeks 15-20 | Microservices, SQS, Sagas | $0-30 |
| **MAKE IT FAST** | Deepening 4: Production | Weeks 21-28 | EKS, observability, DR | $0-50 |
| | Deepening 5: Advanced | Weeks 29-36 | Event sourcing, AI, OSS | $0-50 |

**Total**: ~36 weeks (~9 months). Kent Beck's progression — work → right → fast — instead of guessing at perfection upfront.

---

## 5. DDD: Progressive Adoption (Learn as You Need It)

**DDD Approach**: Use the DDD concept when you need it, learn it then. No upfront theory.

| Concept | When You'll Use It | What OSS Repo Models It |
|---|---|---|
| Entities + Value Objects | Sprint 1 (Day 1) | Every repo — start here |
| State Machines | Sprint 2 (subscription lifecycle) | Ghost (content states) |
| Aggregates | Deepening 1 (proper DDD) | Plane (domain-driven apps) |
| Bounded Contexts | Deepening 3 (service split) | Backend monorepo study |
| Domain Events | Deepening 3 (event-driven) | Campaign API (SQS events) |
| Outbox Pattern | Deepening 3 (reliable events) | Campaign API (transactional outbox) |
| Sagas + Compensation | Deepening 3 (order flows) | E-commerce template |
| CQRS | Deepening 5 (analytics) | Analytics template |
| Event Sourcing | Deepening 5 (audit trails) | Lighthouse (deterministic audits) |

**Rule**: Don't pre-learn DDD. When you hit a problem that needs a pattern, look at the OSS reference, implement it, move on.

---

## 6. Backend Monorepo Study (Reference — Use When Splitting)

### Services Analyzed (reference for Deepening 3):
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

### When to Reference Each:
- **Sprint 2 (Auth)**: Look at User Service (JWT, bcrypt pattern)
- **Sprint 2 (Payments)**: Look at Campaign API (SQS webhooks)
- **Deepening 3 (Split)**: Look at all 10 for service boundary patterns
- **Deepening 3 (Messaging)**: Look at Document Worker (SQS patterns)

### Cross-Cutting Patterns (learn when you need them):
- MVC / Layered: Controllers → Services → CRUD/Repository → Database
- Event-Driven: AWS SQS for inter-service communication (5+ services)
- Worker Pattern: 5 services have background workers
- Repository Pattern: CRUD layer in all Python services
- 12-Factor: Config via env vars, backing services, disposable workers
- Async-First: All Python services use async/await

---

## 7. Component Swap Recommendations (Apply During Deepening)

| Current | Swap To | When to Swap |
|---|---|---|
| uvicorn | Granian | Deepening 2 (infra) |
| Redis | Valkey | Deepening 2 (infra) |
| SQS basic | SQS + DLQ + SNS | Deepening 3 (distributed) |
| SendGrid | AWS SES | Deepening 4 (production) |
| boto3 (sync) | aiobotocore | Deepening 3 (async) |
| Sentry only | OpenTelemetry + Sentry | Deepening 4 (observability) |
| console logging | structlog | Deepening 1 (quality) |
| python-jose | pyjwt | Deepening 1 (quality) |
| slowapi (in-memory) | slowapi + Redis | Deepening 3 (distributed) |

---

## 8. Decision Framework (Unchanged)

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

## 9. CNCF Landscape (Reference — Apply During Deepening)

**6 Categories, 20+ Key Projects** (apply when you reach the phase):

| Category | Key Projects | When You'll Touch It |
|---|---|---|
| Provisioning | Terraform, Pulumi | Deepening 2 (infra) |
| Runtime | containerd, Crun | Deepening 2 (Docker) |
| Orchestration | Kubernetes, K3s | Deepening 2 (K3s) |
| API/Proxy | Kong, APISIX, Envoy | Deepening 3 (gateway) |
| Observability | OpenTelemetry, Prometheus, Grafana, Jaeger, Loki | Deepening 4 (production) |
| Platform | ArgoCD, Flux, Vault | Deepening 2 (GitOps), Deepening 4 (secrets) |

**Adoption Timeline**:
- Deepening 2: K3s + Traefik + ArgoCD (Weeks 11-14)
- Deepening 4: OpenTelemetry + Prometheus + Grafana + Loki + Vault (Weeks 21-28)

---

## 10. Mindset Framework: Phase-Appropriate Discipline

**Mindset**: Each phase has a different discipline. Apply the right one for the phase you're in.

### Phase 1 Mindset: "Build the Wrong Thing First"
> "The first draft of anything is garbage." — Hemingway (applied to code)

| Rule | Why |
|---|---|
| It doesn't have to be perfect, it has to exist | Momentum > perfection |
| What breaks first is what I learn first | Real usage teaches better than reading |
| Research 30 minutes, implement 2.5 hours | Learning happens in shipping, not reading |

### Phase 2 Mindset: "Stand on Shoulders of Giants"
> "If I have seen further it is by standing on the shoulders of giants." — Newton

| Rule | Why |
|---|---|
| Look at how OSS solved this, then apply it | 12 repos already figured out the hard parts |
| Every bug from Phase 1 teaches a concept | The rewrite is where real learning happens |
| Go deep where it hurts | The thing you avoided in Phase 1 is what you need most |

### Phase 3 Mindset: "Measure Everything, Optimize What Matters"
> "Premature optimization is the root of all evil." — Knuth

| Rule | Why |
|---|---|
| Don't optimize until you have metrics | You'll optimize the wrong thing otherwise |
| p99 latency, not average | Your users feel the tail, not the mean |
| Each loop is wider and higher | You're not starting over, you're building on what works |

### 10 Layer Model (learned iteratively, phase by phase):
| Layer | When You'll Learn It Deeply |
|---|---|
| Frontend | Sprint 3 (Weeks 5-6) |
| Backend | Sprint 1 (Weeks 1-2) |
| Database | Sprint 1 (Day 3-4) |
| Messaging | Deepening 3 (Weeks 15-20) |
| Infrastructure | Deepening 2 (Weeks 11-14) |
| Observability | Deepening 4 (Weeks 21-28) |
| Security | Deepening 4 (Week 25) |
| Operations | Deepening 2 (Week 14) |
| Business | Sprint 2 (Weeks 3-4) |
| Learning | Ongoing — dual-language track |

---

## 11. 12 OSS Repos + 7 Universal Patterns (Reference)

### Batch 1:
| Repo | Stack | Key Pattern | When You'll Reference It |
|---|---|---|---|
| **Ghost** | Node.js, Express, Bookshelf, MySQL | Content API + Admin API separation | Sprint 3 (frontend-backend split) |
| **Plane** | Python, Django REST, PostgreSQL, Celery | Multi-tenant via `workspace_id` | Sprint 1 (schema), Deepening 1 (RLS) |
| **Zulip** | Python/Django + Tornado, TypeScript frontend | Custom test harness with module mocking | Deepening 1 (testing) |
| **Storybook** | TypeScript, Vite, Webpack, multi-framework | Framework-agnostic core + adapters | Deepening 5 (plugins) |
| **Playwright** | TypeScript, browser protocols (CDP) | Protocol-first design, self-hosting tests | Deepening 1 (E2E testing) |
| **Mermaid** | TypeScript, D3.js, Langium parser | DSL per diagram type, deterministic layouts | Deepening 5 (protocol design) |

### Batch 2:
| Repo | Stack | Key Pattern | When You'll Reference It |
|---|---|---|---|
| **Hoppscotch** | TypeScript, fp-ts, Auth0, Tauri | `Either` error handling, service DI | Sprint 1 (API skeleton) |
| **Streamlit** | Python, uv+hatch, Protobuf | Protobuf communication, custom exceptions | Sprint 1 (Docker), Deepening 2 (packaging) |
| **Lighthouse** | Node.js, plugin architecture | Deterministic audits, rules as code | Deepening 4 (benchmarks), Deepening 5 (event sourcing) |
| **Discourse** | Ruby on Rails, PostgreSQL, Sidekiq | 100+ tables, fabricators, TurboTests | Deepening 1 (testing at scale) |
| **Puppeteer** | TypeScript, CDP, Mocha | Protocol-first, custom test runner | Deepening 1 (E2E testing) |
| **OpenHands** | TypeScript + Python, uvx, MCP | **Mock-LLM E2E** (GOLD STANDARD) | Deepening 1 (testing), Deepening 5 (AI) |

### 7 Universal Patterns (apply when relevant):
| Pattern | Repos | When You'll Use It |
|---|---|---|
| **Protocol-first design** | Playwright, Puppeteer, Streamlit, OpenHands | Deepening 5 (protocol design) |
| **Mock-dependency testing** | OpenHands, Hoppscotch, Lighthouse, Discourse | Deepening 1 (testing) |
| **Feature-organized tests** | 8/12 repos | Deepening 1 (test structure) |
| **Plugin architecture** | Lighthouse, Discourse, Streamlit, OpenHands, Storybook | Deepening 5 (plugins) |
| **Deterministic algorithms** | Mermaid, Lighthouse, Puppeteer | Deepening 4 (benchmarks) |
| **Documentation as code** | 7/12 repos | Deepening 5 (OSS release) |
| **Framework-agnostic cores** | Storybook, Playwright, Hoppscotch, OpenHands | SoloStack platform (later) |

---

## 12. Taskflow: Thin First, Deepen Later

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

### Sprint 1 Scope (Weeks 1-2):
| Day | Deliverable | How Thin |
|---|---|---|
| 1 | TS + Python basics, typed config | Just types and async, no DB |
| 2 | 3 API endpoints (in-memory) | No auth, no validation, just works |
| 3 | PostgreSQL schema (3 tables) | No RLS, no indexes beyond PK/FK |
| 4 | CRUD operations | Basic Drizzle/asyncpg, no transactions |
| 5 | Docker Compose | Single service + Postgres |
| 6 | Deploy to Oracle | `docker compose up -d`, curl works |
| 7 | Basic CI | `tsc --noEmit` + `pytest` on push |

### What Gets Added in Deepening:
| Pass | What Gets Added |
|---|---|
| Deepening 1 | Tests (80+ unit, 20+ integration, 10+ E2E), proper DDD, RLS multi-tenancy |
| Deepening 2 | Multi-stage Docker, K3s, Helm, Traefik, ArgoCD |
| Deepening 3 | Split into services, SQS, outbox, sagas, circuit breakers |
| Deepening 4 | EKS, full observability, Vault, performance, DR |
| Deepening 5 | Event sourcing, CQRS, AI, plugins, OSS release |

---

## 13. Build Sprint 1: Day-by-Day (Weeks 1-2)

### Day 1: Just Enough to Be Dangerous

**TypeScript (Morning — 2 hours)**:
- Read: [TS Handbook — Basic Types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) (skim, 30 min)
- Implement: `plan-config.ts` — discriminated union for free/pro/enterprise plans
- Setup: `pnpm init`, `tsconfig.json` with `strict: true`
- Verify: `tsc --noEmit` passes

**Python (Afternoon — 2 hours)**:
- Read: [PEP 484 — Type Hints](https://peps.python.org/pep-0484/) (skim, 30 min)
- Implement: `plan_config.py` — Pydantic `BaseModel` for same 3 plans
- Setup: `uv init`, `pyproject.toml` with ruff + mypy
- Verify: `ruff check` + `mypy src/` pass

**Goal**: *working code*, not type system mastery. You'll deepen types in Deepening 1.

---

### Day 2: API Skeleton (In-Memory, No DB)

**Reference**: Hoppscotch — look at how they structure service DI and `Either` error handling (30 min)

**TypeScript**:
- Implement: Fastify server with 3 routes: `GET /workspaces`, `GET /workspaces/:id/projects`, `GET /projects/:id/issues`
- Data: In-memory arrays, hardcoded sample data
- No auth, no validation, no error handling beyond "it works"

**Python**:
- Implement: FastAPI server with same 3 routes
- Data: In-memory lists, hardcoded sample data
- Pydantic response models (thin — just the fields you need)

**Verify**: `curl localhost:3000/workspaces` returns JSON. That's it.

---

### Day 3: Add PostgreSQL

**Reference**: Plane — look at how they use `workspace_id` for multi-tenancy (30 min). You'll add RLS later.

**Schema** (thin — just what you need):
```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Implement**:
- TypeScript: Drizzle ORM schema + migration
- Python: asyncpg direct queries (no ORM yet — you'll add SQLAlchemy/Drizzle in deepening)

**Verify**: `curl` still works, data persists across restarts.

---

### Day 4: CRUD Operations

**Implement** (both languages):
- `POST /workspaces` — create workspace
- `POST /workspaces/:id/projects` — create project
- `POST /projects/:id/issues` — create issue
- `PATCH /issues/:id` — update issue status/priority

**How thin**: No transactions, no validation beyond "field exists", no error messages beyond 500.

**Verify**: Create a workspace → create a project → create an issue → update it. All via curl.

---

### Day 5: Docker Compose

**Reference**: Streamlit — look at their Dockerfile and `uv` integration (30 min)

**Implement**:
- `docker-compose.yml` with PostgreSQL 15 + your app
- `Dockerfile` (thin — `FROM node:20` or `FROM python:3.12`, copy, run)
- Health check: `curl localhost:3000/workspaces`

**Verify**: `docker compose up` starts everything, API responds.

---

### Day 6: Deploy to Oracle Free Tier

**Implement**:
- Create Oracle Free Tier VM (4 ARM cores, 24GB RAM — free forever)
- SSH in, install Docker
- `git clone`, `docker compose up -d`
- Note the public IP, `curl <IP>:3000/workspaces`

**Verify**: You can access your API from your phone's browser. 🎉

---

### Day 7: Basic CI

**Implement**:
- `.github/workflows/test.yml` — on push, run `tsc --noEmit` + `pytest`
- No tests yet, just type checking and linting

**Verify**: Green checkmark on a push.

---

## 14. Business & User Psychology

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

## 15. Learning Process: Phase-Appropriate Verification

**Learning Process**: The verification bar changes with each phase.

### Phase 1: "Show me it works"
```
You say: "Sprint 1 is deployed, here's the URL"
You show me: The URL, the code, what broke during deployment
I verify: Does it return correct output? Can I curl it?
You iterate: Fix what broke
We move on: Next sprint
```
**Bar**: It works. I'm lenient on how it works.

### Phase 2: "Show me it's right"
```
You say: "Deepening 1 is done, here's the code"
You show me: Tests passing, DDD patterns applied, RLS policies
I verify: Type safety? Test coverage? Domain boundaries correct?
You iterate: Fix what's missing
We move on: Next deepening
```
**Bar**: It's structured correctly. I'm strict on how it works.

### Phase 3: "Show me it's fast"
```
You say: "Deepening 4 is done, here are the metrics"
You show me: p99 latency, error rates, trace spans, DR drill results
I verify: Numbers meet budgets? Observability complete?
You iterate: Tune what's slow
We move on: Next deepening
```
**Bar**: Numbers back it up. I'm strict on metrics.

### Universal Rules (all phases):
1. Implement first, ask questions second
2. Show me code or metrics, not descriptions
3. If you're stuck >2 hours, ask — don't spiral
4. **Research for 30 minutes, implement for the rest. Learning happens in doing, not reading.**

---

## 16. Current Status & Next Steps

### Where We Are (2026-08-11):
- ✅ 12 OSS repos analyzed (Ghost, Plane, Zulip, Storybook, Playwright, Mermaid, Discourse, Puppeteer, OpenHands, Hoppscotch, Streamlit, Lighthouse)
- ✅ 7 universal patterns extracted
- ✅ 36-week compressed roadmap with build sprints + deepening passes
- ✅ 5 domain templates with DDD patterns (SaaS first)
- ✅ Taskflow project defined (Linear clone)
- ✅ Build Sprint 1 day-by-day plan (14 days, microscopic)
- ✅ Business psychology framework
- ✅ Learning process: "Ship, Break, Fix, Repeat"
- ✅ OSS reference map (which repo to look at, when)

### What's Next:
1. **Scaffold Taskflow** — Create `tech-foundry/taskflow/` with minimal structure
2. **Start Sprint 1 Day 1** — TypeScript discriminated union + Python Pydantic (one day, not a week)
3. **Ship by Day 7** — Deployed URL, accessible from phone

### Pending Decisions:
- Time commitment pace (full pace / reduced / weekend warrior)
- Month 3-4 language choice for API (Python FastAPI vs TypeScript Fastify) — can decide during Sprint 1

---

*End of roadmap. Make it work, make it right, make it fast.*
