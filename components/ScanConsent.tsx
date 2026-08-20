"use client";

import { Button } from "./ui";

/**
 * The one point in the tool where a client document would leave the browser.
 * It says so plainly, and it is never the default: the alternative of entering
 * the figures by hand is offered with equal weight.
 */
export function ScanConsent({
  fileName,
  onTranscribe,
  onManual,
  onCancel,
}: {
  fileName: string | null;
  onTranscribe: () => void;
  onManual: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)] px-4 py-4">
      <p className="text-[14px] font-semibold text-[var(--color-caution)]">
        This file is a scan, not a digital worksheet
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink)]">
        {fileName ? <span className="font-medium">{fileName}</span> : "This file"}{" "}
        contains no text layer, so its figures cannot be read directly. Nothing
        has been sent anywhere.
      </p>

      <div className="mt-3.5 grid gap-3 @md:grid-cols-2">
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
          <p className="text-[13px] font-semibold">Transcribe it with AI</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
            This <strong>sends the document to Google&rsquo;s Gemini API</strong> to
            be read. It leaves your browser. The figures it returns are checked
            against the worksheet&rsquo;s own arithmetic, so a misreading is caught
            rather than trusted.
          </p>
          <Button size="sm" variant="primary" className="mt-2.5" onClick={onTranscribe}>
            Send and transcribe
          </Button>
        </div>

        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
          <p className="text-[13px] font-semibold">Enter the figures yourself</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
            Type in the summary figures from the first page. Nothing leaves your
            browser, and the recalculation, scenarios and report all work
            normally.
          </p>
          <Button size="sm" variant="secondary" className="mt-2.5" onClick={onManual}>
            Enter by hand
          </Button>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="mt-3 text-[12.5px] text-[var(--color-ink-muted)] underline underline-offset-2 hover:text-[var(--color-ink)]"
      >
        Use a different file
      </button>
    </div>
  );
}
