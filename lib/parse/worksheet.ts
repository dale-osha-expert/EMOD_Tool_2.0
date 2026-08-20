import type {
  Claim,
  ClassRow,
  PolicyBlock,
  RatingFactors,
  SummaryRow,
  Worksheet,
} from "../types";
import {
  assignCells,
  buildColumns,
  cell,
  figure,
  numericCell,
  textCell,
  groupRows,
  mergeAdjacent,
  parseFigure,
  rowText,
  type Column,
  type ColumnSpec,
  type Row,
} from "./columns";
import type { ExtractedDocument, PdfPage, TextItem } from "./textLayer";

/** A row's items bucketed by column name. */
type Cells = Map<string, TextItem[]>;

/* ------------------------------------------------------------------ *
 * Column definitions, anchored on the labels the form prints
 * ------------------------------------------------------------------ */

/** Page-1 grid keyed on the lettered (A)-(I) markers: the most stable anchors. */
const LETTERED_COLUMNS: ColumnSpec[] = [
  { name: "weight", match: /^\(A\)/ },
  { name: "b", match: /^\(B\)/, optional: true },
  { name: "expectedExcess", match: /^\(C\)/ },
  { name: "expectedLosses", match: /^\(D\)/ },
  { name: "expectedPrimary", match: /^\(E\)/ },
  { name: "actualExcess", match: /^\(F\)/ },
  { name: "ballast", match: /^\(G\)/ },
  { name: "actualIncurred", match: /^\(H\)/ },
  { name: "actualPrimary", match: /^\(I\)/ },
];

/** Page-1 per-state grid, above the lettered row. */
const STATE_COLUMNS: ColumnSpec[] = [
  { name: "state", match: /^STATE$/ },
  { name: "weight", match: /^WT$/ },
  { name: "expectedExcess", match: /^EXP EXCESS/ },
  { name: "expectedLosses", match: /^EXPECTED/ },
  { name: "expectedPrimary", match: /^EXP PRIM/ },
  { name: "actualExcess", match: /^ACT EXC/ },
  { name: "ballast", match: /^BALLAST/ },
  { name: "actualIncurred", match: /^ACT INC/ },
  { name: "actualPrimary", match: /^ACT PRIM/ },
];

const FACTOR_COLUMNS: ColumnSpec[] = [
  { name: "primary", match: /^PRIMARY LOSSES/ },
  { name: "stabilizing", match: /^STABILIZING/ },
  { name: "ratableExcess", match: /^RATABLE EXCESS/ },
  { name: "totals", match: /^TOTALS$/ },
];

const ARAP_COLUMNS: ColumnSpec[] = [
  { name: "arap", match: /^ARAP$/ },
  { name: "flarap", match: /^FLARAP$/ },
  { name: "sarap", match: /^SARAP$/ },
  { name: "maarap", match: /^MAARAP$/ },
  { name: "expMod", match: /^EXP MOD/ },
];

/** Per-policy class and claim table. */
const POLICY_COLUMNS: ColumnSpec[] = [
  { name: "code", match: /^CODE$/ },
  { name: "elr", match: /^ELR$/ },
  { name: "dRatio", match: /^D-/ },
  { name: "payroll", match: /^PAYROLL$/ },
  { name: "expectedLosses", match: /^EXPECTED/ },
  { name: "expectedPrimary", match: /^EXP PRIM/ },
  { name: "claimNumber", match: /^CLAIM/ },
  { name: "injuryType", match: /^IJ$/ },
  { name: "status", match: /^OF$/ },
  { name: "actualIncurred", match: /^ACT INC/ },
  { name: "actualPrimary", match: /^ACT PRIM/ },
];

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export class WorksheetParseError extends Error {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
    this.name = "WorksheetParseError";
  }
}

