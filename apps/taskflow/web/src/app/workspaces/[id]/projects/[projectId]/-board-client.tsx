"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Issue } from "@/lib/types";
import { useParams } from "next/navigation";

/**
 * /workspaces/[id]/projects/[projectId] — the board.
 * Two columns: Open / Closed. Click an issue to toggle its status (optimistic).
 * Press `n` to create a new issue.
 */
export function BoardClient() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>();
  const { isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: issues, isLoading: loadingIssues } = useQuery({
    queryKey: ["issues", projectId],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      // The kitchen exposes a flat, membership-scoped /issues — filter to this project client-side.
      return (await api<Issue[]>("/issues", { token })).filter((i) => i.project_id === projectId);
    },
    enabled: isAuthenticated && !!projectId,
  });

  // --- Optimistic status toggle ---
  const toggleMutation = useMutation({
    mutationFn: async ({ issue, newStatus }: { issue: Issue; newStatus: "open" | "closed" }) => {
      const token = await getAccessTokenSilently();
      return api<Issue>(`/issues/${issue.id}`, {
        method: "PATCH",
        body: { status: newStatus },
        token,
      });
    },
    onMutate: async ({ issue, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["issues", projectId] });
      const prev = queryClient.getQueryData<Issue[]>(["issues", projectId]);
      if (prev) {
        queryClient.setQueryData<Issue[]>(["issues", projectId],
          prev.map((i) => (i.id === issue.id ? { ...i, status: newStatus } : i)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData<Issue[]>(["issues", projectId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });

  // --- Create issue ---
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const token = await getAccessTokenSilently();
      return api<Issue>("/issues", {
        method: "POST",
        body: { title, project_id: projectId },
        token,
      });
    },
    onSuccess: () => {
      setNewTitle("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });

  // --- Keyboard: `n` to focus create ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't trigger while typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowCreate(true);
      }
      if (e.key === "Escape") {
        setShowCreate(false);
        setNewTitle("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (isLoading || !isAuthenticated) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>;
  }

  const open = issues?.filter((i) => i.status === "open") ?? [];
  const closed = issues?.filter((i) => i.status === "closed") ?? [];
  const allEmpty = !loadingIssues && issues !== undefined && issues.length === 0;

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Board</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-raised transition-colors"
        >
          New Issue <kbd className="ml-1.5 text-xs text-muted">N</kbd>
        </button>
      </header>

      {allEmpty ? (
        <div className="text-center py-16">
          <p className="text-muted mb-4">No issues yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            Create your first issue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <BoardColumn
            title={`Open (${open.length})`}
            issues={open}
            onToggle={(issue) => toggleMutation.mutate({ issue, newStatus: "closed" })}
            isPending={toggleMutation.isPending}
          />
          <BoardColumn
            title={`Closed (${closed.length})`}
            issues={closed}
            onToggle={(issue) => toggleMutation.mutate({ issue, newStatus: "open" })}
            isPending={toggleMutation.isPending}
          />
        </div>
      )}

      {/* Inline create form */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div
            className="rounded-lg border border-border bg-surface p-5 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-medium mb-3">New Issue</h2>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  createMutation.mutate(newTitle.trim());
                }
                if (e.key === "Escape") setShowCreate(false);
              }}
            />
            {createMutation.isError && (
              <p className="text-sm text-red-400 mt-2">
                Failed to create issue. Try again.
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardColumn({
  title,
  issues,
  onToggle,
  isPending,
}: {
  title: string;
  issues: Issue[];
  onToggle: (issue: Issue) => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-muted mb-3">{title}</h2>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => onToggle(issue)}
            disabled={isPending}
            className="rounded-md border border-border bg-surface-raised p-3 text-sm text-left hover:border-accent/50 transition-colors disabled:opacity-50 cursor-pointer"
            title={issue.status === "open" ? "Click to close" : "Click to reopen"}
          >
            {issue.title}
          </button>
        ))}
        {issues.length === 0 && (
          <p className="text-xs text-muted text-center py-4">Nothing here</p>
        )}
      </div>
    </div>
  );
}
