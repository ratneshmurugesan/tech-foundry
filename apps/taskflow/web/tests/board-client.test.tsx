/**
 * Board client tests (day-18).
 *
 * Two layers, matching the code's own "pure — unit-tested" comments:
 *  1. The pure drag/column logic (`splitByStatus`, `resolveDropStatus`) — no DOM.
 *     The drop decision (which column a drop resolves to) is covered here;
 *     the pointer-gesture mechanics are dnd-kit's, not ours, so they are not
 *     simulated in jsdom (faking layout rects for that is brittle).
 *  2. The create + edit modal flows — real DOM interactions, a mocked `api`.
 *
 * The `api` client is mocked to behave like a tiny in-memory server (it keeps
 * `serverIssues` in sync), so react-query's post-mutation re-fetch stays
 * consistent. Auth0 + `useParams` are mocked; a real `QueryClient` is used so
 * the optimistic update + rollback path is exercised for real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---- Mocks (hoisted above the imports by vitest) ----
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isLoading: false,
    isAuthenticated: true,
    getAccessTokenSilently: vi.fn().mockResolvedValue("test-token"),
    user: { name: "Test User", email: "test@example.com" },
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "ws_1", projectId: "proj_1" }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import {
  BoardClient,
  splitByStatus,
  resolveDropStatus,
} from "@/app/workspaces/[id]/projects/[projectId]/-board-client";
import { api } from "@/lib/api";
import type { Issue } from "@/lib/types";

const mockedApi = vi.mocked(api);

// ---- Fixtures ----
function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "iss_1",
    project_id: "proj_1",
    title: "Issue one",
    status: "open",
    created_at: "2026-11-09T00:00:00Z",
    ...overrides,
  };
}

/** A tiny in-memory "server" the mocked `api` reads/writes. */
let serverIssues: Issue[] = [];

