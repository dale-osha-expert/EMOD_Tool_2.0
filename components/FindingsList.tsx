"use client";

import type { Finding } from "@/lib/types";
import { Badge, Card, CardHeader, money } from "./ui";

const LABEL: Record<Finding["severity"], string> = {
  error: "Does not tie out",
  warning: "Worth a look",
  info: "Context",
};

/**
 * Findings computed from the worksheet's own figures. Each is an observation
 * with its evidence attached, phrased as something to check — the tool has one
 * document and cannot see claim files, reserving rationale or payroll records.
 */
export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader title="Observations" />
        <p className="px-4 py-4 text-[13px] text-[var(--color-ink-muted)]">
          Nothing on this worksheet stood out.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Observations"
        subtitle="Calculated from the worksheet, not written by AI. Each one is a starting point for a conversation with your agent or carrier rather than a conclusion."
      />
      <ul className="divide-y divide-[var(--color-line)]">
        {findings.map((finding) => (
          <li key={finding.id} className="px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge severity={finding.severity}>{LABEL[finding.severity]}</Badge>
              <h3 className="text-[13.5px] font-semibold">{finding.title}</h3>
              {finding.dollarImpact ? (
                <span className="tabular text-[12.5px] text-[var(--color-ink-muted)]">
                  ≈ {money(Math.abs(finding.dollarImpact))}/yr
                </span>
              ) : null}
            </div>

            <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {finding.detail}
            </p>

            {finding.evidence.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {finding.evidence.map((item, i) => (
                  <li
                    key={i}
                    className="tabular rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11.5px] text-[var(--color-ink-muted)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
