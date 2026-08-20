import { describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analyze";
import { computeMod, roundHalfUp } from "@/lib/rating/formula";
import { parseWorksheet } from "@/lib/parse/worksheet";
import { reconcile } from "@/lib/rating/reconcile";
import { loadFixture } from "./helpers";

const analysis = analyzeDocument(loadFixture("interstate-az-fl"));

/**
 * Claims are identified by their financial shape rather than by number, so
 * these assertions survive the fixture's identifiers being re-pseudonymised.
 */
const bigOpenClaim = analysis.worksheet.claims.find(
  (c) => c.actualIncurred === 88221,
)!;

describe("the mod formula", () => {
  it("reproduces every derived cell the worksheet prints", () => {
    const c = analysis.computed;
    expect(c.stabilizingValue).toBeCloseTo(87691, 0);
    expect(c.ratableExcessActual).toBeCloseTo(13627, 0);
    expect(c.ratableExcessExpected).toBeCloseTo(14467, 0);
    expect(Math.round(c.numerator)).toBe(118657);
    expect(Math.round(c.denominator)).toBe(141615);
  });

  it("recomputes the published mod exactly", () => {
    expect(analysis.computed.mod).toBe(0.84);
    expect(analysis.worksheet.factors.publishedMod).toBe(0.84);
  });

  it("collapses the denominator to expected losses plus ballast", () => {
    const t = analysis.worksheet.totals!;
    expect(Math.round(analysis.computed.denominator)).toBe(
      t.expectedLosses + t.ballast,
    );
  });

  it("rounds half-up the way NCCI publishes factors", () => {
    expect(roundHalfUp(0.8379, 2)).toBe(0.84);
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
    expect(roundHalfUp(0.615, 2)).toBe(0.62);
  });

  it("does not divide by zero on an empty rating", () => {
    const c = computeMod({
      weight: 0,
      actualPrimary: 0,
      actualExcess: 0,
      expectedPrimary: 0,
      expectedExcess: 0,
      ballast: 0,
    });
    expect(Number.isFinite(c.mod)).toBe(true);
  });
});

describe("reconciliation", () => {
  it("ties out against the source document", () => {
    const failures = analysis.reconciliation.checks.filter(
      (c) => !c.passed && c.severity === "error",
    );
    expect(failures).toEqual([]);
    expect(analysis.reconciliation.passed).toBe(true);
  });

  it("checks class-level rates, not just the summary", () => {
    const classChecks = analysis.reconciliation.checks.filter((c) =>
      c.id.startsWith("class."),
    );
    expect(classChecks.length).toBeGreaterThan(20);
    expect(classChecks.every((c) => c.passed)).toBe(true);
  });

  it("reconciles claims back to the rated totals through the ERA discount", () => {
    const rollups = analysis.reconciliation.checks.filter((c) =>
      c.id.startsWith("claims."),
    );
    expect(rollups).toHaveLength(2);
    expect(rollups.every((c) => c.passed)).toBe(true);
  });

  it("catches a corrupted value instead of passing it through", () => {
    const doc = loadFixture("interstate-az-fl");
    const ws = parseWorksheet(doc);
    ws.policies[0].classRows[1].payroll = 5_000_000;

    const result = reconcile(ws);
    expect(result.passed).toBe(false);
    expect(
      result.checks.some(
        (c) => !c.passed && c.label.includes("payroll ÷ 100 × ELR"),
      ),
    ).toBe(true);
  });
});

describe("the ERA medical-only discount", () => {
  it("reads the reduction from the worksheet notes", () => {
    expect(analysis.worksheet.eraReduction).toBe(0.7);
  });

  it("explains the gap between the state rows and the rated totals", () => {
    const az = analysis.worksheet.stateRows.find((r) => r.state === "AZ")!;
    const totals = analysis.worksheet.totals!;
    const medOnly = analysis.worksheet.claims.filter(
      (c) => c.injuryType === "06",
    );
    const discounted =
      medOnly.reduce((acc, c) => acc + c.actualIncurred, 0) * 0.7;

    expect(Math.round(discounted)).toBe(1956);
    expect(az.actualPrimary - totals.actualPrimary).toBe(1956);
    expect(az.actualIncurred - totals.actualIncurred).toBe(1956);
  });
});

describe("what-if scenarios", () => {
  const byId = (id: string) => analysis.scenarios.find((s) => s.id === id)!;

  it("computes the loss-free minimum", () => {
    expect(byId("minimum").mod).toBe(0.62);
  });

  it("isolates the large open claim", () => {
    const scenario = analysis.scenarios.find(
      (s) =>
        s.id.startsWith("remove:") &&
        s.claimNumber === bigOpenClaim.claimNumber,
    )!;
    expect(scenario.mod).toBe(0.63);
    expect(scenario.modDelta).toBe(-0.21);
  });

  it("models reserve reductions against the split point", () => {
    const half = byId(`reserve:${bigOpenClaim.claimNumber}:0.5`);
    expect(half.mod).toBeLessThan(analysis.computed.mod);
    expect(half.mod).toBeGreaterThan(byId("minimum").mod);
  });

  it("prices the medical-only discount", () => {
    const era = byId("era:off");
    expect(era.mod).toBeGreaterThanOrEqual(analysis.computed.mod);
  });

  it("estimates premium impact from the printed subject premium", () => {
    expect(analysis.subjectPremium).not.toBeNull();
    expect(byId("minimum").premiumDelta).toBeLessThan(0);
  });
});

describe("split point", () => {
  it("infers the split point from the capped claim", () => {
    expect(analysis.splitPoint).toBe(16500);
  });
});

describe("findings", () => {
  it("surfaces the open claim as the highest-leverage item", () => {
    const open = analysis.findings.find(
      (f) => f.id === `open-claim:${bigOpenClaim.claimNumber}`,
    );
    expect(open).toBeDefined();
    expect(open!.severity).toBe("warning");
  });

  it("notes the split-point cap on that claim", () => {
    expect(
      analysis.findings.some(
        (f) => f.id === `capped:${bigOpenClaim.claimNumber}`,
      ),
    ).toBe(true);
  });

  it("reports no reconciliation errors for a clean worksheet", () => {
    expect(
      analysis.findings.filter((f) => f.id.startsWith("reconcile:")),
    ).toEqual([]);
  });

  it("phrases everything as a suggestion rather than an instruction", () => {
    const directive = /\byou must\b|\bwe recommend that you\b|\brequired to\b/i;
    for (const f of analysis.findings) {
      expect(f.detail).not.toMatch(directive);
    }
  });
});
