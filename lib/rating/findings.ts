import {
  INJURY_TYPES,
  MEDICAL_ONLY_INJURY_TYPE,
  NON_RATABLE_CLASS_CODES,
  type Finding,
  type ModComputation,
  type ReconcileResult,
  type Scenario,
  type Worksheet,
} from "../types";
import { inferSplitPoint, ratedContributions } from "./claims";

const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Deterministic observations drawn from the worksheet's own numbers.
 *
 * Every finding here is computed, not inferred by a model, and every one is
 * worded as something to check rather than something proven. The tool does not
 * have the claim files, the policy contracts or the carrier's reserving
 * rationale, so it can point at a figure and say what would follow if it moved
 * without being able to say that it should.
 */
export function buildFindings(
  ws: Worksheet,
  computed: ModComputation,
  reconciliation: ReconcileResult,
  scenarios: Scenario[],
): Finding[] {
  const findings: Finding[] = [];
  const splitPoint = inferSplitPoint(ws.claims);

  /* --- 1. Cells that do not reconcile --------------------------------- */
  for (const c of reconciliation.checks) {
    if (c.passed || c.severity === "info") continue;
    findings.push({
      id: `reconcile:${c.id}`,
      severity: c.severity,
      title: `${c.scope}: ${c.label} does not tie out`,
      detail:
        `The worksheet prints ${money(c.printed)} where the other printed values imply ` +
        `${money(c.derived)}, a difference of ${money(Math.abs(c.delta))}. This may be a reading ` +
        `error on our side, or it may be a genuine discrepancy in the rating worth raising with ` +
        `your agent or carrier, who can take it to the rating bureau. Confirm the figure against the original document before acting on it.`,
      evidence: [
        `Printed: ${money(c.printed)}`,
        `Derived: ${money(c.derived)}`,
        `Rule: ${c.label}`,
      ],
      dollarImpact: null,
    });
  }

  /* --- 2. Open claims, ranked by what they cost ----------------------- */
  const removalById = new Map(
    scenarios
      .filter((s) => s.id.startsWith("remove:"))
      .map((s) => [s.claimNumber, s] as const),
  );

  const openClaims = ws.claims
    .filter((c) => c.status === "O")
    .sort((a, b) => b.actualIncurred - a.actualIncurred);

  for (const claim of openClaims) {
    const scenario = removalById.get(claim.claimNumber);
    if (!scenario) continue;
    const points = Math.abs(scenario.modDelta);
    findings.push({
      id: `open-claim:${claim.claimNumber}`,
      severity: points >= 0.05 ? "warning" : "info",
      title: `Open claim ${claim.claimNumber} carries ${points.toFixed(2)} of the current mod`,
      detail:
        `This claim is still open, so its reserve is an estimate that can move. It is currently ` +
        `valued at ${money(claim.actualIncurred)} incurred (${money(claim.actualPrimary)} primary). ` +
        `If it closed for nothing, the mod would be ${scenario.mod.toFixed(2)} instead of ${computed.mod.toFixed(2)}. ` +
        `Open reserves are usually the most movable figure on a rating, so this may be worth reviewing ` +
        `with the carrier's claims adjuster to confirm the reserve reflects the current medical and ` +
        `disability picture.`,
      evidence: [
        `Status: open`,
        `Injury type: ${claim.injuryType ?? "not stated"}${
          claim.injuryType && INJURY_TYPES[claim.injuryType]
            ? ` (${INJURY_TYPES[claim.injuryType]})`
            : ""
        }`,
        `Incurred: ${money(claim.actualIncurred)}`,
        `Primary: ${money(claim.actualPrimary)}`,
      ],
      dollarImpact: scenario.premiumDelta,
      claimNumber: claim.claimNumber,
    });
  }

  /* --- 3. Claims capped at the split point ---------------------------- */
  if (splitPoint !== null) {
    for (const claim of ws.claims) {
      if (claim.actualPrimary < claim.actualIncurred) {
        const excess = claim.actualIncurred - claim.actualPrimary;
        findings.push({
          id: `capped:${claim.claimNumber}`,
          severity: "info",
          title: `Claim ${claim.claimNumber} is capped at the ${money(splitPoint)} split point`,
          detail:
            `${money(excess)} of this claim sits above the split point. Excess dollars enter the mod ` +
            `only at the ${computed.weight.toFixed(2)} weighting factor, so each dollar above the cap ` +
            `affects the mod roughly ${(1 / Math.max(computed.weight, 0.01)).toFixed(0)}× less than a ` +
            `dollar below it. That is worth knowing before spending effort on the excess portion: ` +
            `the primary ${money(claim.actualPrimary)} is where the leverage is.`,
          evidence: [
            `Incurred: ${money(claim.actualIncurred)}`,
            `Primary (capped): ${money(claim.actualPrimary)}`,
            `Excess: ${money(excess)}`,
            `Weighting factor: ${computed.weight.toFixed(2)}`,
          ],
          dollarImpact: null,
          claimNumber: claim.claimNumber,
        });
      } else if (claim.actualPrimary > splitPoint + 1) {
        findings.push({
          id: `overcap:${claim.claimNumber}`,
          severity: "error",
          title: `Claim ${claim.claimNumber} shows primary losses above the split point`,
          detail:
            `Primary losses are printed as ${money(claim.actualPrimary)}, above the ${money(splitPoint)} ` +
            `split point observed elsewhere on this rating. Primary losses should be capped at the split ` +
            `point, so this looks inconsistent and may be worth querying.`,
          evidence: [
            `Primary: ${money(claim.actualPrimary)}`,
            `Observed split point: ${money(splitPoint)}`,
          ],
          dollarImpact: null,
          claimNumber: claim.claimNumber,
        });
      }
    }
  }

  /* --- 3b. Claims cut down by the loss limitation ---------------------- */
  const contributions = ratedContributions(ws);
  for (const claim of ws.claims) {
    const rated = contributions.byClaim.get(claim);
    if (!rated?.limited) continue;

    const era = ws.eraReduction !== null && claim.injuryType === MEDICAL_ONLY_INJURY_TYPE
      ? 1 - ws.eraReduction
      : 1;
    const entering = (rated.primary + rated.excess) / Math.max(era, 1e-9);
    const removed = claim.actualIncurred - entering;

    findings.push({
      id: `limited:${claim.claimNumber}`,
      severity: "info",
      title: `Claim ${claim.claimNumber} is capped by the loss limitation, not counted in full`,
      detail:
        `The worksheet prints ${money(claim.actualIncurred)} for this claim, but flags it as a limited ` +
        `loss. A single accident enters the rating only up to the state's loss limitation, and the ` +
        `totals on this worksheet imply about ${money(entering)} of it was actually rated — roughly ` +
        `${money(removed)} was set aside. That is worth knowing before reacting to the printed figure: ` +
        `the claim is already costing you less than it appears to, and reducing it further has a ` +
        `correspondingly smaller effect. The scenarios below use the limited value.`,
      evidence: [
        `Printed incurred: ${money(claim.actualIncurred)}`,
        `Implied rated value: ${money(entering)}`,
        `Flags: ${claim.flags.join(" ")}`,
      ],
      dollarImpact: null,
      claimNumber: claim.claimNumber,
    });
  }

  if (contributions.unexplained > 1) {
    findings.push({
      id: "claims:unexplained-rollup",
      severity: "warning",
      title: "The listed claims add up to more than the rated total",
      detail:
        `Adding up the claims on this worksheet, after the medical-only discount and any loss ` +
        `limitation, gives about ${money(contributions.unexplained)} more than the totals row states. ` +
        `Worksheets sometimes roll cases of $2,000 or less into a single starred line rather than ` +
        `listing them, which can explain a small gap. A large one may be worth querying, since the ` +
        `claim-level figures below would then not tell the whole story.`,
      evidence: [`Unaccounted difference: ${money(contributions.unexplained)}`],
      dollarImpact: null,
    });
  }

  /* --- 4. Medical-only claims and the ERA discount -------------------- */
  const medOnly = ws.claims.filter(
    (c) => c.injuryType === MEDICAL_ONLY_INJURY_TYPE,
  );
  if (medOnly.length > 0) {
    if (ws.eraReduction === null) {
      findings.push({
        id: "era:absent",
        severity: "info",
        title: `${medOnly.length} medical-only claim${medOnly.length === 1 ? "" : "s"} with no medical-only discount noted`,
        detail:
          `This rating includes claims coded as medical only (injury type 06), but the worksheet does not ` +
          `state that a medical-only reduction was applied. Many states apply an Experience Rating ` +
          `Adjustment that removes a share of medical-only loss dollars. Whether one applies here depends ` +
          `on the state, so it may be worth confirming with your agent that the rating reflects the ` +
          `correct treatment.`,
        evidence: medOnly.map(
          (c) => `Claim ${c.claimNumber}: ${money(c.actualIncurred)} incurred`,
        ),
        dollarImpact: null,
      });
    } else {
      const eraScenario = scenarios.find((s) => s.id === "era:off");
      findings.push({
        id: "era:applied",
        severity: "info",
        title: `Medical-only discount of ${Math.round(ws.eraReduction * 100)}% is being applied`,
        detail:
          `${medOnly.length} claim${medOnly.length === 1 ? " is" : "s are"} coded medical only, and the ` +
          `worksheet applies a ${Math.round(ws.eraReduction * 100)}% reduction to those loss dollars.` +
          (eraScenario
            ? ` Without it the mod would be ${eraScenario.mod.toFixed(2)} rather than ${computed.mod.toFixed(2)}.`
            : "") +
          ` This is working in your favour. It is worth confirming that every genuinely medical-only claim ` +
          `is coded as injury type 06, since a miscoded claim would lose this treatment.`,
        evidence: medOnly.map(
          (c) => `Claim ${c.claimNumber}: ${money(c.actualIncurred)} incurred`,
        ),
        dollarImpact: null,
      });
    }
  }

  /* --- 5. Duplicate claim numbers ------------------------------------- */
  const seen = new Map<string, number>();
  for (const c of ws.claims) {
    seen.set(c.claimNumber, (seen.get(c.claimNumber) ?? 0) + 1);
  }
  for (const [claimNumber, count] of seen) {
    if (count > 1) {
      findings.push({
        id: `duplicate:${claimNumber}`,
        severity: "warning",
        title: `Claim ${claimNumber} appears ${count} times`,
        detail:
          `The same claim number is printed in more than one policy block. That can be legitimate when a ` +
          `claim spans policy periods, but it can also indicate the same loss being counted twice. Worth ` +
          `checking, since a duplicated claim would inflate the mod.`,
        evidence: [`Occurrences: ${count}`],
        dollarImpact: null,
        claimNumber,
      });
    }
  }

  /* --- 6. Experience period coverage ---------------------------------- *
   * NCCI rates the three years ending roughly one year before the rating
   * effective date, so the most recent year of experience is excluded.       */
  const ratingYear = parseYear(ws.ratingEffectiveDate);
  if (ratingYear !== null) {
    const years = new Set<number>();
    for (const p of ws.policies) {
      const y = parseYear(p.effectiveDate);
      if (y !== null) years.add(y);
    }
    const expected = [ratingYear - 4, ratingYear - 3, ratingYear - 2];
    const missing = expected.filter((y) => !years.has(y));
    if (missing.length > 0 && years.size > 0) {
      findings.push({
        id: "period:gaps",
        severity: "warning",
        title: `No policy data found for ${missing.join(", ")}`,
        detail:
          `For a rating effective ${ws.ratingEffectiveDate}, the experience period would normally cover ` +
          `policies beginning in ${expected.join(", ")}. Nothing appears here for ${missing.join(", ")}. ` +
          `If the business was covered in ${missing.length === 1 ? "that year" : "those years"}, the ` +
          `missing payroll and losses may be worth raising, since absent payroll lowers expected losses ` +
          `and can push the mod up.`,
        evidence: [
          `Rating effective: ${ws.ratingEffectiveDate}`,
          `Policy years present: ${[...years].sort().join(", ") || "none"}`,
        ],
        dollarImpact: null,
      });
    }
  }

  /* --- 7. Rating surcharges ------------------------------------------- */
  for (const [key, label] of [
    ["arap", "ARAP"],
    ["flarap", "FLARAP"],
    ["sarap", "SARAP"],
    ["maarap", "MAARAP"],
  ] as const) {
    const value = ws.factors[key];
    if (value !== null && value > 1) {
      findings.push({
        id: `surcharge:${key}`,
        severity: "warning",
        title: `${label} surcharge of ${value.toFixed(2)} is applied`,
        detail:
          `An assessment surcharge above 1.00 is on this rating, which multiplies the premium after the ` +
          `mod is applied. Reducing the mod also reduces what this surcharge is charged on, so the two ` +
          `compound. Your agent can confirm whether the surcharge is correctly applied for your state.`,
        evidence: [`${label}: ${value.toFixed(2)}`],
        dollarImpact: null,
      });
    }
  }

  /* --- 8. Payroll concentrated in high-ELR class codes ---------------- */
  const byCode = new Map<string, { payroll: number; elr: number; expected: number }>();
  for (const p of ws.policies) {
    for (const r of p.classRows) {
      if (NON_RATABLE_CLASS_CODES.has(r.code)) continue;
      if (r.payroll === null || r.elr === null) continue;
      const cur = byCode.get(r.code) ?? { payroll: 0, elr: r.elr, expected: 0 };
      cur.payroll += r.payroll;
      cur.expected += r.expectedLosses;
      byCode.set(r.code, cur);
    }
  }
  if (byCode.size > 1) {
    const entries = [...byCode.entries()].sort((a, b) => b[1].elr - a[1].elr);
    const highest = entries[0];
    const lowest = entries[entries.length - 1];
    const totalPayroll = entries.reduce((a, [, v]) => a + v.payroll, 0);
    const share = totalPayroll > 0 ? highest[1].payroll / totalPayroll : 0;

    if (share > 0.2 && highest[1].elr > lowest[1].elr * 3) {
      const delta =
        (highest[1].payroll / 100) * (highest[1].elr - lowest[1].elr);
      findings.push({
        id: "classification:concentration",
        severity: "info",
        title: `${Math.round(share * 100)}% of payroll sits in class ${highest[0]}, the highest-rated code on this policy`,
        detail:
          `Class ${highest[0]} carries an expected loss rate of ${highest[1].elr.toFixed(2)} per $100 of ` +
          `payroll, against ${lowest[1].elr.toFixed(2)} for class ${lowest[0]}. Payroll assigned to a ` +
          `higher-rated code raises expected losses, and misassigned payroll is one of the more common ` +
          `correctable errors on a rating. If any of this payroll belongs to employees whose actual duties ` +
          `fit a different classification, it may be worth a classification review with your agent. ` +
          `Note that higher expected losses are not automatically bad: they raise the denominator of the ` +
          `mod calculation as well.`,
        evidence: [
          `Class ${highest[0]}: ${money(highest[1].payroll)} payroll at ELR ${highest[1].elr.toFixed(2)}`,
          `Class ${lowest[0]}: ${money(lowest[1].payroll)} payroll at ELR ${lowest[1].elr.toFixed(2)}`,
          `Spread if reclassified to the lowest code: ${money(delta)} of expected losses`,
        ],
        dollarImpact: null,
      });
    }
  }

  /* --- 9. Revised rating notice --------------------------------------- */
  const revised = ws.notes.find((n) => /REVISED RATING/i.test(n));
  if (revised) {
    findings.push({
      id: "notes:revised",
      severity: "info",
      title: "This is a revised rating",
      detail:
        `The worksheet is marked as a revision, meaning the mod has already changed once for this ` +
        `effective date. It is worth confirming your carrier is billing against this revised figure ` +
        `rather than the superseded one, since premium is sometimes not re-rated automatically.`,
      evidence: ws.notes.filter((n) => /REVISED/i.test(n)),
      dollarImpact: null,
    });
  }

  /* --- 10. Where the mod sits ----------------------------------------- */
  const minScenario = scenarios.find((s) => s.id === "minimum");
  if (minScenario) {
    const room = computed.mod - minScenario.mod;
    const atFloor = room < 0.005;

    findings.push({
      id: "position",
      severity: computed.mod > 1 ? "warning" : "info",
      title: atFloor
        ? `Mod of ${computed.mod.toFixed(2)} is already the best this experience period can produce`
        : computed.mod > 1
          ? `Mod of ${computed.mod.toFixed(2)} is above unity, adding roughly ${Math.round((computed.mod - 1) * 100)}% to manual premium`
          : `Mod of ${computed.mod.toFixed(2)} is a credit against manual premium`,
      detail: atFloor
        ? `No rated losses appear on this experience period, so the mod is sitting at its loss-free ` +
          `minimum of ${minScenario.mod.toFixed(2)}. Nothing in the claim experience can improve it further. ` +
          `The mod is below 1.00 only to the extent the expected-loss and ballast figures allow, and those ` +
          `follow from payroll and classification rather than from claims — so if a lower factor is the ` +
          `goal, a classification and payroll review is the only remaining avenue.`
        : `The loss-free minimum for this experience period is ${minScenario.mod.toFixed(2)}, so there is ` +
          `${room.toFixed(2)} of movement between the current mod and the best this period could produce. ` +
          `That gap is the total the loss experience is costing; individual claims below account for parts of it.`,
      evidence: [
        `Current mod: ${computed.mod.toFixed(2)}`,
        `Loss-free minimum: ${minScenario.mod.toFixed(2)}`,
        `Gap: ${room.toFixed(2)}`,
      ],
      dollarImpact: atFloor ? null : minScenario.premiumDelta,
    });
  }

  const rank: Record<string, number> = { error: 0, warning: 1, info: 2 };
  return findings.sort((a, b) => {
    const bySeverity = rank[a.severity] - rank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return Math.abs(b.dollarImpact ?? 0) - Math.abs(a.dollarImpact ?? 0);
  });
}

function parseYear(date: string | null): number | null {
  if (!date) return null;
  const m = date.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}
