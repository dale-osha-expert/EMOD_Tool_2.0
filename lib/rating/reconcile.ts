import {
  MEDICAL_ONLY_INJURY_TYPE,
  NON_RATABLE_CLASS_CODES,
  type ReconcileCheck,
  type ReconcileResult,
  type Severity,
  type Worksheet,
} from "../types";
import { computeMod, inputsFromSummary } from "./formula";

/**
 * NCCI rounds each printed figure independently, so derived values can sit a
 * dollar or two away from the printed ones without anything being wrong.
 * Tolerances below are set to absorb that rounding and nothing more: a genuine
 * parse error moves a value by orders of magnitude, not by $2.
 */
const DOLLAR_TOLERANCE = 2;
const MOD_TOLERANCE = 0.005;

function check(
  id: string,
  label: string,
  scope: string,
  printed: number,
  derived: number,
  tolerance: number,
  severity: Severity = "error",
): ReconcileCheck {
  const delta = printed - derived;
  return {
    id,
    label,
    scope,
    printed,
    derived,
    delta,
    tolerance,
    passed: Math.abs(delta) <= tolerance,
    severity,
  };
}

/**
 * Re-derive every internal relationship the worksheet asserts, and report which
 * ones hold. This is the reliability gate: a mis-parsed column will not satisfy
 * `payroll / 100 x ELR = expected losses`, so a bad read is caught and named
 * rather than passed downstream as though it were real data.
 */
