import { describe, it, expect } from "vitest";
import {
  CliError,
  validationError,
  renderError,
  ioError,
  internalError,
} from "../../src/core/errors.js";

describe("error factories", () => {
  it("validationError creates ERR_VALIDATION_ prefix", () => {
    const err = validationError("INVALID_JSON", "bad json");
    expect(err).toBeInstanceOf(CliError);
    expect(err.structured.code).toBe("ERR_VALIDATION_INVALID_JSON");
    expect(err.structured.retryable).toBe(false);
    expect(err.structured.suggested_action).toBe("fix_input");
  });

  it("renderError creates ERR_RENDER_ prefix", () => {
    const err = renderError("BROWSER_UNAVAILABLE", "no playwright");
    expect(err.structured.code).toBe("ERR_RENDER_BROWSER_UNAVAILABLE");
    expect(err.structured.suggested_action).toBe("escalate");
  });

  it("ioError creates ERR_IO_ prefix and is retryable", () => {
    const err = ioError("READ_FAILED", "no file");
    expect(err.structured.code).toBe("ERR_IO_READ_FAILED");
    expect(err.structured.retryable).toBe(true);
    expect(err.structured.suggested_action).toBe("retry");
  });

  it("internalError creates ERR_INTERNAL_UNEXPECTED", () => {
    const err = internalError("something broke");
    expect(err.structured.code).toBe("ERR_INTERNAL_UNEXPECTED");
    expect(err.structured.suggested_action).toBe("escalate");
  });

  it("includes details when provided", () => {
    const err = validationError("TEST", "msg", { key: "value" });
    expect(err.structured.details).toEqual({ key: "value" });
  });
});
