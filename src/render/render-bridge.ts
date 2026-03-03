import { renderError } from "../core/errors.js";
import { generateBridgeHtml } from "./bridge-page.js";

interface SceneData {
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export class RenderBridge {
  private browser: any = null;
  private page: any = null;

  static async isAvailable(): Promise<boolean> {
    try {
      await import("playwright");
      return true;
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    let pw: any;
    try {
      pw = await import("playwright");
    } catch {
      throw renderError(
        "BROWSER_UNAVAILABLE",
        "Playwright is not installed. Install it with: npm install playwright",
      );
    }

    this.browser = await pw.chromium.launch({ headless: true });
    const context = await this.browser.newContext();
    this.page = await context.newPage();

    // Route font requests to local @excalidraw/excalidraw dist if available
    try {
      const excalidrawPkg = await import("@excalidraw/excalidraw");
      // Try to serve fonts from the package
      await this.page.route("**/*.woff2", async (route: any) => {
        try {
          const url = new URL(route.request().url());
          const fontName = url.pathname.split("/").pop();
          if (fontName) {
            const { resolve, dirname } = await import("node:path");
            const { readFile } = await import("node:fs/promises");
            const { createRequire } = await import("node:module");
            const require = createRequire(import.meta.url);
            const excalidrawDir = dirname(require.resolve("@excalidraw/excalidraw/package.json"));
            const fontPath = resolve(excalidrawDir, "dist", "excalidraw-assets", fontName);
            const body = await readFile(fontPath);
            await route.fulfill({ body, contentType: "font/woff2" });
            return;
          }
        } catch {
          // Fall through to abort
        }
        await route.abort();
      });
    } catch {
      // @excalidraw/excalidraw not installed, fonts won't be routed
    }

    const html = await generateBridgeHtml();
    await this.page.setContent(html);

    // Wait for bridge to be ready
    await this.page.waitForFunction("window.__bridgeReady === true", {
      timeout: 10_000,
    });
  }

  async exportSvg(sceneData: SceneData): Promise<string> {
    if (!this.page) throw renderError("EXPORT_FAILED", "Bridge not initialized");

    try {
      const svgString: string = await this.page.evaluate(
        async (data: SceneData) => {
          return (window as any).__excalidrawExport.exportToSvg(data);
        },
        sceneData,
      );
      return svgString;
    } catch (err: unknown) {
      throw renderError(
        "EXPORT_FAILED",
        `SVG export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async exportPng(sceneData: SceneData, scale = 2): Promise<Buffer> {
    if (!this.page) throw renderError("EXPORT_FAILED", "Bridge not initialized");

    try {
      const base64: string = await this.page.evaluate(
        async (data: { scene: SceneData; scale: number }) => {
          const appState = { ...data.scene.appState, exportScale: data.scale };
          return (window as any).__excalidrawExport.exportToBlob({
            ...data.scene,
            appState,
          });
        },
        { scene: sceneData, scale },
      );
      return Buffer.from(base64, "base64");
    } catch (err: unknown) {
      throw renderError(
        "EXPORT_FAILED",
        `PNG export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async exportPdf(sceneData: SceneData): Promise<Buffer> {
    if (!this.page) throw renderError("EXPORT_FAILED", "Bridge not initialized");

    try {
      // Render SVG into page, then use page.pdf()
      const svgString = await this.exportSvg(sceneData);

      await this.page.setContent(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; display: flex; justify-content: center; align-items: center; }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>${svgString}</body>
</html>`);

      const pdf = await this.page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
      });

      // Re-load bridge for subsequent calls
      const html = await generateBridgeHtml();
      await this.page.setContent(html);
      await this.page.waitForFunction("window.__bridgeReady === true", {
        timeout: 10_000,
      });

      return Buffer.from(pdf);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("ERR_RENDER")) throw err;
      throw renderError(
        "EXPORT_FAILED",
        `PDF export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
