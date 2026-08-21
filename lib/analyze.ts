import { parseWorksheet, WorksheetParseError } from "./parse/worksheet";
import type { ExtractedDocument } from "./parse/textLayer";
import { computeMod, inputsFromSummary } from "./rating/formula";
import { buildFindings } from "./rating/findings";
import { reconcile } from "./rating/reconcile";
import { inferSplitPoint } from "./rating/claims";
import {
  averageAnnualSubjectPremium,
  buildScenarios,
} from "./rating/scenarios";
import type { Analysis, Worksheet } from "./types";

export { WorksheetParseError };

/**
 * Turn an extracted text layer into a complete analysis.
 *
 * Everything this produces is computed from the document. No model is
 * consulted, so this path cannot fail because of an API outage, a rate limit or
 * a retired model — which is what makes it safe to treat as the source of truth.
 */
export function analyzeDocument(doc: ExtractedDocument): Analysis {
  const worksheet = parseWorksheet(doc);
  return analyzeWorksheet(worksheet);
}

export function analyzeWorksheet(worksheet: Worksheet): Analysis {
  const reconciliation = reconcile(worksheet);

  if (!worksheet.totals) {
    throw new WorksheetParseError(
      "The rating summary could not be read from this worksheet.",
      "The lettered (A)–(I) summary row on the first page is what the mod is calculated from, and it was not found. If this is an NCCI worksheet in an unfamiliar layout, the figures can be entered by hand instead.",
    );
  }

  const computed = computeMod(inputsFromSummary(worksheet.totals));
  const scenarios = buildScenarios(worksheet, computed);
  const findings = buildFindings(worksheet, computed, reconciliation, scenarios);

  return {
    worksheet,
    reconciliation,
    computed,
    splitPoint: inferSplitPoint(worksheet.claims),
    subjectPremium: averageAnnualSubjectPremium(worksheet),
    scenarios,
    findings,
  };
}
