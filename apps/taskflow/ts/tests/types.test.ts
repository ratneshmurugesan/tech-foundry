import { describe, expect, test } from "vitest";
import  { createWorkspaceSchema, createIssueSchema, idParamSchema } from "../src/server";

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