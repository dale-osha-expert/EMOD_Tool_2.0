import { NextResponse } from "next/server";
import { AiError, notConfigured } from "@/lib/llm/errors";
import { callGemini } from "@/lib/llm/gemini";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "@/lib/llm/prompt";
import { AiNarrativeSchema, GEMINI_RESPONSE_SCHEMA } from "@/lib/llm/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nothing about a request is logged or stored. */
export async function POST(request: Request) {
  let body: { payload?: unknown; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Malformed request body." } },
      { status: 400 },
    );
  }

  // A user-supplied key takes precedence and is never persisted; it lives only
  // for the duration of this request.
  const apiKey = body.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

  if (!apiKey) {
    return NextResponse.json({ error: notConfigured().toJSON() }, { status: 503 });
  }
  if (!body.payload) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "No analysis payload supplied." } },
      { status: 400 },
    );
  }

  try {
    const text = await callGemini({
      apiKey,
      model,
      systemInstruction: SYSTEM_INSTRUCTION,
      parts: [{ text: buildUserPrompt(body.payload) }],
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2,
    });

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      // Withhold rather than show a fragment. A partial narrative is worse than
      // none, because the reader cannot tell what is missing.
      throw new AiError(
        "bad_response",
        "The AI returned a response this tool could not read.",
        "The written analysis has been withheld rather than shown in an unreliable state. Everything else on this page is calculated directly from your worksheet.",
        true,
      );
    }

    const parsed = AiNarrativeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AiError(
        "bad_response",
        "The AI response did not match the expected structure.",
        "The written analysis has been withheld rather than shown in a partial state. Everything else on this page is calculated directly from your worksheet.",
        true,
      );
    }

    return NextResponse.json(
      { narrative: parsed.data, model },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiError) {
      const status =
        error.code === "rate_limited"
          ? 429
          : error.code === "unauthorized"
            ? 401
            : error.code === "model_unavailable"
              ? 502
              : 502;
      return NextResponse.json({ error: error.toJSON() }, { status });
    }

    return NextResponse.json(
      {
        error: {
          code: "network",
          message: "The AI request failed unexpectedly.",
          hint: "Your calculations are complete and unaffected.",
          retryable: true,
        },
      },
      { status: 502 },
    );
  }
}
