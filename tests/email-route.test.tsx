import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { POST } from "@/app/api/email-report/route";
import { analyzeDocument } from "@/lib/analyze";
import { resetRateLimits } from "@/lib/api/guard";
import { EmodReport } from "@/lib/report/document";
import { loadFixture } from "./helpers";

// The feature ships hidden (lib/email/feature.ts). These tests exercise the
// route as it behaves once switched on, so the logic stays verified while it
// waits; tests/email-hidden.test.ts covers the shipped, hidden state.
vi.mock("@/lib/email/feature", () => ({ EMAIL_FEATURE_ENABLED: true }));

const logo = `data:image/png;base64,${readFileSync(
  fileURLToPath(new URL("../public/logo-wordmark.png", import.meta.url)),
).toString("base64")}`;

/** A real report, so the route's "made by this tool" check is exercised for real. */
let report: Uint8Array<ArrayBuffer>;
beforeAll(async () => {
  report = new Uint8Array(
    await renderToBuffer(
      <EmodReport
        analysis={analyzeDocument(loadFixture("interstate-az-fl"))}
        narrative={null}
        options={{
          sections: ["summary"],
          title: "Experience Modification Analysis",
          includeIdentity: true,
          logo,
        }}
      />,
    ),
  );
});

function resendReturns(status: number, body: unknown = { id: "email_1" }) {
  const fetchMock = vi.fn().mockImplementation(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const request = (
  fields: { email?: string; report?: Uint8Array<ArrayBuffer>; filename?: string },
  headers: Record<string, string> = {},
  ip = `10.0.1.${Math.floor(Math.random() * 250) + 1}`,
) => {
  const form = new FormData();
  if (fields.email !== undefined) form.set("email", fields.email);
  if (fields.filename !== undefined) form.set("filename", fields.filename);
  if (fields.report) {
    form.set("report", new Blob([fields.report], { type: "application/pdf" }), "r.pdf");
  }
  return new Request("http://localhost/api/email-report", {
    method: "POST",
    headers: { origin: "http://localhost", "x-forwarded-for": ip, ...headers },
    body: form,
  });
};

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "CertifyMe.net <reports@example.com>");
  vi.stubEnv("ALLOWED_FRAME_ANCESTORS", "");
  resetRateLimits();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the email-report route", () => {
  it("sends the report as an attachment to the address given", async () => {
    const fetchMock = resendReturns(200);
    const res = await POST(
      request({ email: " owner@example.org ", report, filename: "emod analysis/../x.pdf" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.authorization).toBe("Bearer re_test");
    const sent = JSON.parse(init.body);
    expect(sent.to).toEqual(["owner@example.org"]);
    expect(sent.from).toBe("CertifyMe.net <reports@example.com>");
    expect(sent.attachments[0].filename).toBe("emod-analysis-x.pdf");
    expect(Buffer.from(sent.attachments[0].content, "base64").equals(Buffer.from(report))).toBe(true);
  });

  it("says plainly when it is not configured, and sends nothing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = resendReturns(200);
    const res = await POST(request({ email: "a@example.org", report }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a PDF this tool did not make", async () => {
    const fetchMock = resendReturns(200);
    const other = new TextEncoder().encode("%PDF-1.4\n% someone else's document");
    const res = await POST(request({ email: "a@example.org", report: other }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_attachment");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an address that is not one", async () => {
    resendReturns(200);
    for (const email of ["", "not-an-address", "a@b.c, d@e.f", "x@y"]) {
      const res = await POST(request({ email, report }));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("invalid_address");
    }
  });

  it("refuses callers that are not a page in a browser", async () => {
    resendReturns(200);
    const req = new Request("http://localhost/api/email-report", {
      method: "POST",
      body: new FormData(),
    });
    expect((await POST(req)).status).toBe(403);
  });

  it("limits how many reports one caller can send", async () => {
    resendReturns(200);
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await POST(request({ email: "a@example.org", report }, {}, "10.9.9.9"))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("passes on why Resend refused, without inventing a success", async () => {
    resendReturns(422, { message: "The example.com domain is not verified." });
    const res = await POST(request({ email: "a@example.org", report }));
    expect(res.status).toBe(502);
    const { error } = await res.json();
    expect(error.code).toBe("rejected");
    expect(error.hint).toContain("domain is not verified");
  });

  it("does not call a test-mode refusal a bad key", async () => {
    resendReturns(403, {
      message: "You can only send testing emails to your own email address.",
    });
    const res = await POST(request({ email: "someone-else@example.org", report }));
    const { error } = await res.json();
    expect(error.message).toBe("The email service would not send this message.");
    expect(error.hint).toContain("only send testing emails to your own email address");
  });

  it("reports a busy, failing or unreachable service as retryable", async () => {
    resendReturns(429);
    let res = await POST(request({ email: "a@example.org", report }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.retryable).toBe(true);

    resendReturns(500);
    res = await POST(request({ email: "a@example.org", report }));
    expect((await res.json()).error.code).toBe("unavailable");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    res = await POST(request({ email: "a@example.org", report }));
    expect((await res.json()).error).toMatchObject({ code: "network", retryable: true });
  });
});
