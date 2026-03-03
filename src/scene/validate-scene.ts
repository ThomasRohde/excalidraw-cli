import type { StructuredError } from "../core/errors.js";
import type { ExcalidrawScene } from "./schema.js";

export interface ValidationResult {
  valid: boolean;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

export function validateScene(
  scene: ExcalidrawScene,
  opts: { checkAssets?: boolean } = {},
): { result: ValidationResult; warnings: StructuredError[] } {
  const checks: ValidationCheck[] = [];
  const warnings: StructuredError[] = [];

  const elementMap = new Map(scene.elements.map((e) => [e.id, e]));
  const liveElements = scene.elements.filter((e) => !e.isDeleted);

  // Frame reference consistency
  {
    const orphans: string[] = [];
    for (const el of liveElements) {
      if (el.frameId && !elementMap.has(el.frameId)) {
        orphans.push(el.id);
      }
    }
    checks.push({
      name: "frame_references",
      passed: orphans.length === 0,
      message:
        orphans.length > 0
          ? `${orphans.length} element(s) reference non-existent frames`
          : undefined,
    });
    if (orphans.length > 0) {
      warnings.push({
        code: "ERR_VALIDATION_FRAME_ORPHAN",
        message: `Elements reference non-existent frames: ${orphans.join(", ")}`,
        retryable: false,
        suggested_action: "fix_input",
        details: { element_ids: orphans },
      });
    }
  }

  // Bound text consistency
  {
    const broken: string[] = [];
    for (const el of liveElements) {
      if (el.type === "text" && el.containerId) {
        const container = elementMap.get(el.containerId);
        if (!container) {
          broken.push(el.id);
        } else if (container.boundElements) {
          const hasRef = container.boundElements.some(
            (b) => b.id === el.id && b.type === "text",
          );
          if (!hasRef) broken.push(el.id);
        }
      }
    }
    checks.push({
      name: "bound_text",
      passed: broken.length === 0,
      message:
        broken.length > 0
          ? `${broken.length} bound text element(s) have broken references`
          : undefined,
    });
    if (broken.length > 0) {
      warnings.push({
        code: "ERR_VALIDATION_BOUND_TEXT",
        message: `Bound text elements with broken references: ${broken.join(", ")}`,
        retryable: false,
        suggested_action: "fix_input",
        details: { element_ids: broken },
      });
    }
  }

  // Arrow binding consistency
  {
    const broken: string[] = [];
    for (const el of liveElements) {
      if (el.type === "arrow") {
        if (el.startBinding && !elementMap.has(el.startBinding.elementId)) {
          broken.push(`${el.id}:start`);
        }
        if (el.endBinding && !elementMap.has(el.endBinding.elementId)) {
          broken.push(`${el.id}:end`);
        }
      }
    }
    checks.push({
      name: "arrow_bindings",
      passed: broken.length === 0,
      message:
        broken.length > 0
          ? `${broken.length} arrow binding(s) reference non-existent elements`
          : undefined,
    });
    if (broken.length > 0) {
      warnings.push({
        code: "ERR_VALIDATION_ARROW_BINDING",
        message: `Broken arrow bindings: ${broken.join(", ")}`,
        retryable: false,
        suggested_action: "fix_input",
        details: { bindings: broken },
      });
    }
  }

  // Image file references
  if (opts.checkAssets) {
    const missing: string[] = [];
    for (const el of liveElements) {
      if (el.type === "image" && el.fileId) {
        if (!scene.files || !(el.fileId in scene.files)) {
          missing.push(el.id);
        }
      }
    }
    checks.push({
      name: "image_assets",
      passed: missing.length === 0,
      message:
        missing.length > 0
          ? `${missing.length} image(s) reference missing binary files`
          : undefined,
    });
    if (missing.length > 0) {
      warnings.push({
        code: "ERR_VALIDATION_MISSING_ASSET",
        message: `Images with missing file data: ${missing.join(", ")}`,
        retryable: false,
        suggested_action: "fix_input",
        details: { element_ids: missing },
      });
    }
  }

  // Unknown element types (warning only)
  {
    const knownTypes = new Set([
      "rectangle",
      "diamond",
      "ellipse",
      "arrow",
      "line",
      "freedraw",
      "text",
      "image",
      "frame",
      "group",
      "embeddable",
      "iframe",
      "magicframe",
    ]);
    const unknownTypes = new Set<string>();
    for (const el of liveElements) {
      if (!knownTypes.has(el.type)) unknownTypes.add(el.type);
    }
    if (unknownTypes.size > 0) {
      warnings.push({
        code: "ERR_VALIDATION_UNKNOWN_TYPE",
        message: `Unknown element types: ${[...unknownTypes].join(", ")}`,
        retryable: false,
        suggested_action: "fix_input",
        details: { types: [...unknownTypes] },
      });
    }
  }

  const valid = checks.every((c) => c.passed);
  return { result: { valid, checks }, warnings };
}
