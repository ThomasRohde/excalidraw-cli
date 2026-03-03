import type { ExcalidrawScene, ExcalidrawElement } from "./schema.js";
import type { StructuredError } from "../core/errors.js";

export interface FilterOptions {
  frameId?: string;
  frameName?: string;
  elementIds?: string[];
  includeDeleted?: boolean;
}

export interface FilterResult {
  scene: ExcalidrawScene;
  warnings: StructuredError[];
}

export function applyFilters(
  scene: ExcalidrawScene,
  opts: FilterOptions,
): FilterResult {
  let elements = scene.elements;
  const warnings: StructuredError[] = [];

  // Filter deleted
  if (!opts.includeDeleted) {
    elements = elements.filter((e) => !e.isDeleted);
  }

  // Filter by frame
  if (opts.frameId) {
    // Try as ID first, then as name
    const hasById = elements.some((e) => e.id === opts.frameId || e.frameId === opts.frameId);
    if (hasById) {
      elements = filterByFrame(elements, opts.frameId);
    } else {
      // Fall back to name match
      const frame = elements.find(
        (e) => e.type === "frame" && e.name === opts.frameId,
      );
      if (frame) {
        elements = filterByFrame(elements, frame.id);
      } else {
        warnings.push({
          code: "ERR_VALIDATION_FRAME_NOT_FOUND",
          message: `Frame not found: "${opts.frameId}" does not match any frame ID or name`,
          retryable: false,
          suggested_action: "fix_input",
        });
      }
    }
  } else if (opts.frameName) {
    const frame = elements.find(
      (e) => e.type === "frame" && e.name === opts.frameName,
    );
    if (frame) {
      elements = filterByFrame(elements, frame.id);
    } else {
      warnings.push({
        code: "ERR_VALIDATION_FRAME_NOT_FOUND",
        message: `Frame not found: no frame with name "${opts.frameName}"`,
        retryable: false,
        suggested_action: "fix_input",
      });
    }
  }

  // Filter by element IDs
  if (opts.elementIds && opts.elementIds.length > 0) {
    const idSet = new Set(opts.elementIds);
    const before = elements.length;
    elements = elements.filter((e) => idSet.has(e.id));
    const missing = [...idSet].filter((id) => !elements.some((e) => e.id === id));
    if (missing.length > 0) {
      warnings.push({
        code: "ERR_VALIDATION_ELEMENT_NOT_FOUND",
        message: `Element IDs not found: ${missing.join(", ")}`,
        retryable: false,
        suggested_action: "fix_input",
        details: { missing_ids: missing },
      });
    }
  }

  return { scene: { ...scene, elements }, warnings };
}

function filterByFrame(
  elements: ExcalidrawElement[],
  frameId: string,
): ExcalidrawElement[] {
  // Include the frame itself plus all children
  return elements.filter((e) => e.id === frameId || e.frameId === frameId);
}
