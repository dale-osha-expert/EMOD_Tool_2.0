import type { ModComputation, SummaryRow } from "../types";

/**
 * Round half-up to `places` decimals, matching how NCCI publishes factors.
 * JavaScript's Math.round already rounds half-up for positive numbers, but
 * naive `Math.round(x * 100) / 100` misbehaves on values like 1.005 that are
 * not exactly representable in binary floating point. Going through the
 * exponent form avoids that class of error.
 */
export function roundHalfUp(value: number, places: number): number {
  if (!Number.isFinite(value)) return value;
  const shifted = Number(`${value}e${places}`);
  if (!Number.isFinite(shifted)) return Number(value.toFixed(places));
  return Number(`${Math.round(shifted)}e-${places}`);
}

export interface ModInputs {
  /** (A) Weighting factor. */
  weight: number;
  /** (I) Actual primary losses. */
  actualPrimary: number;
  /** (F) Actual excess losses. */
  actualExcess: number;
  /** (E) Expected primary losses. */
  expectedPrimary: number;
  /** (C) Expected excess losses. */
  expectedExcess: number;
  /** (G) Ballast. */
  ballast: number;
}

/**
 * The NCCI experience rating formula.
 *
 *              actual primary + stabilizing value + W x actual excess
 *   Mod  =  ---------------------------------------------------------------
 *            expected primary + stabilizing value + W x expected excess
 *
 * where the stabilizing value is `expected excess x (1 - W) + ballast`.
 *
 * Note the denominator algebraically collapses to `expected losses + ballast`
 * (i.e. D + G), which `reconcile.ts` uses as an independent cross-check.
 */
export function computeMod(inputs: ModInputs): ModComputation {
  const {
    weight,
    actualPrimary,
    actualExcess,
    expectedPrimary,
    expectedExcess,
    ballast,
  } = inputs;

  const stabilizingValue = expectedExcess * (1 - weight) + ballast;
  const ratableExcessActual = weight * actualExcess;
  const ratableExcessExpected = weight * expectedExcess;

  const numerator = actualPrimary + stabilizingValue + ratableExcessActual;
  const denominator = expectedPrimary + stabilizingValue + ratableExcessExpected;

  const raw = denominator === 0 ? 0 : numerator / denominator;

  return {
    weight,
    actualPrimary,
    actualExcess,
    expectedPrimary,
    expectedExcess,
    ballast,
    stabilizingValue,
    ratableExcessActual,
    ratableExcessExpected,
    numerator,
    denominator,
    raw,
    mod: roundHalfUp(raw, 2),
  };
}

/** Build mod inputs from the worksheet's lettered (A)-(I) totals row. */
export function inputsFromSummary(row: SummaryRow): ModInputs {
  return {
    weight: row.weight,
    actualPrimary: row.actualPrimary,
    actualExcess: row.actualExcess,
    expectedPrimary: row.expectedPrimary,
    expectedExcess: row.expectedExcess,
    ballast: row.ballast,
  };
}

/**
 * The lowest mod attainable on this experience period: every actual loss dollar
 * removed. Useful as the floor that frames every other scenario.
 */
export function minimumMod(inputs: ModInputs): ModComputation {
  return computeMod({ ...inputs, actualPrimary: 0, actualExcess: 0 });
}
