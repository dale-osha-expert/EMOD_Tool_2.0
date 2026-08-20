"use client";

import { useState } from "react";
import type { ReconcileResult } from "@/lib/types";
import { Badge, Button, Card, CardHeader, money } from "./ui";

/**
 * The verification gate, made visible.
 *
 * The worksheet asserts a set of arithmetic relationships about itself. We
 * re-derive all of them, and this panel reports the result. A clean pass is
 * evidence the document was read correctly; a failure names the exact cell
 * rather than letting a bad value flow into the analysis unannounced.
 */
export function ReconciliationPanel({
  result,
  source,
}: {
  result: ReconcileResult;
  source: "parsed" | "transcribed" | "manual";
}) {
  const [expanded, setExpanded] = useState(false);

  const errors = result.checks.filter((c) => !c.passed && c.severity === "error");
  const warnings = result.checks.filter(
    (c) => !c.passed && c.severity === "warning",
  );
  const passedCount = result.checks.filter((c) => c.passed).length;
  const clean = errors.length === 0 && warnings.length === 0;

  const origin =
    source === "transcribed"
      ? "AI transcription"
      : source === "manual"
        ? "figures you entered"
        : "worksheet";

  return (
    <Card
      className={
        clean
          ? "border-[var(--color-positive)]/30"
          : errors.length > 0
            ? "border-[var(--color-critical)]/40"
            : "border-[var(--color-caution)]/40"
      }
    >
      <CardHeader
        title={
          clean
            ? "Verified against the source document"
            : errors.length > 0
              ? "Some figures do not tie out"
              : "Mostly verified, with points to note"
        }
        subtitle={
          clean
            ? `All ${passedCount} internal checks reconcile, so the ${origin} was read correctly.`
            : `${passedCount} of ${result.checks.length} checks reconcile. The rest are listed below.`
        }
        actions={
          <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide detail" : "Show all checks"}
          </Button>
        }
      />

      {(errors.length > 0 || warnings.length > 0) && !expanded ? (
        <ul className="divide-y divide-[var(--color-line)]">
          {[...errors, ...warnings].map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="scroll-x">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">
                <th className="px-4 py-2 font-medium">Check</th>
                <th className="px-4 py-2 font-medium">Where</th>
                <th className="px-4 py-2 text-right font-medium">Printed</th>
                <th className="px-4 py-2 text-right font-medium">Derived</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {result.checks.map((check) => (
                <tr key={check.id}>
                  <td className="px-4 py-1.5">{check.label}</td>
                  <td className="px-4 py-1.5 text-[var(--color-ink-muted)]">
                    {check.scope}
                  </td>
                  <td className="tabular px-4 py-1.5 text-right">
                    {formatValue(check.printed)}
                  </td>
                  <td className="tabular px-4 py-1.5 text-right">
                    {formatValue(check.derived)}
                  </td>
                  <td className="px-4 py-1.5">
                    {check.passed ? (
                      <span className="text-[var(--color-positive)]">Ties out</span>
                    ) : (
                      <Badge severity={check.severity}>
                        off by {formatValue(Math.abs(check.delta))}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}

function CheckRow({
  check,
}: {
  check: ReconcileResult["checks"][number];
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge severity={check.severity}>
          {check.severity === "error" ? "Does not tie out" : "Note"}
        </Badge>
        <span className="text-[13px] font-medium">{check.scope}</span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        <span className="font-mono text-[12px]">{check.label}</span> — the
        worksheet prints{" "}
        <span className="tabular font-medium text-[var(--color-ink)]">
          {formatValue(check.printed)}
        </span>{" "}
        where the other figures imply{" "}
        <span className="tabular font-medium text-[var(--color-ink)]">
          {formatValue(check.derived)}
        </span>
        .
      </p>
    </li>
  );
}

/** Factors print as decimals; everything else on these forms is dollars. */
function formatValue(value: number): string {
  return Math.abs(value) < 10 && !Number.isInteger(value)
    ? value.toFixed(2)
    : money(value);
}
