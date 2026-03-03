import { describe, it, expect } from "vitest";
import { inspectScene } from "../../src/scene/inspect-scene.js";
import { loadScene } from "../../src/scene/load-scene.js";

describe("inspectScene", () => {
  it("counts elements by type", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.element_count).toBe(4);
    expect(info.counts_by_type.rectangle).toBe(1);
    expect(info.counts_by_type.text).toBe(1);
    expect(info.counts_by_type.ellipse).toBe(1);
    expect(info.counts_by_type.arrow).toBe(1);
  });

  it("counts deleted elements separately", async () => {
    const scene = await loadScene("test/fixtures/deleted-elements.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.element_count).toBe(1);
    expect(info.deleted_count).toBe(2);
    expect(info.deleted_counts_by_type.rectangle).toBe(1);
    expect(info.deleted_counts_by_type.ellipse).toBe(1);
  });

  it("detects frames and children", async () => {
    const scene = await loadScene("test/fixtures/multi-frame.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.frames).toHaveLength(2);
    expect(info.frames[0].name).toBe("Login Flow");
    expect(info.frames[0].child_count).toBe(1);
    expect(info.frames[1].name).toBe("Dashboard");
  });

  it("computes bounding box", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.bounding_box).not.toBeNull();
    expect(info.bounding_box!.minX).toBe(100);
    expect(info.bounding_box!.width).toBeGreaterThan(0);
  });

  it("returns null bounding box for empty scene", async () => {
    const scene = await loadScene("test/fixtures/empty-scene.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.bounding_box).toBeNull();
  });

  it("detects text stats", async () => {
    const scene = await loadScene("test/fixtures/bound-text.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.text_stats.count).toBe(2);
    expect(info.text_stats.bound_count).toBe(1);
    expect(info.text_stats.unbound_count).toBe(1);
  });

  it("detects image elements", async () => {
    const scene = await loadScene("test/fixtures/with-images.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.images).toHaveLength(2);
    expect(info.images[0].fileId).toBe("file1");
  });

  it("reports binary file sizes", async () => {
    const scene = await loadScene("test/fixtures/with-images.excalidraw");
    const info = inspectScene(scene.parsed);

    expect(info.binary_files).toHaveLength(1);
    expect(info.binary_files[0].id).toBe("file1");
    expect(info.binary_files[0].mimeType).toBe("image/png");
    expect(info.binary_files[0].size).toBeGreaterThan(0);
  });
});
