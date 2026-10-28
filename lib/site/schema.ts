import { PUBLISHER, SITE_URL, TOOL_NAME, TOOL_SHORT_NAME } from "./brand";
import { FAQS, GLOSSARY, type Faq } from "./content";
import { GUIDES, guidePath } from "./guides";

/**
 * JSON-LD structured data.
 *
 * Two audiences. Search engines use it for rich results, notably the FAQ.
 * Answer engines use it as a clean, unambiguous statement of what the page
 * contains and who published it, which makes a citation materially more
 * likely than prose alone. Every claim here mirrors visible page content —
 * marking up something the page does not say is both against Google's
 * guidelines and the kind of thing that gets a site ignored.
 *
 * The tool page and the guides share one Organization and one WebSite by @id,
 * so an answer engine reads them as one publisher's site rather than as
 * unrelated pages that happen to mention each other.
 */

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": `${PUBLISHER.url}/#organization`,
    name: PUBLISHER.name,
    url: PUBLISHER.url,
    ...(PUBLISHER.description ? { description: PUBLISHER.description } : {}),
    ...(PUBLISHER.logo ? { logo: `${SITE_URL}${PUBLISHER.logo}` } : {}),
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: TOOL_NAME,
    alternateName: TOOL_SHORT_NAME,
    publisher: { "@id": `${PUBLISHER.url}/#organization` },
  };
}

function faqNode(id: string, faqs: Faq[]) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function buildSchema() {
  const organization = organizationNode();

  const application = {
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#tool`,
    name: TOOL_NAME,
    alternateName: TOOL_SHORT_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any modern web browser",
    browserRequirements: "Requires JavaScript",
    description:
      "Free tool that recalculates a workers compensation experience modification factor from an NCCI experience rating worksheet, checks the worksheet's own arithmetic, shows what each claim costs in mod points and premium, and exports a PDF report. The worksheet is read in the browser and is never uploaded.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: { "@id": organization["@id"] },
    featureList: [
      "Recalculates the experience modification factor from the NCCI formula",
      "Verifies the worksheet against its own arithmetic",
      "Calculates the loss-free minimum mod",
      "Prices each claim's effect on the mod and on premium",
      "Models open-claim reserve reductions against the split point",
      "Exports a PDF report",
    ],
  };

  const faq = faqNode(`${SITE_URL}/#faq`, FAQS);

  const glossary = {
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/#glossary`,
    name: "Experience rating worksheet terms",
    hasDefinedTerm: GLOSSARY.map((entry) => ({
      "@type": "DefinedTerm",
      name: entry.term,
      description: entry.definition,
      inDefinedTermSet: { "@id": `${SITE_URL}/#glossary` },
    })),
  };

  const page = {
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: `${TOOL_NAME} — free NCCI experience rating worksheet calculator`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": application["@id"] },
    publisher: { "@id": organization["@id"] },
    // The guide cards on the page link to each of these.
    relatedLink: GUIDES.map((g) => `${SITE_URL}${guidePath(g.slug)}`),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, websiteNode(), page, application, faq, glossary],
  };
}

export interface GuideSchemaInput {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  heroAlt: string;
  keywords: string[];
  wordCount: number;
  faqs: Faq[];
}

export function buildGuideSchema(guide: GuideSchemaInput) {
  const url = `${SITE_URL}${guidePath(guide.slug)}`;
  const organization = { "@id": `${PUBLISHER.url}/#organization` };
  const image = {
    "@type": "ImageObject",
    url: `${SITE_URL}/guides/${guide.slug}/hero.jpg`,
    width: 1200,
    height: 630,
    caption: guide.heroAlt,
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: TOOL_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: guide.title, item: url },
    ],
  };

  const page = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: guide.title,
    description: guide.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    breadcrumb: { "@id": breadcrumb["@id"] },
    primaryImageOfPage: image,
    inLanguage: "en-US",
  };

  const article = {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: guide.title,
    description: guide.description,
    image,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    author: organization,
    publisher: organization,
    mainEntityOfPage: { "@id": page["@id"] },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    // Every guide links to the calculator, and the calculator is the subject
    // the guides exist to support.
    mentions: { "@id": `${SITE_URL}/#tool` },
    keywords: guide.keywords.join(", "),
    wordCount: guide.wordCount,
    inLanguage: "en-US",
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      page,
      article,
      breadcrumb,
      ...(guide.faqs.length ? [faqNode(`${url}#faq`, guide.faqs)] : []),
    ],
  };
}
