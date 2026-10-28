import Link from "next/link";
import { TOOL_NAME } from "@/lib/site/brand";
import { GUIDES, guidePath } from "@/lib/site/guides";

/**
 * Links between the tool page and the guides, server-rendered so crawlers see
 * them. The tool page links out to every guide and every guide links back to
 * the tool and across to the others - the hub-and-spoke structure that lets
 * the guides lend the tool page their topical weight.
 *
 * Copy comes from the registry, never from the Markdown: the tool page is
 * rendered per request, and the Markdown is only read at build time.
 */

function GuideCard({ slug, label, summary }: (typeof GUIDES)[number]) {
  return (
    <Link
      href={guidePath(slug)}
      className="group flex flex-col rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
    >
      <span className="text-[14px] font-semibold">{label}</span>
      <span className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {summary}
      </span>
      <span className="mt-3 text-[13px] font-medium text-[var(--color-accent)]">
        Read the guide <span aria-hidden>&rarr;</span>
      </span>
    </Link>
  );
}

/** On the tool page: every guide. */
export function GuideCards() {
  return (
    <section
      id="guides"
      className="@container mx-auto w-full max-w-[1180px] px-4 py-10 @2xl:px-6"
    >
      <h2 className="text-[20px] font-semibold tracking-tight @2xl:text-[24px]">
        Guides to experience rating
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        What the experience mod is and how NCCI calculates it, how to check
        your worksheet line by line, and what your EMR means when you bid
        construction work.
      </p>
      <div className="mt-5 grid gap-3 @2xl:grid-cols-3">
        {GUIDES.map((g) => (
          <GuideCard key={g.slug} {...g} />
        ))}
      </div>
    </section>
  );
}

/** On a guide: the other guides. */
export function RelatedGuides({ current }: { current: string }) {
  const others = GUIDES.filter((g) => g.slug !== current);
  return (
    <section className="@container mx-auto w-full max-w-[1180px] px-4 py-10 @2xl:px-6">
      <h2 className="text-[20px] font-semibold tracking-tight @2xl:text-[24px]">
        More guides
      </h2>
      <div className="mt-5 grid gap-3 @2xl:grid-cols-2">
        {others.map((g) => (
          <GuideCard key={g.slug} {...g} />
        ))}
      </div>
    </section>
  );
}

/** At the end of a guide: the tool the guide has been describing. */
export function ToolCta() {
  return (
    <aside className="mt-12 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-5">
      <h2 className="text-[18px] font-semibold tracking-tight">
        Check your own worksheet
      </h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        The free {TOOL_NAME} recalculates your experience mod from your NCCI
        rating worksheet, checks the worksheet&rsquo;s own arithmetic and shows
        what each claim costs in mod points and premium. Your PDF is read in
        your browser and never uploaded.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3.5 py-1.5 text-[14px] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
      >
        Open the calculator <span aria-hidden>&rarr;</span>
      </Link>
    </aside>
  );
}
