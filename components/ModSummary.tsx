"use client";

import type { Analysis } from "@/lib/types";
import { Card, CardHeader, factor, money, Stat } from "./ui";

export function ModSummary({ analysis }: { analysis: Analysis }) {
  const { computed, worksheet, scenarios } = analysis;
  const minimum = scenarios.find((s) => s.id === "minimum");
  const published = worksheet.factors.publishedMod;
  const matches = published !== null && Math.abs(published - computed.mod) < 0.005;

  return (
    <Card>
      <CardHeader
        title="Experience modification factor"
        subtitle={
          published === null
            ? "Recalculated from the losses and expected losses on this worksheet."
            : matches
              ? "Our recalculation matches the factor printed on the worksheet."
              : "Our recalculation differs from the factor printed on the worksheet."
        }
      />

      <div className="grid gap-2.5 p-4 @sm:grid-cols-2 @xl:grid-cols-4">
        <Stat
          label="Current mod"
          value={factor(computed.mod)}
          tone={computed.mod > 1 ? "caution" : "positive"}
          detail={
            computed.mod > 1
              ? `Adds about ${Math.round((computed.mod - 1) * 100)}% to manual premium`
              : `A credit of about ${Math.round((1 - computed.mod) * 100)}% against manual premium`
          }
        />
        <Stat
          label="As printed"
          value={factor(published)}
          tone={matches ? "neutral" : "critical"}
          detail={matches ? "Matches our recalculation" : "Differs from our recalculation"}
        />
        <Stat
          label="Loss-free minimum"
          value={factor(minimum?.mod ?? null)}
          tone="positive"
          detail="The best this experience period could produce"
        />
        <Stat
          label="Room to the minimum"
          value={
            minimum ? (computed.mod - minimum.mod).toFixed(2) : "—"
          }
          detail={
            minimum?.premiumDelta != null
              ? `Worth about ${money(Math.abs(minimum.premiumDelta))} a year at the printed subject premium`
              : "Total the loss experience is currently costing"
          }
        />
      </div>

      <div className="scroll-x border-t border-[var(--color-line)]">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">
              <th className="px-4 py-2 font-medium">Component</th>
              <th className="px-4 py-2 text-right font-medium">Actual</th>
              <th className="px-4 py-2 text-right font-medium">Expected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            <Row
              label="Primary losses"
              actual={computed.actualPrimary}
              expected={computed.expectedPrimary}
            />
            <Row
              label="Stabilizing value"
              actual={computed.stabilizingValue}
              expected={computed.stabilizingValue}
            />
            <Row
              label={`Ratable excess (weighted at ${factor(computed.weight)})`}
              actual={computed.ratableExcessActual}
              expected={computed.ratableExcessExpected}
            />
            <tr className="bg-[var(--color-surface)] font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="tabular px-4 py-2 text-right">
                {money(computed.numerator)}
              </td>
              <td className="tabular px-4 py-2 text-right">
                {money(computed.denominator)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="border-t border-[var(--color-line)] px-4 py-2.5 text-[12.5px] text-[var(--color-ink-muted)]">
        {money(computed.numerator)} ÷ {money(computed.denominator)} ={" "}
        <span className="tabular font-medium text-[var(--color-ink)]">
          {computed.raw.toFixed(4)}
        </span>
        , rounded to <span className="font-medium">{factor(computed.mod)}</span>.
        {analysis.splitPoint !== null ? (
          <>
            {" "}
            Losses split at {money(analysis.splitPoint)}, read from the capped
            claim on this rating.
          </>
        ) : null}
      </p>
    </Card>
  );
}

function Row({
  label,
  actual,
  expected,
}: {
  label: string;
  actual: number;
  expected: number;
}) {
  return (
    <tr>
      <td className="px-4 py-1.5">{label}</td>
      <td className="tabular px-4 py-1.5 text-right">{money(actual)}</td>
      <td className="tabular px-4 py-1.5 text-right">{money(expected)}</td>
    </tr>
  );
}
