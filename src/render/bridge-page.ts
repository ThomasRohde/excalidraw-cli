import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export async function generateBridgeHtml(): Promise<string> {
  // Resolve bridge script relative to this file's dist location
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const bridgePath = resolve(thisDir, "..", "render", "bridge.global.js");

  let bridgeScript: string;
  try {
    bridgeScript = await readFile(bridgePath, "utf-8");
  } catch {
    // Fallback: try relative to cwd dist
    const fallbackPath = resolve(process.cwd(), "dist", "render", "bridge.global.js");
    bridgeScript = await readFile(fallbackPath, "utf-8");
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>${bridgeScript}</script>
<script>
  window.__bridgeReady = typeof window.__excalidrawExport !== 'undefined' && window.__excalidrawExport.ready;
</script>
</body>
</html>`;
}
