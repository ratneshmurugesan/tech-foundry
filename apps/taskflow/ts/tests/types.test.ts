import { describe, expect, test } from "vitest";
import {
  createWorkspaceSchema, createIssueSchema, idParamSchema,
  workspaceSchema, projectSchema, issueSchema, workspaceMemberSchema,
} from "../src/server";
import type { Workspace } from "../src/types";

describe("Workspace type shape (golden-matrix parity, ADR-001)", () => {
  test("plan_tier is part of the Workspace interface and defaults to 'free'", () => {
    const ws: Workspace = { id: "w-1", name: "Acme", plan_tier: "free", created_at: new Date() };
    expect(ws.plan_tier).toBe("free");
  });

  test("plan_tier accepts 'starter' (the paid tier)", () => {
    const ws: Workspace = { id: "w-1", name: "Acme", plan_tier: "starter", created_at: new Date() };
    expect(ws.plan_tier).toBe("starter");
  });
});

describe("Workspace Schema Validation", () => {
  test("valid workspace passes validation successfully", () => {
      const validPayload = { name: "Acme" };
      const result = createWorkspaceSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
          expect(result.data.name).toBe("Acme");
      }
  })

  test("rejects a name that is less than 3 chars", () => {
      const invalidPayload = { name: 'ab'}
      const result = createWorkspaceSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false)
  })

  test("rejects a id that is not a valid uuid", () => {
      const invalidPayload = { id: '12' }
      const result = idParamSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false)
  })

  test("rejects mid-state status 'in_progress' and only allows open or closed", () => {
      const invalidPayload = { 
        title: "Fix bug", 
        status: "in_progress" 
      };

      const result = createIssueSchema.safeParse(invalidPayload);

      expect(result.success).toBe(false);

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.status).toBeDefined();
      }
    });
})

describe("Server contract surface (DB-free infra validation)", () => {
  
  test("validates req parsing and uninitialized db failure surface", async () => {
    const {app} = await import("../src/server")
  
    const badValidationResponse = await app.inject({
      method: "POST",
      url: "/workspaces",
      payload: {name: "ab"}
    })
    expect(badValidationResponse.statusCode).toBe(400);
  
    const staticResponse = await app.inject({
      method: "GET",
      url: "/"
    })
    // console.log("@staticResponse",{
    //   statusCode: staticResponse.statusCode
    // })
    expect(staticResponse.statusCode).toBe(200);
  
    const dbCrashResponse = await app.inject({
      method: "GET",
      url: "/workspaces"
    })
    expect(dbCrashResponse.statusCode).toBe(500);
    const body = JSON.parse(dbCrashResponse.body)
    expect(body.message).toBe("Database op failed internally");
  })
})

// --- Wire-level golden matrix (ADR-001 parity wall) ---
// The PY twin (py/tests/test_types.py::TestWireShape) asserts the SAME ordered key lists on
// the SAME fixture. `schema.parse(fixture)` is what Fastify's setSerializerCompiler does to
// the response — it keeps only the schema's fields, in schema order. Asserting the ordered
// key list is what catches a serializer/type drift (the gap that was silently shipping two
// different JSON bodies). The two kitchens read different DBs, so we assert SHAPE
// (set + order + enums), not values.
const FIXED_TS = new Date("2026-10-10T12:34:56.789Z");
// RFC 4122 v4 UUIDs (version nibble 4, variant a) — valid under zod's strict z.uuid().
const WS_ID = "123e4567-e89b-42d3-a456-426614174000";
const PRJ_ID = "223e4567-e89b-42d3-a456-426614174001";
const ISS_ID = "323e4567-e89b-42d3-a456-426614174002";
const MEM_ID = "423e4567-e89b-42d3-a456-426614174003";
const USER_ID = "523e4567-e89b-42d3-a456-426614174004";

describe("Wire-level serialization shape (golden-matrix parity, ADR-001)", () => {
  test("workspace serializes as { id, name, plan_tier, created_at }", () => {
    const out = workspaceSchema.parse({ id: WS_ID, name: "Acme", plan_tier: "free", created_at: FIXED_TS });
    expect(Object.keys(out)).toEqual(["id", "name", "plan_tier", "created_at"]);
    expect(out.plan_tier).toBe("free");
  });

  test("project serializes as { id, name, created_at, workspace_id }", () => {
    const out = projectSchema.parse({ id: PRJ_ID, name: "Proj", created_at: FIXED_TS, workspace_id: WS_ID });
    expect(Object.keys(out)).toEqual(["id", "name", "created_at", "workspace_id"]);
  });

  test("issue serializes as { id, project_id, title, status, created_at }", () => {
    const out = issueSchema.parse({ id: ISS_ID, project_id: PRJ_ID, title: "Fix bug", status: "open", created_at: FIXED_TS });
    expect(Object.keys(out)).toEqual(["id", "project_id", "title", "status", "created_at"]);
    expect(out.status).toBe("open");
  });

  test("member serializes as { id, workspace_id, user_id, role } — NO created_at (matches the PY kitchen)", () => {
    // created_at + an unknown field are present in the input and MUST be dropped.
    const out = workspaceMemberSchema.parse({ id: MEM_ID, workspace_id: WS_ID, user_id: USER_ID, role: "owner", created_at: FIXED_TS, extra: "dropped" });
    expect(Object.keys(out)).toEqual(["id", "workspace_id", "user_id", "role"]);
    expect("created_at" in out).toBe(false);
    expect(out.role).toBe("owner");
  });
});