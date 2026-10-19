"use client";

import { useState } from "react";
import type { AiState } from "@/lib/useEmodTool";
import { Badge, Button, Card, CardHeader, Spinner } from "./ui";
import { ErrorPanel } from "./ErrorPanel";

const PRIORITY_SEVERITY = {
  high: "error",
  medium: "warning",
  low: "info",
} as const;

/**
 * The AI layer is strictly additive. Everything above it on the page is already
 * complete and calculated; this panel adds written analysis on top. When it
 * fails it says so and stays visibly absent, rather than leaving the reader to
 * assume the analysis simply had nothing to say.
 */
export function AiPanel({
  ai,
  onRequest,
  userKey,
  onUserKeyChange,
  shareIdentity,
  onShareIdentityChange,
}: {
  ai: AiState;
  onRequest: () => void;
  userKey: string;
  onUserKeyChange: (value: string) => void;
  shareIdentity: boolean;
  onShareIdentityChange: (value: boolean) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Written analysis"
        subtitle="Optional. Sends the calculated figures — not the PDF — to Google's Gemini to be written up and cross-checked."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowOptions((v) => !v)}>
              Options
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={onRequest}
              disabled={ai.status === "loading"}
            >
              {ai.status === "done" ? "Regenerate" : "Generate"}
            </Button>
          </div>
        }
      />

      {showOptions ? (
        <div className="space-y-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
          <label className="flex items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={shareIdentity}
              onChange={(e) => onShareIdentityChange(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Include the company name and risk ID
              <span className="mt-0.5 block text-[12px] text-[var(--color-ink-muted)]">
                Off by default. Claim numbers are always replaced with
                placeholders before sending and restored afterwards.
              </span>
            </span>
          </label>

          <label className="block text-[13px]">
            <span className="font-medium">Your own Gemini API key</span>
            <span className="mt-0.5 block text-[12px] text-[var(--color-ink-muted)]">
              Optional. Uses your quota instead of this deployment&rsquo;s. Held in
              memory for this session only and never stored.
            </span>
            <input
              type="password"
              value={userKey}
              autoComplete="off"
              spellCheck={false}
              placeholder="Leave blank to use the server key"
              onChange={(e) => onUserKeyChange(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-2.5 py-1.5 text-[13px]"
            />
          </label>
        </div>
      ) : null}

      <div className="px-4 py-4">
        {ai.status === "idle" ? (
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            The recalculation, scenarios, observations and report are all
            complete without this step. Generating the written analysis adds a
            plain-language summary and a prioritized set of suggestions, and asks
            the model to check our reading of the worksheet against the source
            text.
          </p>
        ) : null}

        {ai.status === "loading" ? <Spinner label="Writing the analysis…" /> : null}

        {ai.status === "failed" && ai.error ? (
          <ErrorPanel error={ai.error} onRetry={onRequest} tone="caution" />
        ) : null}

        {ai.status === "done" && ai.narrative ? (
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)] px-3.5 py-3">
              <p className="text-[13.5px] leading-relaxed">
                {ai.narrative.summary}
              </p>
            </div>

            {ai.narrative.recommendations.length > 0 ? (
              <ol className="space-y-2.5">
                {ai.narrative.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-[var(--color-line)] px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge severity={PRIORITY_SEVERITY[rec.priority]}>
                        {rec.priority}
                      </Badge>
                      <h3 className="text-[13.5px] font-semibold">{rec.title}</h3>
                      {rec.claimNumber ? (
                        <span className="tabular text-[12px] text-[var(--color-ink-muted)]">
                          claim {rec.claimNumber}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                      {rec.rationale}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}

            {ai.narrative.discrepancies.length > 0 ? (
              <div className="rounded-md border border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)] px-3.5 py-3">
                <h3 className="text-[13px] font-semibold text-[var(--color-caution)]">
                  The model read {ai.narrative.discrepancies.length} figure
                  {ai.narrative.discrepancies.length === 1 ? "" : "s"} differently
                </h3>
                <p className="mt-1 text-[12.5px] text-[var(--color-ink)]">
                  These are advisory. The calculated figures above come from the
                  document and have not been changed. Worth checking against the
                  original if any look significant.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {ai.narrative.discrepancies.map((d, i) => (
                    <li key={i} className="text-[12.5px]">
                      <span className="font-medium">{d.field}</span>: we read{" "}
                      <span className="tabular">{d.parsedValue}</span>, the model
                      read <span className="tabular">{d.modelValue}</span>.{" "}
                      <span className="text-[var(--color-ink-muted)]">{d.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-[11.5px] text-[var(--color-ink-faint)]">
              Written by {ai.model ?? "an AI model"}. AI-generated text can be
              wrong; the figures it cites come from your worksheet, but the
              reasoning is worth confirming with your agent or carrier.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
