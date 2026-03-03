export const ExitCode = {
  OK: 0,
  VALIDATION: 10,
  RENDER: 20,
  IO: 50,
  INTERNAL: 90,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export function exitCodeForError(code: string): ExitCodeValue {
  if (code.startsWith("ERR_VALIDATION")) return ExitCode.VALIDATION;
  if (code.startsWith("ERR_RENDER")) return ExitCode.RENDER;
  if (code.startsWith("ERR_IO")) return ExitCode.IO;
  return ExitCode.INTERNAL;
}
