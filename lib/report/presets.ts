export type SectionId =
  | "summary"
  | "verification"
  | "aiSummary"
  | "aiRecommendations"
  | "findings"
  | "scenarios"
  | "claims"
  | "policies"
  | "methodology";

export interface SectionDef {
  id: SectionId;
  label: string;
  description: string;
  /** True when the section has nothing to show without an AI narrative. */
  requiresAi?: boolean;
}

export const SECTIONS: SectionDef[] = [
  {
    id: "summary",
    label: "Rating summary",
    description: "The mod, how it was calculated, and where it sits against the loss-free minimum.",
  },
  {
    id: "aiSummary",
    label: "Written summary",
    description: "The AI-authored overview of the rating.",
    requiresAi: true,
  },
  {
    id: "findings",
    label: "Observations",
    description: "Calculated observations with their supporting figures.",
  },
  {
    id: "aiRecommendations",
    label: "Suggested actions",
    description: "The AI-authored, prioritised suggestions.",
    requiresAi: true,
  },
  {
    id: "scenarios",
    label: "What-if scenarios",
    description: "What each possible change would be worth, in mod points and premium.",
  },
  {
    id: "claims",
    label: "Claim detail",
    description: "Every claim, with its primary and excess split and its effect on the mod.",
  },
  {
    id: "policies",
    label: "Policy and payroll detail",
    description: "Each policy period with its class codes, payroll and expected losses.",
  },
  {
    id: "verification",
    label: "Verification",
    description: "The arithmetic checks run against the worksheet, and their results.",
  },
  {
    id: "methodology",
    label: "Method and limitations",
    description: "How the figures were derived and what this analysis cannot see.",
  },
];

export interface Preset {
  id: string;
  label: string;
  description: string;
  sections: SectionId[];
}

export const PRESETS: Preset[] = [
  {
    id: "executive",
    label: "Executive summary",
    description: "The result and what it means, in two pages.",
    sections: ["summary", "aiSummary", "findings", "methodology"],
  },
  {
    id: "actions",
    label: "Action items",
    description: "What could be done, ordered by what it is worth.",
    sections: [
      "summary",
      "aiRecommendations",
      "findings",
      "scenarios",
      "methodology",
    ],
  },
  {
    id: "claims",
    label: "Claim detail",
    description: "Claim-by-claim, with each claim's effect on the mod.",
    sections: ["summary", "claims", "scenarios", "methodology"],
  },
  {
    id: "full",
    label: "Full report",
    description: "Everything, including the policy and verification detail.",
    sections: SECTIONS.map((s) => s.id),
  },
];
