# Day 16 (2026-10-22) — the razorpay day, part two: the ledger gets a full life, the courier gets a sealed-delivery route

**Built** (both kitchens, zero services):
- **The full state machine** (`TRANSITIONS`): all three edges ADR-014 only *named* are now wired — `active → past_due` (`payment_failed`), `past_due → active` (`paid`, the recovery), `any → canceled` (`unsubscribe`). `canceled` is terminal. The pure `transition(state, event)` is unchanged in shape — it just has more rows.
- **`verify_webhook_signature`** (both tracks): the server-side check — HMAC-SHA256 over the *raw request bytes*, constant-time compare. The day's one genuinely-new real function, the same pure shape as the day-08 JWKS reader and ADR-014's `verify_signature`.
- **`EVENT_MAP`** (both tracks): Razorpay `event.name` → machine event. Deliberately coarse — the *same* `paid` means "activate" from `trial` but "recover" from `past_due`; the state table, not the map, disambiguates.
- **The webhook route** (`POST /webhooks/razorpay`, both kitchens): a **public** route (joins `PUBLIC_PATHS`) that sits *outside* the ADR-011 door — Razorpay calls it with no badge. It authenticates via the HMAC stamp instead. Reads the raw body, verifies the signature, maps the event, looks up the plan by `razorpay_order_id`, applies the transition. **Always returns 200** (except `503` unkeyed / `400` bad sig) so Razorpay never retries a business no-op.
- **`find_plan_by_order_id` + `apply_plan_transition`** (both repositories): the webhook's lookup + the general transition writer (with the tier sync: `active → starter`, `canceled → free`, `past_due → keep`).
- **Tests** (both kitchens): the state machine's full edge set (incl. the terminal `canceled`), the event map, the webhook signature verify, and the route's fail-closed + idempotent paths. **PY 62 / TS 73, green.**

**The decisions** (full form: [ADR-015](../adrs/adr-015-razorpay-webhooks.md)):
- **A second, internet-facing auth mechanism** — HMAC over the raw body, not a JWT badge. It is confined to the one webhook route and fails closed; the door and every other route are untouched. The delivery comes to the *back* of the house and is checked at the pass.
- **`past_due` keeps its keys** — a lapsed payer retains `starter` (and a `member`'s write access) until they *cancel*. A bounced card is a billing hiccup, not a de-provisioning. That is a product choice, named in the ADR, not a bug.
- **Idempotent by construction** — an unwired `(state, event)` pair is a no-op that still answers `200`; a re-delivered event finds the ledger already moved and does nothing.

**What I learned** (the day's real cost, in one place):
- **The raw body is the whole game.** The signature is over the *exact bytes* Razorpay sent — re-serializing the parsed JSON (a "convenience") breaks the check. Both kitchens had to read the raw body *before* parsing (PY `request.body()`, TS `request.rawBody` via the raw-body hook). This is the same "don't trust the re-encoding" lesson as the day-08 badge reader, one seam over.
- **A public route is a new surface.** Adding to `PUBLIC_PATHS` is the one lever that takes a route *off* the door. It felt small (one string) until I realized it means "this URL is reachable by the internet with no badge" — the HMAC check is the *only* thing standing between a stranger and the ledger. That's why the fail-closed ordering (secret → signature → parse) matters.

**What's left** (the honest remainder):
- **The live Razorpay round-trip** (debt 16a) is still open — a real test-mode charge *and* a real webhook event hitting a deployed route. The webhook's *wiring* is done and tested with fakes; the *live* delivery is the same "first real charge" trigger as 16a. 16b (this day) is closed.
- The `RAZORPAY_WEBHOOK_SECRET` env var is new — it needs to exist wherever the app runs (the local `.env` is gitignored; CI stays key-less and the route fails closed to `503` there, which is the *correct* behaviour).

**The bar** (ADR-101): the ledger now has a full life on both kitchens — activate, lapse, recover, die — driven by a pure state machine and a pure signature check, with the one network courier stubbed like every other seam. The money path is closed; what remains is *live*, not *wired*.
