import { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "./errors";
import { ROLE_RANK } from "./types";
import { PUBLIC_PATHS } from "./constants";
import { getDb, issues, projects } from "./db";
import { eq } from "drizzle-orm";
import PostgresRepository from "./repository";

// The two 403 strings of the day's contract (ADR-007 resident).
// Fixed strings on purpose: parity (8000 == 8001) requires the *same* message on
// both kitchens — they are the day's output contract, not local wording. Mirrors the
// py authorizer's strings byte-for-byte.
export const NOT_A_MEMBER = "Not a member of this workspace";
export const REQUIRES_OWNER = "Requires the owner role";

// The ONE injected read the authorizer depends on: a coroutine taking
// (workspaceId, sub) and resolving to the member row, if any. This is the unit-test
// seam — tests stub it and get the whole ladder without a badge cellars (ADR-010).
type FindMembership = (workspaceId: string, sub: string) => Promise<{ role: "owner" | "member" } | undefined>;

// The *entire* permission decision of the day, as a pure function. No request object,
// no HTTP, no session of its own: the caller passes the one membership read. Two 403
// shapes are the whole output contract. Mirrors py `authorize.py::assert_role`.
export async function assertRole(
    workspaceId: string | undefined,
    sub: string | undefined,
    minRole: "owner" | "member",
    findMembership: FindMembership,
): Promise<void> {
    if (sub === undefined || workspaceId === undefined) {
        throw new ForbiddenError(NOT_A_MEMBER);
    }
    const row = await findMembership(workspaceId, sub);
    // rank only for a known role — a stale off-ladder role falls out to the safe shape.
    const role = row && row.role in ROLE_RANK ? row.role : undefined;
    if (role === undefined) {
        throw new ForbiddenError(NOT_A_MEMBER);
    }
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
        throw new ForbiddenError(REQUIRES_OWNER);
    }
}

// Route table (Decide-1: a table, not branches) — the minimum role a method needs, or
// null when the route is ungated (open). Mirrors py `_min_role_for`: workspaces list /
// create are ungated; a single workspace needs member for reads, owner for writes;
// workspace members POST is owner, other member subroutes are member; projects / issues
// items need member for reads and owner for writes, and CREATE is ungated (workspace
// lives in the body).
export function minRoleFor(method: string, path: string): "owner" | "member" | null {
    const parts = path.split("/").filter((p) => p);
    if (parts.length === 0) return null;
    if (parts[0] === "workspaces") {
        if (parts.length <= 1) return null; // list / create (creator-minted)
        if (parts.length === 2) return method === "GET" ? "member" : "owner";
        if (parts.length === 3 && parts[2] === "members") {
            return method === "POST" ? "owner" : "member";
        }
        return null;
    }
    if (parts[0] === "projects" || parts[0] === "issues") {
        // item routes only; CREATE routes stay ungated (workspace lives in the body)
        if (method === "PATCH" || method === "DELETE") return "owner";
        return parts.length === 2 ? "member" : null;
    }
    return null;
}

// Resolve the workspace-id for a gated route (Decide-5 is the other two of the day; this
// is the third). workspaces/:id carries it in the path. projects / issues have no
// workspace column of their own, so walk the FK chain — one DB read, then return. This
// read is real (not a seam) and only runs when a badge is present. Mirrors py
// `_workspace_id_for`.
async function workspaceIdFor(request: FastifyRequest): Promise<string | undefined> {
    const parts = request.url.split("?")[0].split("/").filter((p) => p);
    if (parts.length && parts[0] === "workspaces" && parts.length > 1) {
        return parts[1];
    }
    if (parts.length === 2 && (parts[0] === "projects" || parts[0] === "issues")) {
        const db = getDb();
        if (parts[0] === "projects") {
            const row = await db.select({ workspace_id: projects.workspace_id })
                .from(projects)
                .where(eq(projects.id, parts[1]))
                .limit(1);
            return row[0]?.workspace_id ?? undefined;
        }
        const r = await db.select({ workspace_id: projects.workspace_id })
            .from(issues)
            .innerJoin(projects, eq(issues.project_id, projects.id))
            .where(eq(issues.id, parts[1]))
            .limit(1);
        return r[0]?.workspace_id ?? undefined;
    }
    return undefined;
}

// The middleware-level gate, mirroring py `AuthorizeMiddleware.dispatch`. The
// doorless escape (ADR-010) and the public-path escape are the day's point: with no
// tenant configured this kitchen runs open, so the authorizer passes through BEFORE
// touching membership — which is what lets a bad request surface its real 400 and an
// uninitialized DB surface its 500 (cellar-less, doorless).
export async function authorizeHook(request: FastifyRequest, reply: FastifyReply) {
    if (!process.env.AUTH0_DOMAIN || PUBLIC_PATHS.has(request.url.split("?")[0])) {
        return; // doorless-auth or a public path
    }

    const minRole = minRoleFor(request.method, request.url.split("?")[0]);
    if (minRole === null) {
        return;
    }

    const sub = request.user?.sub;
    const wsId = await workspaceIdFor(request);
    try {
        await assertRole(wsId, sub, minRole, (wid, s) => repo.findMembership(wid, s));
    } catch (e) {
        if (e instanceof ForbiddenError) {
            return reply.status(403).send({ statusCode: 403, error: "Forbidden", message: e.message });
        }
        throw e; // unexpected (a membership-read failure) => 500 via the receptionist
    }
}

// One shared membership read (the kitchen's real repository). Only reached on a
// configured badge, so it is never exercised in the cellars (ADR-010) — its failure is
// wrapped here and re-thrown (=> 500 via the receptionist), which keeps the door's error
// domain on the receptionist and the decision's domain in the pure assertRole.
const repo = new PostgresRepository();
