import { describe, it, expect } from "vitest";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execAsync = promisify(execFile);
const CLI = "node";
const CLI_ENTRY = "dist/cli/index.js";

const ELABORATE = "test/fixtures/elaborate-scene.excalidraw";
const CLIPBOARD = "test/fixtures/clipboard.json";

async function run(args: string[], input?: string) {
  if (input !== undefined) return runWithStdin(args, input);
  try {
    const { stdout, stderr } = await execAsync(CLI, [CLI_ENTRY, ...args], { timeout: 30_000 });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", exitCode: err.code ?? 1 };
  }
}

function runWithStdin(args: string[], input: string) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
    const proc = spawn(CLI, [CLI_ENTRY, ...args], { timeout: 30_000 });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on("data", (c) => out.push(c));
    proc.stderr.on("data", (c) => err.push(c));
    proc.on("close", (code) =>
      resolve({
        stdout: Buffer.concat(out).toString(),
        stderr: Buffer.concat(err).toString(),
        exitCode: code ?? 1,
      }),
    );
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

function env(stdout: string) {
  return JSON.parse(stdout);
}

// ─── Envelope invariants ──────────────────────────────────────────────────────

describe("envelope invariants on elaborate scene", () => {
  it("every command response has all required envelope fields", async () => {
    const commands = [
      ["inspect", ELABORATE],
      ["validate", ELABORATE],
      ["guide"],
      ["skill"],
    ];

    for (const args of commands) {
      const { stdout } = await run(args);
      const e = env(stdout);
      expect(e).toHaveProperty("schema_version", "1.0");
      expect(e).toHaveProperty("request_id");
      expect(e.request_id).toMatch(/^req_\d{8}_\d{6}_[0-9a-f]{4}$/);
      expect(typeof e.ok).toBe("boolean");
      expect(e).toHaveProperty("command");
      expect(e).toHaveProperty("result");
      expect(Array.isArray(e.warnings)).toBe(true);
      expect(Array.isArray(e.errors)).toBe(true);
      expect(e).toHaveProperty("metrics");
      expect(typeof e.metrics.duration_ms).toBe("number");
    }
  });

  it("failed command still returns a valid envelope", async () => {
    const { stdout, exitCode } = await run(["inspect", "no-such-file.xyz"]);
    const e = env(stdout);

    expect(exitCode).not.toBe(0);
    expect(e.ok).toBe(false);
    expect(e.result).toBeNull();
    expect(e.errors.length).toBeGreaterThan(0);
    expect(e.errors[0]).toHaveProperty("code");
    expect(e.errors[0]).toHaveProperty("message");
    expect(e.errors[0]).toHaveProperty("retryable");
    expect(e.errors[0]).toHaveProperty("suggested_action");
    expect(Array.isArray(e.warnings)).toBe(true);
    expect(e.schema_version).toBe("1.0");
  });
});

// ─── inspect ──────────────────────────────────────────────────────────────────

