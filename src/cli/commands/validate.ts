import type { Command } from "commander";
import { wrapCommand } from "../../core/command-wrapper.js";
import { loadScene } from "../../scene/load-scene.js";
import { validateScene } from "../../scene/validate-scene.js";

export function registerValidate(program: Command): void {
  program
    .command("validate <file>")
    .description("Validate an Excalidraw scene for structural consistency")
    .option("--check-assets", "Verify image file references exist")
    .action(
      wrapCommand("scene.validate", async (ctx, file: unknown, opts: unknown) => {
        const options = opts as { checkAssets?: boolean };
        const fileStr = file as string;

        const loaded = await loadScene(fileStr);
        const { result, warnings } = validateScene(loaded.parsed, {
          checkAssets: options.checkAssets,
        });

        for (const w of warnings) ctx.warn(w);

        return {
          target: { file: loaded.source, fingerprint: loaded.fingerprint },
          result,
        };
      }),
    );
}
