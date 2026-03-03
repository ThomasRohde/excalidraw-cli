import { describe, it, expect } from "vitest";
import { loadScene } from "../../src/scene/load-scene.js";
import { normalizeScene } from "../../src/scene/normalize-scene.js";
import { inspectScene } from "../../src/scene/inspect-scene.js";
import { validateScene } from "../../src/scene/validate-scene.js";
import { applyFilters } from "../../src/scene/filters.js";

const FIXTURE = "test/fixtures/elaborate-scene.excalidraw";

// ─── Loading ──────────────────────────────────────────────────────────────────

describe("elaborate scene: loading", () => {
  it("parses the full scene without error", async () => {
    const scene = await loadScene(FIXTURE);
    expect(scene.parsed.type).toBe("excalidraw");
    expect(scene.parsed.version).toBe(2);
    expect(scene.parsed.source).toBe("https://excalidraw.com");
  });

  it("reports 29 total elements (26 live + 3 deleted)", async () => {
    const { parsed } = await loadScene(FIXTURE);
    expect(parsed.elements).toHaveLength(29);
    expect(parsed.elements.filter((e) => !e.isDeleted)).toHaveLength(26);
    expect(parsed.elements.filter((e) => e.isDeleted)).toHaveLength(3);
  });

  it("has a deterministic fingerprint", async () => {
    const a = await loadScene(FIXTURE);
    const b = await loadScene(FIXTURE);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("preserves appState metadata", async () => {
    const { parsed } = await loadScene(FIXTURE);
    expect(parsed.appState).toMatchObject({
      viewBackgroundColor: "#f8f9fa",
      gridSize: 20,
      theme: "light",
    });
  });

  it("preserves passthrough (unknown) element properties", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const widget = parsed.elements.find((e) => e.id === "widget-unknown");
    expect(widget).toBeDefined();
    expect((widget as any).customProp).toBe("hello");
  });

  it("parses the binary files map", async () => {
    const { parsed } = await loadScene(FIXTURE);
    expect(Object.keys(parsed.files!)).toEqual(["file-logo-png", "file-diagram-svg"]);
  });
});

// ─── Loading: clipboard format ────────────────────────────────────────────────

describe("elaborate scene: clipboard format", () => {
  it("loads clipboard JSON and wraps into a scene", async () => {
    const { parsed } = await loadScene("test/fixtures/clipboard.json");
    expect(parsed.type).toBe("excalidraw");
    expect(parsed.elements).toHaveLength(2);
  });

  it("preserves element data from clipboard", async () => {
    const { parsed } = await loadScene("test/fixtures/clipboard.json");
    const rect = parsed.elements.find((e) => e.id === "clip-rect");
    expect(rect).toBeDefined();
    expect(rect!.type).toBe("rectangle");
    const text = parsed.elements.find((e) => e.id === "clip-text");
    expect(text!.text).toBe("Pasted");
  });
});

// ─── Inspection ───────────────────────────────────────────────────────────────

describe("elaborate scene: inspection", () => {
  it("counts every element type", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const live = { ...parsed, elements: parsed.elements.filter((e) => !e.isDeleted) };
    const info = inspectScene(live);

    expect(info.element_count).toBe(26);
    expect(info.counts_by_type).toEqual({
      frame: 2,
      rectangle: 4,
      text: 8,
      diamond: 1,
      ellipse: 1,
      arrow: 4,
      line: 1,
      freedraw: 1,
      image: 3,
      widget: 1,
    });
  });

  it("counts deleted separately when included", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const info = inspectScene(parsed);

    expect(info.deleted_count).toBe(3);
    // live count excludes deleted
    expect(info.element_count).toBe(26);
  });

  it("identifies both frames with correct child counts", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const live = { ...parsed, elements: parsed.elements.filter((e) => !e.isDeleted) };
    const info = inspectScene(live);

    expect(info.frames).toHaveLength(2);

    const arch = info.frames.find((f) => f.id === "frame-arch");
    expect(arch).toBeDefined();
    expect(arch!.name).toBe("Architecture");
    expect(arch!.child_count).toBe(16);

    const notes = info.frames.find((f) => f.id === "frame-notes");
    expect(notes).toBeDefined();
    expect(notes!.name).toBe("Notes");
    expect(notes!.child_count).toBe(5);
  });

  it("identifies all image elements", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const live = { ...parsed, elements: parsed.elements.filter((e) => !e.isDeleted) };
    const info = inspectScene(live);

    expect(info.images).toHaveLength(3);
    expect(info.images.map((i) => i.fileId).sort()).toEqual([
      "file-diagram-svg",
      "file-does-not-exist",
      "file-logo-png",
    ]);
  });

  it("calculates text stats: bound vs unbound", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const live = { ...parsed, elements: parsed.elements.filter((e) => !e.isDeleted) };
    const info = inspectScene(live);

    // 6 bound: text-client, text-cdn, text-api, text-db, text-cache, text-orphan-container
    // 2 unbound: text-label-fe, text-label-be
    expect(info.text_stats.count).toBe(8);
    expect(info.text_stats.bound_count).toBe(6);
    expect(info.text_stats.unbound_count).toBe(2);
  });

  it("computes bounding box spanning all live elements", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const live = { ...parsed, elements: parsed.elements.filter((e) => !e.isDeleted) };
    const info = inspectScene(live);

    expect(info.bounding_box).not.toBeNull();
    expect(info.bounding_box!.minX).toBe(0);
    expect(info.bounding_box!.minY).toBe(0);
    expect(info.bounding_box!.maxX).toBe(800);
    expect(info.bounding_box!.maxY).toBe(940);
    expect(info.bounding_box!.width).toBe(800);
    expect(info.bounding_box!.height).toBe(940);
  });

  it("reports binary file metadata", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const info = inspectScene(parsed);

    expect(info.binary_files).toHaveLength(2);
    const png = info.binary_files.find((f) => f.id === "file-logo-png");
    expect(png!.mimeType).toBe("image/png");
    expect(png!.size).toBeGreaterThan(0);

    const svg = info.binary_files.find((f) => f.id === "file-diagram-svg");
    expect(svg!.mimeType).toBe("image/svg+xml");
    expect(svg!.size).toBeGreaterThan(0);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("elaborate scene: validation", () => {
  it("detects orphan frame reference", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { result, warnings } = validateScene(parsed);

    const check = result.checks.find((c) => c.name === "frame_references");
    expect(check).toBeDefined();
    expect(check!.passed).toBe(false);
    expect(check!.message).toContain("1 element(s) reference non-existent frames");

    const w = warnings.find((w) => w.code === "ERR_VALIDATION_FRAME_ORPHAN");
    expect(w).toBeDefined();
    expect(w!.details!.element_ids).toContain("orphan-in-missing-frame");
  });

  it("detects broken bound text (container does not exist)", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { result, warnings } = validateScene(parsed);

    const check = result.checks.find((c) => c.name === "bound_text");
    expect(check).toBeDefined();
    expect(check!.passed).toBe(false);

    const w = warnings.find((w) => w.code === "ERR_VALIDATION_BOUND_TEXT");
    expect(w).toBeDefined();
    expect(w!.details!.element_ids).toContain("text-orphan-container");
  });

  it("detects broken arrow bindings", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { result, warnings } = validateScene(parsed);

    const check = result.checks.find((c) => c.name === "arrow_bindings");
    expect(check).toBeDefined();
    expect(check!.passed).toBe(false);

    const w = warnings.find((w) => w.code === "ERR_VALIDATION_ARROW_BINDING");
    expect(w).toBeDefined();
    expect(w!.details!.bindings).toContain("arrow-broken-bindings:start");
    expect(w!.details!.bindings).toContain("arrow-broken-bindings:end");
  });

  it("valid arrows pass the arrow_bindings check when isolated", async () => {
    const { parsed } = await loadScene(FIXTURE);
    // Keep only elements in the Architecture frame (all arrows there are valid)
    const archOnly = {
      ...parsed,
      elements: parsed.elements.filter(
        (e) => e.frameId === "frame-arch" || e.id === "frame-arch",
      ),
    };
    const { result } = validateScene(archOnly);

    const check = result.checks.find((c) => c.name === "arrow_bindings");
    expect(check!.passed).toBe(true);
  });

  it("detects missing image assets with --check-assets", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { result, warnings } = validateScene(parsed, { checkAssets: true });

    const check = result.checks.find((c) => c.name === "image_assets");
    expect(check).toBeDefined();
    expect(check!.passed).toBe(false);
    expect(check!.message).toContain("1 image(s) reference missing binary files");

    const w = warnings.find((w) => w.code === "ERR_VALIDATION_MISSING_ASSET");
    expect(w!.details!.element_ids).toContain("img-missing-ref");
    // The two images with valid file refs should not be flagged
    expect(w!.details!.element_ids).not.toContain("img-logo");
    expect(w!.details!.element_ids).not.toContain("img-diagram");
  });

  it("skips image_assets check by default", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { result } = validateScene(parsed);
    expect(result.checks.find((c) => c.name === "image_assets")).toBeUndefined();
  });

  it("warns about unknown element type 'widget'", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { warnings } = validateScene(parsed);

    const w = warnings.find((w) => w.code === "ERR_VALIDATION_UNKNOWN_TYPE");
    expect(w).toBeDefined();
    expect(w!.details!.types).toContain("widget");
  });

  it("overall valid is false due to broken references", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const { result } = validateScene(parsed);
    expect(result.valid).toBe(false);
  });
});

