"use client";

import type { ToolError } from "@/lib/useEmodTool";
import { Button } from "./ui";

/**
 * Errors are a first-class part of the interface, not a toast that disappears.
 * Every one states what failed, what it means, and what can still be done —
 * because the alternative, quietly carrying on with substituted values, is the
 * specific failure this rebuild exists to eliminate.
 */
export function ErrorPanel({
  error,
  onRetry,
  onReset,
  tone = "critical",
}: {
  error: ToolError;
  onRetry?: () => void;
  onReset?: () => void;
  tone?: "critical" | "caution";
}) {
  const accent =
    tone === "caution"
      ? "border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)]"
      : "border-[var(--color-critical)]/35 bg-[var(--color-critical-soft)]";
  const heading =
    tone === "caution" ? "text-[var(--color-caution)]" : "text-[var(--color-critical)]";

  return (
    <div className={`rounded-lg border px-4 py-3.5 ${accent}`} role="alert">
      <p className={`text-[14px] font-semibold ${heading}`}>{error.message}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink)]">
        {error.hint}
      </p>
      {(onRetry && error.retryable) || onReset ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onRetry && error.retryable ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {onReset ? (
            <Button size="sm" variant="ghost" onClick={onReset}>
              Start over
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
