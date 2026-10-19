import { describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analyze";
import { buildPromotions } from "@/lib/site/promotions";
import { loadFixture } from "./helpers";

const promotionsFor = (fixture: string, includeComplianceHub = true) =>
  buildPromotions(analyzeDocument(loadFixture(fixture)), { includeComplianceHub });

const all = ["interstate-az-fl", "interstate-az-fl-tx-2025", "intrastate-tx-loss-free"];

describe("results-tied promotions", () => {
  it("quotes what losses add to the mod, from the loss-free minimum", () => {
    const [training] = promotionsFor("interstate-az-fl");
    expect(training.headline).toBe(
      "Losses add 0.22 to this mod, about $41,016 a year in estimated premium",
    );
  });

  it("prices open claims at their rated value, not the larger printed one", () => {
    // 2025: a loss-limited open claim printed at $233,837 entered the rating
    // $82,337 lower, plus an open claim of $61,350.
    const records = promotionsFor("interstate-az-fl-tx-2025").find((p) => p.id === "records")!;
    expect(records.headline).toContain("2 open claims rated at $212,850");
    expect(records.headline).not.toContain("295,187");
  });

  it("says so plainly when the mod is already at its minimum", () => {
    const [training, records] = promotionsFor("intrastate-tx-loss-free");
    expect(training.headline).toBe("This mod is already at its loss-free minimum");
    expect(records.headline).toMatch(/^After an accident/);
  });

  it("drops Compliance Hub inside Compliance Hub", () => {
    const ids = promotionsFor("interstate-az-fl", false).map((p) => p.id);
    expect(ids).toEqual(["training"]);
  });

  it("never promises a lower mod or gives an instruction", () => {
    const forbidden = /\byou must\b|\bwe recommend that you\b|\brequired to\b|\bwill (lower|reduce)\b|\bguarantee/i;
    for (const f of all) {
      for (const p of promotionsFor(f)) {
        expect(`${p.headline} ${p.body}`).not.toMatch(forbidden);
      }
    }
  });

  it("stays ASCII, because the same text is drawn into the PDF", () => {
    for (const f of all) {
      for (const p of promotionsFor(f)) {
        expect(`${p.headline} ${p.body}`).toMatch(/^[\x20-\x7e]*$/);
      }
    }
  });
});
