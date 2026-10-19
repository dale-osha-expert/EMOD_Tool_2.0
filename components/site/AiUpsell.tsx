"use client";

import { Card, CardHeader } from "@/components/ui";
import { COMPLIANCE_HUB, hasDescription } from "@/lib/site/brand";
import { CtaButton } from "./Cta";

/**
 * Stands in for the AI written analysis on the public deployment.
 *
 * The honest framing matters more than the sell here. Everything above this
 * panel is already complete and already the useful part; the analysis adds
 * prose on top. Saying that plainly is also what keeps the free tool worth
 * linking to, which is the whole point of it being free.
 */
export function AiUpsell() {
  return (
    <Card className="border-[var(--color-accent)]/30">
      <CardHeader
        title="Written analysis"
        subtitle="Available in Compliance Hub. Everything above is complete without it."
      />

      <div className="px-4 py-4">
        <div className="grid gap-4 @2xl:grid-cols-[1fr_auto] @2xl:items-start">
          <div>
            <p className="max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              The figures, scenarios and observations on this page are
              calculated from your worksheet and are yours to use as they are.
              The written analysis takes them further:
            </p>

            <ul className="mt-3 space-y-1.5">
              {[
                "A plain-language summary of what the rating says, written for someone who does not read worksheets for a living",
                "Suggested actions in priority order, each tied to the specific claim or figure behind it",
                "A second reading of the worksheet that flags any figure the parser may have misread",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]"
                >
                  <span aria-hidden className="text-[var(--color-accent)]">
                    &#8226;
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {hasDescription(COMPLIANCE_HUB) ? (
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {COMPLIANCE_HUB.description}
              </p>
            ) : null}
          </div>

          <div className="@2xl:pl-2">
            <CtaButton link={COMPLIANCE_HUB} context="ai_panel" />
          </div>
        </div>
      </div>
    </Card>
  );
}
