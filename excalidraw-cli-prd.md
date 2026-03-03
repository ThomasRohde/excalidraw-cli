# PRD - Excalidraw CLI

Status: Draft v1
Author: OpenAI
Target repo: `excalidraw-cli`
Preferred stack: TypeScript, Node.js 20+, ESM

## 1. Executive summary

Build an agent-first CLI for working with Excalidraw scenes as files and reproducible artefacts.

The product should not be a thin wrapper around the Excalidraw editor UI. It should behave more like `bcm-cli`: deterministic file-in / artefact-out workflows, structured JSON envelopes on stdout, optional browser-backed export for raster/PDF formats, and built-in machine-readable self-description for coding agents.

The real product is not "an Excalidraw exporter." It is a reliable automation surface for diagram inspection, validation, rendering, packaging, and eventually safe mutation.

## 2. Problem statement

Teams increasingly use Excalidraw as a lightweight diagram format, but automation around `.excalidraw` files is weak:

- CI pipelines need deterministic exports to SVG, HTML, PNG, and PDF.
- AI agents need a stable CLI contract, not prose-heavy terminal output.
- Developers need scene validation and inspection without opening the editor.
- Automated scene edits need safe plan/apply workflows instead of ad hoc JSON rewriting.
- Existing Excalidraw APIs are browser-oriented, which makes a robust Node-only export path less straightforward.

## 3. Product goal

Create a CLI that makes Excalidraw diagrams first-class automation artefacts.

A user or agent should be able to:

1. inspect a scene,
2. validate it,
3. render it to one or more output formats,
4. package outputs for downstream systems,
5. optionally plan and apply safe mutations,
6. understand the full CLI contract from a single `guide` command.

## 4. Product principles

The CLI must follow the same operating model as `bcm-cli`:

- primary outputs are files written to `outDir`
- stdout is reserved for a structured JSON envelope
- PNG/PDF export is optional and browser-backed
- the CLI is deterministic and non-interactive
- the interface is discoverable by agents through `guide`
- help text remains good for humans, but the machine contract is the source of truth

It must also follow the CLI manifest principles:

- one stable response envelope for every command
- stable machine-readable error codes
- explicit separation of reads and writes
- `--dry-run` for all mutations
- plan -> validate -> apply -> verify workflow for risky writes
- explicit safety flags for dangerous operations
- documented concurrency behavior and lock handling for file mutations

## 5. Users

### Primary users

- AI coding agents generating or refining diagrams
- developers automating documentation pipelines
- architects exporting diagrams into docs, wikis, or static sites
- CI jobs validating and rendering diagram assets

### Secondary users

- technical writers
- engineers who want a fast local diagram pipeline without opening the editor

## 6. Scope

### In scope for v1

- inspect `.excalidraw` and compatible JSON scene files
- validate scene structure and asset references
- render to SVG and self-contained HTML
- optionally export PNG and PDF
- emit structured JSON envelopes for every command
- support stdin/stdout-friendly workflows
- provide `guide` and `skill` commands
- provide scene filtering such as frame-only export

### In scope for v1.1

- scene patch plans and safe apply workflow
- verify assertions after mutation
- workflow file support for multi-step scene edits

### Out of scope for v1

- full interactive editor in the terminal
- real-time collaboration
- replacing the Excalidraw web app
- free-form AI generation built into the CLI itself
- implementing a fully custom Excalidraw renderer from scratch

## 7. Success criteria

### Product success

- a developer can export a `.excalidraw` file to SVG or HTML with one command
- an agent can bootstrap the whole interface using `excal guide`
- CI can validate a directory of scenes and fail on typed validation errors
- PNG/PDF export is reliable in headless environments when Playwright is installed
- mutations, when added, are reviewable and reversible enough for agent workflows

### Quality bar

- no mixed human chatter and machine data on stdout
- stable exit codes and error codes
- deterministic outputs for identical inputs and options
- clean handling of fonts, images, and embedded scene metadata

## 8. Recommended product strategy

Do not scope this as a general-purpose editor wrapper.

The right v1 is a render-and-automation CLI with a lightweight renderer bridge. That keeps the product shippable, aligns with `bcm-cli`, and respects how Excalidraw's official export utilities are exposed.

