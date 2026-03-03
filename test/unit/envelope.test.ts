import { describe, it, expect } from "vitest";
import { buildEnvelope } from "../../src/core/envelope.js";

describe("buildEnvelope", () => {
  it("returns all required fields on success", () => {
    const env = buildEnvelope({
      request_id: "req_test",
      command: "test.cmd",
      result: { data: 42 },
      ok: true,
      duration_ms: 10,
    });

    expect(env.schema_version).toBe("1.0");
    expect(env.request_id).toBe("req_test");
    expect(env.ok).toBe(true);
    expect(env.command).toBe("test.cmd");
    expect(env.result).toEqual({ data: 42 });
    expect(env.warnings).toEqual([]);
    expect(env.errors).toEqual([]);
    expect(env.metrics.duration_ms).toBe(10);
    expect(env.target).toBeNull();
  });

  it("returns null result on failure", () => {
    const err = {
      code: "ERR_TEST",
      message: "fail",
      retryable: false,
      suggested_action: "escalate" as const,
    };
    const env = buildEnvelope({
      request_id: "req_fail",
      command: "test.fail",
      result: null,
      ok: false,
      errors: [err],
      duration_ms: 5,
    });

    expect(env.ok).toBe(false);
    expect(env.result).toBeNull();
    expect(env.errors).toHaveLength(1);
    expect(env.errors[0].code).toBe("ERR_TEST");
  });

  it("always has arrays for warnings and errors", () => {
    const env = buildEnvelope({
      request_id: "req_x",
      command: "x",
      result: null,
      ok: true,
      duration_ms: 0,
    });

    expect(Array.isArray(env.warnings)).toBe(true);
    expect(Array.isArray(env.errors)).toBe(true);
  });

  it("includes target when provided", () => {
    const env = buildEnvelope({
      request_id: "req_t",
      command: "t",
      result: null,
      ok: true,
      target: { file: "test.txt" },
      duration_ms: 0,
    });

    expect(env.target).toEqual({ file: "test.txt" });
  });
});
