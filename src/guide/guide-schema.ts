export function getGuideContent(): string {
  return `# excal — CLI Guide

Agent-first CLI for Excalidraw scene inspection, validation, and rendering.

## Commands

### excal inspect <file|->

Inspect an Excalidraw scene and return element counts, bounds, and metadata.

| Flag | Description |
|------|-------------|
| \`--include-deleted\` | Include deleted elements |
| \`--frame <id\\|name>\` | Filter to a specific frame |

\`\`\`bash
excal inspect diagram.excalidraw
cat scene.json | excal inspect -
\`\`\`

### excal validate <file|->

Validate scene structure: frame refs, bound text, arrow bindings, assets.

| Flag | Description |
|------|-------------|
| \`--check-assets\` | Verify image file references exist in scene |

\`\`\`bash
excal validate diagram.excalidraw
excal validate diagram.excalidraw --check-assets
\`\`\`

### excal render <file|->

Render scene to SVG, PNG, or PDF. PNG/PDF require Playwright.

| Flag | Description |
|------|-------------|
| \`--outDir <dir>\` | Output directory (default: .) |
| \`--svg\` | Export SVG (default if no format specified) |
| \`--png\` | Export PNG (requires Playwright) |
| \`--pdf\` | Export PDF (requires Playwright) |
| \`--dark-mode\` | Use dark theme |
| \`--no-background\` | Transparent background |
| \`--scale <n>\` | Scale factor for PNG (default: 2) |
| \`--padding <n>\` | Padding in pixels (default: 20) |
| \`--frame <id\\|name>\` | Export specific frame only |
| \`--element <id>\` | Export specific element only |
| \`--dry-run\` | Run pipeline but write no files |

\`\`\`bash
excal render diagram.excalidraw --outDir ./out
excal render diagram.excalidraw --outDir ./out --png --pdf
excal render - --outDir ./out < scene.json
\`\`\`

### excal guide

Output this CLI guide as Markdown.

### excal skill

Return Excalidraw domain knowledge for AI agents.

## Error Codes

| Code | Exit | Description |
|------|------|-------------|
| \`ERR_VALIDATION_INVALID_JSON\` | 10 | Input is not valid JSON |
| \`ERR_VALIDATION_INVALID_SCENE\` | 10 | Scene structure validation failed |
| \`ERR_VALIDATION_UNKNOWN_FORMAT\` | 10 | Input is not a recognized format |
| \`ERR_RENDER_BROWSER_UNAVAILABLE\` | 20 | Playwright not installed |
| \`ERR_RENDER_EXPORT_FAILED\` | 20 | Export failed in browser bridge |
| \`ERR_IO_READ_FAILED\` | 50 | Failed to read input file |
| \`ERR_IO_WRITE_FAILED\` | 50 | Failed to write output file |
| \`ERR_INTERNAL_UNEXPECTED\` | 90 | Unexpected internal error |

## Response Envelope

Every command returns a JSON envelope on stdout:

\`\`\`jsonc
{
  "schema_version": "1.0",
  "request_id": "req_20260302_143000_7f3a",
  "ok": true,              // always present
  "command": "scene.inspect",
  "target": { ... },       // what was acted on (null for global commands)
  "result": { ... },       // command payload (null on failure)
  "warnings": [],          // always an array
  "errors": [],            // always an array
  "metrics": { "duration_ms": 42 }
}
\`\`\`

- \`errors\` and \`warnings\` are always arrays (possibly empty), never omitted.
- \`result\` is always present; on failure it is \`null\`.
- Each error carries \`code\`, \`message\`, \`retryable\`, and \`suggested_action\`.

## Concurrency

- **Reads** (inspect, validate): safe to run concurrently.
- **Renders**: each invocation launches its own browser; safe to parallelize.
`;
}