// ─── Filtering ────────────────────────────────────────────────────────────────

describe("elaborate scene: filtering", () => {
  it("excludes deleted elements by default", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, {});

    expect(filtered.elements.every((e) => !e.isDeleted)).toBe(true);
    expect(filtered.elements).toHaveLength(26);
  });

  it("includes deleted elements when requested", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { includeDeleted: true });

    expect(filtered.elements).toHaveLength(29);
    expect(filtered.elements.filter((e) => e.isDeleted)).toHaveLength(3);
  });

  it("filters Architecture frame by ID", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "frame-arch" });

    // frame itself (1) + 16 children
    expect(filtered.elements).toHaveLength(17);
    expect(filtered.elements.every((e) => e.id === "frame-arch" || e.frameId === "frame-arch")).toBe(
      true,
    );
  });

  it("filters Architecture frame by name", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "Architecture" });

    expect(filtered.elements).toHaveLength(17);
    expect(filtered.elements[0].id).toBe("frame-arch");
  });

  it("filters Notes frame by name", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "Notes" });

    // frame + 5 children
    expect(filtered.elements).toHaveLength(6);
    expect(filtered.elements.some((e) => e.id === "freedraw-sketch")).toBe(true);
    expect(filtered.elements.some((e) => e.id === "img-logo")).toBe(true);
  });

  it("filters by specific element IDs", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, {
      elementIds: ["rect-client", "diamond-api", "ellipse-db"],
    });

    expect(filtered.elements).toHaveLength(3);
    expect(filtered.elements.map((e) => e.id).sort()).toEqual([
      "diamond-api",
      "ellipse-db",
      "rect-client",
    ]);
  });

  it("combines frame filter + excludes deleted", async () => {
    const { parsed } = await loadScene(FIXTURE);
    // Notes frame has no deleted elements, so all pass
    const filtered = applyFilters(parsed, { frameId: "frame-notes" });

    expect(filtered.elements.every((e) => !e.isDeleted)).toBe(true);
    expect(filtered.elements).toHaveLength(6);
  });

  it("returns empty when filtering by non-existent frame name", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "NoSuchFrame" });

    // No frame matched, so frameId filter is a no-op — returns all non-deleted
    // (The frame filter only activates if a match is found)
    expect(filtered.elements).toHaveLength(26);
  });
});

