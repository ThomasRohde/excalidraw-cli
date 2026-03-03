import { Command, CommanderError } from "commander";
import { registerInspect } from "./commands/inspect.js";
import { registerValidate } from "./commands/validate.js";
import { registerRender } from "./commands/render.js";
import { registerGuide } from "./commands/guide.js";
import { registerSkill } from "./commands/skill.js";
import { buildEnvelope } from "../core/envelope.js";
import { generateRequestId } from "../core/request-id.js";

declare const __VERSION__: string;

const program = new Command();

program
  .name("excal")
  .description("Agent-first CLI for Excalidraw scene inspection, validation, and rendering")
  .version(__VERSION__);

// Bare `excal` with no command → JSON error envelope
program.action(() => {
  const envelope = buildEnvelope({
    request_id: generateRequestId(),
    command: "",
    result: null,
    ok: false,
    errors: [
      {
        code: "ERR_VALIDATION_NO_COMMAND",
        message: "No command specified. Run `excal --help` for usage.",
        retryable: false,
        suggested_action: "fix_input",
      },
    ],
    duration_ms: 0,
  });
  process.exitCode = 10;
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
});

// Suppress Commander's default error output for missing args / unknown commands
program.exitOverride();
program.configureOutput({
  writeOut: () => {},
  writeErr: () => {},
});

registerInspect(program);
registerValidate(program);
registerRender(program);
registerGuide(program);
registerSkill(program);

try {
  program.parse();
} catch (err: unknown) {
  if (err instanceof CommanderError) {
    // Let --help and --version pass through normally
    if (err.code === "commander.helpDisplayed") {
      process.stdout.write(program.helpInformation());
      process.exit(0);
    }
    if (err.code === "commander.version") {
      process.stdout.write(program.version() + "\n");
      process.exit(0);
    }
    const envelope = buildEnvelope({
      request_id: generateRequestId(),
      command: "",
      result: null,
      ok: false,
      errors: [
        {
          code: "ERR_VALIDATION_INVALID_ARGS",
          message: err.message,
          retryable: false,
          suggested_action: "fix_input",
        },
      ],
      duration_ms: 0,
    });
    process.exitCode = 10;
    process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
  } else {
    throw err;
  }
}
