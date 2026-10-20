import { EmodTool } from "@/components/EmodTool";
import { emailConfig } from "@/lib/email/send";
import { ByLine } from "@/components/site/Brand";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import {
  Destinations,
  Disclaimer,
  Faqs,
  Glossary,
  Hero,
  HowItWorks,
} from "@/components/site/Sections";
import { PUBLISHER, TOOL_NAME } from "@/lib/site/brand";
import { buildSchema } from "@/lib/site/schema";

/*
 * Rendered per request so whether emailing is switched on comes from the
 * server's environment at runtime. Statically built, it would be frozen at
 * whatever the build machine had - which in a Docker image built without
 * secrets means off for good. Every response is already sent no-store.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="@container min-h-dvh">
      <script
        type="application/ld+json"
        // Structured data must be in the served HTML, so it is written
        // directly rather than rendered by a client component.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSchema()) }}
      />

      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="@container mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 py-2.5 @2xl:px-6">
          <span className="text-[13px] font-semibold tracking-tight">
            {TOOL_NAME}
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ByLine size="sm" />
          </div>
        </div>
      </div>

      <Hero />

      <main className="pt-6">
        <EmodTool chrome={false} emailEnabled={emailConfig() !== null} />
      </main>

      <HowItWorks />
      <Faqs />
      <Glossary />
      <Destinations />

      <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="@container mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-5 @2xl:px-6">
          <ByLine />
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--color-ink-muted)]">
            <a className="hover:text-[var(--color-ink)]" href="#how-it-works">
              How it works
            </a>
            <a className="hover:text-[var(--color-ink)]" href="#faq">
              FAQ
            </a>
            <a className="hover:text-[var(--color-ink)]" href="#glossary">
              Worksheet terms
            </a>
            <a
              className="hover:text-[var(--color-ink)]"
              href={PUBLISHER.url}
              target="_blank"
              rel="noopener"
            >
              {PUBLISHER.name}
            </a>
          </nav>
        </div>
      </footer>

      <Disclaimer />
    </div>
  );
}
