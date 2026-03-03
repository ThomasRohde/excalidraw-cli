import { describe, it, expect } from "vitest";
import { exitCodeForError, ExitCode } from "../../src/core/exit-codes.js";

describe("exitCodeForError", () => {
  it("maps ERR_VALIDATION_* to 10", () => {
    expect(exitCodeForError("ERR_VALIDATION_INVALID_JSON")).toBe(ExitCode.VALIDATION);
  });

  it("maps ERR_RENDER_* to 20", () => {
    expect(exitCodeForError("ERR_RENDER_BROWSER_UNAVAILABLE")).toBe(ExitCode.RENDER);
  });

  it("maps ERR_IO_* to 50", () => {
    expect(exitCodeForError("ERR_IO_READ_FAILED")).toBe(ExitCode.IO);
  });

  it("maps unknown codes to 90", () => {
    expect(exitCodeForError("ERR_INTERNAL_UNEXPECTED")).toBe(ExitCode.INTERNAL);
    expect(exitCodeForError("UNKNOWN")).toBe(ExitCode.INTERNAL);
  });
});
