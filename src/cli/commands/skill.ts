import type { Command } from "commander";
import { wrapCommand } from "../../core/command-wrapper.js";
import { getSkillContent } from "../../guide/skill-content.js";

export function registerSkill(program: Command): void {
  program
    .command("skill")
    .description("Return Excalidraw domain knowledge for AI agents")
    .action(
      wrapCommand("cli.skill", async () => {
        return { result: { content: getSkillContent(), format: "markdown" } };
      }),
    );
}
