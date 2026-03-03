# excal CLI v1.0.0 — Blind Test Feedback

Tested on Windows 11 (bash via Git Bash), installed globally via npm.

---

## Overall Impression

Well-designed, agent-first CLI. The consistent JSON envelope, structured error codes, and
built-in `guide`/`skill` commands make this immediately useful for programmatic consumption.
Inspect and validate are solid. Render has several flags that don't work.

---

## What Works Well

- **Consistent JSON envelope** on every command — `ok`, `result`, `warnings`, `errors`,
  `metrics` are always present. Easy to parse, no guessing.
- **Structured validation output** — `validate` catches orphaned frame refs, broken bound
  text, and dangling arrow bindings with element IDs and actionable `suggested_action` fields.
- **stdin piping** (`-`) works seamlessly across inspect, validate, and render.
- **`guide` and `skill` commands** — excellent bootstrap for AI agents. The skill command's
  domain primer on Excalidraw internals (bindings, frames, bound text) is genuinely useful.
- **File fingerprint** (SHA-256) in every response — good for caching and change detection.
- **`--dry-run`** for render — validates the full pipeline without writing files. Reports
  byte sizes even in dry-run mode, which is a nice touch.
- **Multi-format export** — `--svg --png` in a single invocation produces both outputs.
- **`--element` and `--frame` filtering** on render works correctly when the target exists.
- **`--no-background`** correctly strips the background rect from SVG output
  (4642 bytes vs 4707 bytes with background).
- **Speed** — inspect/validate complete in <30ms, SVG render in 1–5s.

---

## Bugs

### 1. `--dark-mode` has no effect on SVG output

Dark and light SVGs are byte-identical (4707 bytes both). Verified by diffing the files —
zero differences.

```bash
excal render simple.excalidraw --outDir ./out/dark --svg --dark-mode
excal render simple.excalidraw --outDir ./out/light --svg
diff <(cat out/dark/simple.svg) <(cat out/light/simple.svg)
# no output — files are identical
```

### 2. `--padding` has no effect on SVG output

Padding values 0, 20 (default), and 50 all produce the same `viewBox="0 0 570 170"` and
identical byte count (4707). The viewBox should change with different padding values.

```bash
excal render simple.excalidraw --outDir ./out/pad0  --svg --padding 0
excal render simple.excalidraw --outDir ./out/pad50 --svg --padding 50
# Both produce: viewBox="0 0 570 170", 4707 bytes
```

### 3. Bound text renders with `y="NaN"` in SVG

The rendered SVG contains a text element with `y="NaN"`, which means the text won't
display at the correct vertical position (or at all, depending on the renderer):

```xml
<text x="50" y="NaN" font-family="Segoe UI Emoji" font-size="20px"
      fill="#1e1e1e" text-anchor="middle">Hello World</text>
```

This was from a standard bound text element with `verticalAlign: "middle"` inside a
rectangle container.

### 4. Exit codes missing for validation-class errors

The guide documents `ERR_VALIDATION_INVALID_JSON` and `ERR_VALIDATION_UNKNOWN_FORMAT` as
exit code 10, but these appear to exit with code 0 (or no code at all). Only
`ERR_IO_READ_FAILED` correctly returns exit code 50.

```bash
echo "not json" | excal inspect -; echo "EXIT:$?"
# EXIT: (empty — not 10)

excal inspect nonexistent.excalidraw; echo "EXIT:$?"
# EXIT:50 (correct)
```

### 5. `--include-deleted` doesn't add deleted elements to `counts_by_type`

With `--include-deleted`, `deleted_count` correctly becomes 1, but `counts_by_type` still
only shows the 4 active elements. The deleted rectangle doesn't appear in the type
breakdown. If the flag is meant to "include deleted elements in inspection," they should
show up in the counts (perhaps as a separate section, or as a note in the type counts).

---

## UX Issues

### 6. Nonexistent `--frame` silently returns the full scene

When passing a frame name/ID that doesn't exist to `inspect`, it returns the entire scene
with no error or warning. This is misleading — a typo in the frame name gives you data for
the wrong scope with no indication anything went wrong.

```bash
excal inspect with-frames.excalidraw --frame "Nonexistent Frame"
# Returns ok:true with all 4 elements — should warn or error
```

**Suggestion**: Return a warning or error when the `--frame` filter matches nothing.

### 7. Nonexistent `--element` silently renders empty SVG

When passing a nonexistent element ID to render, it succeeds with `element_count: 0` and
produces a near-empty SVG (483 bytes). No warning, no error.

```bash
excal render simple.excalidraw --outDir ./out --svg --element nonexistent_id
# ok:true, element_count:0, produces empty 483-byte SVG
```

**Suggestion**: At minimum, add a warning. Ideally return an error — an empty render is
almost certainly not what the caller intended.

### 8. Validation failures use `ok: true`

When `validate` finds broken references, the envelope has `ok: true` with issues in the
`warnings` array and `result.valid: false`. For agent consumers, this means you can't just
check `ok` — you have to also check `result.valid`. Consider either:
- Setting `ok: false` when `result.valid` is false, or
- Documenting clearly that `ok` means "command executed successfully" not "scene is valid"

Currently the semantics are defensible (the command ran fine, the scene just has issues),
but it's a footgun for quick-check workflows.

### 9. `--scale` silently ignored for SVG

Passing `--scale 4` with `--svg` produces identical output to default. Since scale only
applies to PNG, the CLI should either warn that the flag is being ignored, or note it in
the help text.

---

## Minor Nits

- **Render output path uses backslashes on Windows** (`out\\simple.svg`). Works fine, but
  forward slashes would be more portable in the JSON output for cross-platform agent
  consumption.
- **Missing `--outDir` auto-creation**: If `--outDir` points to a non-existent directory,
  the CLI should either create it or give a clear error. (Didn't test this specifically, but
  worth verifying.)
- **`bare excal` (no command)** exits 1 with the help text on stdout. Convention is to
  print help to stderr on error. Minor.
- **`inspect` missing arg** outputs a plain text error (`error: missing required argument
  'file'`) rather than the JSON envelope. Breaks the "every response is JSON" contract.

---

## Summary

The core design — JSON envelope, agent-first commands, structured validation — is strong.
The main issues are in the render pipeline: `--dark-mode` and `--padding` are no-ops for
SVG, and bound text renders with `y="NaN"`. Fix those three and the render command becomes
reliable. The silent-failure UX issues (`--frame`/`--element` with bad IDs) are lower
priority but worth addressing for production use.
