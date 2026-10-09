# Day 14 (2026-10-09) — the razorpay day opens: the last precondition (`plan_tier`) lands

**Built** (both kitchens, zero services):
- **The `plan_tier` column on `workspaces`** — the *last open precondition* of the razorpay checkout (debt 11b). A plain string, `free / starter`, `NOT NULL` defaulting to `free`: `py/src/models.py` (`plan_tier = Column(..., server_default="'free'")`) + `ts/src/db.ts` (`plan_tier: text("plan_tier").notNull().default("free")`). *The restaurant: a laminated flag on each table — "which menu can this table buy" — that the cashier, not the guest, is allowed to flip.*
- **System-managed, not user-settable.** `plan_tier` is deliberately *absent* from `CreateWorkspace` / `UpdateWorkspace` (both tracks) — a customer cannot self-assign a tier; only the checkout (12a→12e) writes it. The `Workspace` read model carries it (default `free`), the list projections (`ts/src/repository.ts`) read it, and the new `py/tests/test_types.py` + the two added `ts/tests/types.test.ts` cases pin the default + the create/update boundary.
- **Verification:** PY **29 passed** · TS **40 passed** — zero services (ADR-010 held); `tsc --noEmit` clean; no IDE errors.

**Didn't build:**
- **The checkout itself** (12a→12e — create order → verify payment; the `plan` *table* + state machine of the day-12 prompt A.4–A.6). 11b is the *column* the checkout needs; the *money* is the next piece and is still `claimed`.

**Decisions:** none warrant an ADR yet — `plan_tier` is a column, not a seam. The plan *table* + state machine + the plan→role link (Decide-4) will carry **ADR-013** when the checkout lands.

**Debt:** **11b → `done`** (this note) — the last open precondition; **12a→12e** is now unblocked. (11a/11c closed day-10/11.)

**Next owed to:** the razorpay checkout — 12a→12e (`debt.md`): create order → verify payment, both tracks.
