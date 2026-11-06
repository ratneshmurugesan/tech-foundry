"use client";

import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workspace, Project } from "@/lib/types";
import { useParams } from "next/navigation";

/**
 * /workspaces/[id] — workspace detail: project list + create.
 */
export function WorkspaceDetailClient() {
  const { id } = useParams<{ id: string }>();
  const { isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", id],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return api<Workspace>(`/workspaces/${id}`, { token });
    },
    enabled: isAuthenticated && !!id,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return api<Project[]>(`/workspaces/${id}/projects`, { token });
    },
    enabled: isAuthenticated && !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = await getAccessTokenSilently();
      return api<Project>(`/workspaces/${id}/projects`, {
        method: "POST",
        body: { name },
        token,
      });
    },
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
    },
  });

  if (isLoading || !isAuthenticated) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>;
  }

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{workspace?.name ?? "…"}</h1>
        <a
          href={`/workspaces/${id}/settings`}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Settings
        </a>
      </div>

      <h2 className="text-lg font-medium mb-4">Projects</h2>
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/workspaces/${id}/projects/${p.id}`}
              className="rounded-lg border border-border bg-surface p-4 hover:bg-surface-raised transition-colors"
            >
              <span className="font-medium">{p.name}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-muted mb-6">No projects yet.</p>
      )}

      {/* Create project form */}
      <div className="flex gap-2 max-w-sm">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Project name"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate(newName.trim())}
        />
        <button
          onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
          disabled={!newName.trim() || createMutation.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating…" : "Create"}
        </button>
      </div>
      {createMutation.isError && (
        <p className="text-sm text-red-400 mt-2">Failed to create project.</p>
      )}
    </div>
  );
}
