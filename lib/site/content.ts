import { TOOL_NAME } from "./brand";

/**
 * The page's written content, kept out of the components so it can be read,
 * corrected and reused in structured data without touching layout.
 *
 * Accuracy is the whole strategy here. Answer engines cite content they can
 * verify and quote; a page that gets the mechanics of experience rating wrong
 * earns nothing and costs credibility. Every figure and rule below is either
 * derived from the NCCI experience rating formula itself or stated as varying
 * by state, which it does.
 */

export interface Faq {
  question: string;
  /** Plain-text answer. Kept free of markup so it can go straight into JSON-LD. */
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "What is an experience modification rate (EMR)?",
    answer:
      "An experience modification rate — also called an EMR, e-mod, experience mod or mod factor — is a multiplier applied to a business's workers compensation manual premium based on its own claims history. A mod of 1.00 is average for the industry and state. Below 1.00 is a credit that lowers premium; above 1.00 is a debit that raises it. A mod of 1.15, for example, adds roughly 15 percent to manual premium. In most NCCI states the factor is calculated by the rating bureau from data carriers report, not by the insurer.",
  },
  {
    question: "How is the experience modification factor calculated?",
    answer:
      "The NCCI experience rating formula compares a business's actual losses with the losses expected for a business of its size and classification. The mod is a ratio: actual primary losses plus a stabilizing value plus weighted actual excess losses, divided by expected primary losses plus the same stabilizing value plus weighted expected excess losses. The stabilizing value is expected excess losses multiplied by one minus the weighting factor, plus the ballast. Because the denominator is fixed for a given rating, each claim's effect on the mod is proportional to its primary losses plus its weighted excess losses.",
  },
  {
    question: "What is the split point in workers compensation experience rating?",
    answer:
      "The split point is the dollar threshold that divides each claim into primary and excess losses. Losses below it are primary and count in full. Losses above it are excess and enter the calculation only at the weighting factor, which is often around 0.20, so an excess dollar can affect the mod several times less than a primary dollar. The split point is set per state and changes over time. Worksheets from 2025 onwards print it in a dedicated column on the summary page; on earlier forms it can be read off any claim whose primary losses have been capped below its incurred value.",
  },
  {
    question: "What are primary and excess losses?",
    answer:
      "Every claim is split at the split point. The portion at or below it is primary; the portion above it is excess. The split exists because experience rating is designed to respond more to how often losses happen than to how severe any single one is. Three small claims can therefore raise a mod more than one large claim of the same total value, because all of the smaller losses fall in the primary band while most of the large one falls in the excess band.",
  },
  {
    question: "What is a good EMR, and what do I need to bid on work?",
    answer:
      "Anything below 1.00 is better than average for your industry and state. Many general contractors and owners set a prequalification threshold at 1.00, and some require 0.90 or lower, so for contractors the mod is often a gate on which work can be bid rather than only a cost. There is a floor: no business can go below the mod it would have with no losses at all, which is set by its payroll, classifications and expected losses rather than by its claims. That loss-free minimum is the realistic target, and it is what this tool calculates first.",
  },
  {
    question: "How long does a claim affect my experience mod?",
    answer:
      "The experience period is normally three policy years, ending roughly one year before the rating effective date, so the most recent year of experience is not yet included. A claim therefore affects the mod for about three ratings before it rolls out of the period. A claim reported today will typically start affecting the mod about a year later and stop affecting it about four years after that.",
  },
  {
    question: "Can I lower my experience modification rate?",
    answer:
      "Sometimes, and the worksheet shows where. Open claims are the usual opportunity, because their reserves are estimates that can still move as a case develops, whereas closed claims and expired policy years generally cannot be changed. Classification and payroll errors are the other common source: payroll assigned to a higher-rated class code raises expected losses. Errors in the rating itself — a duplicated claim, a loss that should have been coded medical only, a missing policy period — are worth raising with the rating bureau. What is not available is lowering the mod below its loss-free minimum, and any service promising otherwise is worth treating with caution.",
  },
  {
    question: "Why is the mod on my worksheet different from the one my carrier quoted?",
    answer:
      "The most common reason is a revised rating. Worksheets marked as revisions supersede an earlier figure for the same effective date, and premium is not always re-rated automatically when that happens. Other causes are a mod that has been applied to a different state's premium, or an assessment surcharge such as ARAP being included in the quoted number. Comparing the recalculated mod on this page with the figure your carrier is billing against will usually show which it is.",
  },
  {
    question: "What is ARAP on an experience rating worksheet?",
    answer:
      "ARAP stands for Assessment of Risks Adjustment Program, a surcharge applied in some states on top of the experience modification factor. It multiplies premium after the mod is applied, so the two compound: reducing the mod also reduces the base the surcharge is charged on. FLARAP, SARAP and MAARAP are state-specific variants. A value of 1.00 means no surcharge is being applied.",
  },
  {
    question: "What is the difference between an interstate and an intrastate experience rating?",
    answer:
      "An intrastate rating covers a business operating in a single state and shows that state's name on the worksheet. An interstate rating covers a business with operations in more than one state and shows the word INTERSTATE, with a summary grid listing each state separately before the combined totals. The formula is the same in both cases; the interstate form simply rolls several states into one set of totals, which is also where state-level adjustments such as the medical-only discount can make the state rows and the totals row differ.",
  },
  {
    question: "What is the medical-only discount, or ERA?",
    answer:
      "In states that apply the Experience Rating Adjustment, claims coded as medical only — injury type 06, meaning no lost time — have a share of their loss dollars removed before they enter the rating, commonly 70 percent. The reduction applies to both the primary and excess portions. This is why the per-state rows and the combined totals on an interstate worksheet can differ, and why a claim miscoded as something other than medical only can cost more than it should.",
  },
  {
    question: "Is this experience mod calculator free, and is my worksheet stored anywhere?",
    answer: `${TOOL_NAME} is free to use with no account. The PDF is read entirely inside your browser using its text layer; it is not uploaded, and no part of it is sent to any server. Nothing is saved — refreshing the page clears everything. The tool recalculates the mod from the worksheet's own figures and checks them against the arithmetic the worksheet asserts about itself, so it can show whether the document was read correctly rather than asking you to take the result on trust.`,
  },
];

