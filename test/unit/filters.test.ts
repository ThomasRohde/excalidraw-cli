import { describe, it, expect } from "vitest";
import { applyFilters } from "../../src/scene/filters.js";
import { loadScene } from "../../src/scene/load-scene.js";

describe("applyFilters", () => {
  it("excludes deleted elements by default", async () => {
    const scene = await loadScene("test/fixtures/deleted-elements.excalidraw");
    const filtered = applyFilters(scene.parsed, {});

    expect(filtered.elements).toHaveLength(1);
    expect(filtered.elements[0].id).toBe("live1");
  });

  it("includes deleted elements when requested", async () => {
    const scene = await loadScene("test/fixtures/deleted-elements.excalidraw");
    const filtered = applyFilters(scene.parsed, { includeDeleted: true });

    expect(filtered.elements).toHaveLength(3);
  });

  it("filters by frame ID", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const filtered = applyFilters(scene.parsed, { frameId: "frame1" });

    // Frame itself + its child
    expect(filtered.elements).toHaveLength(2);
    expect(filtered.elements.map((e) => e.id)).toContain("frame1");
    expect(filtered.elements.map((e) => e.id)).toContain("rect-in-frame1");
  });

  it("filters by frame name", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const filtered = applyFilters(scene.parsed, { frameName: "Dashboard" });

    expect(filtered.elements).toHaveLength(2);
    expect(filtered.elements.map((e) => e.id)).toContain("frame2");
  });

  it("filters by element IDs", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const filtered = applyFilters(scene.parsed, { elementIds: ["rect1", "text1"] });

    expect(filtered.elements).toHaveLength(2);
  });
});