## 9. Functional requirements

## 9.1 Commands

### `excal render <file|->`

Full pipeline: load, normalize, validate, filter, render, export.

Examples:

```bash
excal render diagram.excalidraw --outDir ./out
excal render diagram.excalidraw --outDir ./out --svg --html
excal render diagram.excalidraw --outDir ./out --png --pdf
cat diagram.excalidraw | excal render - --stdin-format excalidraw --outDir ./out
```

Required behaviors:

- auto-detect `.excalidraw` and `.json`
- support stdin via `-`
- produce SVG by default
- optionally produce HTML, PNG, PDF, normalized JSON
- support `--dry-run` for no-write pipeline execution
- return artefact metadata in the result envelope

### `excal validate <file|->`

Validate without rendering.

Required behaviors:

- schema and shape validation
- asset/file presence checks when requested
- frame and bound-text consistency checks
- typed validation codes

### `excal inspect <file|->`

Inspect scene metadata without mutating.

Required behaviors:

- scene version / source summary
- element counts by type
- deleted vs non-deleted counts
- frame counts
- text/image statistics
- calculated bounds and canvas dimensions
- binary file references and sizes when available

### `excal plan <spec-file>`

Generate a scene mutation plan from a declarative patch spec.

This is v1.1 unless implementation remains lightweight.

### `excal apply <plan-file>`

Apply a previously generated plan to one or more scene files.

Must support:

- `--dry-run`
- fingerprint conflict detection
- `--outFile` for copy-on-write mode
- lock handling for in-place edits

### `excal verify <assertions-file|->`

Verify post-conditions after render or apply.

### `excal guide`

Return machine-readable CLI schema as JSON.

### `excal skill`

Return markdown guidance for agents on how to create and edit Excalidraw scenes safely, including common element patterns, frames, labels, arrows, and export advice.

## 9.2 Input support

The CLI must accept:

- standard `.excalidraw` scene files
- JSON files containing full scene objects
- JSON files containing element arrays plus optional app state and files
- stdin JSON payloads

Optional v1 support:

- directory mode for batch render / validate
- glob support

## 9.3 Filtering and targeting

The CLI should support exporting the whole scene or a filtered target:

- `--frame <id|name>` export one or more frames
- `--element <id>` export explicit element subsets
- `--include-deleted` for inspection-only workflows
- `--only-nondeleted` default for rendering
- `--bounds scene|selection|frame`

Frame export matters because Excalidraw scenes often contain multiple diagrams in one file.

## 9.4 Output formats

### SVG

Primary vector artefact.

Requirements:

- preserve Excalidraw look and feel
- configurable background inclusion
- configurable dark mode export
- optional embedded scene metadata
- stable viewBox and dimensions

### HTML

Self-contained viewer artefact, similar in spirit to `bcm-cli` HTML output.

Requirements:

- inline or bundled SVG render
- zoom and pan
- fit-to-view
- frame selector when multiple frames are exported
- element inspector panel with id, type, text, and metadata
- optional raw scene metadata panel
- no editing surface in v1
- single-file output preferred

### PNG

Optional raster export.

Requirements:

- configurable scale / pixel ratio
- headless-friendly
- consistent dimensions with SVG export

### PDF

Optional document export.

Requirements:

- configurable page size and margins
- one scene per page for batch mode
- preserve background when requested

### Normalized JSON

Optional write-back artefact for automation.

Requirements:

- normalized ordering
- repaired defaults where safe
- optional removal of deleted elements
- fingerprint included in result envelope

## 9.5 Structured response envelope

Every command must return one JSON envelope.

```json
{
  "schema_version": "1.0",
  "request_id": "req_20260302_101530_ab12",
  "ok": true,
  "command": "excal.render",
  "target": {
    "input": "diagram.excalidraw"
  },
  "result": {
    "scene_summary": {
      "elements": 42,
      "non_deleted": 39,
      "frames": 3,
      "images": 2,
      "bounds": { "x": 0, "y": 0, "width": 1820, "height": 940 },
      "fingerprint": "sha256:..."
    },
    "artefacts": [
      { "type": "svg", "path": "out/diagram.svg", "bytes": 58213 },
      { "type": "html", "path": "out/diagram.html", "bytes": 145902 }
    ]
  },
  "warnings": [],
  "errors": [],
  "metrics": {
    "duration_ms": 143,
    "stages": {
      "load_ms": 9,
      "normalize_ms": 17,
      "render_ms": 44,
      "export_ms": 73
    }
  }
}
```

