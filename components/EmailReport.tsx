"use client";

import { useId, useState } from "react";
import type { ToolError } from "@/lib/useEmodTool";
import { ErrorPanel } from "./ErrorPanel";
import { reportError } from "@/lib/report/errors";
import { Button, Spinner } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; to: string }
  | { kind: "failed"; error: ToolError };

/**
 * "Email me the PDF", through app/api/email-report and Resend.
 *
 * Only the finished report is sent, never the worksheet, and the disclosure
 * beside the button says so - the rest of the page promises nothing leaves the
 * browser, and this is the one place a visitor can choose otherwise.
 *
 * When the deployment has no Resend settings the button stays disabled and says
 * so. A button that appeared to send and quietly did nothing would be the same
 * failure this tool was rebuilt to stop: showing a result that did not happen.
 *
 * The promotions box is still visual only: it is not sent anywhere, because
 * where opt-ins are recorded is undecided. Before wiring it up:
 * - somewhere to record the opt-in with its wording and timestamp, which is a
 *   deliberate exception to the "nothing is persisted" rule in CLAUDE.md and
 *   should be written down there as one;
 * - a privacy policy link beside the checkbox.
 *
 * The box starts unticked and stays independent of getting the report.
 * Pre-ticked consent is invalid in the EU and Canada, and making the report
 * conditional on marketing consent would undercut the tool being free.
 */
export function EmailReport({
  enabled,
  disabled,
  buildPdf,
  onSent,
}: {
  enabled: boolean;
  /** True while a report is being built for download, or no sections are chosen. */
  disabled: boolean;
  buildPdf: () => Promise<{ blob: Blob; filename: string }>;
  onSent: () => void;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const deliver = async () => {
    const to = email.trim();
    setStatus({ kind: "sending" });

    let report: { blob: Blob; filename: string };
    try {
      report = await buildPdf();
    } catch (e) {
      setStatus({ kind: "failed", error: reportError(e) });
      return;
    }

    const form = new FormData();
    form.set("email", to);
    form.set("filename", report.filename);
    form.set("report", report.blob, report.filename);

    try {
      const response = await fetch("/api/email-report", {
        method: "POST",
        body: form,
      });
      if (response.ok) {
        setStatus({ kind: "sent", to });
        onSent();
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        error?: ToolError;
      } | null;
      setStatus({
        kind: "failed",
        error: body?.error ?? {
          code: "email",
          message: `The report could not be emailed (status ${response.status}).`,
          hint: "The PDF can still be downloaded from the button above.",
          retryable: true,
        },
      });
    } catch {
      setStatus({
        kind: "failed",
        error: {
          code: "network",
          message: "The report could not be sent: the connection failed.",
          hint: "Checking your connection and trying again may work. The PDF can still be downloaded from the button above.",
          retryable: true,
        },
      });
    }
  };

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    void deliver();
  };

  const sending = status.kind === "sending";

  return (
    <form onSubmit={send} className="border-t border-[var(--color-line)] pt-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
        Email it instead
      </h3>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label htmlFor={`${id}-email`} className="min-w-0 flex-1 basis-64">
          <span className="block text-[12.5px] font-medium">Email address</span>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status.kind !== "sending") setStatus({ kind: "idle" });
            }}
            className="mt-1.5 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-2.5 py-1.5 text-[13px]"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={!enabled || disabled || sending}
          aria-describedby={`${id}-status`}
        >
          {sending ? "Sending…" : "Email the PDF"}
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

      <div id={`${id}-status`} className="mt-3 space-y-2" aria-live="polite">
        {!enabled ? (
          <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            <span className="font-medium text-[var(--color-ink)]">
              Coming soon.
            </span>{" "}
            Emailing reports is not switched on yet, so nothing entered here is
            sent or saved. Download the PDF above in the meantime.
          </p>
        ) : (
          <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            Emailing sends the finished report, not your worksheet, through our
            server and our email provider, Resend, to the address you enter.
            This tool keeps no copy of either.
          </p>
        )}

        {sending ? <Spinner label="Generating and sending the report…" /> : null}

        {status.kind === "sent" ? (
          <p className="rounded-md border border-[var(--color-positive)]/35 bg-[var(--color-positive-soft)] px-3 py-2 text-[12.5px] leading-relaxed">
            Sent to <span className="font-medium">{status.to}</span>. It can
            take a minute to arrive; if it does not, the spam folder is worth a
            look.
          </p>
        ) : null}

        {status.kind === "failed" ? (
          <ErrorPanel
            error={status.error}
            onRetry={status.error.retryable ? () => void deliver() : undefined}
            tone="caution"
          />
        ) : null}
      </div>
    </form>
  );
}
