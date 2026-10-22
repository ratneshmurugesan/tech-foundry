// Tenants the reader will ever trust; a stranger tenant from the header fails closed.
export const ALLOWED_DOMAINS = new Set(["dev-qr8x8ecg3nfb603i.uk.auth0.com"]);
// Street (lighthouse "/") + menu + lighthouse "/health" stay open (mirrors the PY set).
// The webhook is public (Razorpay calls it without a badge); it authenticates via HMAC sig.
export const PUBLIC_PATHS = new Set<string>(["/", "/docs", "/redoc", "/openapi.json", "/health", "/webhooks/razorpay"]);

export const RAZORPAY_API =  "https://api.razorpay.com/v1"
export const STARTER_AMOUNT_PAISE = 49900
// The plan state machine (ADR-014, Day 15; fully wired Day 16, ADR-015).
// Maps (state, event) -> next state. `transition()` returns null for any pair not
// in this table (the "refused" / no-op case). `canceled` is terminal (empty object).
//
// Events: `paid` (money landed — initial OR recovery), `payment_failed` (money didn't
// land — the bounce), `unsubscribe` (the customer or merchant cancels).
//
// Tier sync (in applyPlanTransition): active->starter, canceled->free, past_due->keep.
// Mirrors py `TRANSITIONS`.
export const TRANSITIONS: Record<string, Record<string, string>> = {
    trial:    { paid: "active", unsubscribe: "canceled" },
    active:   { payment_failed: "past_due", unsubscribe: "canceled" },
    past_due: { paid: "active", unsubscribe: "canceled" },
    canceled: {},
};

// The webhook event map (ADR-015): Razorpay `event.name` -> our machine event.
// Static lookup — the state table disambiguates (trial+paid=activate, past_due+paid=recover).
// Mirrors py `EVENT_MAP`.
export const EVENT_MAP: Record<string, string> = {
    "payment.captured": "paid",
    "payment.failed": "payment_failed",
    "refund.created": "unsubscribe",
    "subscription.paid": "paid",
    "subscription.halted": "payment_failed",
    "subscription.cancelled": "unsubscribe",
};