describe("excal inspect — elaborate scene", () => {
  it("reports full element breakdown", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);

    expect(e.ok).toBe(true);
    expect(e.command).toBe("scene.inspect");
    expect(e.result.element_count).toBe(26);
    expect(e.result.counts_by_type.frame).toBe(2);
    expect(e.result.counts_by_type.rectangle).toBe(4);
    expect(e.result.counts_by_type.diamond).toBe(1);
    expect(e.result.counts_by_type.ellipse).toBe(1);
    expect(e.result.counts_by_type.arrow).toBe(4);
    expect(e.result.counts_by_type.line).toBe(1);
    expect(e.result.counts_by_type.freedraw).toBe(1);
    expect(e.result.counts_by_type.image).toBe(3);
    expect(e.result.counts_by_type.widget).toBe(1);
    expect(e.result.counts_by_type.text).toBe(8);
  });

  it("includes frame details", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);
    const arch = e.result.frames.find((f: any) => f.name === "Architecture");
    const notes = e.result.frames.find((f: any) => f.name === "Notes");

    expect(arch.child_count).toBe(16);
    expect(notes.child_count).toBe(5);
  });

  it("includes text stats", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);
    expect(e.result.text_stats.count).toBe(8);
    expect(e.result.text_stats.bound_count).toBe(6);
    expect(e.result.text_stats.unbound_count).toBe(2);
  });

  it("includes image details", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);
    expect(e.result.images).toHaveLength(3);
  });

  it("includes binary file metadata", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);
    expect(e.result.binary_files).toHaveLength(2);
    expect(e.result.binary_files[0].mimeType).toMatch(/^image\//);
    expect(e.result.binary_files[0].size).toBeGreaterThan(0);
  });

  it("includes bounding box", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);
    expect(e.result.bounding_box).toEqual({
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 940,
      width: 800,
      height: 940,
    });
  });

  it("includes fingerprint in target", async () => {
    const { stdout } = await run(["inspect", ELABORATE]);
    const e = env(stdout);
    expect(e.target.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(e.target.file).toBe(ELABORATE);
  });

  it("--include-deleted shows deleted_count > 0", async () => {
    const { stdout } = await run(["inspect", ELABORATE, "--include-deleted"]);
    const e = env(stdout);
    expect(e.result.element_count).toBe(26);
    expect(e.result.deleted_count).toBe(3);
  });

  it("--frame Architecture returns only that frame's elements", async () => {
    const { stdout } = await run(["inspect", ELABORATE, "--frame", "Architecture"]);
    const e = env(stdout);
    expect(e.ok).toBe(true);
    expect(e.result.element_count).toBe(17);
    expect(e.result.frames).toHaveLength(1);
    expect(e.result.frames[0].name).toBe("Architecture");
  });

  it("--frame Notes returns notes frame elements", async () => {
    const { stdout } = await run(["inspect", ELABORATE, "--frame", "Notes"]);
    const e = env(stdout);
    expect(e.ok).toBe(true);
    expect(e.result.element_count).toBe(6);
    expect(e.result.counts_by_type.freedraw).toBe(1);
    expect(e.result.counts_by_type.image).toBe(3);
  });

  it("--frame by ID works too", async () => {
    const { stdout } = await run(["inspect", ELABORATE, "--frame", "frame-notes"]);
    const e = env(stdout);
    expect(e.ok).toBe(true);
    expect(e.result.element_count).toBe(6);
  });
});

// ─── inspect from stdin ───────────────────────────────────────────────────────

describe("excal inspect — stdin", () => {
  it("reads elaborate scene from stdin via -", async () => {
    const content = await readFile(ELABORATE, "utf-8");
    const { stdout } = await run(["inspect", "-"], content);
    const e = env(stdout);

    expect(e.ok).toBe(true);
    expect(e.target.file).toBe("stdin");
    expect(e.result.element_count).toBe(26);
  });

  it("reads clipboard format from stdin", async () => {
    const content = await readFile(CLIPBOARD, "utf-8");
    const { stdout } = await run(["inspect", "-"], content);
    const e = env(stdout);

    expect(e.ok).toBe(true);
    expect(e.result.element_count).toBe(2);
    expect(e.result.counts_by_type.rectangle).toBe(1);
    expect(e.result.counts_by_type.text).toBe(1);
  });

  it("reads elements-only JSON from stdin", async () => {
    const content = await readFile("test/fixtures/elements-only.json", "utf-8");
    const { stdout } = await run(["inspect", "-"], content);
    const e = env(stdout);

    expect(e.ok).toBe(true);
    expect(e.result.element_count).toBe(2);
  });

  it("returns structured error for invalid JSON from stdin", async () => {
    const { stdout, exitCode } = await run(["inspect", "-"], "not json {{{");
    const e = env(stdout);

    expect(e.ok).toBe(false);
    expect(e.errors[0].code).toBe("ERR_VALIDATION_INVALID_JSON");
    expect(exitCode).not.toBe(0);
  });

  it("returns structured error for valid JSON but not Excalidraw format", async () => {
    const { stdout, exitCode } = await run(["inspect", "-"], '{"name": "not a scene"}');
    const e = env(stdout);

    expect(e.ok).toBe(false);
    expect(e.errors[0].code).toBe("ERR_VALIDATION_UNKNOWN_FORMAT");
  });
});

// ─── validate ─────────────────────────────────────────────────────────────────

