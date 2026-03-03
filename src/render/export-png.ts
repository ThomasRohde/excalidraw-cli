import type { ExportOptions, ExportResult } from "./export-common.js";
import { exportFormat } from "./export-common.js";

export type PngExportResult = ExportResult & { type: "png" };

export async function exportPng(
  opts: ExportOptions & { scale: number },
): Promise<PngExportResult> {
  return exportFormat({
    ...opts,
    ext: "png",
    render: async (bridge, sceneData) => {
      const buf = await bridge.exportPng(sceneData, opts.scale);
      return { data: buf, bytes: buf.length };
    },
  }) as Promise<PngExportResult>;
}
