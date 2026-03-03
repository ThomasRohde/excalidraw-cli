import { ExcalidrawSceneSchema, type ExcalidrawScene } from "./schema.js";
import { readInput } from "../core/io.js";
import { sha256 } from "../core/fingerprint.js";
import { validationError } from "../core/errors.js";

export interface LoadedScene {
  raw: string;
  parsed: ExcalidrawScene;
  source: string;
  fingerprint: string;
}

export async function loadScene(fileOrDash: string): Promise<LoadedScene> {
  const { content, source } = await readInput(fileOrDash);
  const fingerprint = sha256(content);

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw validationError("INVALID_JSON", "Input is not valid JSON", { source });
  }

  // Auto-detect format
  const parsed = detectAndParse(json, source);

  return { raw: content, parsed, source, fingerprint };
}

function detectAndParse(json: unknown, source: string): ExcalidrawScene {
  // Clipboard format (check before full scene since it also has "elements")
  if (isObject(json) && json.type === "excalidraw/clipboard" && "elements" in json) {
    const sceneData = { ...json, type: "excalidraw" };
    const result = ExcalidrawSceneSchema.safeParse(sceneData);
    if (result.success) return result.data;
    throw validationError(
      "INVALID_CLIPBOARD",
      `Clipboard data validation failed: ${result.error.message}`,
      { source },
    );
  }

  // Full scene object
  if (isObject(json) && "elements" in json && Array.isArray(json.elements)) {
    const result = ExcalidrawSceneSchema.safeParse(json);
    if (result.success) return result.data;
    throw validationError("INVALID_SCENE", `Scene validation failed: ${result.error.message}`, {
      source,
      issues: result.error.issues,
    });
  }

  // Elements-only array
  if (Array.isArray(json)) {
    const wrapped = { type: "excalidraw", version: 2, elements: json };
    const result = ExcalidrawSceneSchema.safeParse(wrapped);
    if (result.success) return result.data;
    throw validationError(
      "INVALID_ELEMENTS",
      `Elements array validation failed: ${result.error.message}`,
      { source, issues: result.error.issues },
    );
  }

  throw validationError("UNKNOWN_FORMAT", "Input is not a recognized Excalidraw format", {
    source,
  });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
