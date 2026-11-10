"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { api } from "@/lib/api";
import type { Issue } from "@/lib/types";
import { useParams } from "next/navigation";

type Status = "open" | "closed";

/**
 * Split a flat issue list into the two board columns. Pure — unit-tested.
 */
export function splitByStatus(issues: Issue[]): { open: Issue[]; closed: Issue[] } {
  return {
    open: issues.filter((i) => i.status === "open"),
    closed: issues.filter((i) => i.status === "closed"),
  };
}

/**
 * Resolve the target status for a drop. The droppable `over.id` is either a
 * column id ("open" | "closed") or a card id (cards are droppable too, so
 * dropping on a card is precise). A card id resolves to that card's status.
 * Pure — unit-tested.
 */
export function resolveDropStatus(
  overId: string | undefined,
  issues: Issue[],
): Status | null {
  if (!overId) return null;
  if (overId === "open" || overId === "closed") return overId;
  const overIssue = issues.find((i) => i.id === overId);
  return overIssue ? overIssue.status : null;
}

/** The shared create/edit form. One modal, two modes. */
function IssueFormModal({
  mode,
  initialTitle,
  initialStatus,
  onSubmit,
  onClose,
  isPending,
  error,
}: {
  mode: "create" | "edit";
  initialTitle: string;
  initialStatus: Status;
  onSubmit: (title: string, status: Status) => void;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<Status>(initialStatus);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) onSubmit(title.trim(), status);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <form
        className="rounded-lg border border-border bg-surface p-5 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="font-medium mb-3">
          {mode === "create" ? "New Issue" : "Edit Issue"}
        </h2>

        <label className="block text-sm text-muted mb-1" htmlFor="issue-title">
          Title
        </label>
        <input
          id="issue-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              e.preventDefault();
              onSubmit(title.trim(), status);
            }
            if (e.key === "Escape") onClose();
          }}
          className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm mb-3"
          placeholder="Issue title"
        />

        <label className="block text-sm text-muted mb-1" htmlFor="issue-status">
          Status
        </label>
        <select
          id="issue-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm mb-4"
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-raised transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** A draggable + droppable issue card. Click to edit; drag to move. */
function IssueCard({ issue, onEdit }: { issue: Issue; onEdit: (issue: Issue) => void }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: issue.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: issue.id });

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setDropRef(node);
    },
    [setNodeRef, setDropRef],
  );

  const style: React.CSSProperties = {};
  if (transform) {
    style.transform = `translate(${transform.x}px, ${transform.y}px)`;
  }

  return (
    <div
      ref={ref}
      data-issue-id={issue.id}
      {...listeners}
      {...attributes}
      style={style}
      onClick={() => onEdit(issue)}
      className={`rounded-md border bg-surface-raised p-3 text-sm text-left cursor-pointer transition-colors ${
        isDragging ? "opacity-40" : ""
      } ${isOver ? "border-accent" : "border-border hover:border-accent/50"}`}
      title="Click to edit, drag to move"
    >
      {issue.title}
    </div>
  );
}

/** The visual ghost rendered inside the DragOverlay while a card is dragged. */
function CardGhost({ issue }: { issue: Issue }) {
  return (
    <div className="rounded-md border border-accent bg-surface-raised p-3 text-sm text-left shadow-xl rotate-2">
      {issue.title}
    </div>
  );
}

function BoardColumn({
  id,
  title,
  issues,
  onEdit,
}: {
  id: Status;
  title: string;
  issues: Issue[];
  onEdit: (issue: Issue) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-column={id}
      className={`rounded-lg border p-4 flex-1 min-h-[200px] transition-colors ${
        isOver ? "border-accent bg-accent/5" : "border-border bg-surface"
      }`}
    >
      <h2 className="text-sm font-medium text-muted mb-3">
        {title} ({issues.length})
      </h2>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} onEdit={onEdit} />
        ))}
        {issues.length === 0 && (
          <p className="text-xs text-muted text-center py-4">Nothing here</p>
        )}
      </div>
    </div>
  );
}

/**
 * /workspaces/[id]/projects/[projectId] — the board.
 *
 * Two columns (Open / Closed). Issues are fetched flat (the backend is
 * membership-scoped) and filtered to this project client-side.
 *
 * Interactions (day-18):
 *  - Click a card → edit its title + status (PATCH).
 *  - Drag a card between columns → move it (optimistic PATCH).
 *  - `n` → open the create form (title + status, POST).
 */
