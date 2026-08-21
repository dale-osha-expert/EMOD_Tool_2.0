import { z } from "zod";

/* ------------------------------------------------------------------ *
 * NCCI code tables
 * ------------------------------------------------------------------ */

/** NCCI injury type codes, as printed in the "IJ" column of the worksheet. */
export const INJURY_TYPES: Record<string, string> = {
  "01": "Death",
  "02": "Permanent Total",
  "03": "Major Permanent Partial",
  "04": "Minor Permanent Partial",
  "05": "Temporary Total / Partial",
  "06": "Medical Only",
  "07": "Contract Medical / Hospital",
  "08": "Compromised Death",
  "09": "Unclassifiable",
};

/** Injury type that qualifies for the Experience Rating Adjustment (ERA) discount. */
export const MEDICAL_ONLY_INJURY_TYPE = "06";

/** Footnote flags printed alongside loss values; legend appears at the page foot. */
export const LOSS_FLAGS: Record<string, string> = {
  C: "Catastrophic Loss",
  D: "Disease Loss",
  E: "Employers Liability Loss",
  X: "Ex-Medical Coverage",
  U: "USL&HW",
  "#": "Limited Loss",
  "*": "Total by Policy Year of all cases $2,000 or less",
};

/** Class codes that carry no payroll/loss content and should not be flagged as anomalies. */
export const NON_RATABLE_CLASS_CODES = new Set([
  "0930", // Waiver of subrogation
  "0931", // Short rate penalty premium
  "9812", // Employers liability
  "9848", // Minimum premium adjustment
  "9740", // Terrorism
  "9741", // Catastrophe (other than certified acts of terrorism)
]);

/* ------------------------------------------------------------------ *
 * Parsed worksheet model
 * ------------------------------------------------------------------ */

