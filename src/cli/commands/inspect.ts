import type { Command } from "commander";
import { wrapCommand } from "../../core/command-wrapper.js";
import { loadScene } from "../../scene/load-scene.js";
import { inspectScene } from "../../scene/inspect-scene.js";
import { applyFilters } from "../../scene/filters.js";

export function registerInspect(program: Command): void {
  program
    .command("inspect <file>")
    .description("Inspect an Excalidraw scene and return metadata")
    .option("--include-deleted", "Include deleted elements in inspection")
    .option("--frame <id-or-name>", "Filter to a specific frame")
    .action(
      wrapCommand("scene.inspect", async (ctx, file: unknown, opts: unknown) => {
        const options = opts as { includeDeleted?: boolean; frame?: string };
        const fileStr = file as string;

        const loaded = await loadScene(fileStr);

        const filtered = applyFilters(loaded.parsed, {
          includeDeleted: options.includeDeleted,
          frameId: options.frame,
        });

        const inspection = inspectScene(filtered);

        return {
          target: { file: loaded.source, fingerprint: loaded.fingerprint },
          result: inspection,
        };
      }),
    );
}
