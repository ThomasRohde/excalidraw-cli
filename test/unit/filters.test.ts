import { describe, it, expect } from "vitest";
import { applyFilters } from "../../src/scene/filters.js";
import { loadScene } from "../../src/scene/load-scene.js";

describe("applyFilters", () => {
  it("excludes deleted elements by default", async () => {
    const scene = await loadScene("test/fixtures/deleted-elements.excalidraw");
    const { scene: filtered } = applyFilters(scene.parsed, {});

    expect(filtered.elements).toHaveLength(1);
    expect(filtered.elements[0].id).toBe("live1");
  });

  it("includes deleted elements when requested", async () => {
    const scene = await loadScene("test/fixtures/deleted-elements.excalidraw");
    const { scene: filtered } = applyFilters(scene.parsed, { includeDeleted: true });

    expect(filtered.elements).toHaveLength(3);
  });

  it("filters by frame ID", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const { scene: filtered } = applyFilters(scene.parsed, { frameId: "frame1" });

    // Frame itself + its child
    expect(filtered.elements).toHaveLength(2);
    expect(filtered.elements.map((e) => e.id)).toContain("frame1");
    expect(filtered.elements.map((e) => e.id)).toContain("rect-in-frame1");
  });

  it("filters by frame name", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const { scene: filtered } = applyFilters(scene.parsed, { frameName: "Dashboard" });

    expect(filtered.elements).toHaveLength(2);
    expect(filtered.elements.map((e) => e.id)).toContain("frame2");
  });

  it("filters by element IDs", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const { scene: filtered } = applyFilters(scene.parsed, { elementIds: ["rect1", "text1"] });

    expect(filtered.elements).toHaveLength(2);
  });

  it("warns when frame not found by ID", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const { scene: filtered, warnings } = applyFilters(scene.parsed, { frameId: "nonexistent" });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("ERR_VALIDATION_FRAME_NOT_FOUND");
    expect(warnings[0].message).toContain("nonexistent");
  });

  it("warns when frame not found by name", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const { scene: filtered, warnings } = applyFilters(scene.parsed, { frameName: "NoSuchFrame" });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("ERR_VALIDATION_FRAME_NOT_FOUND");
    expect(warnings[0].message).toContain("NoSuchFrame");
  });

  it("warns when element IDs not found", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const { scene: filtered, warnings } = applyFilters(scene.parsed, {
      elementIds: ["rect1", "bogus1", "bogus2"],
    });

    expect(filtered.elements).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("ERR_VALIDATION_ELEMENT_NOT_FOUND");
    expect(warnings[0].message).toContain("bogus1");
    expect(warnings[0].message).toContain("bogus2");
  });
});
