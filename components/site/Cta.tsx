"use client";

import { track } from "@/lib/site/analytics";
import { hasDescription, type SiteLink } from "@/lib/site/brand";

/**
 * A destination card. Renders the description only once it has been confirmed,
 * so an unfilled entry shows a clean link rather than placeholder prose.
 */
export function DestinationCard({
  link,
  context,
}: {
  link: SiteLink;
  context: string;
}) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener"
      onClick={() => track("cta_click", { destination: link.name, context })}
      className="group flex flex-col rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
    >
      <span className="text-[14px] font-semibold">{link.name}</span>
      {hasDescription(link) ? (
        <span className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
          {link.description}
        </span>
      ) : null}
      <span className="mt-3 text-[13px] font-medium text-[var(--color-accent)]">
        {link.cta} <span aria-hidden>&rarr;</span>
      </span>
    </a>
  );
}

/** Inline button-style CTA, for use inside a panel rather than a card grid. */
export function CtaButton({
  link,
  context,
  variant = "primary",
}: {
  link: SiteLink;
  context: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener"
      onClick={() => track("cta_click", { destination: link.name, context })}
      className={
        variant === "primary"
          ? "inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3.5 py-1.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          : "inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-3.5 py-1.5 text-[14px] font-medium transition-colors hover:bg-[var(--color-surface)]"
      }
    >
      {link.cta} <span aria-hidden>&rarr;</span>
    </a>
  );
}
