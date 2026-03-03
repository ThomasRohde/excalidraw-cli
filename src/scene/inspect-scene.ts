import type { ExcalidrawScene, ExcalidrawElement } from "./schema.js";

export interface SceneInspection {
  element_count: number;
  deleted_count: number;
  counts_by_type: Record<string, number>;
  deleted_counts_by_type: Record<string, number>;
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
  const countsByType: Record<string, number> = {};
  const deletedCountsByType: Record<string, number> = {};
  const frameElements: ExcalidrawElement[] = [];
  const images: ImageInfo[] = [];
  const frameChildCounts = new Map<string, number>();
  let deletedCount = 0;
  let textCount = 0;
  let boundTextCount = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let liveCount = 0;

  // Single pass over all elements
  for (const el of scene.elements) {
    if (el.isDeleted) {
      deletedCount++;
      deletedCountsByType[el.type] = (deletedCountsByType[el.type] ?? 0) + 1;
      continue;
    }
    liveCount++;
    countsByType[el.type] = (countsByType[el.type] ?? 0) + 1;

    // Bounding box
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);

    // Frame child counting
    if (el.frameId) {
      frameChildCounts.set(el.frameId, (frameChildCounts.get(el.frameId) ?? 0) + 1);
    }

    // Collect frames
    if (el.type === "frame") {
      frameElements.push(el);
    }

    // Collect images
    if (el.type === "image") {
      images.push({ id: el.id, fileId: el.fileId, width: el.width, height: el.height });
    }

    // Text stats
    if (el.type === "text") {
      textCount++;
      if (el.containerId) boundTextCount++;
    }
  }

  const frames = frameElements.map((f) => ({
    id: f.id,
    name: f.name,
    child_count: frameChildCounts.get(f.id) ?? 0,
  }));

  const bounding_box =
    liveCount === 0
      ? null
      : { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };

  const binaryFiles: BinaryFileInfo[] = [];
  if (scene.files && typeof scene.files === "object") {
    for (const [id, file] of Object.entries(scene.files)) {
      if (isFileEntry(file)) {
        const size = typeof file.dataURL === "string" ? Math.round((file.dataURL.length * 3) / 4) : 0;
        binaryFiles.push({ id, mimeType: file.mimeType ?? "unknown", size });
      }
    }
  }

  return {
    element_count: liveCount,
    deleted_count: deletedCount,
    counts_by_type: countsByType,
    deleted_counts_by_type: deletedCountsByType,
    frames,
    images,
    text_stats: {
      count: textCount,
      bound_count: boundTextCount,
      unbound_count: textCount - boundTextCount,
    },
    bounding_box,
    binary_files: binaryFiles,
  };
}

function isFileEntry(v: unknown): v is { dataURL?: string; mimeType?: string } {
  return typeof v === "object" && v !== null;
}
