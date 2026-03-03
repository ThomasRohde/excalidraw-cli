import type { RenderBridge } from "./render-bridge.js";
import type { ExcalidrawScene } from "../scene/schema.js";
import { writeOutput } from "../core/io.js";
import { join } from "node:path";

export interface ExportOptions {
  bridge: RenderBridge;
  scene: ExcalidrawScene;
  outDir: string;
  baseName: string;
  dryRun: boolean;
  exportPadding?: number;
}

export interface ExportResult {
  type: string;
  path: string;
  bytes: number;
}

interface FormatOptions extends ExportOptions {
  ext: string;
  render: (
    bridge: RenderBridge,
    sceneData: { elements: unknown[]; appState: unknown; files: unknown; exportPadding?: number },
  ) => Promise<{ data: string | Buffer; bytes: number }>;
}

export async function exportFormat(opts: FormatOptions): Promise<ExportResult> {
  const sceneData = {
    elements: opts.scene.elements,
    appState: opts.scene.appState,
    files: opts.scene.files,
    exportPadding: opts.exportPadding,
  };

  const { data, bytes } = await opts.render(opts.bridge, sceneData);
  const path = join(opts.outDir, `${opts.baseName}.${opts.ext}`).replace(/\\/g, "/");

  if (!opts.dryRun) {
    await writeOutput(path, data);
  }

  return { type: opts.ext, path, bytes };
}
