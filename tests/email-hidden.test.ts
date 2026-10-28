import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/email-report/route";
import { EMAIL_FEATURE_ENABLED } from "@/lib/email/feature";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("emailing reports while hidden", () => {
  it("ships switched off", () => {
    expect(EMAIL_FEATURE_ENABLED).toBe(false);
  });

  it("answers 404 and sends nothing, even with Resend configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "EMOD Analyzer <reports@example.com>");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.set("email", "anyone@example.org");
    const res = await POST(
      new Request("http://localhost/api/email-report", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: form,
      }),
    );

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
