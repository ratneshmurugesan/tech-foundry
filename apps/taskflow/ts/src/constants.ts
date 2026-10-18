// Tenants the reader will ever trust; a stranger tenant from the header fails closed.
export const ALLOWED_DOMAINS = new Set(["dev-qr8x8ecg3nfb603i.uk.auth0.com"]);
// Street (lighthouse "/") + menu + lighthouse "/health" stay open (mirrors the PY set).
export const PUBLIC_PATHS = new Set<string>(["/", "/docs", "/redoc", "/openapi.json", "/health"]);

export const RAZORPAY_API =  "https://api.razorpay.com/v1"
export const STARTER_AMOUNT_PAISE = 49900
// The plan state machine's WIRED transitions (ADR-014). Only trial->active ships today
// (the `paid` event, fired by the verify route). The rest are named-but-NOT-wired (the
// webhook day): active->past_due, past_due->active, any->canceled. `transition()` returns
// null for anything not in this table, so the named ones read as "refused" until they ship.
export const TRANSITIONS: Record<string, Record<string, string>> = {
    trial: { paid: "active" },
}