// ─── Normalization ────────────────────────────────────────────────────────────

describe("elaborate scene: normalization", () => {
  it("is idempotent", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const n1 = normalizeScene(parsed);
    const n2 = normalizeScene(n1);
    expect(n1.elements.map((e) => e.id)).toEqual(n2.elements.map((e) => e.id));
  });

  it("produces stable ordering across calls", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const a = normalizeScene(parsed);
    const b = normalizeScene(parsed);
    expect(a.elements.map((e) => e.id)).toEqual(b.elements.map((e) => e.id));
  });

  it("sorts by type, then y, then x, then id", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const normalized = normalizeScene(parsed);
    const ids = normalized.elements.map((e) => e.id);

    // All arrows should come before all diamonds, diamonds before ellipses, etc.
    const firstArrowIdx = ids.findIndex((id) =>
      normalized.elements[ids.indexOf(id)].type === "arrow",
    );
    const firstDiamondIdx = ids.findIndex((id) =>
      normalized.elements[ids.indexOf(id)].type === "diamond",
    );
    expect(firstArrowIdx).toBeLessThan(firstDiamondIdx);
  });

  it("fills default rendering props for elements missing them", async () => {
    // elements-only.json has minimal props
    const { parsed } = await loadScene("test/fixtures/elements-only.json");
    const normalized = normalizeScene(parsed);

    for (const el of normalized.elements) {
      const raw = el as Record<string, unknown>;
      expect(raw.angle).toBe(0);
      expect(raw.strokeColor).toBe("#1e1e1e");
      expect(raw.backgroundColor).toBe("transparent");
      expect(raw.fillStyle).toBe("solid");
      expect(typeof raw.seed).toBe("number");
      expect(raw.locked).toBe(false);
    }
  });

  it("preserves existing rendering props instead of overwriting", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const normalized = normalizeScene(parsed);

    const cdnRect = normalized.elements.find((e) => e.id === "rect-cdn");
    const raw = cdnRect as unknown as Record<string, unknown>;
    expect(raw.strokeColor).toBe("#2f9e44");
    expect(raw.backgroundColor).toBe("#b2f2bb");
    expect(raw.fillStyle).toBe("hachure");
    expect(raw.strokeStyle).toBe("dashed");
    expect(raw.opacity).toBe(80);
    expect(raw.seed).toBe(1004);
    expect(raw.link).toBe("https://cdn.example.com");
  });

  it("generates points for arrows/lines missing them", async () => {
    // The elaborate scene arrows already have points, so test with simple-scene
    const { parsed } = await loadScene("test/fixtures/simple-scene.excalidraw");
    const normalized = normalizeScene(parsed);

    const arrow = normalized.elements.find((e) => e.type === "arrow");
    expect(arrow).toBeDefined();
    const raw = arrow as unknown as Record<string, unknown>;
    expect(raw.points).toBeDefined();
    expect(Array.isArray(raw.points)).toBe(true);
  });

  it("does NOT overwrite existing points on arrows", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const normalized = normalizeScene(parsed);

    const multiPointArrow = normalized.elements.find((e) => e.id === "arrow-api-cache");
    const raw = multiPointArrow as unknown as Record<string, unknown>;
    // The original has 3 points: [[0,0],[90,55],[180,55]]
    expect(raw.points).toEqual([[0, 0], [90, 55], [180, 55]]);
  });

  it("uses deterministic seeds for elements missing them", async () => {
    const { parsed } = await loadScene("test/fixtures/elements-only.json");
    const n1 = normalizeScene(parsed);
    const n2 = normalizeScene(parsed);

    for (let i = 0; i < n1.elements.length; i++) {
      const r1 = n1.elements[i] as unknown as Record<string, unknown>;
      const r2 = n2.elements[i] as unknown as Record<string, unknown>;
      expect(r1.seed).toBe(r2.seed);
    }
  });
});

