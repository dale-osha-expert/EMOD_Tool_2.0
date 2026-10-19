/**
 * Every brand-specific fact in one place.
 *
 * The tool is a lead magnet for three CertifyMe properties, and the copy that
 * describes them has to be accurate: an SEO page that misstates what a company
 * sells is worse than no page, and an answer engine will happily repeat the
 * mistake. Nothing in here is inferred - each field is either confirmed or
 * marked TODO, and the components below degrade gracefully when a field is
 * still unset rather than inventing filler.
 */

export interface SiteLink {
  /** Short label used in navigation and CTA buttons. */
  name: string;
  url: string;
  /**
   * One sentence on what it actually offers. Shown to users and read by answer
   * engines, so it must be true. Leave empty until confirmed.
   */
  description: string;
  /** Call-to-action button text. */
  cta: string;
}

/** The publisher of this tool. Appears in the header, footer and report. */
export const PUBLISHER = {
  name: "CertifyMe.net",
  url: "https://certifyme.net",
  /**
   * TODO: confirm. Used in the Organization schema and the footer byline.
   */
  description: "",
  /**
   * Drop a file at public/logo.svg (or .png) and set this path to show a real
   * logo. Left null, the header and report fall back to a text wordmark, which
   * is correct and unbranded rather than a broken image.
   */
  logo: null as string | null,
} as const;

/** The upsell destination for the AI analysis. */
export const COMPLIANCE_HUB: SiteLink = {
  name: "Compliance Hub",
  url: "https://compliance-hub.cloud",
  // TODO: confirm what Compliance Hub is and what the AI analysis gives you there.
  description: "",
  cta: "Open it in Compliance Hub",
};

export const CERTIFY_ME_ONLINE: SiteLink = {
  name: "CertifyMeOnline.net",
  url: "https://certifymeonline.net",
  // TODO: confirm what CertifyMeOnline offers and how it differs from CertifyMe.net.
  description: "",
  cta: "Visit CertifyMeOnline.net",
};

export const CERTIFY_ME: SiteLink = {
  name: "CertifyMe.net",
  url: "https://certifyme.net",
  // TODO: confirm.
  description: "",
  cta: "Visit CertifyMe.net",
};

/** Order matters: this is the order CTAs appear on the page and in the report. */
export const DESTINATIONS: SiteLink[] = [
  COMPLIANCE_HUB,
  CERTIFY_ME,
  CERTIFY_ME_ONLINE,
];

/**
 * Canonical origin, with no trailing slash.
 *
 * Set NEXT_PUBLIC_SITE_URL once a real domain is in place; until then this
 * falls back to the Vercel deployment so canonical, sitemap and Open Graph
 * tags are at least self-consistent. A vercel.app host inherits no domain
 * authority, so moving this is the single highest-value SEO change available.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://emod-tool-2-0.vercel.app"
).replace(/\/$/, "");

export const TOOL_NAME = "Experience Mod Analyzer";

/**
 * Whether this deployment runs the AI written analysis itself.
 *
 * One codebase serves two places. On the public funnel it stays off and the
 * panel becomes an honest description of what the analysis adds, with a link
 * to where it runs. Inside Compliance Hub, NEXT_PUBLIC_AI_ENABLED=true turns
 * it on. Everything else - the recalculation, the scenarios, the findings and
 * the report - is identical either way and never gated.
 */
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

/** Whether a SiteLink has enough confirmed copy to render its description. */
export function hasDescription(link: SiteLink): boolean {
  return link.description.trim().length > 0;
}