export function reconcile(ws: Worksheet): ReconcileResult {
  const checks: ReconcileCheck[] = [];

  /* --- Summary totals ------------------------------------------------- */
  const t = ws.totals;
  if (t) {
    checks.push(
      check(
        "totals.excess-expected",
        "(C) = (D) − (E)",
        "Summary totals",
        t.expectedExcess,
        t.expectedLosses - t.expectedPrimary,
        DOLLAR_TOLERANCE,
      ),
    );
    checks.push(
      check(
        "totals.excess-actual",
        "(F) = (H) − (I)",
        "Summary totals",
        t.actualExcess,
        t.actualIncurred - t.actualPrimary,
        DOLLAR_TOLERANCE,
      ),
    );

    const computed = computeMod(inputsFromSummary(t));
    const f = ws.factors;

    if (f.stabilizingValue !== null) {
      checks.push(
        check(
          "factors.stabilizing",
          "Stabilizing value = (C) × (1 − A) + (G)",
          "Rating factors",
          f.stabilizingValue,
          computed.stabilizingValue,
          DOLLAR_TOLERANCE,
        ),
      );
    }
    if (f.ratableExcessActual !== null) {
      checks.push(
        check(
          "factors.ratable-actual",
          "Ratable excess (actual) = (A) × (F)",
          "Rating factors",
          f.ratableExcessActual,
          computed.ratableExcessActual,
          DOLLAR_TOLERANCE,
        ),
      );
    }
    if (f.ratableExcessExpected !== null) {
      checks.push(
        check(
          "factors.ratable-expected",
          "Ratable excess (expected) = (A) × (C)",
          "Rating factors",
          f.ratableExcessExpected,
          computed.ratableExcessExpected,
          DOLLAR_TOLERANCE,
        ),
      );
    }
    if (f.numerator !== null) {
      checks.push(
        check(
          "factors.numerator",
          "(J) = (I) + stabilizing value + (A) × (F)",
          "Rating factors",
          f.numerator,
          computed.numerator,
          DOLLAR_TOLERANCE,
        ),
      );
    }
    if (f.denominator !== null) {
      checks.push(
        check(
          "factors.denominator",
          "(K) = (E) + stabilizing value + (A) × (C)",
          "Rating factors",
          f.denominator,
          computed.denominator,
          DOLLAR_TOLERANCE,
        ),
      );
      // Independent route to the same number: the denominator collapses to D + G.
      checks.push(
        check(
          "factors.denominator-alt",
          "(K) = (D) + (G)",
          "Rating factors",
          f.denominator,
          t.expectedLosses + t.ballast,
          DOLLAR_TOLERANCE,
        ),
      );
    }
    if (f.publishedMod !== null) {
      checks.push(
        check(
          "mod.recomputed",
          "Experience mod = (J) ÷ (K)",
          "Experience modification factor",
          f.publishedMod,
          computed.mod,
          MOD_TOLERANCE,
        ),
      );
    }
  }

  /* --- State rows roll up to the totals row --------------------------- *
   * When ERA applies, the state rows are pre-adjustment and the totals row is
   * post-adjustment, so a mismatch here is expected and informational rather
   * than an error. `findings.ts` turns that difference into the ERA check.    */
  if (t && ws.stateRows.length > 0) {
    const sum = (pick: (r: (typeof ws.stateRows)[number]) => number) =>
      ws.stateRows.reduce((acc, r) => acc + pick(r), 0);
    checks.push(
      check(
        "states.expected-losses",
        "Σ state (D) = totals (D)",
        "State roll-up",
        t.expectedLosses,
        sum((r) => r.expectedLosses),
        DOLLAR_TOLERANCE,
        "info",
      ),
    );
    checks.push(
      check(
        "states.actual-incurred",
        "Σ state (H) = totals (H)",
        "State roll-up",
        t.actualIncurred,
        sum((r) => r.actualIncurred),
        DOLLAR_TOLERANCE,
        "info",
      ),
    );
  }

  /* --- Claims roll up to the rated actual losses ----------------------- *
   * Claims are printed pre-ERA, so medical-only claims contribute only
   * (1 - eraReduction) of their dollars to the rated totals. This is a warning
   * rather than an error because worksheets may aggregate cases of $2,000 or
   * less into a starred summary row instead of listing them individually.     */
  if (t && ws.claims.length > 0) {
    let primary = 0;
    let incurred = 0;
    for (const c of ws.claims) {
      const era =
        ws.eraReduction !== null && c.injuryType === MEDICAL_ONLY_INJURY_TYPE
          ? 1 - ws.eraReduction
          : 1;
      primary += c.actualPrimary * era;
      incurred += c.actualIncurred * era;
    }
    checks.push(
      check(
        "claims.primary-rollup",
        "Σ claim primary (after ERA) = (I)",
        "Claim roll-up",
        t.actualPrimary,
        primary,
        DOLLAR_TOLERANCE,
        "warning",
      ),
    );
    checks.push(
      check(
        "claims.incurred-rollup",
        "Σ claim incurred (after ERA) = (H)",
        "Claim roll-up",
        t.actualIncurred,
        incurred,
        DOLLAR_TOLERANCE,
        "warning",
      ),
    );
  }

  /* --- Class rows: payroll x ELR, and the D-ratio split --------------- */
  ws.policies.forEach((policy, pIdx) => {
    const scopeBase = `Policy ${pIdx + 1}${
      policy.policyNumber ? ` (${policy.policyNumber})` : ""
    }`;

    policy.classRows.forEach((row) => {
      if (NON_RATABLE_CLASS_CODES.has(row.code)) return;
      const scope = `${scopeBase}, class ${row.code}`;

      if (row.payroll !== null && row.elr !== null) {
        checks.push(
          check(
            `class.${pIdx}.${row.code}.expected`,
            "Expected losses = payroll ÷ 100 × ELR",
            scope,
            row.expectedLosses,
            (row.payroll / 100) * row.elr,
            // ELR is printed to two decimals, so on large payrolls the implied
            // rounding band is wider than a flat $2. Scale with payroll.
            Math.max(DOLLAR_TOLERANCE, (row.payroll / 100) * 0.005 + 1),
          ),
        );
      }

      if (row.dRatio !== null) {
        checks.push(
          check(
            `class.${pIdx}.${row.code}.primary`,
            "Expected primary = expected losses × D-ratio",
            scope,
            row.expectedPrimary,
            row.expectedLosses * row.dRatio,
            Math.max(DOLLAR_TOLERANCE, row.expectedLosses * 0.005 + 1),
          ),
        );
      }
    });

    /* --- Policy totals ------------------------------------------------ */
    if (policy.totalPayroll !== null && policy.classRows.length > 0) {
      const summed = policy.classRows.reduce(
        (acc, r) => acc + (r.payroll ?? 0),
        0,
      );
      checks.push(
        check(
          `policy.${pIdx}.payroll`,
          "Policy total payroll = Σ class payroll",
          scopeBase,
          policy.totalPayroll,
          summed,
          DOLLAR_TOLERANCE,
        ),
      );
    }
  });

  const failedCount = checks.filter((c) => !c.passed && c.severity === "error")
    .length;

  return {
    checks,
    passed: failedCount === 0,
    failedCount,
    insufficientData: !t || checks.length === 0,
  };
}
