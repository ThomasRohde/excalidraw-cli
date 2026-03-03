import type { ExportOptions, ExportResult } from "./export-common.js";
import { exportFormat } from "./export-common.js";

export type PdfExportResult = ExportResult & { type: "pdf" };

export async function exportPdf(opts: ExportOptions): Promise<PdfExportResult> {
  return exportFormat({
    ...opts,
    ext: "pdf",
    render: async (bridge, sceneData) => {
      const buf = await bridge.exportPdf(sceneData);
      return { data: buf, bytes: buf.length };
    },
  }) as Promise<PdfExportResult>;
}
