import type { ExcalidrawScene, ExcalidrawElement } from "./schema.js";

function deterministicSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function normalizeScene(scene: ExcalidrawScene): ExcalidrawScene {
  const elements = scene.elements.map(normalizeElement);
  // Stable ordering: by type, then by y, then by x, then by id
  elements.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.id.localeCompare(b.id);
  });

  return { ...scene, elements };
}

function normalizeElement(el: ExcalidrawElement): ExcalidrawElement {
  const raw = el as Record<string, unknown>;
  const result: Record<string, unknown> = {
    ...el,
    isDeleted: el.isDeleted ?? false,
    opacity: el.opacity ?? 100,
    groupIds: el.groupIds ?? [],
    frameId: el.frameId ?? null,
    boundElements: el.boundElements ?? null,
    containerId: el.containerId ?? null,
    startBinding: el.startBinding ?? null,
    endBinding: el.endBinding ?? null,
    fileId: el.fileId ?? null,
    name: el.name ?? null,
    // Properties required by @excalidraw/utils for rendering
    angle: (raw.angle as number) ?? 0,
    strokeColor: (raw.strokeColor as string) ?? "#1e1e1e",
    backgroundColor: (raw.backgroundColor as string) ?? "transparent",
    fillStyle: (raw.fillStyle as string) ?? "solid",
    strokeWidth: (raw.strokeWidth as number) ?? 2,
    strokeStyle: (raw.strokeStyle as string) ?? "solid",
    roughness: (raw.roughness as number) ?? 1,
    roundness: raw.roundness ?? null,
    seed: (raw.seed as number) ?? deterministicSeed(el.id),
    version: (raw.version as number) ?? 1,
    versionNonce: (raw.versionNonce as number) ?? 1,
    updated: (raw.updated as number) ?? Date.now(),
    link: (raw.link as string | null) ?? null,
    locked: (raw.locked as boolean) ?? false,
  };

  // Arrows and lines require a points array
  if ((el.type === "arrow" || el.type === "line" || el.type === "freedraw") && !raw.points) {
    result.points = [[0, 0], [el.width, el.height]];
  }

  // Text elements require font/layout properties for rendering
  if (el.type === "text") {
    result.fontSize = (raw.fontSize as number) ?? 20;
    result.fontFamily = (raw.fontFamily as number) ?? 1;
    result.textAlign = (raw.textAlign as string) ?? "left";
    result.verticalAlign = (raw.verticalAlign as string) ?? "top";
    result.lineHeight = (raw.lineHeight as number) ?? 1.25;
    result.originalText = (raw.originalText as string) ?? (raw.text as string) ?? "";
    result.baseline = (raw.baseline as number) ?? 0;
  }

  return result as ExcalidrawElement;
}
