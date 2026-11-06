"use client";

import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";

/**
 * /workspaces — the dashboard.
 *
 * The "first run" UX law: this is the ONLY surface a new user sees.
 * - Logged out → login CTA (one button, one sentence).
 * - Logged in, no workspaces → "Create your first workspace" (inline, not a modal).
 * - Logged in, has workspaces → card grid, click to enter.
 */
export function WorkspacesClient() {
  const { isLoading, isAuthenticated, getAccessTokenSilently, loginWithRedirect, user } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  const { data: workspaces, isLoading: loading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return api<Workspace[]>("/workspaces", { token });
    },
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <span className="text-sm text-muted">{user?.email}</span>
      </header>

      {loading ? (
        <p className="text-muted">Loading workspaces…</p>
      ) : workspaces && workspaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <a
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="rounded-lg border border-border bg-surface p-5 hover:bg-surface-raised transition-colors"
            >
              <h2 className="font-medium">{ws.name}</h2>
              <p className="text-sm text-muted mt-1">
                {ws.plan_tier === "starter" ? "Starter" : "Free"}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted mb-4">No workspaces yet.</p>
          <CreateWorkspaceForm />
        </div>
      )}
    </div>
  );
}

function CreateWorkspaceForm() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    const token = await getAccessTokenSilently();
    await api("/workspaces", { method: "POST", body: { name: name.trim() }, token });
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  }

  return (
    <div className="flex gap-2 max-w-sm mx-auto">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workspace name"
        className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
      />
      <button
        onClick={handleCreate}
        disabled={!name.trim()}
        className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Create
      </button>
    </div>
  );
}
