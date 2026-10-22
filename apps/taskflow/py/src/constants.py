# Tenants the reader will ever trust; a stranger tenant fails closed.
ALLOWED_DOMAINS = {"dev-qr8x8ecg3nfb603i.uk.auth0.com"}
# Street (lighthouse "/") + menu stay open - menu == swagger doc -> counter = all routes
# The webhook is public (Razorpay calls it without a badge); it authenticates via HMAC sig.
PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/health", "/webhooks/razorpay"}

RAZORPAY_API =  "api.razorpay.com/v1"
STARTER_AMOUNT_PAISE = 49900
# The plan state machine (ADR-014, Day 15; fully wired Day 16, ADR-015).
# Maps (state, event) -> next state. `transition()` returns None for any pair not
# in this table (the "refused" / no-op case). `canceled` is terminal (empty dict).
#
# Events: `paid` (money landed — initial OR recovery), `payment_failed` (money didn't
# land — the bounce), `unsubscribe` (the customer or merchant cancels).
#
# Tier sync (in apply_plan_transition): active->starter, canceled->free, past_due->keep.
TRANSITIONS = {
    "trial":    {"paid": "active", "unsubscribe": "canceled"},
    "active":   {"payment_failed": "past_due", "unsubscribe": "canceled"},
    "past_due": {"paid": "active", "unsubscribe": "canceled"},
    "canceled": {},
}

# The webhook event map (ADR-015): Razorpay `event.name` -> our machine event.
# Static lookup — the state table disambiguates (trial+paid=activate, past_due+paid=recover).
EVENT_MAP = {
    "payment.captured": "paid",
    "payment.failed": "payment_failed",
    "refund.created": "unsubscribe",
    "subscription.paid": "paid",
    "subscription.halted": "payment_failed",
    "subscription.cancelled": "unsubscribe",
}