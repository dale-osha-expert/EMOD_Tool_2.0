import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig, { redirectTarget } from "../next.config.mjs";

afterEach(() => vi.unstubAllEnvs());

/** The rules next.config.mjs hands Next for the current environment. */
const rule = () => nextConfig.redirects!();

describe("the move to the new domain", () => {
  it("does nothing until REDIRECT_TO is set", async () => {
    vi.stubEnv("REDIRECT_TO", "");
    expect(redirectTarget()).toBeNull();
    expect(await rule()).toEqual([]);
  });

  it("redirects every path permanently to the same path on the new origin", async () => {
    vi.stubEnv("REDIRECT_TO", "https://emodanalyzer.com/");
    const [r] = await rule();
    expect(r.permanent).toBe(true);
    expect(r.destination).toBe("https://emodanalyzer.com/:path");
  });

  it("keeps serving the Search Console file, and only that file", async () => {
    vi.stubEnv("REDIRECT_TO", "https://emodanalyzer.com");
    const [r] = await rule();
    // Next matches `/:path(<regex>)` as `^/(<regex>)$`.
    const inner = r.source.slice("/:path(".length, -1);
    const matches = (path: string) => new RegExp(`^/(${inner})$`).test(path);

    expect(matches("/google199a05b29e91da57.html")).toBe(false);
    for (const path of [
      "/",
      "/emr-in-construction",
      "/embed",
      "/api/analyze",
      "/sitemap.xml",
      "/xgoogle199a05b29e91da57.html",
      "/google199a05b29e91da57.htmlx",
    ]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it("fails the build on a value that would redirect visitors somewhere broken", () => {
    for (const bad of [
      "emodanalyzer.com",
      "http://emodanalyzer.com",
      "https://emodanalyzer.com/guides",
      "https://emodanalyzer.com/?x=1",
    ]) {
      expect(() => redirectTarget(bad), bad).toThrow(/REDIRECT_TO/);
    }
  });
});
