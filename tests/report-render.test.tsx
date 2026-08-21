import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { analyzeDocument } from "@/lib/analyze";
import { EmodReport } from "@/lib/report/document";
import { SECTIONS, type SectionId } from "@/lib/report/presets";
import type { AiNarrative, Analysis } from "@/lib/types";
import { loadFixture } from "./helpers";

/**
 * The report is generated in the browser and is the tool's actual deliverable,
 * so a render failure is a failure of the whole product. Exercising every
 * section against every fixture is what catches a layout that only breaks on a
 * document larger or emptier than the one it was written against.
 */

const FIXTURES = [
  "interstate-az-fl",
  "interstate-az-fl-tx-2025",
  "intrastate-tx-loss-free",
];

const NARRATIVE: AiNarrative = {
  summary: "The mod sits above its loss-free minimum.",
  recommendations: [
    {
      title: "Review the open reserve",
      rationale: "It may be worth confirming the reserve with the adjuster.",
      claimNumber: "CLAIM-1",
      priority: "high",
    },
  ],
  discrepancies: [],
};

const render = (
  analysis: Analysis,
  sections: SectionId[],
  narrative: AiNarrative | null = null,
  omitPageNumbers = false,
) =>
  renderToBuffer(
    <EmodReport
      analysis={analysis}
      narrative={narrative}
      options={{
        sections,
        title: "Experience Modification Analysis",
        includeIdentity: true,
        omitPageNumbers,
      }}
    />,
  );

const forFixture = (fixture: string) => analyzeDocument(loadFixture(fixture));

/**
 * Pagination is where this breaks. Every section rendered alone was fine on a
 * nineteen-policy worksheet; the full report failed only once the combined
 * content pushed a block across a page boundary. Multiplying the content makes
 * that pressure far worse than any real worksheet would, so a layout that
 * cannot survive a page break fails here rather than in front of a client.
 */
function inflate(analysis: Analysis, factor: number): Analysis {
  // Ids double as React keys, so vary them per copy; duplicate keys would
  // produce warnings that obscure whatever the layout is actually doing.
  const repeat = <T,>(items: T[], id?: (item: T, n: number) => T) =>
    Array.from({ length: factor }, (_, n) =>
      id ? items.map((item) => id(item, n)) : items,
    ).flat();

  return {
    ...analysis,
    worksheet: {
      ...analysis.worksheet,
      policies: repeat(analysis.worksheet.policies),
      claims: repeat(analysis.worksheet.claims, (c, n) => ({
        ...c,
        claimNumber: `${c.claimNumber}-${n}`,
      })),
      notes: repeat(analysis.worksheet.notes),
    },
    findings: repeat(analysis.findings, (f, n) => ({ ...f, id: `${f.id}-${n}` })),
    scenarios: repeat(analysis.scenarios, (s, n) => ({ ...s, id: `${s.id}-${n}` })),
    reconciliation: {
      ...analysis.reconciliation,
      checks: repeat(analysis.reconciliation.checks, (c, n) => ({
        ...c,
        id: `${c.id}-${n}`,
      })),
    },
  };
}

describe("pagination under pressure", () => {
  const all = SECTIONS.map((s) => s.id as SectionId);

  // 3x is beyond any worksheet seen so far; 8x is well past it. Larger factors
  // were verified by hand but block the event loop long enough that the test
  // runner reports a worker timeout, so they are not kept in the suite.
  it.each([3, 8])(
    "still produces a report %ix the size of the largest worksheet",
    async (factor) => {
      const analysis = inflate(forFixture("interstate-az-fl-tx-2025"), factor);

      // Page numbering needs a per-page callback that the layout engine cannot
      // survive on a document this long. What matters is that the fallback the
      // builder retries with does survive, so the user still gets a report.
      await expect(render(analysis, all, NARRATIVE)).rejects.toThrow();

      const buffer = await render(analysis, all, NARRATIVE, true);
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buffer.length).toBeGreaterThan(10_000);
    },
    240000,
  );
});

describe.each(FIXTURES)("report for %s", (fixture) => {
  it.each(SECTIONS.map((s) => s.id))("renders the %s section alone", async (id) => {
    const buffer = await render(forFixture(fixture), [id as SectionId]);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders every section together, page numbers and all", async () => {
    const all = SECTIONS.map((s) => s.id as SectionId);
    const buffer = await render(forFixture(fixture), all, NARRATIVE);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(2000);
  });
});
