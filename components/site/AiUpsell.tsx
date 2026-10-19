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
 *
 * Each bullet describes what lib/llm/schema.ts and lib/llm/prompt.ts actually
 * produce, and the data-handling line matches lib/llm/payload.ts. Change them
 * together. Compliance Hub's public site does not describe the analysis, so
 * nothing here says how it looks there.
 */
export function AiUpsell() {
  return (
    <Card className="border-[var(--color-accent)]/30">
      <CardHeader
        title="Written analysis"
        subtitle="Offered through Compliance Hub. Everything above is complete without it."
      />

      <div className="px-4 py-4">
        <div className="grid gap-4 @2xl:grid-cols-[1fr_auto] @2xl:items-start">
          <div>
            <p className="max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              The figures, scenarios and observations on this page are
              calculated from your worksheet and are yours to use as they are.
              The written analysis adds three things:
            </p>

            <ul className="mt-3 space-y-1.5">
              {[
                "A short plain-language summary of what the rating says, for someone who does not read worksheets for a living",
                "Points worth reviewing, ranked high, medium or low and tied to a specific claim where one applies, written as things to check with your agent, broker or carrier",
                "A cross-check of the parsed figures against the worksheet lines they were read from, flagging any that disagree",
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

            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              Unlike the rest of this tool, it does send data off your device:
              the calculated figures and the relevant worksheet lines go to
              Google&rsquo;s Gemini, with the business name, risk ID and claim
              numbers replaced first. The PDF itself is never sent.
            </p>

            {hasDescription(COMPLIANCE_HUB) ? (
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                <span className="font-medium text-[var(--color-ink)]">
                  About Compliance Hub:
                </span>{" "}
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