Rules:

- `schema_version`, `request_id`, `ok`, `command`, `result`, `warnings`, `errors`, and `metrics` are always present
- `errors` and `warnings` are always arrays
- `result` is `null` on failure, never omitted
- command ids use canonical dotted names

## 9.6 Error model

Errors must be typed and stable.

Examples:

- `ERR_VALIDATION_INVALID_JSON`
- `ERR_VALIDATION_UNSUPPORTED_SCHEMA`
- `ERR_VALIDATION_MISSING_BINARY_FILE`
- `ERR_VALIDATION_BAD_FRAME_REFERENCE`
- `ERR_RENDER_BROWSER_UNAVAILABLE`
- `ERR_RENDER_EXPORT_FAILED`
- `ERR_IO_FILE_NOT_FOUND`
- `ERR_IO_WRITE_FAILED`
- `ERR_CONFLICT_FINGERPRINT`
- `ERR_LOCK_HELD`
- `ERR_INTERNAL_UNEXPECTED`

Each error object should include:

```json
{
  "code": "ERR_RENDER_BROWSER_UNAVAILABLE",
  "message": "PNG export requires Playwright with Chromium installed",
  "retryable": false,
  "suggested_action": "install_dependency",
  "details": {
    "missing": "playwright"
  }
}
```

## 9.7 Exit codes

Recommended ranges:

- `0` success
- `10` validation errors
- `20` render / export errors
- `30` plan / apply conflicts
- `40` lock / concurrency errors
- `50` I/O errors
- `90` internal errors

## 9.8 Agent mode

When `LLM=true`, `CI=true`, or stdout is not a TTY:

- emit only the JSON envelope on stdout
- suppress decorative logs
- send diagnostics to stderr only when needed and correlation-safe
- avoid interactive prompts entirely

## 9.9 Help and discoverability

Human help must remain good, but agents should rely on `guide`.

`excal guide` should expose:

- command catalog
- flags and defaults
- input and output schemas
- error code taxonomy
- compatibility policy
- examples
- concurrency rules

## 10. Rendering architecture

## 10.1 Core decision

Use the same overall artefact pipeline pattern as `bcm-cli`, but not the same internal renderer implementation.

For Excalidraw, the recommended approach is:

1. Node.js CLI orchestrates the workflow.
2. A lightweight browser render bridge loads the official Excalidraw utility functions.
3. The bridge restores / normalizes scene data and exports canonical SVG.
4. The CLI writes SVG and HTML directly.
5. PNG/PDF are generated from the SVG or HTML via headless Playwright.

This preserves the `bcm-cli` user experience while avoiding a fragile reimplementation of Excalidraw's drawing engine.

## 10.2 Why this architecture

A pure custom renderer would be high-risk and would drift from Excalidraw's visual semantics.

A full embedded editor would be heavy, slower, and wrong for a CLI.

A lightweight export bridge hits the right middle ground:

- official visual semantics
- no editor UI dependency in the output path
- deterministic file artefacts
- optional browser dependency for richer exports

## 10.3 Renderer bridge design

Implement a minimal internal renderer page or module that:

- imports `@excalidraw/excalidraw`
- calls restore utilities to normalize scene state
- calls `exportToSvg` for canonical vector output
- optionally returns normalized scene metadata to the CLI
- does not mount the full Excalidraw canvas unless needed for compatibility

Two implementation options:

### Option A - recommended

Bundle a tiny internal renderer page and drive it with Playwright or a headless browser runtime only for export stages that require browser semantics.

Pros:

- closest to official utilities
- easiest way to handle fonts and browser-only assumptions
- simplest path to faithful output

Cons:

- browser dependency for SVG/HTML pipeline unless a lighter runtime is proven

