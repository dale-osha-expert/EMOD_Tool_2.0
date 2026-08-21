/**
 * Build a parser test fixture from a real NCCI worksheet.
 *
 * Runs the same pdf.js text-layer extraction the browser uses, then replaces
 * every identifying value with a same-length stand-in before writing. We commit
 * the derived geometry rather than the source PDF so that a real company's
 * payroll and injury data stays out of the repository while the tests still
 * exercise real page coordinates.
 *
 * Identifiers are found by position rather than by pattern - the value to the
 * right of "Risk Name:", of "Carrier:", and so on - so this works on any
 * worksheet rather than only the one it was written against.
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
      text,
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

redact(pages);

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
 * A stand-in of exactly the same length and character shape - digits stay
 * digits, letters become X, punctuation is untouched - so the fixture's column
 * widths and right-edge alignment stay faithful to the original page.
 */
function idLike(source) {
  let hash = 7;
  for (const ch of source) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000_007;

  let out = "";
  for (const ch of source) {
    if (/[0-9]/.test(ch)) {
      out += String(hash % 10);
      hash = Math.floor(hash / 7) + 13;
    } else if (/[A-Za-z]/.test(ch)) {
      out += "X";
    } else {
      out += ch;
    }
  }
  return out;
}

function redact(pages) {
  const all = pages.flatMap((p) => p.items);
  const names = new Set();
  const ids = new Set();

  /* --- Pass 1: collect what needs replacing --------------------------- *
   * Scoped per page: pages share a coordinate space, so searching every item
   * for one at the same y would match column headers on other pages.        */
  for (const page of pages) {
    /** Items printed to the right of a label on the same line of this page. */
    const rightOf = (anchor, maxGap = 90) =>
      page.items.filter(
        (i) =>
          i !== anchor &&
          Math.abs(i.y - anchor.y) <= 4 &&
          i.x > anchor.x &&
          i.x - anchor.x < maxGap,
      );

    for (const item of page.items) {
      const text = item.text.trim();

      // The NCCI product notice is long, identical on every page, and
      // reproduced verbatim would put a lot of someone else's prose in this
      // repository. The parser only needs a recognisable opening marker.
      if (/^\u00a9\s*Copyright/i.test(text)) {
        item.text = "\u00a9 Copyright NCCI. [notice text omitted from fixture]";
        continue;
      }

      if (/^Risk Name:$/i.test(text)) {
        for (const v of rightOf(item, 60)) names.add(v.text.trim());
      } else if (/^Firm Name:/i.test(text)) {
        const value = text.replace(/^Firm Name:\s*/i, "").trim();
        if (value) names.add(value);
      } else if (/^Risk ID:/i.test(text)) {
        const inline = text.replace(/^Risk ID:\s*/i, "").trim();
        if (inline) ids.add(inline);
        for (const v of rightOf(item, 80)) {
          if (/^[A-Z0-9-]{4,}$/i.test(v.text.trim())) ids.add(v.text.trim());
        }
      } else if (/^(Carrier:|Policy No\.?)$/i.test(text)) {
        for (const v of rightOf(item, 60)) {
          const value = v.text.trim();
          if (/^[A-Z0-9-]{3,}$/i.test(value)) ids.add(value);
        }
      }

      // Claim numbers: long digit runs printed in the claim-data band, between
      // the loss columns and the injury-type column.
      if (/^\d{6,}$/.test(text) && item.x > 300 && item.x < 400) ids.add(text);
    }
  }

  /* --- Pass 2: replace, longest first so prefixes do not collide ------- */
  const byLength = (a, b) => b.length - a.length;
  const nameList = [...names].filter(Boolean).sort(byLength);
  const idList = [...ids].filter(Boolean).sort(byLength);

  for (const item of all) {
    for (const name of nameList) {
      if (item.text.includes(name)) {
        item.text = item.text.split(name).join(redactedName);
      }
    }

    for (const id of idList) {
      // A short numeric id such as a five-digit carrier code could coincide
      // with a legitimate loss amount, so replace those only when they are the
      // whole cell. Longer identifiers are distinctive enough to swap anywhere,
      // which is what catches a policy number quoted inside a note.
      if (id.length < 6) {
        if (item.text.trim() === id) item.text = idLike(id);
      } else if (item.text.includes(id)) {
        item.text = item.text.split(id).join(idLike(id));
      }
    }
  }
}
