import type { RenderBridge } from "./render-bridge.js";
import type { ExcalidrawScene } from "../scene/schema.js";
import { writeOutput } from "../core/io.js";
import { join } from "node:path";

export interface PdfExportResult {
  type: "pdf";
  path: string;
  bytes: number;
}

export async function exportPdf(
  bridge: RenderBridge,
  scene: ExcalidrawScene,
  outDir: string,
  baseName: string,
  dryRun: boolean,
): Promise<PdfExportResult> {
  const sceneData = {
    elements: scene.elements,
    appState: scene.appState,
    files: scene.files,
  };

  const buf = await bridge.exportPdf(sceneData);
  const path = join(outDir, `${baseName}.pdf`);

  if (!dryRun) {
    await writeOutput(path, buf);
  }

  return { type: "pdf", path, bytes: buf.length };
}
