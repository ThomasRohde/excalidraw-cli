import { describe, it, expect } from "vitest";
import { readInput, writeOutput } from "../../src/core/io.js";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

describe("readInput", () => {
  it("reads a file from disk", async () => {
    const result = await readInput("test/fixtures/simple-scene.excalidraw");
    expect(result.source).toBe("test/fixtures/simple-scene.excalidraw");
    expect(result.content).toContain('"type": "excalidraw"');
  });

  it("throws on missing file", async () => {
    await expect(readInput("nonexistent.json")).rejects.toThrow();
  });
});

describe("writeOutput", () => {
  it("writes a file atomically", async () => {
    const dir = join(tmpdir(), `excal-test-${randomBytes(4).toString("hex")}`);
    const path = join(dir, "output.txt");

    try {
      await writeOutput(path, "hello world");
      const content = await readFile(path, "utf-8");
      expect(content).toBe("hello world");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