export function parseWorksheet(doc: ExtractedDocument): Worksheet {
  if (doc.pages.length === 0) {
    throw new WorksheetParseError(
      "The PDF contains no pages.",
      "Check that the file is not corrupt, then try again.",
    );
  }

  const pages = doc.pages.map((p) => ({
    page: p,
    rows: groupRows(p.items).map((r) => mergeAdjacent(r)),
  }));

  const header = parseHeader(pages[0].rows);
  const { stateRows, totals } = parseSummaryGrid(pages[0].rows);
  const factors = parseFactors(pages[0].rows);
  const notes = parseNotes(pages[0].rows);

  const policies: PolicyBlock[] = [];
  const claims: Claim[] = [];
  for (const { page, rows } of pages) {
    parsePolicyBlocks(page, rows, policies, claims);
  }

  if (!totals && policies.length === 0) {
    throw new WorksheetParseError(
      "This does not look like an NCCI experience rating worksheet.",
      "The expected summary grid and policy tables were not found. Confirm you uploaded the rating worksheet itself rather than a cover letter or a different document.",
    );
  }

  return {
    ...header,
    stateRows,
    totals,
    factors,
    policies,
    claims,
    notes,
    eraReduction: parseEraReduction(notes),
    pageCount: doc.pages.length,
  };
}

/* ------------------------------------------------------------------ *
 * Page 1: identifying header
 * ------------------------------------------------------------------ */

function parseHeader(rows: Row[]) {
  const text = rows.slice(0, 12).map(rowText).join(" | ");

  const riskName = match(text, /Risk Name:\s*(.*?)\s*(?:\||Risk ID:)/i);
  const riskId = match(text, /Risk ID:\s*([A-Z0-9-]+)/i);
  const ratingEffectiveDate = match(
    text,
    /Rating Effective Date:\s*([0-9/]{8,10})/i,
  );
  const productionDate = match(text, /Production Date:\s*([0-9/]{8,10})/i);
  const state = match(text, /\bState:\s*([A-Za-z ]+?)\s*(?:\||$)/i);

  return {
    riskName,
    riskId,
    ratingEffectiveDate,
    productionDate,
    state,
  };
}

function match(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() || null : null;
}

/* ------------------------------------------------------------------ *
 * Page 1: summary grid
 * ------------------------------------------------------------------ */

function parseSummaryGrid(rows: Row[]): {
  stateRows: SummaryRow[];
  totals: SummaryRow | null;
} {
  const stateRows: SummaryRow[] = [];
  let totals: SummaryRow | null = null;

  // The lettered row is the authoritative anchor: those markers are unique on
  // the page and their positions define the columns the rated totals sit in.
  const letteredIdx = rows.findIndex((r) => {
    const cols = buildColumns(r, LETTERED_COLUMNS);
    return cols !== null;
  });

  if (letteredIdx >= 0) {
    const columns = buildColumns(rows[letteredIdx], LETTERED_COLUMNS)!;
    for (const row of rows.slice(letteredIdx + 1, letteredIdx + 4)) {
      const parsed = readSummaryRow(row, columns, "TOTAL");
      if (parsed) {
        totals = parsed;
        break;
      }
    }
  }

  // The per-state rows sit above, under the plain-language header. They are
  // pre-ERA and used for display and roll-up checks, not for the calculation.
  const stateHeaderIdx = rows.findIndex(
    (r) => buildColumns(r, STATE_COLUMNS) !== null,
  );
  if (stateHeaderIdx >= 0) {
    const columns = buildColumns(rows[stateHeaderIdx], STATE_COLUMNS)!;
    const limit = letteredIdx >= 0 ? letteredIdx : rows.length;
    for (const row of rows.slice(stateHeaderIdx + 1, limit)) {
      const label = row.items.find((i) => /^[A-Z]{2}$/.test(i.text));
      if (!label) continue;
      const parsed = readSummaryRow(row, columns, label.text);
      if (parsed) stateRows.push(parsed);
    }
  }

  return { stateRows, totals };
}