### Option B - stretch goal

Investigate whether the export path can run in a minimal DOM shim for SVG-only export.

Pros:

- faster startup
- fewer runtime dependencies

Cons:

- likely brittle
- higher maintenance burden
- greater risk of divergence from upstream behavior

Recommendation: ship Option A first.

## 10.4 HTML viewer architecture

Follow the `bcm-cli` pattern: produce a review-friendly single-file HTML viewer, not a mini web app.

Viewer sections:

- header: title, scene metadata, fit-to-view
- main canvas: rendered SVG
- side panel: element/frame inspector
- optional tabs: scene summary, assets, raw metadata

The HTML viewer should work offline when possible.

## 10.5 Raster and PDF export

Mirror `bcm-cli`:

- SVG and HTML are the primary artefacts
- PNG/PDF are optional exports backed by Playwright
- Playwright is an optional peer dependency and clearly documented

## 11. Scene mutation model (v1.1)

Mutation must not begin as free-form JSON rewriting.

Instead, define a narrow patch DSL.

Example operations:

- `element.add`
- `element.update`
- `element.delete`
- `text.set`
- `frame.create`
- `frame.add-members`
- `element.reposition`
- `style.apply`
- `asset.relink`

## 11.1 Plan file

```json
{
  "schema_version": "1.0",
  "target": {
    "file": "diagram.excalidraw",
    "fingerprint": "sha256:abc123"
  },
  "operations": [
    {
      "op": "text.set",
      "element_id": "txt_01",
      "text": "Payments Platform"
    },
    {
      "op": "element.reposition",
      "element_id": "box_12",
      "x": 640,
      "y": 180
    }
  ],
  "assertions": [
    {
      "type": "element.exists",
      "element_id": "box_12"
    }
  ]
}
```

## 11.2 Apply workflow

`excal apply plan.json --dry-run`

Returns:

- summary of operations
- before / after preview metadata
- conflict warnings
- no file writes

`excal apply plan.json`

Returns:

- before / after fingerprint
- written files
- assertion results if auto-verify enabled

## 11.3 Verification

Support declarative assertions such as:

- `element.exists`
- `element.type`
- `frame.exists`
- `text.contains`
- `scene.bounds.lte`
- `asset.references.valid`

## 12. Recommended technical stack

### Language and packaging

- TypeScript
- Node.js 20+
- ESM package layout
- `tsup` for build
- `vitest` for tests

### CLI framework

- `commander`

### Validation

- `zod` for command contracts and guide schema generation

### Rendering

- `@excalidraw/excalidraw`
- internal renderer bridge module
- `playwright` as optional peer dependency

### Utility libraries

- `sanitize-html` if any user-authored markdown or notes are rendered into HTML panels
- lightweight hashing and filesystem utilities
- file locking library for mutation phase

## 13. Repository structure

```text
excalidraw-cli/
  src/
    cli/
      index.ts
      commands/
        render.ts
        validate.ts
        inspect.ts
        plan.ts
        apply.ts
        verify.ts
        guide.ts
        skill.ts
    core/
      envelope.ts
      errors.ts
      exit-codes.ts
      io.ts
      fingerprint.ts
      locks.ts
    scene/
      load-scene.ts
      normalize-scene.ts
      inspect-scene.ts
      validate-scene.ts
      filters.ts
      patch-dsl.ts
    render/
      render-bridge.ts
      export-svg.ts
      export-html.ts
      export-png.ts
      export-pdf.ts
      html-viewer-template.ts
    guide/
      guide-schema.ts
      skill-content.ts
  assets/
    renderer/
      index.html
      renderer-entry.ts
    fonts/
  test/
    fixtures/
    unit/
    integration/
    golden/
```

## 14. Non-functional requirements

### Determinism

- same input + same flags = same output bytes where upstream rendering allows
- stable element ordering in normalized JSON
- stable hash / fingerprint generation

### Performance

Targets for single-file scenes under 500 elements:

- inspect under 150 ms median
- validate under 250 ms median
- SVG export under 1.5 s median on a normal laptop
- PNG export under 3 s median when browser dependency is installed

