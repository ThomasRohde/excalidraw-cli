export interface StructuredError {
  code: string;
  message: string;
  retryable: boolean;
  suggested_action: "retry" | "fix_input" | "escalate";
  details?: Record<string, unknown>;
}

export class CliError extends Error {
  constructor(public readonly structured: StructuredError) {
    super(structured.message);
    this.name = "CliError";
  }
}

export function validationError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): CliError {
  return new CliError({
    code: `ERR_VALIDATION_${code}`,
    message,
    retryable: false,
    suggested_action: "fix_input",
    details,
  });
}

export function renderError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): CliError {
  return new CliError({
    code: `ERR_RENDER_${code}`,
    message,
    retryable: false,
    suggested_action: "escalate",
    details,
  });
}

export function ioError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): CliError {
  return new CliError({
    code: `ERR_IO_${code}`,
    message,
    retryable: true,
    suggested_action: "retry",
    details,
  });
}

export function internalError(
  message: string,
  details?: Record<string, unknown>,
): CliError {
  return new CliError({
    code: "ERR_INTERNAL_UNEXPECTED",
    message,
    retryable: false,
    suggested_action: "escalate",
    details,
  });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
