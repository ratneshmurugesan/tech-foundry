"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Auth0Provider } from "@auth0/auth0-react";
import { useState, useEffect, type ReactNode } from "react";
import { authConfig } from "@/lib/auth";

/**
 * Client-side providers: TanStack Query (data cache) + Auth0 (the door).
 * Wrapped in the root layout so every route gets both for free.
 *
 * The `mounted` gate ensures `window` exists before Auth0Provider is created,
 * so `redirect_uri` is always set synchronously — no race with child effects.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const queryClient = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30s — "render before sync" law
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )[0];

  // Gate on mounted: avoids SSR hydration mismatch + ensures window is available.
  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">Loading…</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain={authConfig.domain}
        clientId={authConfig.clientId}
        authorizationParams={{
          ...authConfig.authorizationParams,
          redirect_uri: window.location.origin,
        }}
        cacheLocation="localstorage"
        onRedirectCallback={(appState) => {
          window.location.assign(appState?.returnTo ?? window.location.origin);
        }}
      >
        {children}
      </Auth0Provider>
    </QueryClientProvider>
  );
}
