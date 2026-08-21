/**
 * End-to-end smoke test against a running server.
 *
 * Unit tests cover the parser and the rating maths against fixture geometry;
 * this drives the real thing in a real browser with a real PDF, which is the
 * only way to confirm that pdf.js, the worker, the React tree and the PDF
 * renderer all work together in a browser rather than in Node.
 *
 *   npm run build && npm start
 *   node scripts/smoke.mjs <worksheet.pdf> [http://localhost:3000]
 *
 * Set PLAYWRIGHT_CHROMIUM_PATH if Chromium is not where Playwright expects it.
 */
import { chromium } from "playwright";

const [, , pdfPath, baseUrl = "http://localhost:3000"] = process.argv;

if (!pdfPath) {
  console.error("usage: node scripts/smoke.mjs <worksheet.pdf> [baseUrl]");
  process.exit(1);
}

const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    failures.push(name);
  }
};

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {}),
});

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (m) => {
    // A deliberate 503 from /api/analyze when no key is configured is the
    // behaviour under test, not a defect; the browser logs it regardless.
    if (m.type() === "error" && !/\b(503|429|401)\b/.test(m.text())) {
      pageErrors.push(m.text());
    }
  });

  console.log("\nParsing the worksheet in the browser");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.setInputFiles("input[type=file]", pdfPath);
  await page.waitForSelector("text=Experience modification factor", {
    timeout: 30000,
  });

  const heading = (await page.locator("h2").first().textContent())?.trim();
  check(
    "reconciliation passes",
    heading === "Verified against the source document",
    heading,
  );

  const stats = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll("div").forEach((d) => {
      const label = d.querySelector(":scope > div:first-child");
      const value = d.querySelector(":scope > div:nth-child(2)");
      if (
        label &&
        value &&
        label.className.includes("uppercase") &&
        value.className.includes("tabular")
      ) {
        out[label.textContent.trim().toLowerCase()] = value.textContent.trim();
      }
    });
    return out;
  });

  const current = Number(stats["current mod"]);
  const printed = Number(stats["as printed"]);
  const minimum = Number(stats["loss-free minimum"]);

  check(
    "headline figures were found on the page",
    [current, printed, minimum].every(Number.isFinite),
    JSON.stringify(stats),
  );
  check(
    "recomputed mod matches the printed mod",
    Number.isFinite(current) && current === printed,
    `${stats["current mod"]} vs ${stats["as printed"]}`,
  );
  check(
    "loss-free minimum is below the current mod",
    Number.isFinite(minimum) && minimum < current,
    JSON.stringify(stats),
  );

  console.log("\nAI failure is surfaced, not swallowed");
  await page.getByRole("button", { name: "Generate" }).click();
  const alert = page
    .locator("[role=alert]:not(#__next-route-announcer__)")
    .first();
  await alert.waitFor({ timeout: 30000 }).catch(() => {});
  const alertText = (await alert.innerText().catch(() => "")).trim();
  const configured = alertText === "";
  check(
    configured
      ? "narrative generated with the configured key"
      : "missing or failing key produces a stated error",
    configured || alertText.length > 40,
    alertText.slice(0, 120),
  );
  // The route requires an Origin header. Browsers send one on every POST, but
  // if that ever stops being true the tool breaks for everyone, so assert the
  // real browser actually got past the guard rather than trusting the spec.
  check(
    "the browser's own request is not rejected by the origin guard",
    !/only accepts requests from the tool itself/i.test(alertText),
    alertText.slice(0, 120),
  );
  check(
    "calculations survive an AI failure",
    await page.locator("text=Experience modification factor").isVisible(),
  );

  console.log("\nReport export");
  await page.getByRole("button", { name: "Full report" }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  check(
    "PDF downloads with a descriptive filename",
    download.suggestedFilename().endsWith(".pdf"),
    download.suggestedFilename(),
  );

  console.log("\nNarrow container (embed at 360px)");
  const narrow = await context.newPage();
  await narrow.setViewportSize({ width: 360, height: 900 });
  await narrow.goto(`${baseUrl}/embed`, { waitUntil: "networkidle" });
  await narrow.setInputFiles("input[type=file]", pdfPath);
  await narrow.waitForSelector("text=Experience modification factor", {
    timeout: 30000,
  });
  const overflow = await narrow.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  check("page body does not scroll sideways", overflow <= 0, `${overflow}px`);

  console.log("\nNothing is persisted");
  const stored = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
  }));
  check(
    "no localStorage, sessionStorage or cookies written",
    stored.local === 0 && stored.session === 0 && stored.cookies === "",
    JSON.stringify(stored),
  );

  check(
    "no uncaught errors in the console",
    pageErrors.length === 0,
    pageErrors.join(" | ").slice(0, 200),
  );
} finally {
  await browser.close();
}

console.log(
  failures.length === 0
    ? "\nAll smoke checks passed.\n"
    : `\n${failures.length} smoke check(s) failed: ${failures.join(", ")}\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
