import type { ExcalidrawScene, ExcalidrawElement } from "./schema.js";

export interface SceneInspection {
  element_count: number;
  deleted_count: number;
  counts_by_type: Record<string, number>;
  frames: FrameInfo[];
  images: ImageInfo[];
  text_stats: TextStats;
  bounding_box: BoundingBox | null;
  binary_files: BinaryFileInfo[];
}

export interface FrameInfo {
  id: string;
  name: string | null;
  child_count: number;
}

export interface ImageInfo {
  id: string;
  fileId: string | null;
  width: number;
  height: number;
}

export interface TextStats {
  count: number;
  bound_count: number;
  unbound_count: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BinaryFileInfo {
  id: string;
  mimeType: string;
  size: number;
}

export function inspectScene(scene: ExcalidrawScene): SceneInspection {
  const liveElements = scene.elements.filter((e) => !e.isDeleted);
  const deletedElements = scene.elements.filter((e) => e.isDeleted);

  const countsByType: Record<string, number> = {};
  for (const el of liveElements) {
    countsByType[el.type] = (countsByType[el.type] ?? 0) + 1;
  }

  const frames = liveElements
    .filter((e) => e.type === "frame")
    .map((f) => ({
      id: f.id,
      name: f.name,
      child_count: liveElements.filter((e) => e.frameId === f.id).length,
    }));

  const images = liveElements
    .filter((e) => e.type === "image")
    .map((img) => ({
      id: img.id,
      fileId: img.fileId,
      width: img.width,
      height: img.height,
    }));

  const textElements = liveElements.filter((e) => e.type === "text");
  const textStats: TextStats = {
    count: textElements.length,
    bound_count: textElements.filter((e) => e.containerId).length,
    unbound_count: textElements.filter((e) => !e.containerId).length,
  };

  const bounding_box = computeBoundingBox(liveElements);

  const binaryFiles: BinaryFileInfo[] = [];
  if (scene.files && typeof scene.files === "object") {
    for (const [id, file] of Object.entries(scene.files)) {
      if (isFileEntry(file)) {
        const size = typeof file.dataURL === "string" ? Math.round((file.dataURL.length * 3) / 4) : 0;
        binaryFiles.push({
          id,
          mimeType: file.mimeType ?? "unknown",
          size,
        });
      }
    }
  }

  return {
    element_count: liveElements.length,
    deleted_count: deletedElements.length,
    counts_by_type: countsByType,
    frames,
    images,
    text_stats: textStats,
    bounding_box,
    binary_files: binaryFiles,
  };
}

function computeBoundingBox(elements: ExcalidrawElement[]): BoundingBox | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function isFileEntry(v: unknown): v is { dataURL?: string; mimeType?: string } {
  return typeof v === "object" && v !== null;
}
