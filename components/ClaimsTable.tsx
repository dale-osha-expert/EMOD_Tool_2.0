"use client";

import { INJURY_TYPES, LOSS_FLAGS, type Analysis } from "@/lib/types";
import { Badge, Card, CardHeader, money, signedFactor } from "./ui";

export function ClaimsTable({ analysis }: { analysis: Analysis }) {
  const { worksheet, scenarios, splitPoint } = analysis;

  const impact = new Map(
    scenarios
      .filter((s) => s.id.startsWith("remove:"))
      .map((s) => [s.claimNumber, s] as const),
  );

  const claims = [...worksheet.claims].sort(
    (a, b) => b.actualIncurred - a.actualIncurred,
  );

  if (claims.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Claims"
          subtitle="No individual claims are listed on this worksheet."
        />
        <p className="px-4 py-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
          Worksheets sometimes aggregate small claims into a single summary line
          rather than listing them. If losses appear in the totals but no claims
          are shown here, the itemised loss run from your carrier would give the
          detail.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Claims"
        subtitle={`${claims.length} claim${claims.length === 1 ? "" : "s"} on this rating, ordered by size. "Mod effect" is what the mod would change by if the claim carried no loss dollars.`}
      />

      {/* Wide table on roomy containers; stacked cards when the tool is narrow. */}
      <div className="scroll-x hidden @2xl:block">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">
              <th className="px-4 py-2 font-medium">Claim</th>
              <th className="px-4 py-2 font-medium">Injury type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Incurred</th>
              <th className="px-4 py-2 text-right font-medium">Primary</th>
              <th className="px-4 py-2 text-right font-medium">Excess</th>
              <th className="px-4 py-2 text-right font-medium">Mod effect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {claims.map((claim) => {
              const scenario = impact.get(claim.claimNumber);
              const excess = claim.actualIncurred - claim.actualPrimary;
              return (
                <tr key={`${claim.claimNumber}-${claim.policyIndex}`}>
                  <td className="tabular px-4 py-2 font-medium">
                    {claim.claimNumber}
                    {claim.flags.length > 0 ? (
                      <span className="ml-1.5 text-[var(--color-ink-faint)]">
                        {claim.flags.join(" ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-muted)]">
                    {describeInjury(claim.injuryType)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={claim.status} />
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {money(claim.actualIncurred)}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {money(claim.actualPrimary)}
                    {splitPoint !== null && claim.actualPrimary >= splitPoint ? (
                      <span
                        className="ml-1 text-[var(--color-ink-faint)]"
                        title={`Capped at the ${money(splitPoint)} split point`}
                      >
                        capped
                      </span>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-2 text-right text-[var(--color-ink-muted)]">
                    {money(excess)}
                  </td>
                  <td className="tabular px-4 py-2 text-right font-medium">
                    {scenario ? signedFactor(scenario.modDelta) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[var(--color-line)] @2xl:hidden">
        {claims.map((claim) => {
          const scenario = impact.get(claim.claimNumber);
          return (
            <li key={`${claim.claimNumber}-${claim.policyIndex}`} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="tabular text-[14px] font-semibold">
                  {claim.claimNumber}
                </span>
                <StatusBadge status={claim.status} />
              </div>
              <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-muted)]">
                {describeInjury(claim.injuryType)}
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[12.5px]">
                <Field label="Incurred" value={money(claim.actualIncurred)} />
                <Field label="Primary" value={money(claim.actualPrimary)} />
                <Field
                  label="Mod effect"
                  value={scenario ? signedFactor(scenario.modDelta) : "—"}
                />
              </dl>
            </li>
          );
        })}
      </ul>

      {claims.some((c) => c.flags.length > 0) ? (
        <p className="border-t border-[var(--color-line)] px-4 py-2.5 text-[12px] text-[var(--color-ink-muted)]">
          {[...new Set(claims.flatMap((c) => c.flags))]
            .map((f) => `${f} — ${LOSS_FLAGS[f] ?? "see worksheet legend"}`)
            .join(" · ")}
        </p>
      ) : null}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="tabular mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: "O" | "F" | null }) {
  if (status === "O") return <Badge severity="warning">Open</Badge>;
  if (status === "F") return <Badge severity="info">Closed</Badge>;
  return <span className="text-[var(--color-ink-faint)]">—</span>;
}

function describeInjury(code: string | null): string {
  if (!code) return "Not stated";
  return INJURY_TYPES[code] ? `${code} — ${INJURY_TYPES[code]}` : code;
}
