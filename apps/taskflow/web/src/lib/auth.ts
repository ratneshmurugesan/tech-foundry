/**
 * Auth0 configuration for the TaskFlow frontend.
 *
 * The SPA uses the Authorization Code + PKCE flow (auth0-react handles it).
 * The token is sent to the API as a Bearer badge — the same badge the
 * backend's door (badge reader) already validates.
 *
 * NOTE: No `window` references here — this module is imported during SSR
 * for the root layout. Browser-only values (redirect URI) are set in the
 * Providers component where `window` is available.
 */
export const authConfig = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? "dev-qr8x8ecg3nfb603i.uk.auth0.com",
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? "",
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE ?? "https://dev-qr8x8ecg3nfb603i.uk.auth0.com/api/v2/",
  authorizationParams: {
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE ?? "https://dev-qr8x8ecg3nfb603i.uk.auth0.com/api/v2/",
  },
};
