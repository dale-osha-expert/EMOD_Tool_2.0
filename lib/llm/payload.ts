import type { AiNarrative, Analysis } from "../types";

/**
 * What actually gets sent to the model.
 *
 * The PDF is never sent on this path, and identifying fields are removed by
 * default. Claim numbers are replaced with stable pseudonyms so the model can
 * still refer to a specific claim in its recommendations; the client maps them
 * back before anything is displayed.
 */
export interface AnalysisPayload {
  meta: {
    ratingEffectiveDate: string | null;
    productionDate: string | null;
    state: string | null;
    riskName?: string;
    riskId?: string;
  };
  rating: {
    publishedMod: number | null;
    recomputedMod: number;
    weight: number;
    expectedLosses: number;
    expectedPrimary: number;
    expectedExcess: number;
    actualIncurred: number;
    actualPrimary: number;
    actualExcess: number;
    ballast: number;
    stabilizingValue: number;
    numerator: number;
    denominator: number;
    splitPoint: number | null;
    eraReduction: number | null;
    averageAnnualSubjectPremium: number | null;
  };
  claims: {
    ref: string;
    injuryType: string | null;
    injuryTypeLabel: string | null;
    status: "open" | "closed" | null;
    actualIncurred: number;
    actualPrimary: number;
    flags: string[];
  }[];
  classes: {
    code: string;
    description: string | null;
    elr: number | null;
    dRatio: number | null;
    totalPayroll: number;
    totalExpectedLosses: number;
  }[];
  policyYears: {
    effectiveDate: string | null;
    expirationDate: string | null;
    state: string;
    subjectPremium: number | null;
    totalPayroll: number | null;
  }[];
  findings: {
    id: string;
    severity: string;
    title: string;
    detail: string;
  }[];
  scenarios: {
    id: string;
    label: string;
    mod: number;
    modDelta: number;
    premiumDelta: number | null;
  }[];
  reconciliation: {
    passed: boolean;
    failed: { scope: string; rule: string; printed: number; derived: number }[];
  };
  notes: string[];
  /** Verbatim rows, for the model to check our reading against. */
  sourceLines: string[];
}

export interface RedactionMap {
  /** pseudonym -> real claim number */
  claims: Record<string, string>;
}

