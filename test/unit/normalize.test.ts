import { describe, it, expect } from "vitest";
import { normalizeScene } from "../../src/scene/normalize-scene.js";
import { loadScene } from "../../src/scene/load-scene.js";

describe("normalizeScene", () => {
  it("fills default properties", async () => {
    const loaded = await loadScene("test/fixtures/simple-scene.excalidraw");
    const normalized = normalizeScene(loaded.parsed);

    for (const el of normalized.elements) {
      expect(el.isDeleted).toBe(false);
      expect(typeof el.opacity).toBe("number");
      expect(Array.isArray(el.groupIds)).toBe(true);
    }
  });

  it("applies stable ordering", async () => {
    const loaded = await loadScene("test/fixtures/simple-scene.excalidraw");
    const n1 = normalizeScene(loaded.parsed);
    const n2 = normalizeScene(loaded.parsed);
    expect(n1.elements.map((e) => e.id)).toEqual(n2.elements.map((e) => e.id));
  });
});