describe("excal validate — elaborate scene", () => {
  it("reports valid: false due to broken references", async () => {
    const { stdout } = await run(["validate", ELABORATE]);
    const e = env(stdout);

    expect(e.ok).toBe(true);
    expect(e.command).toBe("scene.validate");
    expect(e.result.valid).toBe(false);
    expect(e.result.checks.length).toBeGreaterThanOrEqual(3);
  });

  it("frame_references check fails with orphan", async () => {
    const { stdout } = await run(["validate", ELABORATE]);
    const e = env(stdout);
    const check = e.result.checks.find((c: any) => c.name === "frame_references");

    expect(check.passed).toBe(false);
    expect(check.message).toContain("1 element");
  });

  it("bound_text check fails with orphan container ref", async () => {
    const { stdout } = await run(["validate", ELABORATE]);
    const e = env(stdout);
    const check = e.result.checks.find((c: any) => c.name === "bound_text");
    expect(check.passed).toBe(false);
  });

  it("arrow_bindings check fails with dangling refs", async () => {
    const { stdout } = await run(["validate", ELABORATE]);
    const e = env(stdout);
    const check = e.result.checks.find((c: any) => c.name === "arrow_bindings");
    expect(check.passed).toBe(false);
  });

  it("warnings include all error codes", async () => {
    const { stdout } = await run(["validate", ELABORATE]);
    const e = env(stdout);
    const codes = e.warnings.map((w: any) => w.code);

    expect(codes).toContain("ERR_VALIDATION_FRAME_ORPHAN");
    expect(codes).toContain("ERR_VALIDATION_BOUND_TEXT");
    expect(codes).toContain("ERR_VALIDATION_ARROW_BINDING");
    expect(codes).toContain("ERR_VALIDATION_UNKNOWN_TYPE");
  });

  it("--check-assets adds image_assets failure", async () => {
    const { stdout } = await run(["validate", ELABORATE, "--check-assets"]);
    const e = env(stdout);
    const check = e.result.checks.find((c: any) => c.name === "image_assets");

    expect(check).toBeDefined();
    expect(check.passed).toBe(false);
    expect(e.warnings.some((w: any) => w.code === "ERR_VALIDATION_MISSING_ASSET")).toBe(true);
  });

  it("validates a clean scene as valid: true", async () => {
    const { stdout } = await run(["validate", "test/fixtures/simple-scene.excalidraw"]);
    const e = env(stdout);
    expect(e.result.valid).toBe(true);
    expect(e.result.checks.every((c: any) => c.passed)).toBe(true);
  });

  it("every warning has code, message, retryable, suggested_action", async () => {
    const { stdout } = await run(["validate", ELABORATE, "--check-assets"]);
    const e = env(stdout);
    for (const w of e.warnings) {
      expect(w).toHaveProperty("code");
      expect(w).toHaveProperty("message");
      expect(w).toHaveProperty("retryable");
      expect(w).toHaveProperty("suggested_action");
    }
  });
});

// ─── render ───────────────────────────────────────────────────────────────────