export function BoardClient() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>();
  const { isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  // Suppresses the spurious click that follows a drag (so a drop doesn't also
  // open the edit modal).
  const justDragged = useRef(false);

  const { data: issues, isLoading: loadingIssues } = useQuery({
    queryKey: ["issues", projectId],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      // The kitchen exposes a flat, membership-scoped /issues — filter to this project client-side.
      return (await api<Issue[]>("/issues", { token })).filter(
        (i) => i.project_id === projectId,
      );
    },
    enabled: isAuthenticated && !!projectId,
  });

  // --- Move an issue (drag between columns, or the status picker) ---
  const moveMutation = useMutation({
    mutationFn: async ({ issue, status }: { issue: Issue; status: Status }) => {
      const token = await getAccessTokenSilently();
      return api<Issue>(`/issues/${issue.id}`, {
        method: "PATCH",
        body: { status },
        token,
      });
    },
    onMutate: async ({ issue, status }) => {
      await queryClient.cancelQueries({ queryKey: ["issues", projectId] });
      const prev = queryClient.getQueryData<Issue[]>(["issues", projectId]);
      if (prev) {
        queryClient.setQueryData<Issue[]>(
          ["issues", projectId],
          prev.map((i) => (i.id === issue.id ? { ...i, status } : i)),
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

  // --- Create an issue (title + status) ---
  const createMutation = useMutation({
    mutationFn: async ({ title, status }: { title: string; status: Status }) => {
      const token = await getAccessTokenSilently();
      return api<Issue>("/issues", {
        method: "POST",
        body: { title, status, project_id: projectId },
        token,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });

  // --- Edit an issue (title + status) ---
  const editMutation = useMutation({
    mutationFn: async ({
      issue,
      title,
      status,
    }: {
      issue: Issue;
      title: string;
      status: Status;
    }) => {
      const token = await getAccessTokenSilently();
      return api<Issue>(`/issues/${issue.id}`, {
        method: "PATCH",
        body: { title, status },
        token,
      });
    },
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(e: DragStartEvent) {
    justDragged.current = true;
    const iss = issues?.find((i) => i.id === e.active.id);
    setActiveIssue(iss ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveIssue(null);
    // Let the trailing click event fire (and be suppressed) before arming again.
    window.setTimeout(() => {
      justDragged.current = false;
    }, 100);
    const { active, over } = e;
    if (!over) return;
    const list = issues ?? [];
    const targetStatus = resolveDropStatus(String(over.id), list);
    const dragged = list.find((i) => i.id === active.id);
    if (!dragged || !targetStatus) return;
    if (dragged.status !== targetStatus) {
      moveMutation.mutate({ issue: dragged, status: targetStatus });
    }
  }

  function handleEdit(issue: Issue) {
    if (justDragged.current) return; // ignore the click that follows a drag
    setEditing(issue);
  }

  // Keyboard: `n` opens create (when no modal is up); Escape closes any modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const inField =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if (inField) return; // the modal's input handles its own Escape/Enter
      if (
        e.key === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !createOpen &&
        !editing
      ) {
        e.preventDefault();
        setCreateOpen(true);
      }
      if (e.key === "Escape") {
        setCreateOpen(false);
        setEditing(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen, editing]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  const { open, closed } = splitByStatus(issues ?? []);

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Board</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-raised transition-colors"
        >
          New Issue <kbd className="ml-1.5 text-xs text-muted">N</kbd>
        </button>
      </header>

      {loadingIssues ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveIssue(null)}
        >
          <div className="grid grid-cols-2 gap-6">
            <BoardColumn id="open" title="Open" issues={open} onEdit={handleEdit} />
            <BoardColumn id="closed" title="Closed" issues={closed} onEdit={handleEdit} />
          </div>
          <DragOverlay>
            {activeIssue ? <CardGhost issue={activeIssue} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {createOpen && (
        <IssueFormModal
          mode="create"
          initialTitle=""
          initialStatus="open"
          isPending={createMutation.isPending}
          error={createMutation.error?.message ?? null}
          onSubmit={(title, status) => createMutation.mutate({ title, status })}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editing && (
        <IssueFormModal
          key={editing.id}
          mode="edit"
          initialTitle={editing.title}
          initialStatus={editing.status}
          isPending={editMutation.isPending}
          error={editMutation.error?.message ?? null}
          onSubmit={(title, status) =>
            editMutation.mutate({ issue: editing, title, status })
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
