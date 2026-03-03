# excal

![version](https://img.shields.io/badge/version-1.0.0-blue)
[![npm](https://img.shields.io/npm/v/@trohde/excal-cli)](https://www.npmjs.com/package/@trohde/excal-cli)
![license](https://img.shields.io/badge/license-MIT-green)

Agent-first CLI for [Excalidraw](https://excalidraw.com) scene inspection, validation, and rendering.

Built for AI agents, CI pipelines, and developers who need deterministic, non-interactive workflows around `.excalidraw` files. Every command returns a structured JSON envelope on stdout with stable error codes and exit semantics.

## Install

```bash
npm install -g @trohde/excal-cli
```

Or run directly with npx:

```bash
npx @trohde/excal-cli inspect diagram.excalidraw
```

PNG and PDF export require Playwright (optional):

```bash
npx playwright install chromium
```

### From source

```bash
git clone https://github.com/ThomasRohde/excalidraw-cli.git
cd excalidraw-cli
npm install
npm run build
```

## Quick Start

```bash
# Inspect a scene
excal inspect diagram.excalidraw

# Validate structure
excal validate diagram.excalidraw --check-assets

# Export to SVG
excal render diagram.excalidraw --outDir ./out

# Export to PNG + PDF
excal render diagram.excalidraw --outDir ./out --png --pdf

# Pipe from stdin
cat diagram.excalidraw | excal inspect -

# Agent bootstrapping
excal guide
excal skill
```

## Commands

### `excal inspect <file|->`

Return element counts, type breakdown, frame details, text stats, bounding box, image info, and binary file metadata.

```bash
excal inspect diagram.excalidraw
excal inspect diagram.excalidraw --frame "Login Flow"
excal inspect diagram.excalidraw --include-deleted
```

| Flag | Description |
|------|-------------|
| `--include-deleted` | Include soft-deleted elements |
| `--frame <id\|name>` | Filter to a specific frame by ID or name |

### `excal validate <file|->`

Check structural consistency: frame references, bound text bindings, arrow bindings, and optionally image asset references.

```bash
excal validate diagram.excalidraw
excal validate diagram.excalidraw --check-assets
```

| Flag | Description |
|------|-------------|
| `--check-assets` | Verify image elements reference existing binary files |

### `excal render <file|->`

Render a scene to SVG, PNG, or PDF. SVG is the default. PNG and PDF require Playwright.

```bash
excal render diagram.excalidraw --outDir ./out
excal render diagram.excalidraw --outDir ./out --svg --png
excal render diagram.excalidraw --outDir ./out --frame "Dashboard" --dark-mode
excal render diagram.excalidraw --dry-run
```

| Flag | Description |
|------|-------------|
| `--outDir <dir>` | Output directory (default: `.`) |
| `--svg` | Export SVG (default if no format specified) |
| `--png` | Export PNG (requires Playwright) |
| `--pdf` | Export PDF (requires Playwright) |
| `--dark-mode` | Dark theme |
| `--no-background` | Transparent background |
| `--scale <n>` | PNG scale factor (default: `2`) |
| `--padding <n>` | Padding in pixels (default: `20`) |
| `--frame <id\|name>` | Export a specific frame only |
| `--element <id>` | Export a specific element only |
| `--dry-run` | Run the full pipeline but write no files |

### `excal guide`

Print a Markdown CLI reference — commands, flags, error codes, envelope schema. Designed for agent bootstrapping.

### `excal skill`

Print Markdown domain knowledge about Excalidraw scene structure, element types, frames, arrows, bound text, images, and export tips.

## Response Envelope

Every command writes a JSON envelope to stdout:

```jsonc
{
  "schema_version": "1.0",
  "request_id": "req_20260302_143000_7f3a",
  "ok": true,
  "command": "scene.inspect",
  "target": { "file": "diagram.excalidraw", "fingerprint": "ab12..." },
  "result": { ... },
  "warnings": [],
  "errors": [],
  "metrics": { "duration_ms": 42 }
}
```

- `ok`, `result`, `warnings`, `errors`, and `metrics` are always present.
- On failure, `result` is `null` and `errors` contains structured error objects.
- Each error has `code`, `message`, `retryable`, and `suggested_action`.

## Error Codes

| Code | Exit | Description |
|------|------|-------------|
| `ERR_VALIDATION_INVALID_JSON` | 10 | Input is not valid JSON |
| `ERR_VALIDATION_INVALID_SCENE` | 10 | Scene structure validation failed |
| `ERR_VALIDATION_UNKNOWN_FORMAT` | 10 | Unrecognized input format |
| `ERR_RENDER_BROWSER_UNAVAILABLE` | 20 | Playwright is not installed |
| `ERR_RENDER_EXPORT_FAILED` | 20 | Browser-side export failed |
| `ERR_IO_READ_FAILED` | 50 | Could not read input file |
| `ERR_IO_WRITE_FAILED` | 50 | Could not write output file |
| `ERR_INTERNAL_UNEXPECTED` | 90 | Unexpected internal error |

## Input Formats

The CLI auto-detects three input formats:

- **Full scene** — standard `.excalidraw` JSON with `elements`, `appState`, `files`
- **Elements-only** — a bare JSON array of elements
- **Clipboard** — `{ "type": "excalidraw/clipboard", "elements": [...] }`

## Architecture

```
src/
  cli/          Commander commands (inspect, validate, render, guide, skill)
  core/         Envelope, errors, IO, fingerprinting, exit codes
  scene/        Zod schemas, scene loading, normalization, inspection, validation, filtering
  render/       Playwright browser bridge using @excalidraw/utils
  guide/        Guide + skill markdown content
```

**Dual bundle** via tsup:
- CLI entry — ESM, Node.js, Playwright external
- Bridge entry — IIFE, browser, `@excalidraw/utils` bundled in

Rendering works by loading a minimal HTML page in headless Chromium, passing scene JSON via `page.evaluate()`, and calling `exportToSvg`/`exportToBlob` from `@excalidraw/utils`.

## Development

```bash
npm run build       # Build CLI + bridge bundles
npm test            # Run all tests
npm run dev         # Watch mode build
npm run typecheck   # TypeScript type checking
```

## License

MIT
