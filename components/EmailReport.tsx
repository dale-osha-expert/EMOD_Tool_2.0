"use client";

import { useId, useState } from "react";
import { Button } from "./ui";

/**
 * "Email me the PDF", with an opt-in to promotions. Visual only for now.
 *
 * There is no delivery service and no decision yet on where addresses go, so
 * the send button is disabled and says so. A button that appeared to send and
 * quietly did nothing would be the same failure this tool was rebuilt to stop:
 * showing a result that did not happen. Nothing typed here leaves the browser
 * or is stored; it lives in component state and is gone on reload.
 *
 * Before switching it on:
 * - a server route that renders or receives the PDF and sends it, with a typed
 *   failure the visitor can see, as every other failure here has;
 * - somewhere to record the opt-in with its wording and timestamp, which is a
 *   deliberate exception to the "nothing is persisted" rule in CLAUDE.md and
 *   should be written down there as one;
 * - a privacy policy link beside the checkbox;
 * - new wording for the report card's "Nothing is uploaded" subtitle and the
 *   page's privacy promises, which an emailed PDF would no longer keep.
 *
 * The opt-in box starts unticked and stays independent of getting the report.
 * Pre-ticked consent is invalid in the EU and Canada, and making the report
 * conditional on marketing consent would undercut the tool being free.
 */
export function EmailReport() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);

  return (
    <div className="border-t border-[var(--color-line)] pt-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
        Email it instead
      </h3>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label htmlFor={`${id}-email`} className="min-w-0 flex-1 basis-64">
          <span className="block text-[12.5px] font-medium">Email address</span>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-2.5 py-1.5 text-[13px]"
          />
        </label>
        <Button variant="secondary" disabled aria-describedby={`${id}-status`}>
          Email the PDF
        </Button>
      </div>

      <label className="mt-3 flex items-start gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Receive email promotions
          <span className="mt-0.5 block text-[12px] text-[var(--color-ink-muted)]">
            Occasional offers from CertifyMe.net, CertifyMeOnline.net and
            Compliance Hub. Optional, and not needed to get your report.
          </span>
        </span>
      </label>

      <p
        id={`${id}-status`}
        className="mt-3 text-[12px] leading-relaxed text-[var(--color-ink-muted)]"
      >
        <span className="font-medium text-[var(--color-ink)]">Coming soon.</span>{" "}
        Emailing reports is not switched on yet, so nothing entered here is sent
        or saved. Download the PDF above in the meantime.
      </p>
    </div>
  );
}