export const ClaimSchema = z.object({
  claimNumber: z.string(),
  /** Raw two-digit NCCI injury type code from the IJ column, if printed. */
  injuryType: z.string().nullable(),
  /** "O" = open (reserves still movable), "F" = final/closed. */
  status: z.enum(["O", "F"]).nullable(),
  actualIncurred: z.number(),
  actualPrimary: z.number(),
  /** Footnote letters glued to the loss values (C, D, E, X, U, #). */
  flags: z.array(z.string()),
  /** Index into Worksheet.policies of the policy block this claim sits in. */
  policyIndex: z.number(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const ClassRowSchema = z.object({
  code: z.string(),
  description: z.string().nullable(),
  /** Expected Loss Rate, per $100 of payroll. Null on non-ratable rows. */
  elr: z.number().nullable(),
  /** Discount ratio: the share of expected losses that is primary. */
  dRatio: z.number().nullable(),
  payroll: z.number().nullable(),
  expectedLosses: z.number(),
  expectedPrimary: z.number(),
});
export type ClassRow = z.infer<typeof ClassRowSchema>;

export const PolicyBlockSchema = z.object({
  state: z.string(),
  firmId: z.string().nullable(),
  firmName: z.string().nullable(),
  carrier: z.string().nullable(),
  policyNumber: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  classRows: z.array(ClassRowSchema),
  subjectPremium: z.number().nullable(),
  totalPayroll: z.number().nullable(),
  totalExpectedLosses: z.number().nullable(),
  totalActualIncurred: z.number().nullable(),
  page: z.number(),
});
export type PolicyBlock = z.infer<typeof PolicyBlockSchema>;

/**
 * One row of the page-1 summary grid. State rows show pre-ERA figures; the
 * lettered totals row (A)-(I) shows the ERA-adjusted values actually rated.
 */
export const SummaryRowSchema = z.object({
  /** State postal code, or "TOTAL" for the lettered (A)-(I) row. */
  state: z.string(),
  /** (A) Weighting factor. */
  weight: z.number(),
  /** (C) Expected excess losses = D - E. */
  expectedExcess: z.number(),
  /** (D) Expected losses. */
  expectedLosses: z.number(),
  /** (E) Expected primary losses. */
  expectedPrimary: z.number(),
  /** (F) Actual excess losses = H - I. */
  actualExcess: z.number(),
  /** (G) Ballast. */
  ballast: z.number(),
  /** (H) Actual incurred losses. */
  actualIncurred: z.number(),
  /** (I) Actual primary losses. */
  actualPrimary: z.number(),
  /**
   * The state's approved primary/excess split point. Printed as its own column
   * from the 2025 form onwards; null on earlier layouts, where it can still be
   * inferred from any claim whose primary has been capped.
   */
  splitPoint: z.number().nullable().default(null),
});
export type SummaryRow = z.infer<typeof SummaryRowSchema>;

export const RatingFactorsSchema = z.object({
  arap: z.number().nullable(),
  flarap: z.number().nullable(),
  sarap: z.number().nullable(),
  maarap: z.number().nullable(),
  /** C * (1 - A) + G, as printed. */
  stabilizingValue: z.number().nullable(),
  /** (A) * (F), as printed. */
  ratableExcessActual: z.number().nullable(),
  /** (A) * (C), as printed. */
  ratableExcessExpected: z.number().nullable(),
  /** (J) numerator, as printed. */
  numerator: z.number().nullable(),
  /** (K) denominator, as printed. */
  denominator: z.number().nullable(),
  /** The experience modification factor printed on the worksheet. */
  publishedMod: z.number().nullable(),
});
export type RatingFactors = z.infer<typeof RatingFactorsSchema>;

export const WorksheetSchema = z.object({
  riskName: z.string().nullable(),
  riskId: z.string().nullable(),
  ratingEffectiveDate: z.string().nullable(),
  productionDate: z.string().nullable(),
  state: z.string().nullable(),
  stateRows: z.array(SummaryRowSchema),
  totals: SummaryRowSchema.nullable(),
  factors: RatingFactorsSchema,
  policies: z.array(PolicyBlockSchema),
  claims: z.array(ClaimSchema),
  /** Free-text notes printed under the summary (REVISED RATING, ERA statement, ...). */
  notes: z.array(z.string()),
  /**
   * Verbatim text of the rows the key figures were read from. Retained so the
   * AI cross-check can compare what we parsed against what the page says,
   * without needing the PDF itself.
   */
  sourceLines: z.array(z.string()),
  /**
   * ERA reduction fraction parsed out of the notes text (e.g. 0.70 for
   * "A DECREASE OF 70% MEDICAL ONLY ..."). Null when the worksheet says nothing,
   * which means we must not assume ERA applies.
   */
  eraReduction: z.number().nullable(),
  pageCount: z.number(),
});
export type Worksheet = z.infer<typeof WorksheetSchema>;

/* ------------------------------------------------------------------ *
 * Reconciliation
 * ------------------------------------------------------------------ */

export type Severity = "error" | "warning" | "info";

export interface ReconcileCheck {
  id: string;
  /** Human label for the relationship being tested, e.g. "(C) = (D) - (E)". */
  label: string;
  /** Where the check applies, e.g. "Summary totals" or "Policy 3, class 5059". */
  scope: string;
  /** Value printed on the worksheet. */
  printed: number;
  /** Value we derive from the other printed values. */
  derived: number;
  delta: number;
  tolerance: number;
  passed: boolean;
  severity: Severity;
}

export interface ReconcileResult {
  checks: ReconcileCheck[];
  passed: boolean;
  failedCount: number;
  /** True when the parse produced too little to even attempt reconciliation. */
  insufficientData: boolean;
}

/* ------------------------------------------------------------------ *
 * Analysis outputs
 * ------------------------------------------------------------------ */

export interface ModComputation {
  weight: number;
  actualPrimary: number;
  actualExcess: number;
  expectedPrimary: number;
  expectedExcess: number;
  ballast: number;
  stabilizingValue: number;
  ratableExcessActual: number;
  ratableExcessExpected: number;
  numerator: number;
  denominator: number;
  /** Unrounded quotient. */
  raw: number;
  /** Rounded to two decimals the way NCCI publishes it. */
  mod: number;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  mod: number;
  /** Change from the current computed mod. Negative means a lower mod. */
  modDelta: number;
  /** Estimated annual premium change, or null when no subject premium is available. */
  premiumDelta: number | null;
  claimNumber?: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  /** Plain-language explanation, phrased as an observation to verify. */
  detail: string;
  /** The specific printed values the finding rests on. */
  evidence: string[];
  /** Estimated annual dollar impact, when it can be derived. */
  dollarImpact: number | null;
  claimNumber?: string;
}

export interface AiNarrative {
  summary: string;
  recommendations: {
    title: string;
    rationale: string;
    claimNumber?: string;
    priority: "high" | "medium" | "low";
  }[];
  /** Fields where the model read the source text differently from the parser. */
  discrepancies: {
    field: string;
    parsedValue: string;
    modelValue: string;
    note: string;
  }[];
}

/** Analysis is always produced; the AI layer is strictly additive. */
export interface Analysis {
  worksheet: Worksheet;
  reconciliation: ReconcileResult;
  computed: ModComputation;
  /** Inferred from claim data; null when no capped claim exists to infer from. */
  splitPoint: number | null;
  /** Sum of subject premium across policy blocks; the premium-impact base. */
  subjectPremium: number | null;
  scenarios: Scenario[];
  findings: Finding[];
}
