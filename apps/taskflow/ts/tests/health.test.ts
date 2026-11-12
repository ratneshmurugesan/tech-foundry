// tests/health.test.ts
//
// Parity twin of py/tests/test_health.py (ADR-001 parity wall).
//
// The lighthouse (ADR-006/011): GET /health is a public path (in PUBLIC_PATHS), so the
// door + key-ring both skip it and it answers 200 with no badge. The body is
// kitchen-identical — both kitchens assert the same {"status": "ok"}.
//
// Cellars apart (ADR-010): hits the real app in-process via fastify.inject — no network,
// no Postgres. The /health route touches no DB, so it is a pure liveness answer.

import { describe, expect, it } from "vitest";

describe("lighthouse — GET /health (public, no badge)", () => {
    it("answers 200 with the shared {status: ok} body and no token", async () => {
        const { app } = await import("../src/server");
        const res = await app.inject({ method: "GET", url: "/health" });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({ status: "ok" });
    });
});