function readSummaryRow(
  row: Row,
  columns: Column[],
  state: string,
): SummaryRow | null {
  const cells = assignCells(row, columns);

  const weight = figure(numericCell(cells, "weight"));
  const expectedLosses = figure(numericCell(cells, "expectedLosses"));
  const expectedPrimary = figure(numericCell(cells, "expectedPrimary"));
  const actualIncurred = figure(numericCell(cells, "actualIncurred"));
  const actualPrimary = figure(numericCell(cells, "actualPrimary"));
  const ballast = figure(numericCell(cells, "ballast"));
  const expectedExcess = figure(numericCell(cells, "expectedExcess"));
  const actualExcess = figure(numericCell(cells, "actualExcess"));

  // A summary row without expected losses and a weight is not a summary row.
  if (weight === null || expectedLosses === null) return null;

  return {
    state,
    weight,
    expectedExcess: expectedExcess ?? expectedLosses - (expectedPrimary ?? 0),
    expectedLosses,
    expectedPrimary: expectedPrimary ?? 0,
    actualExcess: actualExcess ?? (actualIncurred ?? 0) - (actualPrimary ?? 0),
    ballast: ballast ?? 0,
    actualIncurred: actualIncurred ?? 0,
    actualPrimary: actualPrimary ?? 0,
  };
}

/* ------------------------------------------------------------------ *
 * Page 1: rating factors
 * ------------------------------------------------------------------ */

