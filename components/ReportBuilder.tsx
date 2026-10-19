"use client";

import { useMemo, useState } from "react";
import type { AiNarrative, Analysis } from "@/lib/types";
import { PRESETS, SECTIONS, type SectionId } from "@/lib/report/presets";
import { track } from "@/lib/site/analytics";
import { Button, Card, CardHeader, cx, Spinner } from "./ui";
import { ErrorPanel } from "./ErrorPanel";
import type { ToolError } from "@/lib/useEmodTool";

export function ReportBuilder({
  analysis,
  narrative,
}: {
  analysis: Analysis;
  narrative: AiNarrative | null;
}) {
  const [presetId, setPresetId] = useState<string>("executive");
  const [custom, setCustom] = useState<SectionId[] | null>(null);
  const [includeIdentity, setIncludeIdentity] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<ToolError | null>(null);
  const [degraded, setDegraded] = useState(false);

  const sections = useMemo(() => {
    if (custom) return custom;
    return PRESETS.find((p) => p.id === presetId)?.sections ?? [];
  }, [custom, presetId]);

  const available = useMemo(
    () => SECTIONS.filter((s) => !s.requiresAi || narrative !== null),
    [narrative],
  );

  const toggle = (id: SectionId) => {
    const base = custom ?? sections;
    setCustom(
      base.includes(id) ? base.filter((s) => s !== id) : [...base, id],
    );
  };

  const download = async () => {
    setBuilding(true);
    setError(null);
    setDegraded(false);
    try {
      // Loaded on demand: the renderer is a large dependency and most sessions
      // never reach this step.
      const [{ pdf }, { EmodReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/report/document"),
      ]);

      const title = "Experience Modification Analysis";
      const ordered = SECTIONS.filter((s) => sections.includes(s.id)).map(
        (s) => s.id,
      );

      const render = (omitPageNumbers: boolean) =>
        pdf(
          <EmodReport
            analysis={analysis}
            narrative={narrative}
            options={{ sections: ordered, title, includeIdentity, omitPageNumbers }}
          />,
        ).toBlob();

      // Numbering the pages needs a per-page callback, and on a long report
      // that makes the PDF layout engine fail. Retry without it rather than
      // hand back nothing: a report missing its page numbers is still the
      // report, and the note below says what was lost.
      let blob: Blob;
      try {
        blob = await render(false);
      } catch {
        blob = await render(true);
        setDegraded(true);
      }

      // Counts that a report was produced, and which preset. Nothing about
      // the worksheet behind it.
      track("report_downloaded", {
        preset: custom ? "custom" : presetId,
        sections: sections.length,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileStem(analysis, includeIdentity)}.pdf`;
      link.click();
      // Revoke on the next tick so the click has taken effect first.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError({
        code: "report",
        message: "The report could not be generated.",
        hint:
          e instanceof Error
            ? `${e.message}. Everything on this page is still available on screen.`
            : "Everything on this page is still available on screen.",
        retryable: true,
      });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Export a report"
        subtitle="Generated in your browser as a PDF. Nothing is uploaded."
      />

      <div className="space-y-4 px-4 py-4">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
            Template
          </h3>
          <div className="mt-2 grid gap-2 @md:grid-cols-2 @3xl:grid-cols-4">
            {PRESETS.map((preset) => {
              const active = !custom && preset.id === presetId;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setPresetId(preset.id);
                    setCustom(null);
                  }}
                  className={cx(
                    "rounded-md border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-line)] hover:bg-[var(--color-surface)]",
                  )}
                >
                  <span className="block text-[13px] font-medium">
                    {preset.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-ink-muted)]">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
              Sections {custom ? "(custom)" : "(from template)"}
            </h3>
            {custom ? (
              <button
                onClick={() => setCustom(null)}
                className="text-[12px] text-[var(--color-accent)] underline underline-offset-2"
              >
                Reset to template
              </button>
            ) : null}
          </div>

          <div className="mt-2 grid gap-1.5 @md:grid-cols-2 @3xl:grid-cols-3">
            {available.map((section) => (
              <label
                key={section.id}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--color-line)] px-2.5 py-2 text-[12.5px] hover:bg-[var(--color-surface)]"
              >
                <input
                  type="checkbox"
                  checked={sections.includes(section.id)}
                  onChange={() => toggle(section.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{section.label}</span>
                  <span className="block leading-snug text-[var(--color-ink-muted)]">
                    {section.description}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {narrative === null ? (
            <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">
              The two AI-written sections appear here once the written analysis
              has been generated. The report works without them.
            </p>
          ) : null}
        </div>

        <label className="flex items-start gap-2.5 text-[13px]">
          <input
            type="checkbox"
            checked={includeIdentity}
            onChange={(e) => setIncludeIdentity(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Include the company name and risk ID in the report
            <span className="mt-0.5 block text-[12px] text-[var(--color-ink-muted)]">
              Turn this off to produce an anonymised copy.
            </span>
          </span>
        </label>

        {error ? <ErrorPanel error={error} onRetry={download} tone="caution" /> : null}

        {degraded ? (
          <p className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
            This report was long enough that page numbering had to be left out —
            the PDF is otherwise complete. Selecting fewer sections will restore
            the numbering.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={download}
            disabled={building || sections.length === 0}
          >
            {building ? "Generating…" : "Download PDF"}
          </Button>
          {building ? <Spinner label="Rendering the report…" /> : null}
          {sections.length === 0 ? (
            <span className="text-[12.5px] text-[var(--color-ink-muted)]">
              Choose at least one section.
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function fileStem(analysis: Analysis, includeIdentity: boolean): string {
  const parts = ["emod-analysis"];
  if (includeIdentity && analysis.worksheet.riskName) {
    parts.push(
      analysis.worksheet.riskName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40),
    );
  }
  const date = analysis.worksheet.ratingEffectiveDate?.replace(/\//g, "-");
  if (date) parts.push(date);
  return parts.join("_");
}
