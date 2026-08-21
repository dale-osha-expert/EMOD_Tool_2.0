import {
  MEDICAL_ONLY_INJURY_TYPE,
  type Claim,
  type ModComputation,
  type Scenario,
  type Worksheet,
} from "../types";
import {
  capForClaim,
  eraFactor,
  inferSplitPoint,
  ratedContributions,
  type ClaimContributions,
} from "./claims";
import { computeMod, type ModInputs, roundHalfUp } from "./formula";


/**
 * Average annual subject premium across the experience period.
 *
 * Subject premium is printed per policy block, and blocks span roughly three
 * policy years with several concurrent policies per year. Summing everything
 * and dividing by the number of distinct policy years gives a per-year figure
 * to scale mod changes against. It is an estimate: these are historical
 * premiums, not the premium the mod will actually be applied to.
 */
export function averageAnnualSubjectPremium(ws: Worksheet): number | null {
  const withPremium = ws.policies.filter((p) => p.subjectPremium !== null);
  if (withPremium.length === 0) return null;

  const total = withPremium.reduce((acc, p) => acc + (p.subjectPremium ?? 0), 0);
  if (total <= 0) return null;

  const years = new Set(
    withPremium
      .map((p) => p.effectiveDate?.slice(-4))
      .filter((y): y is string => Boolean(y)),
  );
  const divisor = years.size > 0 ? years.size : 1;
  return total / divisor;
}

function premiumImpact(modDelta: number, premium: number | null): number | null {
  if (premium === null) return null;
  return roundHalfUp(modDelta * premium, 0);
}

export interface ScenarioContext {
  base: ModInputs;
  current: ModComputation;
  splitPoint: number | null;
  subjectPremium: number | null;
  eraReduction: number | null;
  contributions: ClaimContributions;
}

function makeScenario(
  ctx: ScenarioContext,
  id: string,
  label: string,
  description: string,
  overrides: Partial<ModInputs>,
  claimNumber?: string,
): Scenario {
  const computed = computeMod({ ...ctx.base, ...overrides });
  const modDelta = roundHalfUp(computed.mod - ctx.current.mod, 2);
  return {
    id,
    label,
    description,
    mod: computed.mod,
    modDelta,
    premiumDelta: premiumImpact(modDelta, ctx.subjectPremium),
    claimNumber,
  };
}

/**
 * Every what-if the worksheet supports, computed locally and exactly. No model
 * is involved in any of these numbers.
 */
