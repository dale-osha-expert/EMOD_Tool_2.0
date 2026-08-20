import {
  AiError,
  badResponse,
  blocked,
  modelUnavailable,
  networkError,
  rateLimited,
  unauthorized,
} from "./errors";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiRequest {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  parts: GeminiPart[];
  responseSchema?: unknown;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * One call to Gemini, with every failure mapped to a typed error.
 *
 * Nothing here ever returns a fallback value. A caller that gets an AiError
 * shows it; a caller that gets text can trust it came from the model.
 */
export async function callGemini(req: GeminiRequest): Promise<string> {
  const url = `${ENDPOINT}/${encodeURIComponent(req.model)}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": req.apiKey,
      },
      signal: req.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: req.parts }],
        ...(req.systemInstruction
          ? { systemInstruction: { parts: [{ text: req.systemInstruction }] } }
          : {}),
        generationConfig: {
          temperature: req.temperature ?? 0.2,
          ...(req.responseSchema
            ? {
                responseMimeType: "application/json",
                responseSchema: req.responseSchema,
              }
            : {}),
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw networkError(
      error instanceof Error ? error.message : "unknown transport error",
    );
  }

  if (!response.ok) {
    throw mapHttpError(response.status, await safeText(response), req.model);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw badResponse("the service returned a body that was not JSON");
  }

  return extractText(payload);
}

function mapHttpError(status: number, body: string, model: string): AiError {
  // A retired or renamed model is the failure that silently broke the previous
  // build of this tool, so it gets its own message naming the model.
  if (status === 404 || /NOT_FOUND|is not found|not supported/i.test(body)) {
    return modelUnavailable(model);
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(body)) {
    return rateLimited();
  }
  if (status === 401 || status === 403 || /API_KEY|PERMISSION_DENIED/i.test(body)) {
    return unauthorized();
  }
  if (status >= 500) {
    return networkError(`the service returned ${status}`);
  }
  return badResponse(`the service returned ${status}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractText(payload: any): string {
  if (payload?.promptFeedback?.blockReason) throw blocked();

  const candidate = payload?.candidates?.[0];
  if (!candidate) throw badResponse("the response contained no candidates");

  if (
    candidate.finishReason &&
    !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)
  ) {
    if (candidate.finishReason === "SAFETY") throw blocked();
    throw badResponse(`the response ended with ${candidate.finishReason}`);
  }

  const text = (candidate.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!text) throw badResponse("the response contained no text");

  // A truncated response is not usable as structured output; say so rather than
  // handing the caller a fragment that will fail to parse for an unclear reason.
  if (candidate.finishReason === "MAX_TOKENS") {
    throw badResponse("the response was cut off before it finished");
  }

  return text;
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 2000);
  } catch {
    return "";
  }
}
