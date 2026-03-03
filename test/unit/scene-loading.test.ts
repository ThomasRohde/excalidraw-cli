import { describe, it, expect } from "vitest";
import { loadScene } from "../../src/scene/load-scene.js";

describe("loadScene", () => {
  it("loads a valid excalidraw file", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    expect(scene.parsed.elements.length).toBe(4);
    expect(scene.source).toBe("test/fixtures/simple-scene.excalidraw");
    expect(scene.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("loads elements-only array format", async () => {
    const scene = await loadScene("test/fixtures/elements-only.json");
    expect(scene.parsed.elements.length).toBe(2);
    expect(scene.parsed.type).toBe("excalidraw");
  });

  it("loads empty scene", async () => {
    const scene = await loadScene("test/fixtures/empty-scene.excalidraw");
    expect(scene.parsed.elements.length).toBe(0);
  });

  it("throws on invalid JSON", async () => {
    await expect(loadScene("test/fixtures/invalid-json.txt")).rejects.toThrow(
      "not valid JSON",
    );
  });

  it("produces deterministic fingerprint", async () => {
    const s1 = await loadScene("test/fixtures/simple-scene.excalidraw");
    const s2 = await loadScene("test/fixtures/simple-scene.excalidraw");
    expect(s1.fingerprint).toBe(s2.fingerprint);
  });
});