export function buildScenarios(ws: Worksheet, current: ModComputation): Scenario[] {
  const base: ModInputs = {
    weight: current.weight,
    actualPrimary: current.actualPrimary,
    actualExcess: current.actualExcess,
    expectedPrimary: current.expectedPrimary,
    expectedExcess: current.expectedExcess,
    ballast: current.ballast,
  };

  const ctx: ScenarioContext = {
    base,
    current,
    splitPoint: inferSplitPoint(ws.claims),
    subjectPremium: averageAnnualSubjectPremium(ws),
    eraReduction: ws.eraReduction,
    contributions: ratedContributions(ws),
  };

  const scenarios: Scenario[] = [];

  /* --- The floor ------------------------------------------------------ */
  scenarios.push(
    makeScenario(
      ctx,
      "minimum",
      "Loss-free minimum",
      "The lowest mod this experience period could produce, with every actual loss dollar removed. Nothing can be done to go below this; it is the yardstick for every other scenario.",
      { actualPrimary: 0, actualExcess: 0 },
    ),
  );

  /* --- Remove one claim ----------------------------------------------- */
  for (const claim of ws.claims) {
    const { primary, excess } = ctx.contributions.byClaim.get(claim)!;
    if (primary === 0 && excess === 0) continue;
    scenarios.push(
      makeScenario(
        ctx,
        `remove:${claim.claimNumber}`,
        `Without claim ${claim.claimNumber}`,
        describeRemoval(claim, ctx),
        {
          actualPrimary: Math.max(0, base.actualPrimary - primary),
          actualExcess: Math.max(0, base.actualExcess - excess),
        },
        claim.claimNumber,
      ),
    );
  }

  /* --- Reduce reserves on open claims --------------------------------- *
   * Only open claims have reserves still to move. Reducing incurred moves the
   * primary portion dollar-for-dollar until the split point cap is reached;
   * beyond that the reduction lands in excess, which is only W-weighted.      */
  for (const claim of ws.claims) {
    if (claim.status !== "O") continue;
    const cap = capForClaim(claim);
    const old = ctx.contributions.byClaim.get(claim)!;

    for (const pct of [0.25, 0.5, 0.75]) {
      // A limited claim's rated value is lower than its printed one, so scale
      // the reduction against what actually reaches the rating.
      const ratedIncurred =
        (old.primary + old.excess) / Math.max(eraFactor(claim, ctx.eraReduction), 1e-9);
      const newIncurred = ratedIncurred * (1 - pct);
      const newPrimary = Math.min(newIncurred, cap);
      const f = eraFactor(claim, ctx.eraReduction);

      scenarios.push(
        makeScenario(
          ctx,
          `reserve:${claim.claimNumber}:${pct}`,
          `Claim ${claim.claimNumber} settles ${Math.round(pct * 100)}% below current reserve`,
          `Models this open claim closing at ${Math.round((1 - pct) * 100)}% of the value that currently reaches the rating${
            Number.isFinite(cap)
              ? `, with the primary portion capped at the $${cap.toLocaleString()} split point`
              : ""
          }.`,
          {
            actualPrimary: Math.max(
              0,
              base.actualPrimary - old.primary + newPrimary * f,
            ),
            actualExcess: Math.max(
              0,
              base.actualExcess -
                old.excess +
                (newIncurred - newPrimary) * f,
            ),
          },
          claim.claimNumber,
        ),
      );
    }
  }

  /* --- ERA sensitivity ------------------------------------------------ *
   * Shows what the medical-only discount is worth, by re-rating those claims
   * at their full undiscounted value.                                        */
  if (ctx.eraReduction !== null) {
    const medOnly = ws.claims.filter(
      (c) => c.injuryType === MEDICAL_ONLY_INJURY_TYPE,
    );
    if (medOnly.length > 0) {
      let addedPrimary = 0;
      let addedExcess = 0;
      for (const c of medOnly) {
        const rated = ctx.contributions.byClaim.get(c)!;
        addedPrimary += c.actualPrimary - rated.primary;
        addedExcess += c.actualIncurred - c.actualPrimary - rated.excess;
      }
      scenarios.push(
        makeScenario(
          ctx,
          "era:off",
          "Without the medical-only discount",
          `What the mod would be if the ${Math.round(
            ctx.eraReduction * 100,
          )}% medical-only reduction did not apply to the ${medOnly.length} medical-only claim${
            medOnly.length === 1 ? "" : "s"
          } on this rating. The gap is what that discount is currently worth.`,
          {
            actualPrimary: base.actualPrimary + addedPrimary,
            actualExcess: base.actualExcess + addedExcess,
          },
        ),
      );
    }
  }

  return scenarios;
}

/**
 * What removing a particular claim means in practice, rather than a generic
 * sentence repeated once per claim. What matters differs by claim: an open
 * claim is a live reserve, a capped one is mostly excess, a closed medical-only
 * one is already discounted and largely settled.
 */
function describeRemoval(claim: Claim, ctx: ScenarioContext): string {
  const rated = ctx.contributions.byClaim.get(claim)!;
  const amount = `$${Math.round(claim.actualIncurred).toLocaleString("en-US")}`;
  const capped = claim.actualPrimary < claim.actualIncurred;

  if (rated.limited) {
    const entering = Math.round(
      (rated.primary + rated.excess) /
        Math.max(eraFactor(claim, ctx.eraReduction), 1e-9),
    );
    return (
      `This claim is printed at ${amount} incurred, but it is flagged as limited, so only about ` +
      `$${entering.toLocaleString("en-US")} of it reaches the rating. The figures here reflect the ` +
      `limited value, not the printed one.`
    );
  }

  const opening =
    claim.status === "O"
      ? `This claim is still open at ${amount} incurred, so its reserve is an estimate that can still move.`
      : claim.status === "F"
        ? `This claim is closed at ${amount} incurred, so its value is unlikely to change.`
        : `This claim carries ${amount} incurred.`;

  const mechanism = capped
    ? ` Only $${Math.round(claim.actualPrimary).toLocaleString("en-US")} of it is primary; the rest is excess and enters the mod at the ${ctx.base.weight.toFixed(2)} weighting factor.`
    : claim.injuryType === MEDICAL_ONLY_INJURY_TYPE && ctx.eraReduction !== null
      ? ` It is medical only, so the ${Math.round(ctx.eraReduction * 100)}% reduction already removes most of its weight.`
      : " All of it is primary, so it counts against the mod dollar for dollar.";

  return opening + mechanism;
}
