import type { RenderBridge } from "./render-bridge.js";
import type { ExportOptions, ExportResult } from "./export-common.js";
import { exportFormat } from "./export-common.js";

export type SvgExportResult = ExportResult & { type: "svg" };

export async function exportSvg(opts: ExportOptions): Promise<SvgExportResult> {
  return exportFormat({
    ...opts,
    ext: "svg",
    render: async (bridge, sceneData) => {
      const svg = await bridge.exportSvg(sceneData);
      return { data: svg, bytes: Buffer.byteLength(svg, "utf-8") };
    },
  }) as Promise<SvgExportResult>;
}
