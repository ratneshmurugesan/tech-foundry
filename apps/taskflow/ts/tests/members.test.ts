// tests/members.test.ts
//
// Parity twin of py/tests/test_members.py (ADR-001 parity wall).
//
// The members-POST route is gated by the door (doorHook) + the key-ring (authorizeHook).
// These assert the two paths reachable *cellarless* (ADR-010: no Postgres in CI, so any DB
// read/write 500s):
//
// - 401 no badge — the door rejects before any DB or body work (needs AUTH0_DOMAIN set;
//   the door is doorless without it).
// - 400 missing user_id — doorless (no AUTH0_DOMAIN), so the door + key-ring pass and the
//   request reaches body validation, which fails on the now-required user_id.
//
// The happy path (201) and the 409 dup-check both hit the cellar, so they are NOT asserted
// here; they are covered by the compose integration run. The PY twin asserts the identical
// status + envelope.

import { describe, expect, it, afterEach } from "vitest";

// A valid UUID for the {id} path param (validated as z.uuid()).
const WS_ID = "123e4567-e89b-42d3-a456-426614174000";

afterEach(() => {
    // The hooks read process.env.AUTH0_DOMAIN at request time; restore doorless state.
    delete process.env.AUTH0_DOMAIN;
});

describe("members-POST — POST /workspaces/{id}/members (parity wall, ADR-001)", () => {
    it("401 no badge: the door rejects before any DB or body work", async () => {
        process.env.AUTH0_DOMAIN = "stub.auth0.com";
        const { app } = await import("../src/server");
        const res = await app.inject({
            method: "POST",
            url: `/workspaces/${WS_ID}/members`,
            payload: { user_id: "auth0|someone" },
        });
        expect(res.statusCode).toBe(401);
        expect(JSON.parse(res.body)).toEqual({
            statusCode: 401,
            error: "Unauthorized",
            message: "No token provided",
        });
    });

    it("400 missing user_id: doorless, body validation fails on the required user_id", async () => {
        delete process.env.AUTH0_DOMAIN;
        const { app } = await import("../src/server");
        const res = await app.inject({
            method: "POST",
            url: `/workspaces/${WS_ID}/members`,
            payload: {},
        });
        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body);
        expect(body.statusCode).toBe(400);
        expect(body.error).toBe("Bad Request");
        expect(body.message).toBe("Validation failed");
    });
});
