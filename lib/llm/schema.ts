import { z } from "zod";

/**
 * The exact shape the model is asked for. A response that does not satisfy this
 * is an error, not something to render partially: a half-parsed recommendation
 * is worse than none, because the user cannot tell which half is missing.
 */
export const AiNarrativeSchema = z.object({
  summary: z.string().min(1),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1),
        rationale: z.string().min(1),
        claimNumber: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(12),
  discrepancies: z
    .array(
      z.object({
        field: z.string(),
        parsedValue: z.string(),
        modelValue: z.string(),
        note: z.string(),
      }),
    )
    .max(20),
});

/** Gemini's responseSchema dialect (a subset of OpenAPI schema). */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    recommendations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          rationale: { type: "STRING" },
          claimNumber: { type: "STRING" },
          priority: { type: "STRING", enum: ["high", "medium", "low"] },
        },
        required: ["title", "rationale", "priority"],
      },
    },
    discrepancies: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          field: { type: "STRING" },
          parsedValue: { type: "STRING" },
          modelValue: { type: "STRING" },
          note: { type: "STRING" },
        },
        required: ["field", "parsedValue", "modelValue", "note"],
      },
    },
  },
  required: ["summary", "recommendations", "discrepancies"],
} as const;
