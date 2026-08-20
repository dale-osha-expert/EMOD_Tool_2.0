"use client";

import { useCallback, useRef, useState } from "react";
import { analyzeWorksheet, WorksheetParseError } from "./analyze";
import { parseWorksheet } from "./parse/worksheet";
import { extractTextLayer } from "./parse/textLayer";
import { toWorksheet, type ExtractedWorksheet } from "./llm/extraction";
import { buildAnalysisPayload, restoreNarrative } from "./llm/payload";
import type { AiErrorCode } from "./llm/errors";
import type { AiNarrative, Analysis, Worksheet } from "./types";

export interface ToolError {
  code: string;
  message: string;
  hint: string;
  retryable?: boolean;
}

export type Stage =
  | "idle"
  | "reading"
  | "scan-detected"
  | "transcribing"
  | "ready"
  | "failed";

export interface AiState {
  status: "idle" | "loading" | "done" | "failed";
  narrative: AiNarrative | null;
  error: ToolError | null;
  model: string | null;
}

/**
 * All application state, held in React memory only.
 *
 * Nothing is written to localStorage, sessionStorage, cookies, IndexedDB or any
 * server. Refreshing the page loses everything, which is the intended
 * behaviour for a tool handling other people's injury and payroll data.
 */
export function useEmodTool() {
  const [stage, setStage] = useState<Stage>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<"parsed" | "transcribed" | "manual">(
    "parsed",
  );
  const [ai, setAi] = useState<AiState>({
    status: "idle",
    narrative: null,
    error: null,
    model: null,
  });
  const [userKey, setUserKey] = useState<string>("");
  const [shareIdentity, setShareIdentity] = useState(false);

  /** Held only while the user decides whether to send a scan for transcription. */
  const pendingScan = useRef<{ bytes: ArrayBuffer; pageCount: number } | null>(
    null,
  );

  const reset = useCallback(() => {
    pendingScan.current = null;
    setStage("idle");
    setAnalysis(null);
    setError(null);
    setFileName(null);
    setSource("parsed");
    setAi({ status: "idle", narrative: null, error: null, model: null });
  }, []);

  const loadWorksheet = useCallback(
    (worksheet: Worksheet, origin: "parsed" | "transcribed" | "manual") => {
      try {
        setAnalysis(analyzeWorksheet(worksheet));
        setSource(origin);
        setStage("ready");
        setError(null);
      } catch (e) {
        setError(toToolError(e));
        setStage("failed");
      }
    },
    [],
  );

  const openFile = useCallback(
    async (file: File) => {
      reset();
      setFileName(file.name);
      setStage("reading");

      try {
        const bytes = await file.arrayBuffer();
        // pdf.js takes ownership of the buffer it is given, so keep a copy for
        // the transcription path in case this turns out to be a scan.
        const doc = await extractTextLayer(bytes.slice(0));

        if (!doc.hasTextLayer) {
          pendingScan.current = { bytes, pageCount: doc.pages.length };
          setStage("scan-detected");
          return;
        }

        loadWorksheet(parseWorksheet(doc), "parsed");
      } catch (e) {
        setError(toToolError(e));
        setStage("failed");
      }
    },
    [loadWorksheet, reset],
  );

  /** Sends the scanned document for transcription, only after explicit consent. */
  const transcribeScan = useCallback(async () => {
    const pending = pendingScan.current;
    if (!pending) return;

    setStage("transcribing");
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pdfBase64: toBase64(pending.bytes),
          pageCount: pending.pageCount,
          ...(userKey ? { apiKey: userKey } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(normalizeApiError(data));
        setStage("failed");
        return;
      }

      const worksheet = toWorksheet(
        data.worksheet as ExtractedWorksheet,
        pending.pageCount,
      );
      pendingScan.current = null;
      loadWorksheet(worksheet, "transcribed");
    } catch (e) {
      setError(toToolError(e));
      setStage("failed");
    }
  }, [loadWorksheet, userKey]);

  /** Re-runs the analysis after the user corrects a figure by hand. */
  const applyCorrections = useCallback(
    (worksheet: Worksheet) => {
      loadWorksheet(worksheet, source === "parsed" ? "manual" : source);
      setAi({ status: "idle", narrative: null, error: null, model: null });
    },
    [loadWorksheet, source],
  );

  const requestNarrative = useCallback(async () => {
    if (!analysis) return;
    setAi({ status: "loading", narrative: null, error: null, model: null });

    const { payload, redaction } = buildAnalysisPayload(analysis, {
      includeIdentity: shareIdentity,
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload, ...(userKey ? { apiKey: userKey } : {}) }),
      });

      const data = await response.json();
      if (!response.ok) {
        setAi({
          status: "failed",
          narrative: null,
          error: normalizeApiError(data),
          model: null,
        });
        return;
      }

      setAi({
        status: "done",
        narrative: restoreNarrative(data.narrative as AiNarrative, redaction),
        error: null,
        model: data.model ?? null,
      });
    } catch (e) {
      setAi({
        status: "failed",
        narrative: null,
        error: toToolError(e),
        model: null,
      });
    }
  }, [analysis, shareIdentity, userKey]);

  return {
    stage,
    analysis,
    error,
    fileName,
    source,
    ai,
    userKey,
    setUserKey,
    shareIdentity,
    setShareIdentity,
    openFile,
    transcribeScan,
    applyCorrections,
    requestNarrative,
    reset,
    dismissScan: reset,
  };
}

function toToolError(error: unknown): ToolError {
  if (error instanceof WorksheetParseError) {
    return { code: "parse", message: error.message, hint: error.hint };
  }
  if (error instanceof Error) {
    // pdf.js reports a password-protected file this way.
    if (/password/i.test(error.message)) {
      return {
        code: "encrypted",
        message: "This PDF is password protected.",
        hint: "Remove the password, or save an unprotected copy, and try again. The file is read entirely in your browser, so it is never sent anywhere.",
      };
    }
    if (/Invalid PDF|InvalidPDFException|corrupt/i.test(error.message)) {
      return {
        code: "invalid",
        message: "That file could not be opened as a PDF.",
        hint: "Check the file downloaded completely, then try again.",
      };
    }
    return {
      code: "unknown",
      message: "The worksheet could not be read.",
      hint: error.message,
    };
  }
  return {
    code: "unknown",
    message: "Something went wrong reading the worksheet.",
    hint: "Try the file again. If it keeps failing, the figures can be entered by hand.",
  };
}

function normalizeApiError(data: unknown): ToolError {
  const raw = (data as { error?: Partial<ToolError> & { code?: AiErrorCode } })
    ?.error;
  return {
    code: raw?.code ?? "unknown",
    message: raw?.message ?? "The request failed.",
    hint:
      raw?.hint ??
      "Your calculations are complete and are not affected by this.",
    retryable: raw?.retryable,
  };
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