export interface GlossaryEntry {
  term: string;
  definition: string;
}

/**
 * Short definitions of the column headings people are actually looking at when
 * they search. These are the highest-intent long-tail queries for this page
 * and the easiest thing for an answer engine to quote.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Expected losses",
    definition:
      "What a business of this size and classification would normally lose. Calculated as payroll divided by 100, multiplied by the expected loss rate for the class code.",
  },
  {
    term: "ELR (expected loss rate)",
    definition:
      "The losses expected per $100 of payroll for a given class code in a given state. Printed on the worksheet, so it never has to be looked up.",
  },
  {
    term: "D-ratio",
    definition:
      "The share of expected losses that is expected to fall below the split point. Multiplying expected losses by the D-ratio gives expected primary losses.",
  },
  {
    term: "Ballast",
    definition:
      "A stabilising amount added to both sides of the mod calculation. It damps the effect of a single claim on a small employer, which is why smaller businesses see less movement per claim.",
  },
  {
    term: "Weighting factor",
    definition:
      "The proportion of excess losses that enters the rating, shown as (A) on the worksheet. A lower weight means large claims move the mod less.",
  },
  {
    term: "Stabilizing value",
    definition:
      "Expected excess losses multiplied by one minus the weighting factor, plus the ballast. The same figure appears on both the actual and expected sides of the calculation.",
  },
  {
    term: "Loss limitation",
    definition:
      "A cap on how much a single accident can contribute to the rating. A claim subject to it is flagged on the worksheet, and its printed incurred value is higher than the amount actually rated.",
  },
  {
    term: "Injury type (IJ)",
    definition:
      "A two-digit NCCI code for the nature of the claim. 01 death, 02 permanent total, 03 major permanent partial, 04 minor permanent partial, 05 temporary total or partial, 06 medical only, 07 contract medical, 08 compromised death, 09 unclassifiable.",
  },
  {
    term: "O/F status",
    definition:
      "Whether a claim is open or final. Open claims carry reserves that are still estimates and can change; final claims are closed and settled.",
  },
  {
    term: "Subject premium",
    definition:
      "The premium the experience rating applies to, printed per policy period. It is what a change in the mod is scaled against to estimate a dollar impact.",
  },
];

export interface Step {
  title: string;
  body: string;
}

export const HOW_IT_WORKS: Step[] = [
  {
    title: "Your worksheet stays in your browser",
    body: "Drop in the PDF your rating bureau or agent sent. It is read locally using the document's own text layer — nothing is uploaded, and nothing is stored.",
  },
  {
    title: "Every figure is checked against the document",
    body: "The worksheet asserts a set of arithmetic relationships about itself: payroll times the expected loss rate, the D-ratio split, excess losses, the mod itself. All of them are re-derived. A clean pass is evidence the document was read correctly; a failure names the exact cell rather than quietly carrying on.",
  },
  {
    title: "The mod is recalculated from scratch",
    body: "Using the NCCI experience rating formula and the worksheet's own figures, then compared with the factor printed on the page. The loss-free minimum is calculated too, so you can see how much of the mod is the loss experience and how much is simply the size and shape of the business.",
  },
  {
    title: "Each claim is priced separately",
    body: "You see what every claim contributes in mod points and in estimated premium, which open reserves are worth reviewing, and what a settlement below the current reserve would be worth. Loss-limited claims are valued at what the rating actually used, not the larger figure printed on the page.",
  },
  {
    title: "Export a report",
    body: "Generated in your browser as a PDF, with presets for an executive summary, action items, claim detail or the full analysis — or pick the sections yourself.",
  },
];
