"use client";

import { useState } from "react";
import { useEmodTool } from "@/lib/useEmodTool";
import { AiPanel } from "./AiPanel";
import { ClaimsTable } from "./ClaimsTable";
import { ErrorPanel } from "./ErrorPanel";
import { FindingsList } from "./FindingsList";
import { ManualEntry } from "./ManualEntry";
import { ModSummary } from "./ModSummary";
import { ReconciliationPanel } from "./ReconciliationPanel";
import { ReportBuilder } from "./ReportBuilder";
import { ScanConsent } from "./ScanConsent";
import { ScenariosPanel } from "./ScenariosPanel";
import { Uploader } from "./Uploader";
import { Button } from "./ui";

/**
 * The whole tool.
 *
 * Layout keys off container width rather than viewport width throughout, so the
 * same component works full-screen and as a narrow iframe on a wider page.
 */
export function EmodTool({ chrome = true }: { chrome?: boolean }) {
  const tool = useEmodTool();
  const [manual, setManual] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);

  const busy = tool.stage === "reading" || tool.stage === "transcribing";

  // Figures that do not reconcile are withheld until the user has seen why and
  // chosen to look anyway. Showing a confident mod built on values we know do
  // not tie out is the failure this tool exists to avoid.
  const blocked =
    tool.analysis !== null &&
    !tool.analysis.reconciliation.passed &&
    !showUnverified;

  return (
    <div className="@container mx-auto w-full max-w-[1180px] px-4 py-5 @2xl:px-6 @2xl:py-7">
      {chrome ? (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold tracking-tight @2xl:text-[22px]">
              Experience Modification Analyser
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              Recalculates an NCCI experience rating worksheet, shows what each
              claim is costing, and exports a report. Everything runs in your
              browser, and nothing is saved.
            </p>
          </div>
          {tool.stage === "ready" ? (
            <Button variant="secondary" onClick={() => {
                tool.reset();
                setManual(false);
                setShowUnverified(false);
              }}>
              New worksheet
            </Button>
          ) : null}
        </header>
      ) : null}

      {/* ---- Input stage ---- */}
      {tool.stage === "idle" && !manual ? (
        <div className="space-y-3">
          <Uploader onFile={tool.openFile} busy={false} busyLabel="" />
          <p className="text-center text-[13px] text-[var(--color-ink-muted)]">
            No worksheet to hand?{" "}
            <button
              onClick={() => setManual(true)}
              className="text-[var(--color-accent)] underline underline-offset-2"
            >
              Enter the summary figures instead
            </button>
          </p>
        </div>
      ) : null}

      {busy ? (
        <Uploader
          onFile={tool.openFile}
          busy
          busyLabel={
            tool.stage === "transcribing"
              ? "Transcribing the scan…"
              : "Reading the worksheet…"
          }
        />
      ) : null}

      {tool.stage === "scan-detected" ? (
        <ScanConsent
          fileName={tool.fileName}
          onTranscribe={tool.transcribeScan}
          onManual={() => {
            tool.dismissScan();
            setManual(true);
          }}
          onCancel={() => {
            tool.reset();
            setManual(false);
          }}
        />
      ) : null}

      {manual && tool.stage !== "ready" ? (
        <div className="mt-3">
          <ManualEntry
            onSubmit={(worksheet) => {
              tool.applyCorrections(worksheet);
              setManual(false);
            }}
            onCancel={() => setManual(false)}
          />
        </div>
      ) : null}

      {tool.stage === "failed" && tool.error ? (
        <div className="space-y-3">
          <ErrorPanel
            error={tool.error}
            onReset={() => {
              tool.reset();
              setManual(false);
            }}
          />
          <p className="text-[13px] text-[var(--color-ink-muted)]">
            You can also{" "}
            <button
              onClick={() => {
                tool.reset();
                setManual(true);
              }}
              className="text-[var(--color-accent)] underline underline-offset-2"
            >
              enter the summary figures by hand
            </button>
            .
          </p>
        </div>
      ) : null}

      {/* ---- Results ---- */}
      {tool.stage === "ready" && tool.analysis ? (
        <div className="space-y-4">
          {tool.source === "transcribed" ? (
            <p className="rounded-md border border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)] px-3 py-2 text-[12.5px] leading-relaxed">
              These figures came from an AI transcription of a scanned document,
              not from the file itself. The verification below is what tells you
              whether the transcription was read correctly — worth a look before
              relying on anything here.
            </p>
          ) : null}

          <ReconciliationPanel
            result={tool.analysis.reconciliation}
            source={tool.source}
          />

          {blocked ? (
            <div className="rounded-lg border border-[var(--color-critical)]/35 bg-[var(--color-critical-soft)] px-4 py-4">
              <p className="text-[14px] font-semibold text-[var(--color-critical)]">
                The calculated figures are being withheld
              </p>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed">
                {tool.analysis.reconciliation.failedCount} of the arithmetic
                checks above did not tie out, listed with the exact cells
                involved. Either the worksheet was misread, or the worksheet
                itself is inconsistent. Until that is resolved, anything
                calculated from these values could be wrong, so it is not being
                shown as though it were reliable.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    tool.reset();
                    setManual(true);
                  }}
                >
                  Enter the figures by hand
                </Button>
                <Button variant="ghost" onClick={() => setShowUnverified(true)}>
                  Show them anyway
                </Button>
              </div>
            </div>
          ) : null}

          {!blocked ? (
            <>
              {!tool.analysis.reconciliation.passed ? (
                <p className="rounded-md border border-[var(--color-critical)]/35 bg-[var(--color-critical-soft)] px-3 py-2 text-[12.5px] leading-relaxed">
                  These figures did not fully reconcile against the source
                  document. Treat everything below as unverified until the
                  checks above are resolved.
                </p>
              ) : null}

              <ModSummary analysis={tool.analysis} />
              <ScenariosPanel analysis={tool.analysis} />
              <FindingsList findings={tool.analysis.findings} />
              <ClaimsTable analysis={tool.analysis} />
            </>
          ) : null}

          {!blocked ? (
          <AiPanel
            ai={tool.ai}
            onRequest={tool.requestNarrative}
            userKey={tool.userKey}
            onUserKeyChange={tool.setUserKey}
            shareIdentity={tool.shareIdentity}
            onShareIdentityChange={tool.setShareIdentity}
          />
          ) : null}

          {!blocked ? (
            <ReportBuilder
              analysis={tool.analysis}
              narrative={tool.ai.narrative}
            />
          ) : null}

          <footer className="pb-2 pt-1 text-[11.5px] leading-relaxed text-[var(--color-ink-faint)]">
            Calculations are derived from your worksheet using the NCCI
            experience rating formula. This tool sees one document and cannot
            see claim files, reserving rationale or payroll records, so its
            observations are points to check rather than findings of error. It
            is not legal, actuarial or insurance advice. Nothing you upload is
            stored; refreshing this page clears it.
          </footer>
        </div>
      ) : null}
    </div>
  );
}