const INJURY_LABELS: Record<string, string> = {
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

export function buildAnalysisPayload(
  analysis: Analysis,
  options: { includeIdentity: boolean },
): { payload: AnalysisPayload; redaction: RedactionMap } {
  const { worksheet: ws, computed } = analysis;

  const claims: Record<string, string> = {};
  const refFor = new Map<string, string>();
  ws.claims.forEach((claim, index) => {
    const ref = `CLAIM-${index + 1}`;
    claims[ref] = claim.claimNumber;
    refFor.set(claim.claimNumber, ref);
  });

  const scrub = (text: string): string => {
    let out = text;
    for (const [ref, real] of Object.entries(claims)) {
      out = out.split(real).join(ref);
    }
    if (!options.includeIdentity) {
      if (ws.riskName) out = out.split(ws.riskName).join("[RISK NAME]");
      if (ws.riskId) out = out.split(ws.riskId).join("[RISK ID]");
    }
    return out;
  };

  // Roll class rows up across policies so the model sees each classification
  // once, with its whole payroll, rather than eleven fragments of it.
  const classMap = new Map<string, AnalysisPayload["classes"][number]>();
  for (const policy of ws.policies) {
    for (const row of policy.classRows) {
      const existing = classMap.get(row.code);
      if (existing) {
        existing.totalPayroll += row.payroll ?? 0;
        existing.totalExpectedLosses += row.expectedLosses;
        existing.elr = existing.elr ?? row.elr;
        existing.dRatio = existing.dRatio ?? row.dRatio;
        existing.description = existing.description ?? row.description;
      } else {
        classMap.set(row.code, {
          code: row.code,
          description: row.description,
          elr: row.elr,
          dRatio: row.dRatio,
          totalPayroll: row.payroll ?? 0,
          totalExpectedLosses: row.expectedLosses,
        });
      }
    }
  }

  const payload: AnalysisPayload = {
    meta: {
      ratingEffectiveDate: ws.ratingEffectiveDate,
      productionDate: ws.productionDate,
      state: ws.state,
      ...(options.includeIdentity
        ? { riskName: ws.riskName ?? undefined, riskId: ws.riskId ?? undefined }
        : {}),
    },
    rating: {
      publishedMod: ws.factors.publishedMod,
      recomputedMod: computed.mod,
      weight: computed.weight,
      expectedLosses: round(computed.expectedPrimary + computed.expectedExcess),
      expectedPrimary: round(computed.expectedPrimary),
      expectedExcess: round(computed.expectedExcess),
      actualIncurred: round(computed.actualPrimary + computed.actualExcess),
      actualPrimary: round(computed.actualPrimary),
      actualExcess: round(computed.actualExcess),
      ballast: round(computed.ballast),
      stabilizingValue: round(computed.stabilizingValue),
      numerator: round(computed.numerator),
      denominator: round(computed.denominator),
      splitPoint: analysis.splitPoint,
      eraReduction: ws.eraReduction,
      averageAnnualSubjectPremium:
        analysis.subjectPremium === null ? null : round(analysis.subjectPremium),
    },
    claims: ws.claims.map((c) => ({
      ref: refFor.get(c.claimNumber)!,
      injuryType: c.injuryType,
      injuryTypeLabel: c.injuryType ? (INJURY_LABELS[c.injuryType] ?? null) : null,
      status: c.status === "O" ? "open" : c.status === "F" ? "closed" : null,
      actualIncurred: c.actualIncurred,
      actualPrimary: c.actualPrimary,
      flags: c.flags,
    })),
    classes: [...classMap.values()].sort(
      (a, b) => b.totalPayroll - a.totalPayroll,
    ),
    policyYears: ws.policies.map((p) => ({
      effectiveDate: p.effectiveDate,
      expirationDate: p.expirationDate,
      state: p.state,
      subjectPremium: p.subjectPremium,
      totalPayroll: p.totalPayroll,
    })),
    findings: analysis.findings.map((f) => ({
      // Ids embed the claim number they refer to, so they need scrubbing too.
      id: scrub(f.id),
      severity: f.severity,
      title: scrub(f.title),
      detail: scrub(f.detail),
    })),
    scenarios: analysis.scenarios
      // Removal and headline scenarios carry the argument; the reserve ladder
      // is three variants of the same idea and would only pad the prompt.
      .filter((s) => !s.id.startsWith("reserve:"))
      .map((s) => ({
        id: scrub(s.id),
        label: scrub(s.label),
        mod: s.mod,
        modDelta: s.modDelta,
        premiumDelta: s.premiumDelta,
      })),
    reconciliation: {
      passed: analysis.reconciliation.passed,
      failed: analysis.reconciliation.checks
        .filter((c) => !c.passed && c.severity !== "info")
        .map((c) => ({
          scope: c.scope,
          rule: c.label,
          printed: c.printed,
          derived: round(c.derived),
        })),
    },
    notes: ws.notes.map(scrub),
    sourceLines: ws.sourceLines.map(scrub),
  };

  return { payload, redaction: { claims } };
}

/** Turn the model's pseudonyms back into the real claim numbers for display. */
export function restoreNarrative(
  narrative: AiNarrative,
  redaction: RedactionMap,
): AiNarrative {
  const restore = (text: string): string => {
    let out = text;
    for (const [ref, real] of Object.entries(redaction.claims)) {
      out = out.split(ref).join(real);
    }
    return out;
  };

  return {
    summary: restore(narrative.summary),
    recommendations: narrative.recommendations.map((r) => ({
      ...r,
      title: restore(r.title),
      rationale: restore(r.rationale),
      claimNumber: r.claimNumber
        ? (redaction.claims[r.claimNumber] ?? restore(r.claimNumber))
        : undefined,
    })),
    discrepancies: narrative.discrepancies.map((d) => ({
      field: restore(d.field),
      parsedValue: restore(d.parsedValue),
      modelValue: restore(d.modelValue),
      note: restore(d.note),
    })),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
