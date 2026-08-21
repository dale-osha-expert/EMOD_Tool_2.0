import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError } from "@/lib/llm/errors";
import { callGemini } from "@/lib/llm/gemini";
import { AiNarrativeSchema } from "@/lib/llm/schema";

/**
 * The previous build of this tool silently substituted default values when the
 * model call failed — most consequentially when the model it used was retired.
 * These tests exist to make that class of failure impossible to reintroduce:
 * every path below must raise a typed, named error and must never return a
 * usable-looking result.
 */

const call = () =>
  callGemini({
    apiKey: "test-key",
    model: "gemini-3.6-flash",
    parts: [{ text: "hello" }],
  });

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("AI failures never degrade into defaults", () => {
  it("names a retired model instead of falling back", async () => {
    respond(404, {
      error: { code: 404, status: "NOT_FOUND", message: "models/x is not found" },
    });
    const error = await call().catch((e) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe("model_unavailable");
    expect(error.message).toContain("gemini-3.6-flash");
    expect(error.retryable).toBe(false);
  });

  it("detects a retired model from the body even on a 400", async () => {
    respond(400, { error: { message: "model is not found for API version" } });
    await expect(call()).rejects.toMatchObject({ code: "model_unavailable" });
  });

  it("reports rate limiting as retryable", async () => {
    respond(429, { error: { status: "RESOURCE_EXHAUSTED" } });
    const error = await call().catch((e) => e);
    expect(error.code).toBe("rate_limited");
    expect(error.retryable).toBe(true);
  });

  it("reports a rejected key", async () => {
    respond(403, { error: { status: "PERMISSION_DENIED" } });
    await expect(call()).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("rejects an empty candidate list", async () => {
    respond(200, { candidates: [] });
    await expect(call()).rejects.toMatchObject({ code: "bad_response" });
  });

  it("rejects a truncated response rather than using the fragment", async () => {
    respond(200, {
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"sum' }] } },
      ],
    });
    const error = await call().catch((e) => e);
    expect(error.code).toBe("bad_response");
    // The specific cause reaches the user through the hint.
    expect(error.hint).toContain("cut off");
  });

  it("reports a safety block distinctly", async () => {
    respond(200, { promptFeedback: { blockReason: "SAFETY" } });
    await expect(call()).rejects.toMatchObject({ code: "blocked" });
  });

  it("reports a transport failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    const error = await call().catch((e) => e);
    expect(error.code).toBe("network");
    expect(error.retryable).toBe(true);
  });

  it("carries a user-facing hint on every failure", async () => {
    for (const [status, body] of [
      [404, { error: { status: "NOT_FOUND" } }],
      [429, {}],
      [401, {}],
      [200, { candidates: [] }],
    ] as const) {
      respond(status, body);
      const error = await call().catch((e) => e);
      expect(error).toBeInstanceOf(AiError);
      expect(error.hint.length).toBeGreaterThan(20);
    }
  });
});

describe("narrative validation", () => {
  it("rejects a response missing required fields", () => {
    expect(
      AiNarrativeSchema.safeParse({ summary: "ok" }).success,
    ).toBe(false);
  });

  it("rejects an empty summary rather than rendering a blank section", () => {
    expect(
      AiNarrativeSchema.safeParse({
        summary: "",
        recommendations: [],
        discrepancies: [],
      }).success,
    ).toBe(false);
  });

  it("accepts a well-formed response", () => {
    expect(
      AiNarrativeSchema.safeParse({
        summary: "The mod sits above its loss-free minimum.",
        recommendations: [
          { title: "Review the open claim", rationale: "It is movable.", priority: "high" },
        ],
        discrepancies: [],
      }).success,
    ).toBe(true);
  });
});
