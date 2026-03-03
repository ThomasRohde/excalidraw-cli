export function getSkillContent(): string {
  return `# Excalidraw Scene Structure — Agent Guide

## File Format

Excalidraw scenes are JSON files (typically \`.excalidraw\`) with this structure:

\`\`\`json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [ ... ],
  "appState": { ... },
  "files": { ... }
}
\`\`\`

## Element Types

| Type | Description |
|------|-------------|
| rectangle | Box shape |
| diamond | Diamond/rhombus shape |
| ellipse | Circle/ellipse shape |
| arrow | Arrow connector |
| line | Line/polyline |
| freedraw | Freehand drawing |
| text | Text label |
| image | Embedded image |
| frame | Grouping frame |

## Key Element Properties

Every element has: \`id\`, \`type\`, \`x\`, \`y\`, \`width\`, \`height\`, \`isDeleted\`, \`opacity\`, \`groupIds\`, \`frameId\`.

## Frames

Frames group elements visually. Elements inside a frame have \`frameId\` set to the frame's \`id\`. Frames themselves have \`type: "frame"\` and an optional \`name\`.

To export a single frame: use \`--frame <id|name>\`.

## Bound Text

Text can be bound to a container (rectangle, diamond, ellipse). The text element has \`containerId\` pointing to the container, and the container has a \`boundElements\` entry with \`{ id, type: "text" }\`.

## Arrows & Bindings

Arrows connect elements via \`startBinding\` and \`endBinding\`:
\`\`\`json
{
  "startBinding": { "elementId": "target-id", "focus": 0, "gap": 1 },
  "endBinding": { "elementId": "target-id", "focus": 0, "gap": 1 }
}
\`\`\`

## Images & Binary Files

Image elements have \`fileId\` referencing an entry in \`files\`. The files object maps IDs to \`{ mimeType, dataURL }\` where dataURL is base64-encoded.

## Export Tips

- SVG export inlines fonts; no external dependencies
- PNG/PDF require Playwright for headless browser rendering
- Use \`--scale 2\` (default) for crisp PNG exports
- Use \`--dark-mode\` for dark theme exports
- Use \`--no-background\` for transparent backgrounds
- \`--dry-run\` validates the full pipeline without writing files

## Common Patterns

1. **Inspect before modifying**: Always run \`excal inspect\` to understand scene structure
2. **Validate after changes**: Run \`excal validate --check-assets\` to catch broken references
3. **Frame-based export**: Use frames to organize sections, export individually with \`--frame\`
4. **Deterministic output**: Same input + same options = same output (for CI/CD)
`;
}
