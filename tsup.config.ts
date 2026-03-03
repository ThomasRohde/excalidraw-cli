import { defineConfig } from "tsup";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig([
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    platform: "node",
    target: "node20",
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    define: {
      __VERSION__: JSON.stringify(version),
    },
    banner: {
      js: "#!/usr/bin/env node",
    },
    external: ["playwright", "@excalidraw/excalidraw"],
  },
  {
    entry: { "render/bridge": "src/render/bridge-entry.ts" },
    format: ["iife"],
    platform: "browser",
    globalName: "__excalidrawBridge",
    noExternal: ["@excalidraw/utils"],
    splitting: false,
    sourcemap: false,
    dts: false,
  },
]);
