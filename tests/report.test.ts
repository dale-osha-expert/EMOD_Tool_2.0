import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The report uses the PDF built-in fonts, which cover WinAnsi only. Characters
 * outside it render as a missing glyph rather than failing loudly, so a stray
 * U+2212 MINUS SIGN silently turns every negative figure in the report into a
 * box. This scans the report source for that class of character.
 */
const WINANSI_EXTRA = new Set([
  "€", "‚", "ƒ", "„", "…", "†", "‡", "ˆ", "‰", "Š", "‹", "Œ", "Ž",
  "‘", "’", "“", "”", "•", "–", "—", "˜", "™", "š", "›", "œ", "ž", "Ÿ",
]);

function isWinAnsiSafe(char: string): boolean {
  const code = char.codePointAt(0)!;
  if (code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return true;
  return WINANSI_EXTRA.has(char);
}

describe("report typography", () => {
  it("uses only characters the built-in PDF fonts can render", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../lib/report/document.tsx", import.meta.url)),
      "utf8",
    );

    const offenders = [
      ...new Set([...source].filter((c) => !isWinAnsiSafe(c))),
    ];

    expect(
      offenders,
      `These characters are outside WinAnsi and will render as missing glyphs in the PDF: ${offenders
        .map((c) => `${JSON.stringify(c)} (U+${c.codePointAt(0)!.toString(16).toUpperCase()})`)
        .join(", ")}`,
    ).toEqual([]);
  });
});
