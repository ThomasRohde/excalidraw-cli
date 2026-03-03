import { Command } from "commander";
import { registerInspect } from "./commands/inspect.js";
import { registerValidate } from "./commands/validate.js";
import { registerRender } from "./commands/render.js";
import { registerGuide } from "./commands/guide.js";
import { registerSkill } from "./commands/skill.js";

const program = new Command();

program
  .name("excal")
  .description("Agent-first CLI for Excalidraw scene inspection, validation, and rendering")
  .version("1.0.0");

registerInspect(program);
registerValidate(program);
registerRender(program);
registerGuide(program);
registerSkill(program);

program.parse();
