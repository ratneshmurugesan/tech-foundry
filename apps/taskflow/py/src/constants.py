# Tenants the reader will ever trust; a stranger tenant fails closed.
ALLOWED_DOMAINS = {"dev-qr8x8ecg3nfb603i.uk.auth0.com"}
# Street (lighthouse "/") + menu stay open - menu == swagger doc -> counter = all routes
PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/health"}