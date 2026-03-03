# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build          # Build CLI + browser bridge bundles via tsup
npm test               # Run all tests (vitest)
npm run test:watch     # Watch mode
npm run typecheck      # Type-check without emitting
npx vitest test/unit/envelope.test.ts          # Run a single test file
npx vitest -t "counts elements"                # Run tests matching a name pattern
```

Build must succeed before integration tests run — they spawn `node dist/cli/index.js` as a subprocess.

## Architecture

This is an agent-first CLI (`excal`) for Excalidraw scene inspection, validation, and rendering. Every command writes a single JSON envelope to stdout — same shape for success and failure.

### Dual Bundle (tsup)

Two separate entry points produce two bundles:

- **CLI bundle** (`src/cli/index.ts` → `dist/cli/index.js`): ESM, Node.js platform, Playwright marked external. This is the `excal` binary.
- **Bridge bundle** (`src/render/bridge-entry.ts` → `dist/render/bridge.global.js`): IIFE, browser platform, `@excalidraw/utils` bundled in. This script runs inside headless Chromium.

The CLI bundle imports and inlines the bridge bundle as an HTML string at runtime.

### Command Wrapper Pattern

Every command is registered via `wrapCommand(commandId, handler)` in `src/core/command-wrapper.ts`. The wrapper:

1. Creates a `CommandContext` with request ID, timer, and warnings collector
2. Calls the handler, which returns `{ result, target? }`
3. Catches any `CliError` and maps its code to an exit code
4. Serializes the envelope to stdout

To add a new command: create `src/cli/commands/foo.ts` with a `registerFoo(program)` function, use `wrapCommand("domain.foo", handler)`, and import it in `src/cli/index.ts`.

### Scene Pipeline

Scene commands follow: **Load → Normalize → Filter → Inspect/Validate/Render**

- **Load** (`src/scene/load-scene.ts`): reads file or stdin, SHA-256 fingerprints the raw content, auto-detects format (full scene, elements-only array, clipboard)
- **Normalize** (`src/scene/normalize-scene.ts`): fills rendering defaults (`angle`, `seed`, `strokeColor`, etc.), adds `points` for arrows/lines, applies deterministic sort by type→y→x→id
- **Filter** (`src/scene/filters.ts`): strips deleted elements, filters by frame ID/name, or by element IDs
- **Inspect/Validate**: pure analysis, no browser needed
- **Render**: requires the Playwright bridge

### Playwright Render Bridge

`RenderBridge` (`src/render/render-bridge.ts`) manages the browser lifecycle:

1. Launches headless Chromium, loads an HTML page with the IIFE bridge script inlined
2. The bridge exposes `globalThis.__excalidrawExport` with `exportToSvg()` and `exportToBlob()` (from `@excalidraw/utils`)
3. The CLI calls `page.evaluate()` to run exports in the browser context
4. PNG data returns as base64 strings (Playwright can't serialize ArrayBuffer across the bridge)
5. PDF uses SVG → HTML → `page.pdf()`

Playwright is optional. If missing, render commands fail with `ERR_RENDER_BROWSER_UNAVAILABLE` (exit 20).

### Error System

Errors are `CliError` instances wrapping a `StructuredError` (`src/core/errors.ts`). Four factories:

| Factory | Code prefix | Exit | retryable | suggested_action |
|---------|------------|------|-----------|-----------------|
| `validationError()` | `ERR_VALIDATION_*` | 10 | false | `fix_input` |
| `renderError()` | `ERR_RENDER_*` | 20 | false | `escalate` |
| `ioError()` | `ERR_IO_*` | 50 | true | `retry` |
| `internalError()` | `ERR_INTERNAL_*` | 90 | false | `escalate` |

Exit codes are derived from the error code prefix in `src/core/exit-codes.ts`.

### Envelope Contract

Every response has: `schema_version`, `request_id`, `ok`, `command`, `target`, `result`, `warnings[]`, `errors[]`, `metrics`. `result` is `null` on failure. `warnings` and `errors` are always arrays.

## Testing

- **Unit tests** (`test/unit/`): import source modules directly, test pure functions
- **Integration tests** (`test/integration/`): spawn the built CLI as a child process, parse the JSON envelope from stdout
- **Fixtures** (`test/fixtures/`): `.excalidraw` files covering various scenarios — `elaborate-scene.excalidraw` exercises every element type, validation failure, frame filtering, and binary file handling
- Integration tests use `spawn` (not `execFile`) for stdin piping on Windows

## Key Conventions

- Zod schemas use `.passthrough()` for forward compatibility with unknown Excalidraw element properties
- `normalizeScene()` must add all properties that `@excalidraw/utils` needs for rendering (missing props cause silent crashes in the minified bundle)
- Atomic file writes: temp file + rename via `writeOutput()` in `src/core/io.ts`
- The `--frame` flag tries matching as element ID first, then falls back to frame name
- `guide` and `skill` both return `{ content: string, format: "markdown" }` in the envelope result
