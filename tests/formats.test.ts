import { describe, expect, it } from "vitest";
import { analyzeDocument, WorksheetParseError } from "@/lib/analyze";
import { parseWorksheet } from "@/lib/parse/worksheet";
import { ratedContributions } from "@/lib/rating/claims";
import type { ExtractedDocument } from "@/lib/parse/textLayer";
import { loadFixture } from "./helpers";

/**
 * One parser has to read forms that differ by year, by bureau and by how many
 * states a risk operates in. These fixtures cover the three shapes we have seen
 * so far, and exist so that support for a new one cannot silently break an old.
 */

describe("2025 interstate form (AZ/FL/TX)", () => {
  const analysis = analyzeDocument(loadFixture("interstate-az-fl-tx-2025"));

  it("recomputes the published mod", () => {
    expect(analysis.computed.mod).toBe(1.1);
    expect(analysis.worksheet.factors.publishedMod).toBe(1.1);
  });

  it("reconciles fully", () => {
    const failing = analysis.reconciliation.checks.filter(
      (c) => !c.passed && c.severity !== "info",
    );
    expect(failing).toEqual([]);
  });

  it("reads the split-point column this form added", () => {
    const printed = analysis.worksheet.stateRows.map((r) => [
      r.state,
      r.splitPoint,
    ]);
    expect(printed).toEqual([
      ["AZ", 17000],
      ["FL", 18500],
      ["TX", 16500],
    ]);
  });

  it("keeps the actual-primary column separate from the new split-point column", () => {
    // Regression: without the split-point spec both values land in one cell,
    // fail to parse, and the state's actual primary silently reads as zero.
    const az = analysis.worksheet.stateRows.find((r) => r.state === "AZ")!;
    expect(az.actualPrimary).toBe(61982);
    expect(az.actualIncurred).toBe(324892);
  });

  it("reads surcharges above unity", () => {
    expect(analysis.worksheet.factors.arap).toBe(1.09);
    expect(analysis.worksheet.factors.flarap).toBe(1.12);
    expect(
      analysis.findings.filter((f) => f.id.startsWith("surcharge:")),
    ).toHaveLength(2);
  });

  it("handles three states and nineteen policy periods", () => {
    expect(analysis.worksheet.stateRows).toHaveLength(3);
    expect(analysis.worksheet.policies).toHaveLength(19);
    expect(analysis.worksheet.claims).toHaveLength(6);
  });
});

describe("loss limitation on a flagged claim", () => {
  const ws = parseWorksheet(loadFixture("interstate-az-fl-tx-2025"));
  const contributions = ratedContributions(ws);
  const limited = ws.claims.find((c) => c.flags.includes("#"))!;

  it("recovers the limited value from the totals row", () => {
    // The claim prints at 233,837 but the totals imply only ~151,500 was rated.
    expect(limited.actualIncurred).toBe(233837);
    const rated = contributions.byClaim.get(limited)!;
    expect(rated.limited).toBe(true);
    expect(Math.round(rated.primary + rated.excess)).toBe(151500);
  });

  it("leaves nothing unexplained once the limitation is attributed", () => {
    expect(Math.round(contributions.limitationApplied)).toBe(82337);
    expect(Math.round(contributions.unexplained)).toBe(0);
  });

  it("does not touch claims that are not flagged", () => {
    for (const claim of ws.claims) {
      if (claim.flags.includes("#")) continue;
      expect(contributions.byClaim.get(claim)!.limited).toBe(false);
    }
  });

  it("prices the removal scenario off the limited value, not the printed one", () => {
    const analysis = analyzeDocument(loadFixture("interstate-az-fl-tx-2025"));
    const scenario = analysis.scenarios.find(
      (s) => s.id === `remove:${limited.claimNumber}`,
    )!;
    // Using the printed 233,837 would overstate the gain by roughly 10 points.
    expect(scenario.mod).toBe(0.82);
    expect(scenario.modDelta).toBe(-0.28);
  });

  it("explains the limitation as a finding", () => {
    const analysis = analyzeDocument(loadFixture("interstate-az-fl-tx-2025"));
    const finding = analysis.findings.find((f) =>
      f.id.startsWith("limited:"),
    )!;
    expect(finding).toBeDefined();
    expect(finding.detail).toMatch(/limited loss/i);
  });
});

describe("2017 intrastate form, loss free", () => {
  const analysis = analyzeDocument(loadFixture("intrastate-tx-loss-free"));

  it("reads a single-state rating", () => {
    expect(analysis.worksheet.state).toBe("TEXAS");
    expect(analysis.worksheet.stateRows).toHaveLength(1);
    expect(analysis.worksheet.stateRows[0].state).toBe("TX");
  });

  it("reconciles fully on a form with no split-point column", () => {
    expect(analysis.reconciliation.passed).toBe(true);
    expect(analysis.worksheet.stateRows[0].splitPoint).toBeNull();
  });

  it("recomputes the published mod with no losses at all", () => {
    expect(analysis.computed.mod).toBe(0.81);
    expect(analysis.worksheet.factors.publishedMod).toBe(0.81);
    expect(analysis.worksheet.claims).toHaveLength(0);
  });

  it("reports the mod as already at its floor rather than offering false hope", () => {
    const minimum = analysis.scenarios.find((s) => s.id === "minimum")!;
    expect(minimum.mod).toBe(0.81);
    expect(minimum.modDelta).toBe(0);

    const position = analysis.findings.find((f) => f.id === "position")!;
    expect(position.title).toMatch(/already the best/i);
    expect(position.dollarImpact).toBeNull();
  });

  it("offers no claim scenarios when there are no claims", () => {
    expect(analysis.scenarios.filter((s) => s.id.startsWith("remove:"))).toEqual(
      [],
    );
    expect(analysis.splitPoint).toBeNull();
  });

  it("copes with no ARAP values printed at all", () => {
    expect(analysis.worksheet.factors.arap).toBeNull();
    expect(
      analysis.findings.filter((f) => f.id.startsWith("surcharge:")),
    ).toEqual([]);
  });
});

describe("documents that are not ratings", () => {
  const withText = (lines: string[]): ExtractedDocument => ({
    pages: [
      {
        pageNumber: 1,
        width: 612,
        height: 792,
        items: lines.map((text, i) => ({
          text,
          x: 60,
          y: 100 + i * 14,
          w: text.length * 5,
          h: 9,
        })),
      },
    ],
    glyphCount: lines.join("").length * 20,
    hasTextLayer: true,
  });

  it("refuses a document that merely mentions worksheet terms", () => {
    // An explainer or training deck can quote every column heading without
    // being a rating. Guessing at one would be worse than declining.
    const doc = withText([
      "Understanding Your Experience Rating Worksheet",
      "The Expected Losses column is derived from Payroll and the ELR.",
      "Ballast and the Act Inc Losses column are explained on the next page.",
    ]);
    expect(() => parseWorksheet(doc)).toThrow(WorksheetParseError);
  });

  it("names what was missing rather than failing vaguely", () => {
    const doc = withText([
      "Understanding Your Experience Rating Worksheet",
      "Expected Losses, Ballast and Exp Prim Losses are shown here.",
    ]);
    try {
      parseWorksheet(doc);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WorksheetParseError);
      expect((error as WorksheetParseError).hint).toMatch(
        /summary grid and policy tables/i,
      );
    }
  });
});
