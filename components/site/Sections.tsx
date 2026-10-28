import Link from "next/link";
import { DESTINATIONS, TOOL_NAME } from "@/lib/site/brand";
import { FAQS, GLOSSARY, HOW_IT_WORKS } from "@/lib/site/content";
import { DestinationCard } from "./Cta";

/**
 * Server-rendered page content around the tool.
 *
 * Deliberately not a client component: the tool itself has to run in the
 * browser, but none of the copy does, and content that only exists after
 * hydration is content a crawler may never see.
 */

export function Hero() {
  return (
    <header className="@container mx-auto w-full max-w-[1180px] px-4 pt-8 @2xl:px-6">
      <h1 className="max-w-3xl text-[26px] font-semibold leading-tight tracking-tight @2xl:text-[34px]">
        Free experience mod calculator for NCCI rating worksheets
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-ink-muted)] @2xl:text-[16px]">
        Upload your workers compensation experience rating worksheet and see the
        experience modification rate recalculated from scratch, checked against
        the worksheet&rsquo;s own arithmetic, with every claim priced in mod
        points and premium. Your PDF is read inside your browser — it is never
        uploaded, and nothing is stored.
      </p>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--color-ink-muted)]">
        {[
          "No account, no email, no cost",
          "Nothing leaves your browser",
          "Works with interstate and single-state ratings",
          "Exports a PDF report",
        ].map((point) => (
          <li key={point} className="flex items-center gap-1.5">
            <span aria-hidden className="text-[var(--color-positive)]">
              &#10003;
            </span>
            {point}
          </li>
        ))}
      </ul>
    </header>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="@container mx-auto w-full max-w-[1180px] px-4 py-10 @2xl:px-6"
    >
      <h2 className="text-[20px] font-semibold tracking-tight @2xl:text-[24px]">
        How the experience mod calculator works
      </h2>
      <ol className="mt-5 grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-4"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
              Step {i + 1}
            </span>
            <h3 className="mt-1 text-[14px] font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Faqs() {
  return (
    <section
      id="faq"
      className="@container mx-auto w-full max-w-[1180px] px-4 py-10 @2xl:px-6"
    >
      <h2 className="text-[20px] font-semibold tracking-tight @2xl:text-[24px]">
        Experience modification rate: frequently asked questions
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        How the EMR is calculated, what the figures on an NCCI worksheet mean,
        and what can and cannot be changed.
      </p>

      <div className="mt-5 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]">
        {FAQS.map((item) => (
          // <details> keeps every answer in the served HTML whether or not it
          // is open, so a crawler and an answer engine read all of it.
          <details key={item.question} className="group px-4 py-3.5">
            <summary className="cursor-pointer list-none text-[14px] font-medium marker:content-none">
              <h3 className="inline">{item.question}</h3>
              <span
                aria-hidden
                className="float-right text-[var(--color-ink-faint)] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
              {item.answer}
            </p>
            {item.more ? (
              <Link
                href={item.more.href}
                className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-accent)] hover:underline"
              >
                {item.more.label} <span aria-hidden>&rarr;</span>
              </Link>
            ) : null}
          </details>
        ))}
      </div>
    </section>
  );
}

export function Glossary() {
  return (
    <section
      id="glossary"
      className="@container mx-auto w-full max-w-[1180px] px-4 py-10 @2xl:px-6"
    >
      <h2 className="text-[20px] font-semibold tracking-tight @2xl:text-[24px]">
        What the columns on an experience rating worksheet mean
      </h2>
      <dl className="mt-5 grid gap-x-6 gap-y-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {GLOSSARY.map((entry) => (
          <div key={entry.term}>
            <dt className="text-[13.5px] font-semibold">{entry.term}</dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {entry.definition}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Destinations() {
  return (
    <section
      id="more"
      className="@container mx-auto w-full max-w-[1180px] px-4 py-10 @2xl:px-6"
    >
      <h2 className="text-[20px] font-semibold tracking-tight @2xl:text-[24px]">
        More from CertifyMe
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        An experience mod is set by claims. The CertifyMe businesses work on the
        safety side of that: the forklift and aerial lift operator training OSHA
        requires employers to provide, and keeping the records that show it was
        done.
      </p>
      <div className="mt-5 grid gap-3 @2xl:grid-cols-3">
        {DESTINATIONS.map((link) => (
          <DestinationCard key={link.url} link={link} context="footer" />
        ))}
      </div>
    </section>
  );
}

export function Disclaimer() {
  return (
    <section className="@container mx-auto w-full max-w-[1180px] px-4 pb-12 @2xl:px-6">
      <p className="max-w-4xl text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
        {TOOL_NAME} recalculates the figures printed on a worksheet you supply,
        using the NCCI experience rating formula. It works from that one
        document and cannot see claim files, reserving rationale, payroll
        records or filed rates, so what it reports are points to check with your
        agent, broker or carrier rather than findings of error. It is not legal,
        actuarial or insurance advice. NCCI is a registered trademark of the
        National Council on Compensation Insurance, Inc., which is not
        affiliated with this tool and does not endorse it.
      </p>
    </section>
  );
}
