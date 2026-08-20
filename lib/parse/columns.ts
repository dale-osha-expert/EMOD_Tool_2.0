import type { TextItem } from "./textLayer";

/** Footnote letters NCCI glues onto loss values. */
const FLAG_CHARS = "CDEXU#*";

export interface Row {
  /** Representative y for the row. */
  y: number;
  items: TextItem[];
}

/**
 * Group items into visual rows. Values within a printed row can sit a few
 * points apart vertically (labels and figures use different font sizes), so
 * cluster on y rather than requiring an exact match.
 */
export function groupRows(items: TextItem[], tolerance = 5): Row[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Row[] = [];

  for (const item of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(item.y - last.y) <= tolerance) {
      last.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

/**
 * Join items that are printed side by side with no meaningful gap, so that a
 * header split across several text runs ("Exp" + "Excess") is matched as the
 * one label it visually is, and a figure with a footnote letter glued to it
 * ("88,221" + "C") arrives as a single cell. Real columns on these forms sit
 * far further apart than `gap`, so this never merges across a column boundary.
 */
export function mergeAdjacent(row: Row, gap = 3): Row {
  const merged: TextItem[] = [];

  for (const item of row.items) {
    const prev = merged[merged.length - 1];
    const distance = prev ? item.x - (prev.x + prev.w) : Infinity;

    if (prev && distance <= gap && mergeable(prev.text, item.text)) {
      const joiner = distance > 0.6 ? " " : "";
      merged[merged.length - 1] = {
        ...prev,
        text: prev.text + joiner + item.text,
        w: item.x + item.w - prev.x,
      };
    } else {
      merged.push({ ...item });
    }
  }

  return { y: row.y, items: merged };
}

/** Whole-row text, useful for label lookups and regex extraction. */
export function rowText(row: Row): string {
  return row.items.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();
}

export interface Column {
  name: string;
  /** Inclusive left boundary in points. */
  start: number;
  /** Exclusive right boundary in points. */
  end: number;
}

export interface ColumnSpec {
  name: string;
  /**
   * Patterns matching the printed header text for this column. The first
   * matching item in the header row anchors the column.
   */
  match: RegExp;
  /** When true, the column may legitimately be absent from the header row. */
  optional?: boolean;
}

/**
 * Build column boundaries from the printed header row rather than from fixed
 * coordinates. NCCI forms vary in horizontal placement between vintages,
 * bureaus and carriers, so anchoring to the labels the form itself prints is
 * what lets one parser read more than one variant.
 *
 * Returns null when a required header is missing, which is the signal that this
 * row is not the table header we thought it was.
 */
export function buildColumns(
  headerRow: Row,
  spec: ColumnSpec[],
): Column[] | null {
  const anchors: { name: string; x: number }[] = [];

  for (const s of spec) {
    const hit = headerRow.items.find((i) => s.match.test(normalize(i.text)));
    if (!hit) {
      if (s.optional) continue;
      return null;
    }
    anchors.push({ name: s.name, x: hit.x });
  }

  if (anchors.length === 0) return null;
  anchors.sort((a, b) => a.x - b.x);

  return anchors.map((a, idx) => ({
    name: a.name,
    // The leftmost column extends to negative infinity so that values printed
    // marginally left of their header still land in it.
    start: idx === 0 ? Number.NEGATIVE_INFINITY : a.x,
    end: idx === anchors.length - 1
      ? Number.POSITIVE_INFINITY
      : anchors[idx + 1].x,
  }));
}

/**
 * Assign a row's items to columns.
 *
 * Numeric cells on these forms are right-aligned, so a value's right edge is
 * what identifies its column; its left edge drifts with the number of digits.
 * Alphabetic cells (class descriptions) are left-aligned and can be much wider
 * than their column, so those are placed by left edge instead.
 */
export function assignCells(row: Row, columns: Column[]): Map<string, TextItem[]> {
  const out = new Map<string, TextItem[]>();
  for (const c of columns) out.set(c.name, []);

  for (const item of row.items) {
    const alphabetic = !/\d/.test(item.text);
    const probe = alphabetic ? item.x : item.x + item.w;
    const column = columns.find((c) => probe >= c.start && probe < c.end);
    if (column) out.get(column.name)!.push(item);
  }

  return out;
}

/**
 * Whether two horizontally touching runs belong to the same cell.
 *
 * Multi-word headers ("Exp" + "Excess") and figures carrying a footnote letter
 * ("88,221" + "C") are one cell. A figure sitting next to a word is not: on
 * these forms that pattern means a value has come to rest beside a label
 * belonging to a different line, such as the second line of "Subject Premium:"
 * printing alongside the policy total.
 */
function mergeable(left: string, right: string): boolean {
  const leftNumeric = /\d/.test(left);
  const rightNumeric = /\d/.test(right);
  if (leftNumeric === rightNumeric) return true;
  // Numeric followed by a lone footnote character is still one cell.
  return leftNumeric && right.length === 1 && FLAG_CHARS.includes(right);
}

/** The single cell value for a column, or null when the cell is blank. */
export function cell(cells: Map<string, TextItem[]>, name: string): string | null {
  const items = cells.get(name);
  if (!items || items.length === 0) return null;
  return items.map((i) => i.text).join(" ").trim() || null;
}

/**
 * Only the figure-like content of a cell. Row labels and stray second lines of
 * a wrapped header are left-aligned and can land in a numeric column; this
 * keeps them out of the value.
 */
export function numericCell(
  cells: Map<string, TextItem[]>,
  name: string,
): string | null {
  const items = (cells.get(name) ?? []).filter((i) => /\d/.test(i.text));
  if (items.length === 0) return null;
  return items.map((i) => i.text).join(" ").trim() || null;
}

/** Only the alphabetic content of a cell, such as a class description. */
export function textCell(
  cells: Map<string, TextItem[]>,
  name: string,
): string | null {
  const items = (cells.get(name) ?? []).filter((i) => !/\d/.test(i.text));
  if (items.length === 0) return null;
  return items.map((i) => i.text).join(" ").trim() || null;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toUpperCase();
}

/* ------------------------------------------------------------------ *
 * Value parsing
 * ------------------------------------------------------------------ */

export interface ParsedNumber {
  value: number | null;
  flags: string[];
}

/**
 * Parse a printed figure. Handles thousands separators, leading-decimal factors
 * (".19"), parenthesised negatives, and trailing footnote letters.
 */
export function parseFigure(raw: string | null): ParsedNumber {
  if (raw === null) return { value: null, flags: [] };

  let text = raw.trim();
  const flags: string[] = [];

  // Strip footnote characters from either end.
  let changed = true;
  while (changed && text.length > 0) {
    changed = false;
    const last = text[text.length - 1];
    if (FLAG_CHARS.includes(last)) {
      flags.unshift(last);
      text = text.slice(0, -1).trim();
      changed = true;
    }
  }

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }

  text = text.replace(/,/g, "").trim();
  if (text === "" || !/^\d*\.?\d+$/.test(text)) {
    return { value: null, flags };
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return { value: null, flags };
  return { value: negative ? -value : value, flags };
}

/** Convenience wrapper when footnote flags are not of interest. */
export function figure(raw: string | null): number | null {
  return parseFigure(raw).value;
}
