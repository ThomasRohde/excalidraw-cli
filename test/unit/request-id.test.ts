import { describe, it, expect } from "vitest";
import { generateRequestId } from "../../src/core/request-id.js";

describe("generateRequestId", () => {
  it("starts with req_", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_/);
  });

  it("has date and time components", () => {
    const id = generateRequestId();
    // Format: req_YYYYMMDD_HHmmss_XXXX
    expect(id).toMatch(/^req_\d{8}_\d{6}_[0-9a-f]{4}$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});
