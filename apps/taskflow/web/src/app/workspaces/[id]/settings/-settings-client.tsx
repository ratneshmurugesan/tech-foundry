"use client";

import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workspace, CheckoutResponse } from "@/lib/types";
import { useParams } from "next/navigation";

/**
 * /workspaces/[id]/settings — billing/plan page.
 * Shows current plan + upgrade button (Razorpay checkout).
 */
export function SettingsClient() {
  const { id } = useParams<{ id: string }>();
  const { isLoading, isAuthenticated, getAccessTokenSilently, user } = useAuth0();
  const queryClient = useQueryClient();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", id],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return api<Workspace>(`/workspaces/${id}`, { token });
    },
    enabled: isAuthenticated && !!id,
  });

  const isStarter = workspace?.plan_tier === "starter";

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessTokenSilently();
      return api<CheckoutResponse>(`/workspaces/${id}/billing/checkout`, {
        method: "POST",
        token,
      });
    },
    onSuccess: async (data) => {
      // Open Razorpay checkout in the browser.
      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "TaskFlow",
        description: `Starter plan for ${workspace?.name ?? "workspace"}`,
        order_id: data.order_id,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Verify the payment with the backend.
          const token = await getAccessTokenSilently();
          await api(`/workspaces/${id}/billing/verify`, {
            method: "POST",
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: data.amount,
            },
            token,
          });
          // Refresh the workspace to reflect the new plan tier.
          queryClient.invalidateQueries({ queryKey: ["workspace", id] });
          queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        },
        modal: {
          ondismiss: () => {
            setCheckoutError("Checkout cancelled.");
          },
        },
      });
      rzp.open();
    },
    onError: (err) => {
      setCheckoutError(err instanceof Error ? err.message : "Failed to start checkout.");
    },
  });

  if (isLoading || !isAuthenticated) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>;
  }

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-medium mb-2">Plan</h2>
        <p className="text-muted mb-4">
          Current: <span className="text-foreground font-medium capitalize">{workspace?.plan_tier ?? "free"}</span>
        </p>

        {isStarter ? (
          <p className="text-sm text-muted">You&apos;re on the Starter plan. No upgrade needed.</p>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Upgrade to Starter for unlimited projects and priority support.
            </p>
            <button
              onClick={() => {
                setCheckoutError(null);
                checkoutMutation.mutate();
              }}
              disabled={checkoutMutation.isPending}
              className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {checkoutMutation.isPending ? "Starting checkout…" : "Upgrade to Starter"}
            </button>
            {checkoutError && (
              <p className="text-sm text-red-400 mt-3">{checkoutError}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
