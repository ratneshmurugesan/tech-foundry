import { describe, test, expect } from "vitest"

import generateId from "../src/ids"; // Adjust path as needed

describe("ID Generator Tests", () => {
  
  test("verifies that generated IDs strictly adhere to the standard UUID4 text pattern", () => {
    // 1. Act: Generate a single identifier token
    const identifier = generateId();

    // 2. Assert: Confirm physical length and structural integrity
    expect(identifier).toHaveLength(36);

    // Validates string format matches standard UUID hex-and-dash pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(identifier).toMatch(uuidRegex);
  });

  test("asserts that 1,000 sequentially generated identifiers yield zero collisions", () => {
    // 1. Arrange & Act: Pack 1,000 fresh IDs inside a uniqueness-enforcing Set collection
    const sampleSize = 1000;
    const uniqueIds = new Set(Array.from({ length: sampleSize }, () => generateId()));

    // 2. Assert: If any item overlapped, the final Set size would fall under 1,000
    expect(uniqueIds.size).toBe(sampleSize);
  });

});
