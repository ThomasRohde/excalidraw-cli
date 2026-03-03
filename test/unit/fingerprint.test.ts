import { describe, it, expect } from "vitest";
import { sha256 } from "../../src/core/fingerprint.js";

describe("sha256", () => {
  it("produces deterministic hashes", () => {
    const hash1 = sha256("hello");
    const hash2 = sha256("hello");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = sha256("hello");
    const hash2 = sha256("world");
    expect(hash1).not.toBe(hash2);
  });

  it("returns a 64-character hex string", () => {
    const hash = sha256("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
