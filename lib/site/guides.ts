/**
 * The pillar guides that support the tool page.
 *
 * The article itself lives in content/guides/<slug>.md, exactly as the content
 * pipeline produced it, and its title, description, dates and hero alt text
 * come from that file's front matter (see lib/site/guide-content.ts). This
 * registry holds only what the page furniture needs and the Markdown does not
 * carry: menu order, a short label and a one-line summary for the menu and the
 * cards, and the photo credit.
 *
 * Kept free of Node imports so the client-side navigation menu can read it.
 */

export interface GuideLink {
  /** URL path segment, and the name of the Markdown file. */
  slug: string;
  /** Short label for the navigation menu. */
  label: string;
  /** One sentence on what the guide answers, for the menu and guide cards. */
  summary: string;
  /** Unsplash credit for the hero image (attribution is optional but given). */
  heroCredit: { photographer: string; url: string };
  /**
   * Where the photo's subject sits, as a CSS object-position. Wide layouts
   * crop the hero to a banner, centred unless this says otherwise.
   */
  heroFocus?: string;
}

/** Order matters: this is the order the menu and the guide cards list them. */
export const GUIDES: GuideLink[] = [
  {
    slug: "what-is-experience-modification-rate-emr",
    label: "What is an EMR?",
    summary:
      "What the experience mod means, the NCCI formula step by step, and why several small claims move it more than one large one.",
    heroCredit: {
      photographer: "John Kakuk",
      url: "https://unsplash.com/photos/men-in-safety-vests-working-on-a-construction-site-13-uHUz4Uik",
    },
  },
  {
    slug: "how-to-read-experience-mod-worksheet",
    label: "How to read your worksheet",
    summary:
      "A field-by-field walk through the NCCI experience rating worksheet, the arithmetic you can check, and what to do about an error.",
    heroCredit: {
      photographer: "Jakub Zerdzicki",
      url: "https://unsplash.com/photos/LNnmSumlwO4",
    },
  },
  {
    slug: "emr-in-construction",
    label: "EMR in construction",
    summary:
      "What owners ask for on prequalification forms, the states that restrict EMR bid cutoffs, and what pushes a contractor's mod over 1.0.",
    heroCredit: {
      photographer: "Scott Blake",
      url: "https://unsplash.com/photos/x-ghf9LjrVg",
    },
    // The crew stands along the bottom edge of the frame.
    heroFocus: "50% 90%",
  },
];

export function guidePath(slug: string): string {
  return `/${slug}`;
}
