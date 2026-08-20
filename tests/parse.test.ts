import { describe, expect, it } from "vitest";
import { parseWorksheet } from "@/lib/parse/worksheet";
import { loadFixture } from "./helpers";

const ws = parseWorksheet(loadFixture("interstate-az-fl"));

describe("worksheet header", () => {
  it("reads the identifying fields", () => {
    expect(ws.riskId).toBe("900000000");
    expect(ws.ratingEffectiveDate).toBe("06/01/2024");
    expect(ws.productionDate).toBe("04/08/2024");
    expect(ws.state).toBe("INTERSTATE");
    expect(ws.pageCount).toBe(7);
  });
});

describe("summary grid", () => {
  it("reads the lettered totals row", () => {
    expect(ws.totals).not.toBeNull();
    expect(ws.totals).toMatchObject({
      weight: 0.19,
      expectedExcess: 76144,
      expectedLosses: 115601,
      expectedPrimary: 39457,
      actualExcess: 71721,
      ballast: 26014,
      actualIncurred: 89060,
      actualPrimary: 17339,
    });
  });

  it("reads the per-state rows", () => {
    expect(ws.stateRows.map((r) => r.state)).toEqual(["AZ", "FL"]);
    expect(ws.stateRows[0]).toMatchObject({
      weight: 0.19,
      expectedExcess: 76051,
      expectedLosses: 115440,
      actualIncurred: 91016,
      actualPrimary: 19295,
    });
  });
});

describe("rating factors", () => {
  it("reads the printed factors and mod", () => {
    expect(ws.factors).toMatchObject({
      stabilizingValue: 87691,
      ratableExcessActual: 13627,
      ratableExcessExpected: 14467,
      numerator: 118657,
      denominator: 141615,
      publishedMod: 0.84,
      arap: 1,
    });
  });
});

describe("notes", () => {
  it("captures the ERA statement and reads the reduction", () => {
    expect(ws.eraReduction).toBe(0.7);
    expect(ws.notes.some((n) => /REVISED RATING/.test(n))).toBe(true);
  });
});

describe("policy blocks", () => {
  it("finds every policy block across all pages", () => {
    expect(ws.policies.length).toBeGreaterThanOrEqual(10);
  });

  it("reads the first block's identifying fields", () => {
    const p = ws.policies[0];
    expect(p).toMatchObject({
      state: "02-ARIZONA",
      carrier: "19909",
      policyNumber: "1014389",
      effectiveDate: "03/30/2020",
      expirationDate: "03/30/2021",
      subjectPremium: 190856,
      totalPayroll: 3663204,
    });
  });

  it("reads class rows with rates and payroll", () => {
    const p = ws.policies[0];
    const c3030 = p.classRows.find((r) => r.code === "3030");
    expect(c3030).toMatchObject({
      elr: 1.3,
      dRatio: 0.37,
      payroll: 1000952,
      expectedLosses: 13012,
      expectedPrimary: 4814,
    });
  });
});

describe("claims", () => {
  it("finds all three claims", () => {
    expect(ws.claims).toHaveLength(3);
  });

  it("reads the large open claim", () => {
    const claim = ws.claims.find((c) => c.actualIncurred === 88221);
    expect(claim).toMatchObject({
      injuryType: "05",
      status: "O",
      actualIncurred: 88221,
      actualPrimary: 16500,
    });
  });

  it("reads the closed medical-only claims", () => {
    const medOnly = ws.claims.filter((c) => c.injuryType === "06");
    expect(medOnly).toHaveLength(2);
    expect(medOnly.map((c) => c.actualIncurred).sort((a, b) => a - b)).toEqual([
      800, 1995,
    ]);
    expect(medOnly.every((c) => c.status === "F")).toBe(true);
  });
});
