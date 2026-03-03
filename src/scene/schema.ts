import { z } from "zod";

export const ExcalidrawElementSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    isDeleted: z.boolean().optional().default(false),
    opacity: z.number().optional().default(100),
    groupIds: z.array(z.string()).optional().default([]),
    frameId: z.string().nullable().optional().default(null),
    boundElements: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
        }),
      )
      .nullable()
      .optional()
      .default(null),
    // Text-specific
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.number().optional(),
    containerId: z.string().nullable().optional().default(null),
    // Arrow-specific
    startBinding: z
      .object({
        elementId: z.string(),
        focus: z.number(),
        gap: z.number(),
      })
      .nullable()
      .optional()
      .default(null),
    endBinding: z
      .object({
        elementId: z.string(),
        focus: z.number(),
        gap: z.number(),
      })
      .nullable()
      .optional()
      .default(null),
    // Image-specific
    fileId: z.string().nullable().optional().default(null),
    // Frame-specific
    name: z.string().nullable().optional().default(null),
  })
  .passthrough();

export type ExcalidrawElement = z.infer<typeof ExcalidrawElementSchema>;

export const ExcalidrawSceneSchema = z.object({
  type: z.string().optional().default("excalidraw"),
  version: z.number().optional().default(2),
  source: z.string().optional(),
  elements: z.array(ExcalidrawElementSchema),
  appState: z.record(z.unknown()).optional().default({}),
  files: z.record(z.unknown()).optional().default({}),
});

export type ExcalidrawScene = z.infer<typeof ExcalidrawSceneSchema>;
