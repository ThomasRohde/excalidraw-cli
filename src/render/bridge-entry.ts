// This file is bundled as IIFE for the browser.
// It exposes window.__excalidrawBridge with export methods.

import { exportToSvg, exportToBlob } from "@excalidraw/utils";

interface SceneData {
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

async function bridgeExportToSvg(sceneData: SceneData): Promise<string> {
  const svg = await exportToSvg({
    elements: sceneData.elements as any,
    appState: sceneData.appState as any,
    files: (sceneData.files as any) ?? {},
  });
  return svg.outerHTML;
}

async function bridgeExportToBlob(sceneData: SceneData): Promise<string> {
  const blob = await exportToBlob({
    elements: sceneData.elements as any,
    appState: sceneData.appState as any,
    files: (sceneData.files as any) ?? {},
    mimeType: "image/png",
  });
  // Convert to base64 so Playwright can transfer it as a string
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Set on globalThis so it survives the IIFE wrapper
(globalThis as any).__excalidrawExport = {
  ready: true,
  exportToSvg: bridgeExportToSvg,
  exportToBlob: bridgeExportToBlob,
};

export { bridgeExportToSvg as exportToSvg, bridgeExportToBlob as exportToBlob };
