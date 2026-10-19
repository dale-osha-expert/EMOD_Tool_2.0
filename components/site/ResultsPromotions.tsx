"use client";

import { Card, CardHeader } from "@/components/ui";
import { AI_ENABLED, PUBLISHER } from "@/lib/site/brand";
import { buildPromotions } from "@/lib/site/promotions";
import type { Analysis } from "@/lib/types";
import { CtaButton } from "./Cta";

/**
 * Where the publisher's products meet this worksheet's results.
 *
 * Labelled as coming from the publisher so it never reads as one of the
 * findings: findings are observations about the document, this is a pitch.
 * Inside Compliance Hub (AI_ENABLED) the Compliance Hub item is dropped,
 * since the visitor is already there.
 */
export function ResultsPromotions({ analysis }: { analysis: Analysis }) {
  const promotions = buildPromotions(analysis, {
    includeComplianceHub: !AI_ENABLED,
  });

  return (
    <Card>
      <CardHeader
        title="Where the next rating comes from"
        subtitle={`From ${PUBLISHER.name}, the publisher of this free tool.`}
      />
      <div
        className={`grid gap-px bg-[var(--color-line)] ${promotions.length > 1 ? "@3xl:grid-cols-2" : ""}`}
      >
        {promotions.map((p) => (
          <section
            key={p.id}
            className="flex flex-col bg-[var(--color-canvas)] px-4 py-4"
          >
            <h3 className="text-[14px] font-semibold leading-snug">
              {p.headline}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {p.body}
            </p>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-3 pt-4">
              {p.links.map(({ link, label }) => (
                <div key={link.url} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
                    {label}
                  </span>
                  <CtaButton
                    link={link}
                    context={`results_${p.id}`}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