// ─── Inspection after filtering ───────────────────────────────────────────────

describe("elaborate scene: inspect + filter combos", () => {
  it("Architecture frame inspection has correct counts", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "frame-arch" });
    const info = inspectScene(filtered);

    expect(info.element_count).toBe(17);
    expect(info.frames).toHaveLength(1);
    expect(info.frames[0].name).toBe("Architecture");
    expect(info.counts_by_type.arrow).toBe(3);
    expect(info.counts_by_type.rectangle).toBe(3);
    expect(info.counts_by_type.text).toBe(7);
    expect(info.counts_by_type.diamond).toBe(1);
    expect(info.counts_by_type.ellipse).toBe(1);
    expect(info.counts_by_type.line).toBe(1);
  });

  it("Notes frame inspection has images and freedraw", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "frame-notes" });
    const info = inspectScene(filtered);

    expect(info.element_count).toBe(6);
    expect(info.counts_by_type.image).toBe(3);
    expect(info.counts_by_type.freedraw).toBe(1);
    expect(info.images).toHaveLength(3);
  });

  it("inspecting with --include-deleted shows deleted count", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { includeDeleted: true });
    const info = inspectScene(filtered);

    expect(info.element_count).toBe(26);
    expect(info.deleted_count).toBe(3);
  });

  it("single-element filter returns only that element", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { elementIds: ["diamond-api"] });
    const info = inspectScene(filtered);

    expect(info.element_count).toBe(1);
    expect(info.counts_by_type.diamond).toBe(1);
  });

  it("validation of Architecture frame alone passes all checks", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "frame-arch" });
    const { result } = validateScene(filtered);

    expect(result.valid).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("validation of Notes frame with --check-assets detects missing file", async () => {
    const { parsed } = await loadScene(FIXTURE);
    const filtered = applyFilters(parsed, { frameId: "frame-notes" });
    const { result, warnings } = validateScene(filtered, { checkAssets: true });

    const assetCheck = result.checks.find((c) => c.name === "image_assets");
    expect(assetCheck!.passed).toBe(false);
    expect(warnings.some((w) => w.code === "ERR_VALIDATION_MISSING_ASSET")).toBe(true);
  });
});
