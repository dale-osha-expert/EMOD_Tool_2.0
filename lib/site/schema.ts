import { PUBLISHER, SITE_URL, TOOL_NAME, TOOL_SHORT_NAME } from "./brand";
import { FAQS, GLOSSARY } from "./content";

/**
 * JSON-LD structured data.
 *
 * Two audiences. Search engines use it for rich results, notably the FAQ.
 * Answer engines use it as a clean, unambiguous statement of what the page
 * contains and who published it, which makes a citation materially more
 * likely than prose alone. Every claim here mirrors visible page content —
 * marking up something the page does not say is both against Google's
 * guidelines and the kind of thing that gets a site ignored.
 */

export function buildSchema() {
  const organization = {
    "@type": "Organization",
    "@id": `${PUBLISHER.url}/#organization`,
    name: PUBLISHER.name,
    url: PUBLISHER.url,
    ...(PUBLISHER.description ? { description: PUBLISHER.description } : {}),
    ...(PUBLISHER.logo ? { logo: `${SITE_URL}${PUBLISHER.logo}` } : {}),
  };

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

  const faq = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

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
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: TOOL_NAME,
    alternateName: TOOL_SHORT_NAME,
    publisher: { "@id": organization["@id"] },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, page, application, faq, glossary],
  };
}
