import { describe, it, expect } from "vitest";
import { validateScene } from "../../src/scene/validate-scene.js";
import { loadScene } from "../../src/scene/load-scene.js";

describe("validateScene", () => {
  it("validates a correct scene as valid", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const { result } = validateScene(scene.parsed);

    expect(result.valid).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("detects missing image assets when checkAssets enabled", async () => {
    const scene = await loadScene("test/fixtures/with-images.excalidraw");
    const { result, warnings } = validateScene(scene.parsed, { checkAssets: true });

    const assetCheck = result.checks.find((c) => c.name === "image_assets");
    expect(assetCheck).toBeDefined();
    expect(assetCheck!.passed).toBe(false);
    expect(warnings.some((w) => w.code === "ERR_VALIDATION_MISSING_ASSET")).toBe(true);
  });

  it("passes without asset check by default", async () => {
    const scene = await loadScene("test/fixtures/with-images.excalidraw");
    const { result } = validateScene(scene.parsed);

    expect(result.checks.find((c) => c.name === "image_assets")).toBeUndefined();
  });

  it("validates bound text consistency", async () => {
    const scene = await loadScene("test/fixtures/bound-text.excalidraw");
    const { result } = validateScene(scene.parsed);

    const textCheck = result.checks.find((c) => c.name === "bound_text");
    expect(textCheck).toBeDefined();
    expect(textCheck!.passed).toBe(true);
  });

  it("validates arrow binding consistency", async () => {
    const scene = await loadScene("test/fixtures/simple-scene.excalidraw");
    const { result } = validateScene(scene.parsed);

    const arrowCheck = result.checks.find((c) => c.name === "arrow_bindings");
    expect(arrowCheck).toBeDefined();
    expect(arrowCheck!.passed).toBe(true);
  });
});
