import type { StructuredError } from "./errors.js";

export interface Envelope<T> {
  schema_version: string;
  request_id: string;
  ok: boolean;
  command: string;
  target: Record<string, unknown> | null;
  result: T | null;
  warnings: StructuredError[];
  errors: StructuredError[];
  metrics: {
    duration_ms: number;
    [key: string]: unknown;
  };
}

export function buildEnvelope<T>(opts: {
  request_id: string;
  command: string;
  target?: Record<string, unknown> | null;
  result: T | null;
  ok: boolean;
  warnings?: StructuredError[];
  errors?: StructuredError[];
  duration_ms: number;
}): Envelope<T> {
  return {
    schema_version: "1.0",
    request_id: opts.request_id,
    ok: opts.ok,
    command: opts.command,
    target: opts.target ?? null,
    result: opts.result,
    warnings: opts.warnings ?? [],
    errors: opts.errors ?? [],
    metrics: { duration_ms: opts.duration_ms },
  };
}
