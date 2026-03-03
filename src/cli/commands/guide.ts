import type { Command } from "commander";
import { wrapCommand } from "../../core/command-wrapper.js";
import { getGuideContent } from "../../guide/guide-schema.js";

export function registerGuide(program: Command): void {
  program
    .command("guide")
    .description("Return CLI guide as Markdown for agent bootstrapping")
    .action(
      wrapCommand("cli.guide", async () => {
        return { result: { content: getGuideContent(), format: "markdown" } };
      }),
    );
}