describe("excal render — elaborate scene", () => {
  it("renders SVG", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-svg-"));
    try {
      const { stdout } = await run(["render", ELABORATE, "--outDir", tmpDir, "--svg"]);
      const e = env(stdout);

      expect(e.ok).toBe(true);
      expect(e.command).toBe("scene.render");
      expect(e.result.artefacts).toHaveLength(1);
      expect(e.result.artefacts[0].type).toBe("svg");
      expect(e.result.artefacts[0].bytes).toBeGreaterThan(0);

      const svg = await readFile(e.result.artefacts[0].path, "utf-8");
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("renders PNG with valid magic bytes", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-png-"));
    try {
      const { stdout } = await run(["render", ELABORATE, "--outDir", tmpDir, "--png"]);
      const e = env(stdout);

      expect(e.ok).toBe(true);
      expect(e.result.artefacts).toHaveLength(1);
      expect(e.result.artefacts[0].type).toBe("png");

      const buf = await readFile(e.result.artefacts[0].path);
      // PNG magic bytes: 89 50 4E 47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("renders multiple formats at once (--svg --png)", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-multi-"));
    try {
      const { stdout } = await run([
        "render",
        ELABORATE,
        "--outDir",
        tmpDir,
        "--svg",
        "--png",
      ]);
      const e = env(stdout);

      expect(e.ok).toBe(true);
      expect(e.result.artefacts).toHaveLength(2);
      const types = e.result.artefacts.map((a: any) => a.type).sort();
      expect(types).toEqual(["png", "svg"]);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("--dry-run produces artefact metadata but no files", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-dry-"));
    try {
      const { stdout } = await run([
        "render",
        ELABORATE,
        "--outDir",
        tmpDir,
        "--svg",
        "--dry-run",
      ]);
      const e = env(stdout);

      expect(e.ok).toBe(true);
      expect(e.result.dry_run).toBe(true);
      expect(e.result.artefacts).toHaveLength(1);
      expect(e.result.artefacts[0].bytes).toBeGreaterThan(0);

      // File should NOT exist on disk
      await expect(stat(e.result.artefacts[0].path)).rejects.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("defaults to SVG when no format flag given", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-def-"));
    try {
      const { stdout } = await run(["render", ELABORATE, "--outDir", tmpDir]);
      const e = env(stdout);

      expect(e.ok).toBe(true);
      expect(e.result.artefacts).toHaveLength(1);
      expect(e.result.artefacts[0].type).toBe("svg");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("--frame filters before render", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-frame-"));
    try {
      const { stdout } = await run([
        "render",
        ELABORATE,
        "--outDir",
        tmpDir,
        "--svg",
        "--frame",
        "Notes",
      ]);
      const e = env(stdout);

      expect(e.ok).toBe(true);
      expect(e.result.scene_summary.element_count).toBe(6);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("result includes scene_summary with fingerprint", async () => {
    const { stdout } = await run(["render", ELABORATE, "--dry-run"]);
    const e = env(stdout);

    expect(e.ok).toBe(true);
    expect(e.result.scene_summary.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(e.result.scene_summary.element_count).toBe(26);
    expect(e.result.scene_summary.bounding_box).toBeDefined();
  });

  it("output filename derives from input filename", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-elab-name-"));
    try {
      const { stdout } = await run(["render", ELABORATE, "--outDir", tmpDir, "--svg"]);
      const e = env(stdout);
      expect(e.result.artefacts[0].path).toContain("elaborate-scene.svg");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── error paths ──────────────────────────────────────────────────────────────

describe("error paths", () => {
  it("exit code 10 for validation errors", async () => {
    const { stdout, exitCode } = await run(["inspect", "test/fixtures/invalid-json.txt"]);
    const e = env(stdout);
    expect(e.errors[0].code).toMatch(/^ERR_VALIDATION/);
    expect(exitCode).toBe(10);
  });

  it("exit code 50 for IO errors", async () => {
    const { stdout, exitCode } = await run(["inspect", "absolutely-does-not-exist.json"]);
    const e = env(stdout);
    expect(e.errors[0].code).toMatch(/^ERR_IO/);
    expect(exitCode).toBe(50);
  });

  it("errors have suggested_action field", async () => {
    const { stdout } = await run(["inspect", "test/fixtures/invalid-json.txt"]);
    const e = env(stdout);
    expect(e.errors[0].suggested_action).toBe("fix_input");
  });

  it("IO errors are retryable", async () => {
    const { stdout } = await run(["inspect", "absolutely-does-not-exist.json"]);
    const e = env(stdout);
    expect(e.errors[0].retryable).toBe(true);
  });

  it("validation errors are not retryable", async () => {
    const { stdout } = await run(["inspect", "test/fixtures/invalid-json.txt"]);
    const e = env(stdout);
    expect(e.errors[0].retryable).toBe(false);
  });
});

// ─── guide & skill ────────────────────────────────────────────────────────────

describe("guide & skill completeness", () => {
  it("guide returns markdown mentioning all commands", async () => {
    const { stdout } = await run(["guide"]);
    const e = env(stdout);
    expect(e.result.format).toBe("markdown");
    const md: string = e.result.content;
    expect(md).toContain("excal inspect");
    expect(md).toContain("excal validate");
    expect(md).toContain("excal render");
    expect(md).toContain("excal guide");
    expect(md).toContain("excal skill");
  });

  it("guide documents error codes", async () => {
    const { stdout } = await run(["guide"]);
    const e = env(stdout);
    const md: string = e.result.content;
    expect(md).toContain("ERR_VALIDATION_INVALID_JSON");
    expect(md).toContain("ERR_RENDER_BROWSER_UNAVAILABLE");
    expect(md).toContain("ERR_IO_READ_FAILED");
  });

  it("guide documents the response envelope", async () => {
    const { stdout } = await run(["guide"]);
    const e = env(stdout);
    const md: string = e.result.content;
    expect(md).toContain("schema_version");
    expect(md).toContain("request_id");
    expect(md).toContain("Response Envelope");
  });

  it("skill returns markdown with key sections", async () => {
    const { stdout } = await run(["skill"]);
    const e = env(stdout);
    expect(e.result.format).toBe("markdown");
    expect(e.result.content).toContain("Element Types");
    expect(e.result.content).toContain("Frames");
    expect(e.result.content).toContain("Arrows");
    expect(e.result.content).toContain("Bound Text");
    expect(e.result.content).toContain("Export Tips");
  });
});
