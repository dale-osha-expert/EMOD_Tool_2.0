import {
  MEDICAL_ONLY_INJURY_TYPE,
  type Claim,
  type Worksheet,
} from "../types";

/**
 * Infer the NCCI split point from the worksheet itself.
 *
 * The split point is the dollar level above which losses become excess. Any
 * claim whose actual primary is less than its actual incurred has been capped,
 * and that cap is the split point. Reading it off the document avoids buying
 * NCCI's state split-point tables, and is exact for the rating in hand rather
 * than an approximation from a published table that may not match this state
 * and effective date.
 *
 * Returns null when no claim is capped, meaning every claim falls below the
 * split point and its value cannot be observed from this document.
 */
export function inferSplitPoint(claims: Claim[]): number | null {
  const capped = claims.filter((c) => c.actualPrimary < c.actualIncurred);
  if (capped.length === 0) return null;
  return Math.max(...capped.map((c) => c.actualPrimary));
}

/**
 * How much of a claim's dollars actually reach the rating. Claims are printed
 * pre-ERA; medical-only claims are discounted before they enter the totals row.
 */
export function eraFactor(claim: Claim, eraReduction: number | null): number {
  if (eraReduction === null) return 1;
  return claim.injuryType === MEDICAL_ONLY_INJURY_TYPE ? 1 - eraReduction : 1;
}

/** A claim's contribution to the rated (A)-(I) totals row. */
export function ratedContribution(
  claim: Claim,
  eraReduction: number | null,
): { primary: number; excess: number } {
  const f = eraFactor(claim, eraReduction);
  return {
    primary: claim.actualPrimary * f,
    excess: (claim.actualIncurred - claim.actualPrimary) * f,
  };
}

/**
 * Footnote flags marking a claim whose rated value is not its printed incurred.
 * NCCI caps a single accident at the state's loss limitation and may exclude a
 * catastrophic loss outright, but prints the unlimited figure on the worksheet.
 */
const LIMITED_LOSS_FLAGS = new Set(["#", "C"]);

export interface RatedContribution {
  primary: number;
  excess: number;
  /** True when this claim's excess was reduced to make the roll-up tie. */
  limited: boolean;
}

export interface ClaimContributions {
  byClaim: Map<Claim, RatedContribution>;
  /** Dollars removed from limited claims to reconcile with the totals row. */
  limitationApplied: number;
  /** Roll-up difference we could not attribute to a limited claim. */
  unexplained: number;
}

const ROLLUP_TOLERANCE = 2;

/**
 * What each claim actually contributes to the rated totals.
 *
 * Two adjustments separate this from the printed figures. Medical-only claims
 * are discounted by ERA. And a claim flagged as limited or catastrophic enters
 * the rating at less than its printed incurred, without the worksheet ever
 * saying by how much.
 *
 * That second one is recoverable. The totals row states what the losses summed
 * to after limitation, so the gap between the printed claims and the printed
 * total is precisely the amount that was limited away. Attributing that gap to
 * the flagged claims turns an unknown into an exact figure - which matters,
 * because a limited claim is usually the largest on the rating and therefore
 * the one whose scenarios people act on.
 */
export function ratedContributions(ws: Worksheet): ClaimContributions {
  const byClaim = new Map<Claim, RatedContribution>();
  for (const claim of ws.claims) {
    const { primary, excess } = ratedContribution(claim, ws.eraReduction);
    byClaim.set(claim, { primary, excess, limited: false });
  }

  const totals = ws.totals;
  if (!totals || ws.claims.length === 0) {
    return { byClaim, limitationApplied: 0, unexplained: 0 };
  }

  const sum = (pick: (c: RatedContribution) => number) =>
    [...byClaim.values()].reduce((acc, c) => acc + pick(c), 0);

  // Positive means the printed claims add up to more than the rating used.
  const residual = sum((c) => c.excess) - totals.actualExcess;
  if (residual <= ROLLUP_TOLERANCE) {
    return {
      byClaim,
      limitationApplied: 0,
      unexplained: Math.abs(residual) > ROLLUP_TOLERANCE ? residual : 0,
    };
  }

  const limited = ws.claims.filter((c) =>
    c.flags.some((f) => LIMITED_LOSS_FLAGS.has(f)),
  );
  const available = limited.reduce(
    (acc, c) => acc + (byClaim.get(c)?.excess ?? 0),
    0,
  );

  // Only attribute what the flagged claims can actually account for. Anything
  // beyond that is a different problem - most often a worksheet that rolls
  // cases of $2,000 or less into a single starred line instead of listing them.
  if (limited.length === 0 || available <= 0) {
    return { byClaim, limitationApplied: 0, unexplained: residual };
  }

  const applied = Math.min(residual, available);
  for (const claim of limited) {
    const current = byClaim.get(claim)!;
    const share = current.excess / available;
    byClaim.set(claim, {
      primary: current.primary,
      excess: Math.max(0, current.excess - applied * share),
      limited: true,
    });
  }

  return {
    byClaim,
    limitationApplied: applied,
    unexplained: residual - applied,
  };
}

/**
 * The primary/excess split point that applies to one claim.
 *
 * A claim whose printed primary is below its printed incurred has already been
 * capped, and that cap is the split point that applied to it - exact, and with
 * no need to map the claim's policy back to a state. An uncapped claim sits
 * entirely below the split point, so reducing it keeps it uncapped and the
 * value is irrelevant.
 */
export function capForClaim(claim: Claim): number {
  return claim.actualPrimary < claim.actualIncurred
    ? claim.actualPrimary
    : Number.POSITIVE_INFINITY;
}
