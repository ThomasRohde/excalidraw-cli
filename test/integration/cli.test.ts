import { describe, it, expect } from "vitest";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execAsync = promisify(execFile);
const CLI = "node";
const CLI_ENTRY = "dist/cli/index.js";

async function run(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (input !== undefined) {
    return runWithStdin(args, input);
  }
  try {
    const { stdout, stderr } = await execAsync(CLI, [CLI_ENTRY, ...args], { timeout: 15_000 });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", exitCode: err.code ?? 1 };
  }
}

function runWithStdin(args: string[], input: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(CLI, [CLI_ENTRY, ...args], { timeout: 15_000 });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    proc.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    proc.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        exitCode: code ?? 1,
      });
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

function parseEnvelope(stdout: string) {
  return JSON.parse(stdout);
}

describe("excal (bare command)", () => {
  it("outputs JSON error envelope with no command", async () => {
    const { stdout, exitCode } = await run([]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(false);
    expect(env.errors).toHaveLength(1);
    expect(env.errors[0].code).toBe("ERR_VALIDATION_NO_COMMAND");
    expect(env.result).toBeNull();
    expect(exitCode).toBe(10);
  });

  it("outputs JSON error envelope for missing arg", async () => {
    const { stdout, exitCode } = await run(["inspect"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(false);
    expect(env.errors).toHaveLength(1);
    expect(env.errors[0].code).toBe("ERR_VALIDATION_INVALID_ARGS");
    expect(env.result).toBeNull();
    expect(exitCode).toBe(10);
  });
});

describe("excal guide", () => {
  it("returns markdown content in envelope", async () => {
    const { stdout } = await run(["guide"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.command).toBe("cli.guide");
    expect(env.schema_version).toBe("1.0");
    expect(env.result.format).toBe("markdown");
    expect(env.result.content).toContain("# excal");
    expect(Array.isArray(env.warnings)).toBe(true);
    expect(Array.isArray(env.errors)).toBe(true);
  });
});

describe("excal skill", () => {
  it("returns markdown content in envelope", async () => {
    const { stdout } = await run(["skill"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.command).toBe("cli.skill");
    expect(env.result.format).toBe("markdown");
    expect(env.result.content).toContain("Excalidraw");
  });
});

describe("excal inspect", () => {
  it("inspects simple scene", async () => {
    const { stdout } = await run(["inspect", "test/fixtures/simple-scene.excalidraw"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.command).toBe("scene.inspect");
    expect(env.result.element_count).toBe(4);
    expect(env.result.counts_by_type.rectangle).toBe(1);
    expect(env.target.file).toBe("test/fixtures/simple-scene.excalidraw");
    expect(env.target.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("inspects multi-frame scene", async () => {
    const { stdout } = await run(["inspect", "test/fixtures/multi-frame.excalidraw"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.result.frames).toHaveLength(2);
  });

  it("filters by frame name", async () => {
    const { stdout } = await run([
      "inspect",
      "test/fixtures/multi-frame.excalidraw",
      "--frame",
      "Dashboard",
    ]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    // Frame + its child
    expect(env.result.element_count).toBe(2);
  });

  it("reads from stdin", async () => {
    const content = await readFile("test/fixtures/simple-scene.excalidraw", "utf-8");
    const { stdout } = await run(["inspect", "-"], content);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.result.element_count).toBe(4);
    expect(env.target.file).toBe("stdin");
  });

  it("returns error for invalid input", async () => {
    const { stdout, exitCode } = await run(["inspect", "test/fixtures/invalid-json.txt"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(false);
    expect(env.errors).toHaveLength(1);
    expect(env.errors[0].code).toContain("ERR_VALIDATION");
    expect(env.result).toBeNull();
    expect(exitCode).not.toBe(0);
  });

  it("returns error for missing file", async () => {
    const { stdout, exitCode } = await run(["inspect", "nonexistent.file"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(false);
    expect(env.errors[0].code).toContain("ERR_IO");
  });
});

describe("excal validate", () => {
  it("validates a correct scene", async () => {
    const { stdout } = await run(["validate", "test/fixtures/simple-scene.excalidraw"]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.command).toBe("scene.validate");
    expect(env.result.valid).toBe(true);
  });

  it("detects missing assets with --check-assets", async () => {
    const { stdout } = await run([
      "validate",
      "test/fixtures/with-images.excalidraw",
      "--check-assets",
    ]);
    const env = parseEnvelope(stdout);

    expect(env.ok).toBe(true);
    expect(env.result.valid).toBe(false);
    expect(env.warnings.some((w: any) => w.code === "ERR_VALIDATION_MISSING_ASSET")).toBe(true);
  });
});

describe("excal render", () => {
  it("renders SVG or fails gracefully without Playwright", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "excal-render-"));
    try {
      const { stdout } = await run([
        "render",
        "test/fixtures/simple-scene.excalidraw",
        "--outDir",
        tmpDir,
        "--svg",
      ]);
      const env = parseEnvelope(stdout);

      if (env.ok) {
        expect(env.command).toBe("scene.render");
        expect(env.result.artefacts).toHaveLength(1);
        expect(env.result.artefacts[0].type).toBe("svg");

        const svgContent = await readFile(env.result.artefacts[0].path, "utf-8");
        expect(svgContent).toContain("<svg");
      } else {
        // If Playwright is not available, the render should fail gracefully
        expect(env.errors[0].code).toBe("ERR_RENDER_BROWSER_UNAVAILABLE");
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("supports --dry-run or fails gracefully", async () => {
    const { stdout } = await run([
      "render",
      "test/fixtures/simple-scene.excalidraw",
      "--dry-run",
    ]);
    const env = parseEnvelope(stdout);

    if (env.ok) {
      expect(env.result.dry_run).toBe(true);
      expect(env.result.artefacts.length).toBeGreaterThan(0);
    } else {
      // Playwright unavailable is expected
      expect(env.errors[0].code).toBe("ERR_RENDER_BROWSER_UNAVAILABLE");
    }
  });
});
