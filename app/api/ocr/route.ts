import { NextResponse } from "next/server";
import { AiError, notConfigured } from "@/lib/llm/errors";
import {
  ExtractedWorksheetSchema,
  GEMINI_EXTRACTION_SCHEMA,
} from "@/lib/llm/extraction";
import { callGemini } from "@/lib/llm/gemini";
import { OCR_INSTRUCTION } from "@/lib/llm/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Gemini's inline-data ceiling is well above this; the guard is for our own sake. */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * The opt-in fallback for scanned worksheets that carry no text layer.
 *
 * This is the only path on which a client document leaves the browser, and it
 * is reached only after the user has been told that plainly and agreed. The
 * result is structured data that goes through exactly the same reconciliation
 * gate as a locally parsed worksheet, so a transcription error is caught by
 * arithmetic rather than trusted.
 */
export async function POST(request: Request) {
  let body: { pdfBase64?: string; apiKey?: string; pageCount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Malformed request body." } },
      { status: 400 },
    );
  }

  const apiKey = body.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  const model =
    process.env.GEMINI_VISION_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.5-flash-lite";

  if (!apiKey) {
    return NextResponse.json({ error: notConfigured().toJSON() }, { status: 503 });
  }
  if (!body.pdfBase64) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "No document supplied." } },
      { status: 400 },
    );
  }
  if (body.pdfBase64.length * 0.75 > MAX_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: "That file is too large to transcribe.",
          hint: "Scanned worksheets above roughly 12 MB cannot be sent. A lower-resolution scan, or the digital original from your carrier or agent, would work.",
        },
      },
      { status: 413 },
    );
  }

  try {
    const text = await callGemini({
      apiKey,
      model,
      systemInstruction: OCR_INSTRUCTION,
      parts: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: body.pdfBase64,
          },
        },
        {
          text: "Transcribe this experience rating worksheet into the required JSON structure. Read only what is printed.",
        },
      ],
      responseSchema: GEMINI_EXTRACTION_SCHEMA,
      // Transcription, not composition: leave no room for creative completion.
      temperature: 0,
    });

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new AiError(
        "bad_response",
        "The transcription could not be read.",
        "The document was not transcribed into a usable form. Entering the summary figures by hand is the reliable route for this file.",
        true,
      );
    }

    const parsed = ExtractedWorksheetSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AiError(
        "bad_response",
        "The transcription did not contain the fields this tool needs.",
        "Rather than work from a partial reading of your worksheet, nothing has been loaded. Entering the summary figures by hand is the reliable route for this file.",
        true,
      );
    }

    return NextResponse.json(
      { worksheet: parsed.data, model },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiError) {
      const status =
        error.code === "rate_limited"
          ? 429
          : error.code === "unauthorized"
            ? 401
            : 502;
      return NextResponse.json({ error: error.toJSON() }, { status });
    }
    return NextResponse.json(
      {
        error: {
          code: "network",
          message: "The transcription request failed unexpectedly.",
          hint: "Entering the summary figures by hand is the reliable route for this file.",
          retryable: true,
        },
      },
      { status: 502 },
    );
  }
}
