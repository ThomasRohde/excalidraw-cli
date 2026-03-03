import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

interface FontAsset {
  name: string;
  file: string;
}

const FONTS: FontAsset[] = [
  { name: "Virgil", file: "Virgil-Regular.woff2" },
  { name: "Excalifont", file: "Excalifont-Regular.woff2" },
];

async function loadFontBase64(filename: string): Promise<string> {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(thisDir, "..", "..", "assets", "fonts", filename),
    resolve(process.cwd(), "assets", "fonts", filename),
  ];
  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      return buf.toString("base64");
    } catch {
      continue;
    }
  }
  return "";
}

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

  const fontLoaderParts: string[] = [];
  for (const font of FONTS) {
    const b64 = await loadFontBase64(font.file);
    if (b64) {
      fontLoaderParts.push(
        `{ const f = new FontFace("${font.name}", "url(data:font/woff2;base64,${b64})");
           await f.load(); document.fonts.add(f); }`,
      );
    }
  }
  const fontLoader = fontLoaderParts.join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>${bridgeScript}</script>
<script>
  (async () => {
    ${fontLoader}
    window.__bridgeReady = typeof window.__excalidrawExport !== 'undefined' && window.__excalidrawExport.ready;
  })();
</script>
</body>
</html>`;
}
