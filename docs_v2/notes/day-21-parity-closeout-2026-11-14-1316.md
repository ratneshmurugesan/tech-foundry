# Day 21 (2026-11-14) — parity closeout: the three day-20 debts resolve

**Built** (2 features, both kitchens, each with its test):

- **A — 20a closed: the members-POST parity crack is fixed.** The two kitchens now do the
  *same* thing on `POST /workspaces/{id}/members`. PY: `CreateWorkspaceMember.user_id` is now
  **required** (it was optional with a `str(sub)` fallback) and `workspace_id` is **dropped**
  (the route supplies it from the path) — matching the TS body schema. TS: `workspaceMemberSchema`
  is the *response* shape; the *create* body is a distinct `{ user_id, role? }`, and
  `user_id` is `z.string()` (not `z.uuid()`) because an Auth0 `sub` is a 28-char string, not a
  UUID. Both `invite` repos take explicit `(workspace_id, user_id, role)`, and the TS invite route
  now reads `user_id`/`role` from the body (not the caller's `sub`) with a 409 duplicate check —
  mirroring PY. A new golden-matrix pair pins the wire contract on **both** kitchens:
  `py/tests/test_members.py` + `ts/tests/members.test.ts` (401 no-badge, 400 missing `user_id`).
- **B — 20b closed: the compose healthcheck now probes `/health`.** ADR-006 documents `/health`
  as the liveness target, but the compose probed `/` (the lighthouse). Both app healthchecks in
  `docker-compose.yml` now hit `/health` — the dedicated, DB-free liveness probe — and the prod
  overlay inherits them (it only overrides `volumes`/`command`/`restart`). Docs and code agree.

**Found while working → fixed today (not a new debt):**

- **The TS error-handler 400 branch was dead code.** `fastify-type-provider-zod` compiles Zod
  schemas into Fastify JSON schema, so **AJV** validates and the error that reaches the handler is
  a Fastify validation error — the `error instanceof ZodError` branch never fires. That branch
  emitted the generic `Validation failed` (PY parity), but the *live* branch (the `error.validation`
  fallback) emitted AJV's detailed string (`body/user_id Invalid input: …`). The new 20a test
  caught it. Fixed: the `error.validation` branch now emits the same generic `message` + `details`
  shape as the PY kitchen's `RequestValidationError` handler. (The `ZodError` branch is left in
  place, now consistent, in case a manual `.parse()` path ever throws one.)
- **20c dropped — false alarm.** The day-20 row claimed "PY is a `Literal("free","starter")`", but
  PY `types.py` has `plan_tier: str` (a plain `str`, introduced day-14, never a `Literal` —
  `Literal` is imported there for `role`, not `plan_tier`). Both kitchens use a plain string, so
  there was never a divergence. The TS schema comment already documents the intent (`z.string()` on
  purpose; the plan state machine constrains it at runtime). Dropped, not done.

**Baselines:** PY **71** (69+2) · TS **82** (80+2) · `tsc --noEmit` clean.

**Next owed to:** the Make-it-Right arc per build ledger §5 — **multi-tenant RLS**, then
K3s/Helm/GitOps. (The debt ledger is now **empty** — zero open rows.)
