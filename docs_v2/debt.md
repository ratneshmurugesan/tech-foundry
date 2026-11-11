# Debt ledger — the *single* source of truth for deferred work

> Every ADR / note / prompt that defers something writes **one row here** and *links* it —
> it never re-states the due date (ADR-013, rule 1).
> **Statuses**: `open` → `claimed(day-N)` → `done` (link note) / `dropped` (link ADR + why).
> *Unowed* rows carry a concrete **revisit-when**, never a date — dates lie; triggers don't.
> **Prune on close**: when a row flips to `done` or `dropped`, remove it from this table (its resolution lives in the note/ADR it links). The ledger holds *open* work only.

| Debt | Deferred on | Why deferred | Owed to | Status |
|------|-------------|--------------|---------|--------|


**Format for every new row** (one line, no more): `**id** — what | deferred-on (day+ADR) | why (one clause) | owed-to (a roadmap *row* or a trigger — never a date) | status`.

---
*Lineage note:* 2026-10-19 cleanup — 8 closed/dropped rows (6d, 6e, 11a, 11b, 11c, 12a→12e, 14b, 15a) removed; their resolution is recorded in the day notes and ADRs they link. 2026-10-22 — **16b** (webhook-driven plan transitions) closed by day-16 / ADR-015 (the state machine is fully wired; the *live* remainder folds into 16a, which already names the webhook). 2026-11-01 — **16c** (idempotent checkout) opened: the day-16 first-row fix stops the verify 500 but leaves duplicate `trial` rows, so a re-checkout can still 400 the manual `verify`. 2026-11-01 — **14a** (live-URL banner) + **16c** (idempotent checkout) closed: banner added to README; `mint_plan`/`mintPlan` now re-point an existing `trial` row instead of inserting a 2nd. 2026-11-04 — **16a** (live Razorpay round-trip) closed: real `rzp_test_` order `order_Tw47rTIwcJoan1` → domestic Visa debit `4100 2800 0000 1007` → mock-bank OTP → `payment.captured` webhook → plan `trial → active` on the running box (`ec2-34-229-172-231`). **Zero open rows remain.** 2026-11-07 — **17a** (checkout modal close button) opened: the first browser run of the day-17 web UI proved the full checkout flow (real `rzp_test_` order `order_TxLtUJDICPDASd` → test-mode modal), but the modal's close button sits under the overlay backdrop. 2026-11-10 — **17a** dropped: the trigger (board work) fired on day-18; the fix is a one-line z-index/pointer-events tweak on the backdrop, deferred to whenever the checkout modal is next touched. **Zero open rows remain.** 2026-11-11 — day-19: **full-stack deploy** shipped (ADR-016 — the one-command `deploy/deploy.sh`, the web healthcheck, `BACKEND_URL` as a build-time ARG); proven by street curls + browser E2E (login → board → settings `starter`). No debt opened — the live checkout→webhook leg was already proven 2026-11-04 (16a) and the deploy day re-proved everything short of a fresh charge. **Zero open rows remain.**
