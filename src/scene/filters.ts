import type { ExcalidrawScene, ExcalidrawElement } from "./schema.js";

export interface FilterOptions {
  frameId?: string;
  frameName?: string;
  elementIds?: string[];
  includeDeleted?: boolean;
}

export function applyFilters(
  scene: ExcalidrawScene,
  opts: FilterOptions,
): ExcalidrawScene {
  let elements = scene.elements;

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
      }
    }
  } else if (opts.frameName) {
    const frame = elements.find(
      (e) => e.type === "frame" && e.name === opts.frameName,
    );
    if (frame) {
      elements = filterByFrame(elements, frame.id);
    }
  }

  // Filter by element IDs
  if (opts.elementIds && opts.elementIds.length > 0) {
    const idSet = new Set(opts.elementIds);
    elements = elements.filter((e) => idSet.has(e.id));
  }

  return { ...scene, elements };
}

function filterByFrame(
  elements: ExcalidrawElement[],
  frameId: string,
): ExcalidrawElement[] {
  // Include the frame itself plus all children
  return elements.filter((e) => e.id === frameId || e.frameId === frameId);
}
