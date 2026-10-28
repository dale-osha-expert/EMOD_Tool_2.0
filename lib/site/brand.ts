/**
 * Every brand-specific fact in one place.
 *
 * The tool is a lead magnet for three CertifyMe properties, and the copy that
 * describes them has to be accurate: an SEO page that misstates what a company
 * sells is worse than no page, and an answer engine will happily repeat the
 * mistake. Nothing in here is inferred - each field is either confirmed or
 * marked TODO, and the components below degrade gracefully when a field is
 * still unset rather than inventing filler.
 *
 * The descriptions were written from the live sites in October 2026. None of
 * the three mentions workers compensation or experience rating, so nothing
 * here claims they do; if a site's offering changes, change its line here.
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
  /** Used in the Organization schema. Confirmed against certifyme.net. */
  description:
    "CertifyMe.net has provided online forklift operator training and certification for employers since 1999, with a printable operator card on completion, the onsite evaluation checklist, and free three-year renewals.",
  /**
   * The full stacked logo, for the Organization schema. Too tall to read at
   * byline size, which is what the wordmark below is for.
   */
  logo: "/logo.png" as string | null,
  /**
   * The wordmark cropped from the same logo, for the header and footer byline.
   * Left null, the byline falls back to a text wordmark, which is correct and
   * unbranded rather than a broken image.
   */
  wordmark: "/logo-wordmark.png" as string | null,
  /** Intrinsic aspect ratio of the wordmark file, so the byline never distorts it. */
  wordmarkAspect: 440 / 91,
} as const;

/** The upsell destination for the AI analysis. */
export const COMPLIANCE_HUB: SiteLink = {
  name: "Compliance Hub",
  url: "https://compliance-hub.cloud",
  // Its public site describes employee records only and says nothing about the
  // AI analysis, so this line describes Compliance Hub itself. The CTA lands on
  // that homepage; "Open it in Compliance Hub" promised a feature page that a
  // visitor would not find there.
  description:
    "Employee document and certification tracking for small employers: training certificates, driver's licenses and drug-test documentation kept in one place, with expiration alerts and PDF reports for when someone asks for proof.",
  cta: "Explore Compliance Hub",
};

export const CERTIFY_ME_ONLINE: SiteLink = {
  name: "CertifyMeOnline.net",
  url: "https://certifymeonline.net",
  // Aerial and scissor lifts, where CertifyMe.net is forklifts.
  description:
    "Online aerial lift operator training, with one course covering scissor lifts, boom lifts and cherry pickers, plus the onsite evaluation checklist, a wallet card mailed to you and free three-year renewals.",
  cta: "See aerial lift courses",
};

export const CERTIFY_ME: SiteLink = {
  name: "CertifyMe.net",
  url: "https://certifyme.net",
  description:
    "Online forklift operator certification for warehouse, rough terrain and order picker trucks and pallet jacks, plus Train the Trainer, with a printable operator card on completion and free three-year renewals.",
  cta: "See forklift courses",
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
