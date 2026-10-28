"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { GUIDES, guidePath } from "@/lib/site/guides";
import { TOOL_NAME } from "@/lib/site/brand";

/**
 * The site menu, top right of every full page.
 *
 * Built on <details> so it opens without JavaScript and, more to the point,
 * so every link is in the served HTML whether or not the menu is open: the
 * links from the tool page to the guides are what make them pillar pages, and
 * a crawler has to see them. Script only adds the expected dismissals -
 * clicking outside, Escape, or choosing a link.
 */
export function GuidesMenu({ current }: { current: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(event: Event) {
      const menu = ref.current;
      if (!menu?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        menu.open = false;
        menu.querySelector("summary")?.focus();
        return;
      }
      if (!menu.contains(event.target as Node)) menu.open = false;
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const items = [
    {
      href: "/",
      label: "Experience mod calculator",
      summary: `The free ${TOOL_NAME}: recalculate your mod from your NCCI worksheet.`,
    },
    ...GUIDES.map((g) => ({ href: guidePath(g.slug), label: g.label, summary: g.summary })),
  ];

  return (
    // Not relative: the panel anchors to the header row (see SiteHeader).
    <nav aria-label="Site">
      <details ref={ref} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2.5 py-1 text-[12.5px] font-medium marker:content-none hover:border-[var(--color-line-strong)] [&::-webkit-details-marker]:hidden">
          Guides
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            width="10"
            height="10"
            className="text-[var(--color-ink-faint)] transition-transform group-open:rotate-180"
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </summary>
        <ul className="absolute right-4 top-full z-50 mt-1 w-[min(21rem,calc(100%-2rem))] rounded-lg @2xl:right-6 border border-[var(--color-line)] bg-[var(--color-canvas)] p-1.5 shadow-lg">
          {items.map((item) => {
            const active = item.href === current;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (ref.current) ref.current.open = false;
                  }}
                  className={`block rounded-md px-3 py-2 transition-colors hover:bg-[var(--color-surface)] ${
                    active ? "bg-[var(--color-accent-soft)]" : ""
                  }`}
                >
                  <span className="block text-[13.5px] font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--color-ink-muted)]">
                    {item.summary}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </nav>
  );
}