function parseFactors(rows: Row[]): RatingFactors {
  const empty: RatingFactors = {
    arap: null,
    flarap: null,
    sarap: null,
    maarap: null,
    stabilizingValue: null,
    ratableExcessActual: null,
    ratableExcessExpected: null,
    numerator: null,
    denominator: null,
    publishedMod: null,
  };

  const factorHeaderIdx = rows.findIndex(
    (r) => buildColumns(r, FACTOR_COLUMNS) !== null,
  );

  const out = { ...empty };

  if (factorHeaderIdx >= 0) {
    const columns = buildColumns(rows[factorHeaderIdx], FACTOR_COLUMNS)!;

    // The Actual and Expected rows carry their own labels at the left margin.
    for (const row of rows.slice(factorHeaderIdx + 1, factorHeaderIdx + 12)) {
      const label = rowText(row).toUpperCase();
      const cells = assignCells(row, columns);
      const totalsValue = figure(numericCell(cells, "totals"));
      const stabilizing = figure(numericCell(cells, "stabilizing"));
      const ratable = figure(numericCell(cells, "ratableExcess"));

      if (/^ACTUAL\b/.test(label) && totalsValue !== null) {
        out.stabilizingValue = stabilizing;
        out.ratableExcessActual = ratable;
        out.numerator = totalsValue;
      } else if (/^EXPECTED\b/.test(label) && totalsValue !== null) {
        out.stabilizingValue = out.stabilizingValue ?? stabilizing;
        out.ratableExcessExpected = ratable;
        out.denominator = totalsValue;
      }
    }
  }

  const arapHeaderIdx = rows.findIndex(
    (r) => buildColumns(r, ARAP_COLUMNS) !== null,
  );
  if (arapHeaderIdx >= 0) {
    const columns = buildColumns(rows[arapHeaderIdx], ARAP_COLUMNS)!;
    for (const row of rows.slice(arapHeaderIdx + 1, arapHeaderIdx + 5)) {
      const cells = assignCells(row, columns);
      const mod = figure(numericCell(cells, "expMod"));
      const arap = figure(numericCell(cells, "arap"));
      if (arap === null && mod === null) continue;
      out.arap = out.arap ?? arap;
      out.flarap = out.flarap ?? figure(numericCell(cells, "flarap"));
      out.sarap = out.sarap ?? figure(numericCell(cells, "sarap"));
      out.maarap = out.maarap ?? figure(numericCell(cells, "maarap"));
      out.publishedMod = out.publishedMod ?? mod;
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Page 1: notes
 * ------------------------------------------------------------------ */

const BOILERPLATE =
  /^(©|Copyright|Page \d+ of|\* Total|[A-Z] (Disease|Catastrophic|Employers|Ex-Medical|Limited)|U USL)/i;

function parseNotes(rows: Row[]): string[] {
  const notes: string[] = [];

  for (const row of rows) {
    const text = rowText(row);
    if (!text || BOILERPLATE.test(text)) continue;
    // Notes are printed as full-width prose at the left margin, in capitals.
    if (row.items[0].x > 110) continue;
    if (text.length < 12) continue;
    if (!/^[A-Z0-9 ,.:#'()/%-]+$/.test(text)) continue;
    if (!/[A-Z]{4}/.test(text)) continue;
    notes.push(text);
  }

  return notes;
}

/**
 * The medical-only reduction is stated in the notes, not implied. When the
 * worksheet says nothing we return null rather than assuming a default, because
 * whether ERA applies depends on the state.
 */
function parseEraReduction(notes: string[]): number | null {
  const joined = notes.join(" ");
  const m = joined.match(
    /DECREASE OF\s+(\d+(?:\.\d+)?)\s*%\s*MEDICAL ONLY/i,
  );
  if (!m) return null;
  const pct = Number(m[1]);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null;
  return pct / 100;
}

/* ------------------------------------------------------------------ *
 * Policy blocks
 * ------------------------------------------------------------------ */

const STATE_HEADING = /^\d{2}-[A-Z][A-Z .]+$/;

function parsePolicyBlocks(
  page: PdfPage,
  rows: Row[],
  policies: PolicyBlock[],
  claims: Claim[],
): void {
  for (let i = 0; i < rows.length; i++) {
    const text = rowText(rows[i]);
    if (!/Firm Name:|Firm ID:/i.test(text)) continue;

    const heading = rows[i].items.find((it) => STATE_HEADING.test(it.text));
    if (!heading) continue;

    const block = readPolicyBlock(page, rows, i, heading.text);
    if (!block) continue;

    const policyIndex = policies.length;
    policies.push(block.policy);
    for (const claim of block.claims) {
      claims.push({ ...claim, policyIndex });
    }
    i = block.endIndex;
  }
}

function readPolicyBlock(
  page: PdfPage,
  rows: Row[],
  startIndex: number,
  state: string,
): {
  policy: PolicyBlock;
  claims: Omit<Claim, "policyIndex">[];
  endIndex: number;
} | null {
  const headingText = rowText(rows[startIndex]);
  const firmId = match(headingText, /Firm ID:\s*([A-Z0-9]+)/i);
  const firmName = match(headingText, /Firm Name:\s*(.+?)\s*$/i);

  // Carrier / policy line sits immediately below the firm heading.
  let carrier: string | null = null;
  let policyNumber: string | null = null;
  let effectiveDate: string | null = null;
  let expirationDate: string | null = null;

  for (const row of rows.slice(startIndex + 1, startIndex + 4)) {
    const text = rowText(row);
    if (!/Carrier:/i.test(text)) continue;
    carrier = match(text, /Carrier:\s*(\S+)/i);
    policyNumber = match(text, /Policy No\.?\s*(\S+)/i);
    effectiveDate = match(text, /Eff Date:\s*([0-9/]{8,10})/i);
    expirationDate = match(text, /Exp Date:\s*([0-9/]{8,10})/i);
    break;
  }

  // Column header for this block's class/claim table.
  let headerIndex = -1;
  let columns: Column[] | null = null;
  for (let i = startIndex + 1; i < Math.min(startIndex + 8, rows.length); i++) {
    const built = buildColumns(rows[i], POLICY_COLUMNS);
    if (built) {
      headerIndex = i;
      columns = built;
      break;
    }
  }
  if (headerIndex < 0 || !columns) return null;

  const classRows: ClassRow[] = [];
  const blockClaims: Omit<Claim, "policyIndex">[] = [];
  let subjectPremium: number | null = null;
  let totalPayroll: number | null = null;
  let totalActualIncurred: number | null = null;
  let endIndex = rows.length - 1;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const text = rowText(row);

    if (/Policy Total:/i.test(text)) {
      const cells = assignCells(row, columns);
      totalPayroll = figure(numericCell(cells, "payroll"));
      // The printed subject premium is right-aligned into the expected-primary
      // column of the same grid; its own label sits on the line above.
      subjectPremium = figure(numericCell(cells, "expectedPrimary"));
      totalActualIncurred = figure(numericCell(cells, "actualIncurred"));
      endIndex = i;
      break;
    }

    // A new firm heading or the page footer ends the block.
    if (/Firm Name:|Firm ID:/i.test(text)) {
      endIndex = i - 1;
      break;
    }
    if (BOILERPLATE.test(text)) {
      endIndex = i - 1;
      break;
    }
    // Skip the "Subject Premium: / Total Act Inc Losses:" label line.
    if (/Subject\s*Premium:/i.test(text)) continue;

    const cells = assignCells(row, columns);

    const classRow = readClassRow(cells);
    if (classRow) classRows.push(classRow);

    const claim = readClaim(cells);
    if (claim) blockClaims.push(claim);
  }

  const policy: PolicyBlock = {
    state,
    firmId,
    firmName,
    carrier,
    policyNumber,
    effectiveDate,
    expirationDate,
    classRows,
    subjectPremium,
    totalPayroll,
    totalExpectedLosses: classRows.length
      ? classRows.reduce((acc, r) => acc + r.expectedLosses, 0)
      : null,
    totalActualIncurred,
    page: page.pageNumber,
  };

  return { policy, claims: blockClaims, endIndex };
}

function readClassRow(cells: Cells): ClassRow | null {
  // The class code is left-aligned at the start of the row, and its printed
  // description follows immediately to its right — still inside the code
  // column's span, since the next header anchor is further right than the
  // description's left edge.
  const code = (numericCell(cells, "code") ?? "").trim();
  if (!/^\d{4}$/.test(code)) return null;

  const expectedLosses = figure(numericCell(cells, "expectedLosses"));
  const expectedPrimary = figure(numericCell(cells, "expectedPrimary"));
  if (expectedLosses === null && expectedPrimary === null) return null;

  return {
    code,
    description: textCell(cells, "code"),
    elr: figure(numericCell(cells, "elr")),
    dRatio: figure(numericCell(cells, "dRatio")),
    payroll: figure(numericCell(cells, "payroll")),
    expectedLosses: expectedLosses ?? 0,
    expectedPrimary: expectedPrimary ?? 0,
  };
}

function readClaim(cells: Cells): Omit<Claim, "policyIndex"> | null {
  const claimNumber = (numericCell(cells, "claimNumber") ?? "").trim();
  if (!/^\d{4,}$/.test(claimNumber)) return null;

  const incurred = parseFigure(numericCell(cells, "actualIncurred"));
  const primary = parseFigure(numericCell(cells, "actualPrimary"));
  if (incurred.value === null && primary.value === null) return null;

  const rawStatus = (textCell(cells, "status") ?? "").trim().toUpperCase();
  const injuryRaw = (numericCell(cells, "injuryType") ?? "").trim();

  return {
    claimNumber,
    injuryType: /^\d{1,2}$/.test(injuryRaw) ? injuryRaw.padStart(2, "0") : null,
    status: rawStatus === "O" || rawStatus === "F" ? rawStatus : null,
    actualIncurred: incurred.value ?? 0,
    actualPrimary: primary.value ?? 0,
    flags: [...new Set([...incurred.flags, ...primary.flags])],
  };
}
