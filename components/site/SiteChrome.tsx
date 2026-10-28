import Link from "next/link";
import { ByLine } from "./Brand";
import { GuidesMenu } from "./GuidesMenu";
import { ThemeToggle } from "./ThemeToggle";
import { PUBLISHER, TOOL_NAME, TOOL_SHORT_NAME } from "@/lib/site/brand";
import { GUIDES, guidePath } from "@/lib/site/guides";

/**
 * Header and footer shared by the tool page and the guides. /embed has
 * neither: inside someone else's page, a site menu would navigate the iframe.
 */

export function SiteHeader({ current }: { current: string }) {
  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      {/* relative: the menu panel positions against this row, not its button,
          so on a phone it spans the row instead of running off the left edge. */}
      <div className="@container relative mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-4 py-2.5 @2xl:px-6">
        <Link href="/" className="whitespace-nowrap text-[13px] font-semibold tracking-tight">
          {/* The short name is the one the domain spells, so it is no less the name. */}
          <span className="@md:hidden">{TOOL_SHORT_NAME}</span>
          <span className="hidden @md:inline">{TOOL_NAME}</span>
        </Link>
        <div className="flex items-center gap-3">
          <GuidesMenu current={current} />
          <ThemeToggle />
          {/* Also in the footer; on a phone the menu and toggle need the room. */}
          <span className="hidden @2xl:inline-flex">
            <ByLine size="sm" />
          </span>
        </div>
      </div>
    </div>
  );
}

const linkClass = "hover:text-[var(--color-ink)]";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="@container mx-auto grid w-full max-w-[1180px] gap-4 px-4 py-5 @2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ByLine />
          <nav
            aria-label="Tool"
            className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--color-ink-muted)]"
          >
            <Link className={linkClass} href="/">
              Calculator
            </Link>
            <Link className={linkClass} href="/#how-it-works">
              How it works
            </Link>
            <Link className={linkClass} href="/#faq">
              FAQ
            </Link>
            <Link className={linkClass} href="/#glossary">
              Worksheet terms
            </Link>
            <a className={linkClass} href={PUBLISHER.url} target="_blank" rel="noopener">
              {PUBLISHER.name}
            </a>
          </nav>
        </div>
        <nav
          aria-label="Guides"
          className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--color-ink-muted)]"
        >
          <span className="font-medium text-[var(--color-ink)]">Guides:</span>
          {GUIDES.map((g) => (
            <Link key={g.slug} className={linkClass} href={guidePath(g.slug)}>
              {g.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
