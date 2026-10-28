import { ratedContributions } from "../rating/claims";
import type { Analysis } from "../types";
import {
  CERTIFY_ME,
  CERTIFY_ME_ONLINE,
  COMPLIANCE_HUB,
  type SiteLink,
} from "./brand";

/**
 * The marketing that follows the results, tied to what this worksheet shows.
 *
 * Every figure quoted here is one the page has already calculated, and every
 * claim about a destination is one its own site makes. Two things are
 * deliberately not done:
 *
 * - No targeting by class code. Worksheets usually print no class description,
 *   and guessing that a code means forklifts would put an unverifiable claim
 *   about the visitor's own business on the page. The visitor picks the
 *   equipment instead.
 * - No promise that training or records lower a mod. Training is part of
 *   preventing the incidents that become claims; how much it moves a rating is
 *   not something one worksheet can show.
 *
 * Plain ASCII throughout: these strings are also drawn into the PDF report,
 * whose built-in fonts have no glyph for typographic minus or approximation.
 */

export interface PromotionLink {
  link: SiteLink;
  /** What the visitor is choosing between, e.g. the equipment a course covers. */
  label: string;
}

export interface Promotion {
  id: "training" | "records";
  headline: string;
  body: string;
  links: PromotionLink[];
}

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

export function buildPromotions(
  analysis: Analysis,
  options: { includeComplianceHub: boolean },
): Promotion[] {
  const { worksheet: ws, computed, scenarios } = analysis;
  const minimum = scenarios.find((s) => s.id === "minimum");
  const fromLosses = minimum ? Math.round((computed.mod - minimum.mod) * 100) / 100 : 0;
  const annual = minimum?.premiumDelta != null ? -minimum.premiumDelta : null;

  const prevention =
    "Where a team operates forklifts or aerial lifts, OSHA holds the employer responsible for training and evaluating every operator, and that training is part of preventing the incidents that become future claims.";

  const training: Promotion =
    fromLosses > 0
      ? {
          id: "training",
          headline:
            `Losses add ${fromLosses.toFixed(2)} to this mod` +
            (annual !== null && annual > 0
              ? `, about ${usd(annual)} a year in estimated premium`
              : ""),
          body: `Each claim stays in the rating for about three years, and experience rating weighs how often claims happen more heavily than how large any one of them is. ${prevention}`,
          links: [
            { link: CERTIFY_ME, label: "Forklift operators" },
            { link: CERTIFY_ME_ONLINE, label: "Aerial and scissor lift operators" },
          ],
        }
      : {
          id: "training",
          headline: "This mod is already at its loss-free minimum",
          body: `A claim that happens now would start counting in a rating one to two years from now and stay for three. ${prevention}`,
          links: [
            { link: CERTIFY_ME, label: "Forklift operators" },
            { link: CERTIFY_ME_ONLINE, label: "Aerial and scissor lift operators" },
          ],
        };

  const promotions = [training];
  if (!options.includeComplianceHub) return promotions;

  const contributions = ratedContributions(ws).byClaim;
  const open = ws.claims.filter((c) => c.status === "O");
  // Rated, not printed: a loss-limited open claim is usually the largest one,
  // and its printed incurred overstates what the rating used.
  const openRated = open.reduce((sum, c) => {
    const r = contributions.get(c);
    return sum + (r ? r.primary + r.excess : c.actualIncurred);
  }, 0);

  const records =
    "After a serious workplace accident OSHA may investigate, and it is the employer, not the training provider, who has to show each operator was trained and evaluated.";

  promotions.push(
    open.length > 0
      ? {
          id: "records",
          headline: `${open.length} open claim${open.length === 1 ? "" : "s"} rated at ${usd(openRated)}, the part of this rating that can still change`,
          body: `Reserves on open claims are estimates that move as a case develops. ${records} Questions from a carrier or an inspector are easier to answer when certificates, signed evaluation forms and incident notes are kept together, by employee.`,
          links: [{ link: COMPLIANCE_HUB, label: "Training records and incident notes" }],
        }
      : {
          id: "records",
          headline: "After an accident, the training records are what get asked for",
          body: `${records} That is easier when certificates, signed evaluation forms and incident notes are already kept together, by employee.`,
          links: [{ link: COMPLIANCE_HUB, label: "Training records and incident notes" }],
        },
  );

  return promotions;
}