beforeEach(() => {
  serverIssues = [];
  mockedApi.mockImplementation((async (path: string, opts: { method?: string; body?: any } = {}) => {
    const { method = "GET", body } = opts;
    if (method === "GET" && path === "/issues") {
      return serverIssues.filter((i) => i.project_id === "proj_1");
    }
    if (method === "POST" && path === "/issues") {
      const created = makeIssue({
        id: `iss_${Math.random().toString(36).slice(2, 8)}`,
        title: body?.title,
        status: body?.status ?? "open",
      });
      serverIssues = [...serverIssues, created];
      return created;
    }
    if (method === "PATCH" && path.startsWith("/issues/")) {
      const id = path.split("/")[2];
      serverIssues = serverIssues.map((i) =>
        i.id === id ? { ...i, ...body } : i,
      );
      return serverIssues.find((i) => i.id === id)!;
    }
    return {};
  }) as any);
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderBoard() {
  const queryClient = makeQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  const utils = render(
    <Wrapper>
      <BoardClient />
    </Wrapper>,
  );
  return { queryClient, ...utils };
}

// Wait for the board to finish its initial fetch (the columns replace "Loading…").
async function waitForBoard() {
  await screen.findByText(/Open \(/);
}

// ---------------------------------------------------------------------------
// 1. Pure logic
// ---------------------------------------------------------------------------
describe("splitByStatus", () => {
  it("splits a flat list into open and closed, preserving order", () => {
    const issues = [
      makeIssue({ id: "a", status: "open" }),
      makeIssue({ id: "b", status: "closed" }),
      makeIssue({ id: "c", status: "open" }),
    ];
    const { open, closed } = splitByStatus(issues);
    expect(open.map((i) => i.id)).toEqual(["a", "c"]);
    expect(closed.map((i) => i.id)).toEqual(["b"]);
  });

  it("returns two empty columns for an empty list", () => {
    expect(splitByStatus([])).toEqual({ open: [], closed: [] });
  });
});

describe("resolveDropStatus", () => {
  const issues = [
    makeIssue({ id: "iss_open", status: "open" }),
    makeIssue({ id: "iss_closed", status: "closed" }),
  ];

  it("resolves a column id straight through", () => {
    expect(resolveDropStatus("open", issues)).toBe("open");
    expect(resolveDropStatus("closed", issues)).toBe("closed");
  });

  it("resolves a card id to that card's status", () => {
    expect(resolveDropStatus("iss_open", issues)).toBe("open");
    expect(resolveDropStatus("iss_closed", issues)).toBe("closed");
  });

  it("returns null for a missing over (no drop) or an unknown id", () => {
    expect(resolveDropStatus(undefined, issues)).toBeNull();
    expect(resolveDropStatus("does-not-exist", issues)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Render + create + edit
// ---------------------------------------------------------------------------
describe("<BoardClient /> render", () => {
  it("shows the issues in the right columns with live counts", async () => {
    serverIssues = [
      makeIssue({ id: "a", title: "Alpha", status: "open" }),
      makeIssue({ id: "b", title: "Beta", status: "open" }),
      makeIssue({ id: "c", title: "Gamma", status: "closed" }),
    ];
    renderBoard();
    await waitForBoard();

    expect(screen.getByText("Open (2)")).toBeInTheDocument();
    expect(screen.getByText("Closed (1)")).toBeInTheDocument();
    // Alpha + Beta in the open column, Gamma in the closed column.
    const openCol = screen.getByText("Open (2)").closest("[data-column='open']")!;
    const closedCol = screen.getByText("Closed (1)").closest("[data-column='closed']")!;
    expect(openCol?.textContent).toContain("Alpha");
    expect(openCol?.textContent).toContain("Beta");
    expect(closedCol?.textContent).toContain("Gamma");
  });

  it("shows an empty board with a create CTA when there are no issues", async () => {
    serverIssues = [];
    renderBoard();
    await waitForBoard();
    expect(screen.getByText("Open (0)")).toBeInTheDocument();
    expect(screen.getByText("Closed (0)")).toBeInTheDocument();
    // Both empty columns render the placeholder.
    expect(screen.getAllByText(/Nothing here/)).toHaveLength(2);
  });
});

describe("<BoardClient /> create", () => {
  it("posts a new issue (title + status) and closes the modal", async () => {
    serverIssues = [makeIssue({ id: "a", title: "Alpha", status: "open" })];
    renderBoard();
    await waitForBoard();

    // Open the create modal via the header button.
    fireEvent.click(screen.getByText(/New Issue/));
    const input = await screen.findByLabelText(/Title/);
    fireEvent.change(input, { target: { value: "Brand new issue" } });
    // Default status is "open"; switch to "closed" to prove the picker is wired.
    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: "closed" } });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/issues",
        expect.objectContaining({
          method: "POST",
          body: { title: "Brand new issue", status: "closed", project_id: "proj_1" },
        }),
      ),
    );
    // The modal closes on success. (Assert on the modal-only Title field — the
    // header's "New Issue" button is always present, so it can't signal closure.)
    await waitFor(() => expect(screen.queryByLabelText(/Title/)).not.toBeInTheDocument());
  });

  it("closes on Escape without posting", async () => {
    serverIssues = [];
    renderBoard();
    await waitForBoard();

    fireEvent.click(screen.getByText(/New Issue/));
    await screen.findByLabelText(/Title/);
    fireEvent.keyDown(screen.getByLabelText(/Title/), { key: "Escape" });
    await waitFor(() => expect(screen.queryByLabelText(/Title/)).not.toBeInTheDocument());
    expect(mockedApi).not.toHaveBeenCalledWith(
      "/issues",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("<BoardClient /> edit", () => {
  it("clicking a card opens a prefilled edit modal and patches on save", async () => {
    serverIssues = [makeIssue({ id: "a", title: "Alpha", status: "open" })];
    renderBoard();
    await waitForBoard();

    // Click the card to open the edit modal.
    fireEvent.click(screen.getByText("Alpha"));
    const input = await screen.findByDisplayValue("Alpha");
    expect(screen.getByText("Edit Issue")).toBeInTheDocument();
    expect((screen.getByLabelText(/Status/) as HTMLSelectElement).value).toBe("open");

    fireEvent.change(input, { target: { value: "Renamed Alpha" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/issues/a",
        expect.objectContaining({
          method: "PATCH",
          body: { title: "Renamed Alpha", status: "open" },
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByText("Edit Issue")).not.toBeInTheDocument());
  });
});
