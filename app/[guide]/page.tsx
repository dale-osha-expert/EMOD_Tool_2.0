import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Destinations } from "@/components/site/Sections";
import { RelatedGuides, ToolCta } from "@/components/site/Guides";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { PUBLISHER, TOOL_NAME } from "@/lib/site/brand";
import { loadGuide } from "@/lib/site/guide-content";
import { GUIDES, guidePath } from "@/lib/site/guides";
import { buildGuideSchema } from "@/lib/site/schema";

/*
 * Every guide is generated at build time from its Markdown, and any other
 * top-level path is a 404 rather than a render attempt. Unlike the tool page
 * these read nothing from the server's environment, so static is safe.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ guide: g.slug }));
}

type Props = { params: Promise<{ guide: string }> };

function find(slug: string) {
  const link = GUIDES.find((g) => g.slug === slug);
  if (!link) notFound();
  return { link, guide: loadGuide(slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guide } = find((await params).guide);
  const { meta, slug } = guide;
  const path = guidePath(slug);
  const image = {
    url: `/guides/${slug}/hero.jpg`,
    width: 1200,
    height: 630,
    alt: meta.heroAlt,
  };
  return {
    // The drafts' titles are already written to length; the site suffix
    // would push them past what a results page shows.
    title: { absolute: meta.title },
    description: meta.description,
    keywords: meta.tags,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: TOOL_NAME,
      title: meta.title,
      description: meta.description,
      locale: "en_US",
      publishedTime: meta.date,
      modifiedTime: meta.lastUpdated,
      section: meta.kicker,
      tags: meta.tags,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [image],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function GuidePage({ params }: Props) {
  const { link, guide } = find((await params).guide);
  const { meta, slug } = guide;
  const path = guidePath(slug);
  const updated = meta.lastUpdated !== meta.date;

  const schema = buildGuideSchema({
    slug,
    title: meta.title,
    description: meta.description,
    datePublished: meta.date,
    dateModified: meta.lastUpdated,
    heroAlt: meta.heroAlt,
    keywords: meta.tags,
    wordCount: guide.wordCount,
    faqs: guide.faqs,
  });

  return (
    <div className="@container min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <SiteHeader current={path} />

      <main>
        {/* Same width as the tool page's content, so the header, article and
            footer share one edge on a wide screen. */}
        <article className="@container mx-auto w-full max-w-[1180px] px-4 pt-6 pb-4 @2xl:px-6">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[var(--color-ink-muted)]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-[var(--color-ink)]">
                  {TOOL_NAME}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-[var(--color-ink)]">
                {link.label}
              </li>
            </ol>
          </nav>

          <header className="mt-6">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
              {meta.kicker}
            </p>
            <h1 className="mt-2 max-w-4xl text-[28px] font-semibold leading-tight tracking-tight text-balance @2xl:text-[36px] @5xl:text-[40px]">
              {meta.title}
            </h1>
            <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">
              By{" "}
              <a
                href={PUBLISHER.url}
                target="_blank"
                rel="noopener"
                className="font-medium text-[var(--color-ink)] hover:underline"
              >
                {PUBLISHER.name}
              </a>
              {" · "}
              {updated ? "Updated " : "Published "}
              <time dateTime={updated ? meta.lastUpdated : meta.date}>
                {formatDate(updated ? meta.lastUpdated : meta.date)}
              </time>
            </p>
          </header>

          <figure className="mt-6">
            <Image
              src={`/guides/${slug}/hero.jpg`}
              alt={meta.heroAlt}
              width={1200}
              height={630}
              priority
              sizes="(max-width: 1180px) 100vw, 1132px"
              // At full width the 1200x630 photo would fill the screen and push
              // the article below the fold, so wide layouts crop it to a banner.
              className="h-auto w-full rounded-lg @4xl:aspect-[3/1] @4xl:object-cover"
              style={link.heroFocus ? { objectPosition: link.heroFocus } : undefined}
            />
            <figcaption className="mt-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
              Photo:{" "}
              <a href={link.heroCredit.url} target="_blank" rel="noopener" className="hover:underline">
                {link.heroCredit.photographer}
              </a>{" "}
              on Unsplash
            </figcaption>
          </figure>

          <div
            className="guide-prose mt-8"
            // Rendered at build time from the committed Markdown; see
            // lib/site/guide-content.ts for what is rewritten on the way.
            dangerouslySetInnerHTML={{ __html: guide.html }}
          />

          <ToolCta />
        </article>

        <RelatedGuides current={slug} />
        <Destinations />
      </main>

      <SiteFooter />
    </div>
  );
}