### Reliability

- batch mode should continue collecting failures when `--continue-on-error` is set
- lock handling must prevent parallel in-place writes to the same file

### Security

- never execute script content from imported scene metadata
- sanitize any HTML shown in viewer panels
- restrict file writes to explicit target paths

## 15. Testing strategy

### Unit tests

- envelope invariants
- error typing
- scene normalization
- frame filtering
- patch planning

### Integration tests

- `.excalidraw` -> SVG
- `.excalidraw` -> HTML
- `.excalidraw` -> PNG with Playwright
- multi-frame export
- image asset references
- stdin workflows

### Golden tests

Store expected SVG and JSON outputs for representative fixtures:

- simple boxes and arrows
- bound text
- frames
- free draw
- embedded images
- dark mode export
- deleted elements

### Regression tests

- fonts present / absent
- missing binary file map entry
- invalid frame membership
- upstream package version changes

## 16. Milestones

### Milestone 1 - foundations

- repo scaffold
- envelope, errors, exit codes
- `guide` and `skill`
- `inspect` and `validate`

### Milestone 2 - render MVP

- load scene
- normalize scene
- SVG export
- HTML viewer
- structured artefact output

### Milestone 3 - browser-backed exports

- Playwright integration
- PNG export
- PDF export
- CI docs for headless install

### Milestone 4 - mutation workflow

- patch DSL
- `plan`
- `apply --dry-run`
- fingerprint validation
- locks
- `verify`

## 17. Risks and mitigations

### Risk: upstream Excalidraw export behavior changes

Mitigation:

- lock package versions tightly
- maintain golden tests
- keep renderer bridge isolated

### Risk: font loading breaks in offline or CI environments

Mitigation:

- bundle or copy required fonts into package assets
- make asset path explicit in renderer bridge
- fail with typed diagnostics

### Risk: browser dependency feels too heavy

Mitigation:

- keep Playwright optional for PNG/PDF
- document a slim render bridge path for SVG/HTML
- treat zero-browser SVG export as optimization, not v1 requirement

### Risk: users expect editing, not automation

Mitigation:

- keep product messaging explicit: this is a CLI for artefacts and safe scene operations
- ship `plan/apply` only after render path is solid

## 18. Open questions

1. Should SVG export require browser runtime in v1, or do we invest time proving a non-browser path first?
2. Should HTML output remain single-file only, or also support asset-split mode for large scenes?
3. Should `skill` include agent guidance for generating standard Excalidraw JSON directly?
4. Should mutation v1.1 write back `.excalidraw` only, or also emit patch artefacts without apply?
5. Should frame selection support matching by visible text label in addition to frame id?

## 19. Recommendation

Build this in two passes.

### Pass 1

Ship an agent-first render CLI:

- `inspect`
- `validate`
- `render`
- `guide`
- `skill`
- SVG and HTML first
- PNG and PDF as optional Playwright-backed exports

### Pass 2

Add safe mutation workflows:

- `plan`
- `apply --dry-run`
- `apply`
- `verify`
- locks and fingerprint checks

This gives you something useful early while preserving the bigger automation story.

## 20. Developer notes

If your real goal is "make Excalidraw automation usable by agents," then a pure export-only CLI is too small.

The right framing is:

- scene inspection
- deterministic artefact generation
- machine-readable CLI contract
- safe mutation workflow later

That is the level at which this becomes strategically useful alongside `bcm-cli`, `xl`, and similar agent-facing tools.

## Appendix A - Design grounding

This PRD was shaped by the following references:

- Excalidraw export utilities (`exportToCanvas`, `exportToBlob`, `exportToSvg`)
- Excalidraw restore utilities (`restore`, `restoreElements`, `restoreAppState`)
- Excalidraw 0.18.0 release notes covering ESM packaging and self-hosted fonts
- Excalidraw MCP architecture notes describing a pure SVG rendering path using `exportToSvg`
- `bcm-cli` package and README, especially its artefact pipeline, structured output, optional Playwright exports, and agent-first command surface
- CLI-MANIFEST.md, especially the structured envelope, typed error model, `guide`, dry-run, fingerprinting, and lock guidance
