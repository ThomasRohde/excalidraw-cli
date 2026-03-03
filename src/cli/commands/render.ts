import { basename, extname } from "node:path";
import type { Command } from "commander";
import { wrapCommand, type CommandContext } from "../../core/command-wrapper.js";
import { loadScene } from "../../scene/load-scene.js";
import { normalizeScene } from "../../scene/normalize-scene.js";
import { applyFilters } from "../../scene/filters.js";
import { inspectScene } from "../../scene/inspect-scene.js";
import { RenderBridge } from "../../render/render-bridge.js";
import { exportSvg, type SvgExportResult } from "../../render/export-svg.js";
import { exportPng, type PngExportResult } from "../../render/export-png.js";
import { exportPdf, type PdfExportResult } from "../../render/export-pdf.js";

interface RenderOptions {
  outDir: string;
  svg: boolean;
  png: boolean;
  pdf: boolean;
  darkMode: boolean;
  background: boolean;
  scale: string;
  padding: string;
  frame?: string;
  element?: string;
  dryRun: boolean;
}

export function registerRender(program: Command): void {
  program
    .command("render <file>")
    .description("Render an Excalidraw scene to SVG, PNG, or PDF")
    .option("--outDir <dir>", "Output directory", ".")
    .option("--svg", "Export SVG")
    .option("--png", "Export PNG (requires Playwright)")
    .option("--pdf", "Export PDF (requires Playwright)")
    .option("--dark-mode", "Use dark theme")
    .option("--no-background", "Transparent background")
    .option("--scale <n>", "Scale factor for PNG", "2")
    .option("--padding <n>", "Padding in pixels", "20")
    .option("--frame <id-or-name>", "Export specific frame only")
    .option("--element <id>", "Export specific element only")
    .option("--dry-run", "Run pipeline but write no files")
    .action(
      wrapCommand("scene.render", async (ctx: CommandContext, file: unknown, opts: unknown) => {
        const options = opts as RenderOptions;
        const fileStr = file as string;

        const loaded = await loadScene(fileStr);
        const normalized = normalizeScene(loaded.parsed);

        const filtered = applyFilters(normalized, {
          frameId: options.frame,
          frameName: options.frame,
          elementIds: options.element ? [options.element] : undefined,
        });

        const inspection = inspectScene(filtered);

        // Determine formats
        const formats = {
          svg: options.svg || (!options.png && !options.pdf),
          png: options.png || false,
          pdf: options.pdf || false,
        };

        // Build appState overrides
        const appState: Record<string, unknown> = { ...filtered.appState };
        if (options.darkMode) appState.theme = "dark";
        if (!options.background) appState.exportBackground = false;
        appState.exportPadding = parseInt(options.padding, 10);

        const sceneForExport = { ...filtered, appState };

        // Base name from input file
        const baseName =
          loaded.source === "stdin"
            ? "scene"
            : basename(loaded.source, extname(loaded.source));

        // Initialize bridge
        const bridge = new RenderBridge();
        try {
          await bridge.initialize();

          const artefacts: (SvgExportResult | PngExportResult | PdfExportResult)[] = [];

          if (formats.svg) {
            artefacts.push(
              await exportSvg(bridge, sceneForExport, options.outDir, baseName, options.dryRun),
            );
          }

          if (formats.png) {
            const scale = parseFloat(options.scale);
            artefacts.push(
              await exportPng(bridge, sceneForExport, options.outDir, baseName, scale, options.dryRun),
            );
          }

          if (formats.pdf) {
            artefacts.push(
              await exportPdf(bridge, sceneForExport, options.outDir, baseName, options.dryRun),
            );
          }

          return {
            target: { file: loaded.source, fingerprint: loaded.fingerprint },
            result: {
              artefacts,
              scene_summary: {
                element_count: inspection.element_count,
                bounding_box: inspection.bounding_box,
                fingerprint: loaded.fingerprint,
              },
              dry_run: options.dryRun || false,
            },
          };
        } finally {
          await bridge.dispose();
        }
      }),
    );
}
