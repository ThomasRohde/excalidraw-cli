import type { RenderBridge } from "./render-bridge.js";
import type { ExcalidrawScene } from "../scene/schema.js";
import { writeOutput } from "../core/io.js";
import { join } from "node:path";

export interface PngExportResult {
  type: "png";
  path: string;
  bytes: number;
}

export async function exportPng(
  bridge: RenderBridge,
  scene: ExcalidrawScene,
  outDir: string,
  baseName: string,
  scale: number,
  dryRun: boolean,
): Promise<PngExportResult> {
  const sceneData = {
    elements: scene.elements,
    appState: scene.appState,
    files: scene.files,
  };

  const buf = await bridge.exportPng(sceneData, scale);
  const path = join(outDir, `${baseName}.png`);

  if (!dryRun) {
    await writeOutput(path, buf);
  }

  return { type: "png", path, bytes: buf.length };
}
