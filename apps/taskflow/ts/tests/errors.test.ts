import {describe, test, expect } from "vitest"

import { NotFoundError, ConflictError, DatabaseCrashError } from "../src/errors"; // Adjust the path as needed

describe("Custom Error Classes Contracts", () => {
  test("NotFoundError carries its contract name and correct message", () => {
    const message = "User not found";
    const error = new NotFoundError(message);
    
    expect(error.name).toBe("NotFoundError");
    expect(error.message).toBe(message);
  });

  test("ConflictError carries its contract name", () => {
    const error = new ConflictError();
    
    expect(error.name).toBe("ConflictError");
  });

  test("ConflictError default message is the golden string (parity with PY)", () => {
    // Golden-matrix parity (ADR-001): the default message is a shared contract string.
    // The PY twin (py/tests/test_errors.py) asserts the identical literal, so a drift in
    // either kitchen reds on push.
    const error = new ConflictError();
    expect(error.message).toBe("Resource already exists");
  });

  test("DatabaseCrashError handles sensitive data securely", () => {
    const originalError = new Error("Connection timed out");
    const secretError = new Error("DB_PASSWORD=secret123");
    
    const errorWithOrig = new DatabaseCrashError(originalError);
    const errorWithSecret = new DatabaseCrashError(secretError);

    // Verifies contract name
    expect(errorWithOrig.name).toBe("DatabaseCrashError");
    
    // Verifies the hidden message mask
    expect(errorWithSecret.message).toBe("Database op failed internally");
    
    // Verifies original/secret message is NOT leaked through .message
    expect(errorWithSecret.message).not.toContain("DB_PASSWORD");
    expect(errorWithSecret.message).not.toBe(secretError.message);
  });

});