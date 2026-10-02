// Tenants the reader will ever trust; a stranger tenant from the header fails closed.
export const ALLOWED_DOMAINS = new Set(["dev-qr8x8ecg3nfb603i.uk.auth0.com"]);
// Street (lighthouse "/") + menu + lighthouse "/health" stay open (mirrors the PY set).
export const PUBLIC_PATHS = new Set<string>(["/", "/docs", "/redoc", "/openapi.json", "/health"]);
