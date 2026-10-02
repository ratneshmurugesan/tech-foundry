// The day-10 authorizer's unit suite — the ADR-010 payoff: pure-function tests that stub
// the one membership read, so they pass *cellar-less and doorless* in CI (no JWKS, no
// Postgres, no live badge). The eight cases are the full decision ladder of the day,
// mirrored byte-for-byte from the PY kitchen's tests/test_authorize.py:
//
//    sub=None (no badge)         -> 403 "Not a member of this workspace"
//    workspaceId=None (no room)  -> 403 "Not a member of this workspace"
//    no membership row           -> 403 "Not a member of this workspace"
//    member,  min=member         -> pass
//    member,  min=owner          -> 403 "Requires the owner role"
//    owner,   min=owner          -> pass
//    owner,   min=member         -> pass   (rank 2 >= 1 — the ladder, not string equality)
//
// The seam is the injected findMembership stub — a pure function returns the row.
import { describe, expect, test } from "vitest";
import { assertRole, NOT_A_MEMBER, REQUIRES_OWNER } from "../src/authorize";
import { ForbiddenError } from "../src/errors";

type Role = "owner" | "member";
type FindMembershipStub = (workspaceId: string, sub: string) => Promise<{ role: Role } | undefined>;

function row(role: Role): { role: Role } {
    return { role };
}

// A stub that always hands back a row with a given role (or an empty row set for "no row").
function findMembershipOf(role: Role | undefined): FindMembershipStub {
    return async () => (role ? { role } : undefined);
}

describe("authorize.ts — the day-10 pure permission decision (ADR-010: cellars apart)", () => {
    test("sub undefined (doorless / no badge resolved) -> the safe \"not a member\" 403", async () => {
        // no room to assert against: even an owner badge that couldn't be resolved is a non-member.
        await expect(
            assertRole("ws-1", undefined, "member", findMembershipOf("owner")),
        ).rejects.toThrow(ForbiddenError);

        // The 403 carries the day's fixed string, not an empty message or a throw name.
        await assertRole("ws-1", undefined, "member", findMembershipOf("owner")).catch((e) => {
            expect(e).toBeInstanceOf(ForbiddenError);
            expect((e as ForbiddenError).message).toBe(NOT_A_MEMBER);
        });
    });

    test("workspaceId undefined (room could not be resolved) -> \"not a member\" 403", async () => {
        // A real badge, but the route gave no workspace to read membership for.
        await expect(
            assertRole(undefined, "user-1", "member", findMembershipOf("owner")),
        ).rejects.toThrow(ForbiddenError);
    });

    test("membership read returns no row (not a member) -> \"not a member\" 403", async () => {
        await expect(
            assertRole("ws-1", "stranger", "member", findMembershipOf(undefined)),
        ).rejects.toThrow(ForbiddenError);
    });

    test("a member against a member-gated route -> passes (the day's happy path)", async () => {
        // resolvable room + a real row at the required rank -> no throw, the door holds.
        await expect(assertRole("ws-1", "user-1", "member", findMembershipOf("member"))).resolves.toBeUndefined();
    });

    test("a member against an owner-gated route -> the lower rank fails, \"Requires the owner role\"", async () => {
        // 1 < 2 is the whole ladder — string-equality would miss this.
        await expect(
            assertRole("ws-1", "user-1", "owner", findMembershipOf("member")),
        ).rejects.toBeInstanceOf(ForbiddenError);

        await assertRole("ws-1", "user-1", "owner", findMembershipOf("member")).catch((e) => {
            expect((e as ForbiddenError).message).toBe(REQUIRES_OWNER);
        });
    });

    test("an owner against an owner-gated route -> passes", async () => {
        await expect(assertRole("ws-1", "owner-1", "owner", findMembershipOf("owner"))).resolves.toBeUndefined();
    });

    test("an owner against a member-gated route -> passes (the rank ladder: 2 >= 1, not string equality)", async () => {
        // The single most common RBAC bug is `role == min_role`; assert the owner *exceeds* it.
        await expect(assertRole("ws-1", "owner-1", "member", findMembershipOf("owner"))).resolves.toBeUndefined();
    });

    test("a stale / off-ladder role that survived the schema falls out to the safe \"not a member\"", async () => {
        // Not expressible through the typed seam alone (a row is owner|member); assert the
        // rank-lookup guard directly on a cast that simulates a corrupted / pre-migration role.
        const oddRow = { role: "admin" as unknown as Role };
        await expect(
            assertRole("ws-1", "user-1", "member", (async () => oddRow) as unknown as FindMembershipStub),
        ).rejects.toBeInstanceOf(ForbiddenError);

        await (assertRole("ws-1", "user-1", "member", (async () => oddRow) as unknown as FindMembershipStub)).catch((e) => {
            expect((e as ForbiddenError).message).toBe(NOT_A_MEMBER);
        });
    });
});
