import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeDocument } from "@/lib/analyze";
import { buildAnalysisPayload, restoreNarrative } from "@/lib/llm/payload";
import { POST } from "@/app/api/analyze/route";
import { loadFixture } from "./helpers";

const analysis = analyzeDocument(loadFixture("interstate-az-fl"));

function geminiReturns(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(payload) }] },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
}

const request = (body: unknown) =>
  new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "gemini-flash-latest");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the analyze route", () => {
  it("returns a validated narrative", async () => {
    geminiReturns({
      summary: "The mod sits above its loss-free minimum.",
      recommendations: [
        {
          title: "Review the open reserve",
          rationale: "It may be worth confirming with the adjuster.",
          claimNumber: "CLAIM-1",
          priority: "high",
        },
      ],
      discrepancies: [],
    });

    const { payload } = buildAnalysisPayload(analysis, {
      includeIdentity: false,
    });
    const response = await POST(request({ payload }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.narrative.summary).toContain("loss-free minimum");
    expect(data.model).toBe("gemini-flash-latest");
  });

  it("rejects a structurally invalid narrative rather than rendering part of it", async () => {
    geminiReturns({ summary: "fine", recommendations: "not an array" });

    const { payload } = buildAnalysisPayload(analysis, {
      includeIdentity: false,
    });
    const response = await POST(request({ payload }));

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error.code).toBe("bad_response");
    expect(data.narrative).toBeUndefined();
  });

  it("reports a missing key without calling out to anything", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(request({ payload: {} }));

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("prefers a user-supplied key over the server key", async () => {
    geminiReturns({ summary: "ok", recommendations: [], discrepancies: [] });

    await POST(request({ payload: {}, apiKey: "user-key" }));

    const [, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0];
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "user-key",
    );
  });
});

describe("what leaves the browser", () => {
  it("withholds identity by default and pseudonymises claim numbers", () => {
    const { payload, redaction } = buildAnalysisPayload(analysis, {
      includeIdentity: false,
    });
    const serialised = JSON.stringify(payload);

    expect(payload.meta.riskName).toBeUndefined();
    expect(payload.meta.riskId).toBeUndefined();

    for (const real of Object.values(redaction.claims)) {
      expect(serialised).not.toContain(real);
    }
    expect(payload.claims.map((c) => c.ref)).toEqual([
      "CLAIM-1",
      "CLAIM-2",
      "CLAIM-3",
    ]);
    // The identity also has to be gone from the free-text it carries.
    expect(serialised).not.toContain(analysis.worksheet.riskId!);
  });

  it("includes identity only when explicitly asked", () => {
    const { payload } = buildAnalysisPayload(analysis, {
      includeIdentity: true,
    });
    expect(payload.meta.riskId).toBe(analysis.worksheet.riskId);
  });

  it("never sends the document itself", () => {
    const { payload } = buildAnalysisPayload(analysis, {
      includeIdentity: true,
    });
    expect(payload).not.toHaveProperty("pdfBase64");
    expect(JSON.stringify(payload).length).toBeLessThan(120_000);
  });

  it("maps pseudonyms back to real claim numbers for display", () => {
    const { redaction } = buildAnalysisPayload(analysis, {
      includeIdentity: false,
    });
    const real = redaction.claims["CLAIM-1"];

    const restored = restoreNarrative(
      {
        summary: "CLAIM-1 is the largest.",
        recommendations: [
          {
            title: "Review CLAIM-1",
            rationale: "It is open.",
            claimNumber: "CLAIM-1",
            priority: "high",
          },
        ],
        discrepancies: [],
      },
      redaction,
    );

    expect(restored.summary).toBe(`${real} is the largest.`);
    expect(restored.recommendations[0].claimNumber).toBe(real);
  });
});
