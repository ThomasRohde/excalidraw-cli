import type { RenderBridge } from "./render-bridge.js";
import type { ExcalidrawScene } from "../scene/schema.js";
import { writeOutput } from "../core/io.js";
import { join } from "node:path";

export interface SvgExportResult {
  type: "svg";
  path: string;
  bytes: number;
}

export async function exportSvg(
  bridge: RenderBridge,
  scene: ExcalidrawScene,
  outDir: string,
  baseName: string,
  dryRun: boolean,
): Promise<SvgExportResult> {
  const sceneData = {
    elements: scene.elements,
    appState: scene.appState,
    files: scene.files,
  };

  const svg = await bridge.exportSvg(sceneData);
  const path = join(outDir, `${baseName}.svg`);
  const bytes = Buffer.byteLength(svg, "utf-8");

  if (!dryRun) {
    await writeOutput(path, svg);
  }

  return { type: "svg", path, bytes };
}
