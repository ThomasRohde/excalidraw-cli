import { buildEnvelope, type Envelope } from "./envelope.js";
import { CliError, internalError, type StructuredError } from "./errors.js";
import { exitCodeForError } from "./exit-codes.js";
import { generateRequestId } from "./request-id.js";
import { Timer } from "./timer.js";

export interface CommandContext {
  requestId: string;
  timer: Timer;
  warnings: StructuredError[];
  warn(warning: StructuredError): void;
}

type CommandHandler<T> = (
  ctx: CommandContext,
  ...args: unknown[]
) => Promise<{ result: T; target?: Record<string, unknown> | null }>;

export function wrapCommand<T>(
  command: string,
  handler: CommandHandler<T>,
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    const timer = new Timer();
    const requestId = generateRequestId();
    const warnings: StructuredError[] = [];
    const ctx: CommandContext = {
      requestId,
      timer,
      warnings,
      warn(w) {
        warnings.push(w);
      },
    };

    let envelope: Envelope<T>;
    try {
      const { result, target } = await handler(ctx, ...args);
      envelope = buildEnvelope<T>({
        request_id: requestId,
        command,
        target,
        result,
        ok: true,
        warnings,
        duration_ms: timer.elapsed(),
      });
    } catch (err: unknown) {
      const structured =
        err instanceof CliError
          ? err.structured
          : internalError(
              err instanceof Error ? err.message : String(err),
            ).structured;

      envelope = buildEnvelope<T>({
        request_id: requestId,
        command,
        result: null,
        ok: false,
        warnings,
        errors: [structured],
        duration_ms: timer.elapsed(),
      });
      process.exitCode = exitCodeForError(structured.code);
    }

    process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
  };
}
