import { z } from "zod";
import { WorksheetSchema, type Worksheet } from "../types";

/**
 * The shape the vision fallback is asked to return for a scanned worksheet.
 *
 * This deliberately mirrors the model the geometric parser produces, so an
 * OCR'd worksheet flows into exactly the same reconciliation gate. An OCR
 * misread will not satisfy `payroll / 100 x ELR = expected losses`, so a bad
 * transcription is caught by arithmetic rather than trusted because a model
 * produced it.
 */
export const ExtractedWorksheetSchema = WorksheetSchema.omit({
  sourceLines: true,
  pageCount: true,
  eraReduction: true,
  claims: true,
}).extend({
  claims: z.array(
    z.object({
      claimNumber: z.string(),
      injuryType: z.string().nullable(),
      status: z.enum(["O", "F"]).nullable(),
      actualIncurred: z.number(),
      actualPrimary: z.number(),
      flags: z.array(z.string()).default([]),
      /** 1-based index of the policy block this claim was printed in. */
      policyIndex: z.number(),
    }),
  ),
});

export type ExtractedWorksheet = z.infer<typeof ExtractedWorksheetSchema>;

const NUM = { type: "NUMBER", nullable: true } as const;
const STR = { type: "STRING", nullable: true } as const;

const SUMMARY_ROW = {
  type: "OBJECT",
  properties: {
    state: { type: "STRING" },
    weight: { type: "NUMBER" },
    expectedExcess: { type: "NUMBER" },
    expectedLosses: { type: "NUMBER" },
    expectedPrimary: { type: "NUMBER" },
    actualExcess: { type: "NUMBER" },
    ballast: { type: "NUMBER" },
    actualIncurred: { type: "NUMBER" },
    actualPrimary: { type: "NUMBER" },
  },
  required: [
    "state",
    "weight",
    "expectedExcess",
    "expectedLosses",
    "expectedPrimary",
    "actualExcess",
    "ballast",
    "actualIncurred",
    "actualPrimary",
  ],
} as const;

export const GEMINI_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    riskName: STR,
    riskId: STR,
    ratingEffectiveDate: STR,
    productionDate: STR,
    state: STR,
    stateRows: { type: "ARRAY", items: SUMMARY_ROW },
    totals: { ...SUMMARY_ROW, nullable: true },
    factors: {
      type: "OBJECT",
      properties: {
        arap: NUM,
        flarap: NUM,
        sarap: NUM,
        maarap: NUM,
        stabilizingValue: NUM,
        ratableExcessActual: NUM,
        ratableExcessExpected: NUM,
        numerator: NUM,
        denominator: NUM,
        publishedMod: NUM,
      },
      required: ["publishedMod"],
    },
    policies: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          state: { type: "STRING" },
          firmId: STR,
          firmName: STR,
          carrier: STR,
          policyNumber: STR,
          effectiveDate: STR,
          expirationDate: STR,
          subjectPremium: NUM,
          totalPayroll: NUM,
          totalExpectedLosses: NUM,
          totalActualIncurred: NUM,
          page: { type: "INTEGER" },
          classRows: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                code: { type: "STRING" },
                description: STR,
                elr: NUM,
                dRatio: NUM,
                payroll: NUM,
                expectedLosses: { type: "NUMBER" },
                expectedPrimary: { type: "NUMBER" },
              },
              required: ["code", "expectedLosses", "expectedPrimary"],
            },
          },
        },
        required: ["state", "classRows", "page"],
      },
    },
    claims: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          claimNumber: { type: "STRING" },
          injuryType: STR,
          status: { type: "STRING", nullable: true, enum: ["O", "F"] },
          actualIncurred: { type: "NUMBER" },
          actualPrimary: { type: "NUMBER" },
          flags: { type: "ARRAY", items: { type: "STRING" } },
          policyIndex: { type: "INTEGER" },
        },
        required: [
          "claimNumber",
          "actualIncurred",
          "actualPrimary",
          "policyIndex",
        ],
      },
    },
    notes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["stateRows", "totals", "factors", "policies", "claims", "notes"],
} as const;

/** Complete an OCR extraction into the same model the geometric parser emits. */
export function toWorksheet(
  extracted: ExtractedWorksheet,
  pageCount: number,
): Worksheet {
  return {
    ...extracted,
    claims: extracted.claims.map((c) => ({
      ...c,
      injuryType: normalizeInjuryType(c.injuryType),
      // Clamp to a real index so downstream lookups cannot land out of range.
      policyIndex: Math.min(
        Math.max(c.policyIndex, 0),
        Math.max(extracted.policies.length - 1, 0),
      ),
    })),
    sourceLines: [],
    pageCount,
    eraReduction: parseEraReduction(extracted.notes),
  };
}

function normalizeInjuryType(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return /^\d{1,2}$/.test(digits) ? digits.padStart(2, "0") : null;
}

function parseEraReduction(notes: string[]): number | null {
  const m = notes
    .join(" ")
    .match(/DECREASE OF\s+(\d+(?:\.\d+)?)\s*%\s*MEDICAL ONLY/i);
  if (!m) return null;
  const pct = Number(m[1]);
  return Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct / 100 : null;
}
