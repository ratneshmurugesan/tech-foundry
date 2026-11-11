# Day 19 (2026-11-11) — full-stack deploy: one command, Mac → $0 box → street

**Built** (the front-of-house):
- **Full stack on the $0 box** (Feature A): `web/Dockerfile` gained `BACKEND_URL` as a build-time ARG (Next rewrites freeze at `next build`, not runtime) + a web healthcheck that probes `/workspaces` (never `/` — the root 404s non-JS clients); compose gained the env + a postgres restart policy.
- **One-command deploy** (Feature B): `deploy/deploy.sh` — preflight → `git reset --hard origin/dev` → env-file audit (never writes the gitignored secrets) → build+up → health wait → **street proof** (four curls + the cellar-door refusal). `DRY_RUN=1` rehearses without the two mutating steps. Plus `deploy/README.md` (the runbook).

**Decided** (ADR-016): the deploy is a **one-command, Mac-driven** script — the street is the test (exit 0 = proven, not assumed). Explicitly **not** a CI/CD pipeline, **not** blue/green, and **superseded** by the Make-it-Right path (K3s/Helm/GitOps) when it lands.

**Proof**: street curls green (FE `/workspaces` 200, FE `/api` 401, py `/` 200, cellar `5432` refused) + browser E2E login → board → settings (`starter`). The checkout→webhook leg was not re-driven (the only workspace is already `starter`, so the button is hidden) — it was already proven live 2026-11-04 (debt 16a).

**Debt**: none — still zero open rows.

**Next owed to**: Multi-tenant RLS, K3s/Helm/GitOps (Make it Right) — build ledger §5.
