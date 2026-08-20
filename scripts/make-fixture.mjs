/**
 * Build a parser test fixture from a real NCCI worksheet.
 *
 * Runs the same pdf.js text-layer extraction the browser uses, then redacts the
 * identifying fields before writing. We commit the derived geometry rather than
 * the source PDF so a real company's payroll and injury data stays out of the
 * repository while the tests still exercise real page coordinates.
 *
 *   node scripts/make-fixture.mjs <input.pdf> <output.json> [RedactedName]
 */
import { readFile, writeFile } from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const [, , input, output, redactedName = "SAMPLE MANUFACTURING INC"] =
  process.argv;

if (!input || !output) {
  console.error(
    "usage: node scripts/make-fixture.mjs <input.pdf> <output.json> [RedactedName]",
  );
  process.exit(1);
}

const REDACTED_ID = "900000000";

/*
 * Identifiers are replaced with same-length stand-ins so the fixture stays
 * faithful to the original page geometry while carrying nothing that could
 * re-identify the business the sample worksheet belongs to.
 */
const REPLACEMENTS = [
  // Risk id.
  [/\b9150365\d{2}\b/g, REDACTED_ID],
  // Policy numbers, in the formats these worksheets use.
  [/WDR\d+/g, (m) => "PLA" + seq(m, m.length - 3)],
  [/\bWC\d{8,}/g, (m) => "WC" + seq(m, m.length - 2)],
  [/\b\d{2}WN[A-Z]{2}\d+/g, (m) => "00WNZZ" + seq(m, m.length - 6)],
  [/\b1014389\b/g, "5550001"],
  // Claim numbers.
  [/\b10000\d{4,}/g, (m) => "10000" + seq(m, m.length - 5)],
  // Carrier codes.
  [/\b(19909|36658|10456|27944|14095)\b/g, (m) => seq(m, 5)],
];

/** Deterministic digits of the same length, so widths and column fits hold. */
function seq(source, length) {
  let hash = 7;
  for (const ch of source) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000_007;
  return String(hash).padStart(length, "1").slice(-length);
}

const data = new Uint8Array(await readFile(input));
const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

const pages = [];
let glyphCount = 0;

for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const items = [];
  for (const raw of content.items) {
    if (typeof raw.str !== "string") continue;
    const text = raw.str.trim();
    if (!text) continue;
    items.push({
      text: redact(text),
      x: round(raw.transform[4]),
      y: round(viewport.height - raw.transform[5]),
      w: round(raw.width ?? 0),
      h: round(raw.height ?? 0),
    });
    glyphCount += text.length;
  }

  pages.push({
    pageNumber: n,
    width: round(viewport.width),
    height: round(viewport.height),
    items,
  });
}

await writeFile(
  output,
  JSON.stringify({ pages, glyphCount, hasTextLayer: true }, null, 1) + "\n",
);

console.log(
  `wrote ${output}: ${pages.length} pages, ${pages.reduce((a, p) => a + p.items.length, 0)} items`,
);

function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Replace identifying values while preserving each item's width, so column
 * geometry in the fixture stays faithful to the original document.
 */
function redact(text) {
  let out = text.replace(/CASTLE STEEL INC/gi, redactedName);
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
