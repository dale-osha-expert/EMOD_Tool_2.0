"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  INJURY_TYPES,
  type Analysis,
  type AiNarrative,
} from "../types";
import { AI_ENABLED, DESTINATIONS, PUBLISHER, TOOL_NAME } from "../site/brand";
import { buildPromotions } from "../site/promotions";
import type { SectionId } from "./presets";

/* Built-in PDF fonts only: no network fetch, so the report renders offline. */
const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#14181d",
    lineHeight: 1.45,
  },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  subtitle: { fontSize: 9.5, color: "#5a6472", marginBottom: 2 },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: "#dfe3e8",
    marginTop: 12,
    marginBottom: 14,
  },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  h3: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 9, marginBottom: 2 },
  p: { marginBottom: 5, color: "#2a3038" },
  muted: { color: "#5a6472" },
  faint: { color: "#8b95a3", fontSize: 8 },

  statRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dfe3e8",
    borderRadius: 3,
    padding: 7,
  },
  statLabel: {
    fontSize: 7,
    color: "#8b95a3",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  statValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  statDetail: { fontSize: 7.5, color: "#5a6472", marginTop: 2 },

  table: { marginTop: 5, marginBottom: 8 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8ebef",
    paddingVertical: 3,
  },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#c6ccd4",
    paddingBottom: 3,
  },
  thText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#5a6472" },
  right: { textAlign: "right" },

  item: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#dfe3e8",
  },
  itemCritical: { borderLeftColor: "#a52218" },
  itemCaution: { borderLeftColor: "#8a5300" },
  itemTitle: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  evidence: { fontSize: 7.5, color: "#5a6472", marginTop: 2 },

  warning: {
    borderWidth: 1,
    borderColor: "#e0b4ae",
    backgroundColor: "#fbe9e7",
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
  },
  warningTitle: {
    fontFamily: "Helvetica-Bold",
    color: "#a52218",
    marginBottom: 2,
  },
  callout: {
    borderWidth: 1,
    borderColor: "#c9dced",
    backgroundColor: "#f2f7fb",
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
  },
  aiTag: {
    fontSize: 7,
    color: "#1b5e8a",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  brandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  brand: { fontSize: 8, color: "#5a6472" },
  brandName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1b5e8a" },
  ctaCard: {
    borderWidth: 1,
    borderColor: "#c9dced",
    backgroundColor: "#f2f7fb",
    borderRadius: 3,
    padding: 9,
    marginBottom: 7,
  },
  ctaName: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  ctaUrl: { fontSize: 8, color: "#1b5e8a", marginTop: 3 },
  pageNumber: {
    position: "absolute",
    bottom: 26,
    right: 44,
    paddingTop: 5,
    fontSize: 7,
    color: "#8b95a3",
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: "#dfe3e8",
    paddingTop: 5,
    fontSize: 7,
    color: "#8b95a3",
  },
});

/*
 * The built-in PDF fonts cover WinAnsi only. Typographic characters the web UI
 * uses freely - U+2212 MINUS SIGN, U+2248 ALMOST EQUAL TO - are outside it and
 * render as a missing glyph, so the report sticks to ASCII equivalents.
 */
const money = (n: number | null): string => {
  if (n === null || !Number.isFinite(n)) return "-";
  const r = Math.round(n);
  return `${r < 0 ? "-" : ""}$${Math.abs(r).toLocaleString("en-US")}`;
};
const factor = (n: number | null): string =>
  n === null || !Number.isFinite(n) ? "-" : n.toFixed(2);
const signed = (n: number): string =>
  n === 0 ? "0.00" : `${n > 0 ? "+" : "-"}${Math.abs(n).toFixed(2)}`;

export interface ReportOptions {
  sections: SectionId[];
  title: string;
  includeIdentity: boolean;
  /**
   * Leave page numbers out of the footer.
   *
   * Page numbers require a per-page render callback, and on a long report that
   * callback makes the layout engine fail outright. This is the fallback the
   * builder retries with: a report without page numbers beats no report.
   */
  omitPageNumbers?: boolean;
}

export function EmodReport({
  analysis,
  narrative,
  options,
}: {
  analysis: Analysis;
  narrative: AiNarrative | null;
  options: ReportOptions;
}) {
  const { worksheet: ws, computed } = analysis;
  const has = (id: SectionId) => options.sections.includes(id);
  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document
      title={options.title}
      author={TOOL_NAME}
      creator={TOOL_NAME}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.brandBar}>
          <Text style={styles.brand}>
            {TOOL_NAME} &nbsp;·&nbsp; by{" "}
            <Text style={styles.brandName}>{PUBLISHER.name}</Text>
          </Text>
          <Text style={styles.brand}>{PUBLISHER.url.replace(/^https:\/\//, "")}</Text>
        </View>

        <Text style={styles.title}>{options.title}</Text>
        {options.includeIdentity && ws.riskName ? (
          <Text style={styles.subtitle}>
            {ws.riskName}
            {ws.riskId ? ` · Risk ID ${ws.riskId}` : ""}
          </Text>
        ) : null}
        <Text style={styles.subtitle}>
          Rating effective {ws.ratingEffectiveDate ?? "-"}
          {ws.state ? ` · ${ws.state}` : ""}
          {ws.productionDate ? ` · produced ${ws.productionDate}` : ""}
        </Text>
        <View style={styles.rule} />

        {!analysis.reconciliation.passed ? (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>
              These figures did not fully reconcile
            </Text>
            <Text>
              {analysis.reconciliation.failedCount} of the{" "}
              {analysis.reconciliation.checks.length} arithmetic checks run
              against the worksheet did not tie out. Either the worksheet was
              misread or it is internally inconsistent, so every figure in this
              report should be treated as unverified until that is resolved.
              {options.sections.includes("verification")
                ? " The Verification section lists the specific cells involved."
                : ""}
            </Text>
          </View>
        ) : null}

        {has("summary") ? <SummarySection analysis={analysis} /> : null}

        {has("aiSummary") && narrative ? (
          <View>
            <Text style={styles.h2}>Written summary</Text>
            <View style={styles.callout}>
              <Text style={styles.aiTag}>AI-generated</Text>
              <Text>{narrative.summary}</Text>
            </View>
          </View>
        ) : null}

        {has("aiRecommendations") && narrative?.recommendations.length ? (
          <View>
            <Text style={styles.h2}>Suggested actions</Text>
            <Text style={[styles.faint, { marginBottom: 6 }]}>
              AI-generated suggestions, in priority order. Each is a starting
              point to confirm, not a conclusion.
            </Text>
            {narrative.recommendations.map((rec, i) => (
              <View
                key={i}
               
                style={[
                  styles.item,
                  rec.priority === "high" ? styles.itemCaution : {},
                ]}
              >
                <Text style={styles.itemTitle}>
                  {i + 1}. {rec.title}
                  {rec.claimNumber ? ` (claim ${rec.claimNumber})` : ""}
                </Text>
                <Text style={styles.muted}>{rec.rationale}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {has("findings") ? <FindingsSection analysis={analysis} /> : null}
        {has("scenarios") ? <ScenariosSection analysis={analysis} /> : null}
        {has("claims") ? <ClaimsSection analysis={analysis} /> : null}
        {has("policies") ? <PoliciesSection analysis={analysis} /> : null}
        {has("verification") ? <VerificationSection analysis={analysis} /> : null}
        {has("methodology") ? (
          <MethodologySection analysis={analysis} usedAi={Boolean(narrative)} />
        ) : null}

        <NextSteps analysis={analysis} />

        <View style={styles.footer} fixed>
          <Text>
            {TOOL_NAME} by {PUBLISHER.name} · Generated {generated} · Figures
            calculated from the worksheet; any suggestions are worth confirming.
          </Text>
        </View>
        {options.omitPageNumbers ? null : (
          // Kept out of the bordered flex row above and positioned on its own.
          // The per-page render callback is what the layout engine struggles
          // with on a long report; giving it the simplest possible box to
          // resolve is what makes the difference.
          <Text
            style={styles.pageNumber}
            fixed
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} of ${totalPages}`
            }
          />
        )}
      </Page>
    </Document>
  );
}

/**
 * Where the report hands off.
 *
 * Kept to the end, after the analysis has earned the reader's attention, and
 * written as what each destination is for rather than as an advertisement -
 * a report someone forwards to their broker should not read like a flyer.
 */
function NextSteps({ analysis }: { analysis: Analysis }) {
  const described = DESTINATIONS.filter((d) => d.description.trim().length > 0);
  // The same results-tied lines the page shows, so a forwarded report explains
  // why each destination is listed rather than presenting a bare list of links.
  const promotions = buildPromotions(analysis, {
    includeComplianceHub: !AI_ENABLED,
  });

  return (
    // No wrap={false} here: a block that cannot split fails the layout engine
    // outright once it is taller than the space left on the page, which is the
    // failure documented against the policy section below.
    <View break>
      <Text style={styles.h2}>Next steps</Text>
      <Text style={[styles.p, styles.muted]}>
        This analysis was produced with {TOOL_NAME}, a free tool from{" "}
        {PUBLISHER.name.replace(/\.net$/, "")} ({PUBLISHER.url.replace(/^https:\/\//, "")}).
        You can re-run it on any NCCI experience rating worksheet at no cost;
        the document is read in your browser and is never uploaded.
      </Text>

      {promotions.map((p) => (
        <View key={p.id} style={styles.p}>
          <Text style={styles.ctaName}>{p.headline}</Text>
          <Text style={styles.muted}>{p.body}</Text>
        </View>
      ))}

      {(described.length > 0 ? described : DESTINATIONS).map((d) => (
        <View key={d.url} style={styles.ctaCard}>
          <Text style={styles.ctaName}>{d.name}</Text>
          {d.description.trim().length > 0 ? (
            <Text style={styles.muted}>{d.description}</Text>
          ) : null}
          <Text style={styles.ctaUrl}>
            {d.url.replace(/^https:\/\//, "")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SummarySection({ analysis }: { analysis: Analysis }) {
  const { computed, worksheet: ws, scenarios } = analysis;
  const minimum = scenarios.find((s) => s.id === "minimum");

  return (
    <View>
      <Text style={styles.h2}>Rating summary</Text>
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Current mod</Text>
          <Text style={styles.statValue}>{factor(computed.mod)}</Text>
          <Text style={styles.statDetail}>
            {computed.mod > 1
              ? `Adds ~${Math.round((computed.mod - 1) * 100)}% to manual premium`
              : `Credit of ~${Math.round((1 - computed.mod) * 100)}%`}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>As printed</Text>
          <Text style={styles.statValue}>{factor(ws.factors.publishedMod)}</Text>
          <Text style={styles.statDetail}>
            {ws.factors.publishedMod !== null &&
            Math.abs(ws.factors.publishedMod - computed.mod) < 0.005
              ? "Matches our recalculation"
              : "Differs from our recalculation"}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Loss-free minimum</Text>
          <Text style={styles.statValue}>{factor(minimum?.mod ?? null)}</Text>
          <Text style={styles.statDetail}>Best this period could produce</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Room to minimum</Text>
          <Text style={styles.statValue}>
            {minimum ? (computed.mod - minimum.mod).toFixed(2) : "-"}
          </Text>
          <Text style={styles.statDetail}>
            {minimum?.premiumDelta != null
              ? `~${money(Math.abs(minimum.premiumDelta))}/yr`
              : "Cost of the loss experience"}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.th}>
          <Text style={[styles.thText, { flex: 3 }]}>Component</Text>
          <Text style={[styles.thText, styles.right, { flex: 1 }]}>Actual</Text>
          <Text style={[styles.thText, styles.right, { flex: 1 }]}>Expected</Text>
        </View>
        {[
          ["Primary losses", computed.actualPrimary, computed.expectedPrimary],
          ["Stabilizing value", computed.stabilizingValue, computed.stabilizingValue],
          [
            `Ratable excess (weighted ${factor(computed.weight)})`,
            computed.ratableExcessActual,
            computed.ratableExcessExpected,
          ],
          ["Total", computed.numerator, computed.denominator],
        ].map(([label, a, e], i, arr) => (
          <View style={styles.tr} key={String(label)}>
            <Text
              style={[
                { flex: 3 },
                i === arr.length - 1 ? { fontFamily: "Helvetica-Bold" } : {},
              ]}
            >
              {label as string}
            </Text>
            <Text style={[styles.right, { flex: 1 }]}>{money(a as number)}</Text>
            <Text style={[styles.right, { flex: 1 }]}>{money(e as number)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.faint}>
        {money(computed.numerator)} ÷ {money(computed.denominator)} ={" "}
        {computed.raw.toFixed(4)}, rounded to {factor(computed.mod)}.
        {analysis.splitPoint !== null
          ? ` Losses split at ${money(analysis.splitPoint)}.`
          : ""}
        {ws.eraReduction !== null
          ? ` A ${Math.round(ws.eraReduction * 100)}% medical-only reduction applies.`
          : ""}
      </Text>
    </View>
  );
}

function FindingsSection({ analysis }: { analysis: Analysis }) {
  if (analysis.findings.length === 0) return null;
  return (
    <View break={analysis.findings.length > 6}>
      <Text style={styles.h2}>Observations</Text>
      <Text style={[styles.faint, { marginBottom: 6 }]}>
        Calculated from the worksheet. Each is a point to verify, not a
        conclusion.
      </Text>
      {analysis.findings.map((f) => (
        <View
          key={f.id}
         
          style={[
            styles.item,
            f.severity === "error"
              ? styles.itemCritical
              : f.severity === "warning"
                ? styles.itemCaution
                : {},
          ]}
        >
          <Text style={styles.itemTitle}>{f.title}</Text>
          <Text style={styles.muted}>{f.detail}</Text>
          {f.evidence.length > 0 ? (
            <Text style={styles.evidence}>{f.evidence.join("  ·  ")}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ScenariosSection({ analysis }: { analysis: Analysis }) {
  const rows = analysis.scenarios.filter((s) => !s.id.startsWith("reserve:"));
  if (rows.length === 0) return null;

  return (
    <View break>
      <Text style={styles.h2}>What-if scenarios</Text>
      <Text style={[styles.faint, { marginBottom: 6 }]}>
        Calculated exactly from the worksheet. Premium figures are estimates
        scaled from the printed subject premium.
      </Text>
      <View style={styles.table}>
        <View style={styles.th}>
          <Text style={[styles.thText, { flex: 4 }]}>Scenario</Text>
          <Text style={[styles.thText, styles.right, { flex: 1 }]}>Mod</Text>
          <Text style={[styles.thText, styles.right, { flex: 1 }]}>Change</Text>
          <Text style={[styles.thText, styles.right, { flex: 1.4 }]}>
            Premium/yr
          </Text>
        </View>
        {rows.map((s) => (
          <View style={styles.tr} key={s.id} wrap={false}>
            <Text style={{ flex: 4 }}>{s.label}</Text>
            <Text style={[styles.right, { flex: 1 }]}>{factor(s.mod)}</Text>
            <Text style={[styles.right, { flex: 1 }]}>{signed(s.modDelta)}</Text>
            <Text style={[styles.right, { flex: 1.4 }]}>
              {s.premiumDelta === null || s.premiumDelta === 0
                ? "-"
                : money(s.premiumDelta)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ClaimsSection({ analysis }: { analysis: Analysis }) {
  const { worksheet: ws } = analysis;
  if (ws.claims.length === 0) return null;

  const impact = new Map(
    analysis.scenarios
      .filter((s) => s.id.startsWith("remove:"))
      .map((s) => [s.claimNumber, s.modDelta] as const),
  );
  const claims = [...ws.claims].sort(
    (a, b) => b.actualIncurred - a.actualIncurred,
  );

  return (
    <View break>
      <Text style={styles.h2}>Claim detail</Text>
      <View style={styles.table}>
        <View style={styles.th}>
          <Text style={[styles.thText, { flex: 1.6 }]}>Claim</Text>
          <Text style={[styles.thText, { flex: 2.2 }]}>Injury type</Text>
          <Text style={[styles.thText, { flex: 0.9 }]}>Status</Text>
          <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>
            Incurred
          </Text>
          <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>Primary</Text>
          <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>Excess</Text>
          <Text style={[styles.thText, styles.right, { flex: 1.1 }]}>
            Mod effect
          </Text>
        </View>
        {claims.map((c, i) => (
          <View style={styles.tr} key={`${c.claimNumber}-${i}`} wrap={false}>
            <Text style={{ flex: 1.6 }}>{c.claimNumber}</Text>
            <Text style={{ flex: 2.2 }}>
              {c.injuryType
                ? `${c.injuryType} ${INJURY_TYPES[c.injuryType] ?? ""}`.trim()
                : "-"}
            </Text>
            <Text style={{ flex: 0.9 }}>
              {c.status === "O" ? "Open" : c.status === "F" ? "Closed" : "-"}
            </Text>
            <Text style={[styles.right, { flex: 1.2 }]}>
              {money(c.actualIncurred)}
            </Text>
            <Text style={[styles.right, { flex: 1.2 }]}>
              {money(c.actualPrimary)}
            </Text>
            <Text style={[styles.right, { flex: 1.2 }]}>
              {money(c.actualIncurred - c.actualPrimary)}
            </Text>
            <Text style={[styles.right, { flex: 1.1 }]}>
              {impact.has(c.claimNumber) ? signed(impact.get(c.claimNumber)!) : "-"}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.faint}>
        &quot;Mod effect&quot; is the change if the claim carried no loss dollars.
        Open claims have reserves that can still move; closed claims generally
        cannot.
      </Text>
    </View>
  );
}

function PoliciesSection({ analysis }: { analysis: Analysis }) {
  const { policies } = analysis.worksheet;
  if (policies.length === 0) return null;

  return (
    <View break>
      <Text style={styles.h2}>Policy and payroll detail</Text>
      {policies.map((p, i) => (
        // Long blocks must be allowed to split across pages. Forcing one to
        // stay whole with wrap={false} makes the layout engine fail outright
        // once the block is taller than the space left on the page - which is
        // exactly what broke the full report on a nineteen-policy worksheet.
        // minPresenceAhead is not a safe substitute here: it reintroduces the
        // same failure. Only single-line table rows keep wrap={false}.
        <View key={i} style={{ marginBottom: 9 }}>
          <Text style={styles.h3}>
            {p.state} · {p.policyNumber ?? "policy number not shown"} ·{" "}
            {p.effectiveDate ?? "-"} to {p.expirationDate ?? "-"}
          </Text>
          <Text style={styles.faint}>
            Carrier {p.carrier ?? "-"}
            {p.firmId ? ` · Firm ${p.firmId}` : ""} · Payroll{" "}
            {money(p.totalPayroll)} · Subject premium {money(p.subjectPremium)}
          </Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 0.9 }]}>Code</Text>
              <Text style={[styles.thText, { flex: 2.6 }]}>Description</Text>
              <Text style={[styles.thText, styles.right, { flex: 0.8 }]}>ELR</Text>
              <Text style={[styles.thText, styles.right, { flex: 0.8 }]}>
                D-ratio
              </Text>
              <Text style={[styles.thText, styles.right, { flex: 1.4 }]}>
                Payroll
              </Text>
              <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>
                Expected
              </Text>
              <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>
                Exp primary
              </Text>
            </View>
            {p.classRows.map((r, j) => (
              <View style={styles.tr} key={`${r.code}-${j}`}>
                <Text style={{ flex: 0.9 }}>{r.code}</Text>
                <Text style={{ flex: 2.6 }}>{r.description ?? "-"}</Text>
                <Text style={[styles.right, { flex: 0.8 }]}>
                  {r.elr?.toFixed(2) ?? "-"}
                </Text>
                <Text style={[styles.right, { flex: 0.8 }]}>
                  {r.dRatio?.toFixed(2) ?? "-"}
                </Text>
                <Text style={[styles.right, { flex: 1.4 }]}>
                  {money(r.payroll)}
                </Text>
                <Text style={[styles.right, { flex: 1.2 }]}>
                  {money(r.expectedLosses)}
                </Text>
                <Text style={[styles.right, { flex: 1.2 }]}>
                  {money(r.expectedPrimary)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function VerificationSection({ analysis }: { analysis: Analysis }) {
  const { reconciliation } = analysis;
  const failed = reconciliation.checks.filter(
    (c) => !c.passed && c.severity !== "info",
  );

  return (
    <View break>
      <Text style={styles.h2}>Verification</Text>
      <Text style={styles.p}>
        The worksheet asserts a set of arithmetic relationships about itself:
        expected losses from payroll and the expected loss rate, the primary
        split from the D-ratio, excess losses from incurred less primary, and
        the mod from its numerator and denominator. All {reconciliation.checks.length}{" "}
        of these were re-derived independently.{" "}
        {failed.length === 0
          ? "Every one reconciles, which is evidence the worksheet was read correctly and that the figures in this report are sound."
          : `${failed.length} did not reconcile and are listed below.`}
      </Text>

      {failed.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.thText, { flex: 2.4 }]}>Where</Text>
            <Text style={[styles.thText, { flex: 2.6 }]}>Rule</Text>
            <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>
              Printed
            </Text>
            <Text style={[styles.thText, styles.right, { flex: 1.2 }]}>
              Derived
            </Text>
          </View>
          {failed.map((c) => (
            <View style={styles.tr} key={c.id} wrap={false}>
              <Text style={{ flex: 2.4 }}>{c.scope}</Text>
              <Text style={{ flex: 2.6 }}>{c.label}</Text>
              <Text style={[styles.right, { flex: 1.2 }]}>{money(c.printed)}</Text>
              <Text style={[styles.right, { flex: 1.2 }]}>{money(c.derived)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MethodologySection({
  analysis,
  usedAi,
}: {
  analysis: Analysis;
  usedAi: boolean;
}) {
  return (
    <View>
      <Text style={styles.h2}>Method and limitations</Text>

      <Text style={styles.h3}>How the figures were derived</Text>
      <Text style={styles.p}>
        Every number in this report was read from the experience rating
        worksheet and recalculated using the NCCI experience rating formula. The
        mod is the ratio of actual primary losses, the stabilizing value and
        weighted actual excess losses, to expected primary losses, the same
        stabilizing value and weighted expected excess losses.
        {analysis.splitPoint !== null
          ? ` The ${money(analysis.splitPoint)} split point was read from the capped claim on this rating rather than from a published table, so it is exact for this rating.`
          : ""}
      </Text>

      <Text style={styles.h3}>What premium estimates assume</Text>
      <Text style={styles.p}>
        {analysis.subjectPremium !== null
          ? `Premium figures scale the change in mod by ${money(analysis.subjectPremium)}, the average annual subject premium printed on the worksheet. That is a historical figure, not the premium the mod will actually be applied to, so treat these as an order of magnitude rather than a quotation.`
          : "No subject premium is printed on this worksheet, so no premium estimates are given."}
      </Text>

      <Text style={styles.h3}>What this analysis cannot see</Text>
      <Text style={styles.p}>
        This is built from one document. It has no access to claim files,
        medical reports, reserve rationale, payroll records, policy contracts or
        your state&apos;s filed rates. A figure that looks irregular here may
        have a straightforward explanation the worksheet does not show. Nothing
        in this report should be treated as a finding of error, and none of it
        is legal, actuarial or insurance advice. Confirm anything you plan to
        act on with your agent, broker or carrier.
      </Text>

      {usedAi ? (
        <>
          <Text style={styles.h3}>Where AI was used</Text>
          <Text style={styles.p}>
            The calculations, scenarios and observations in this report are
            deterministic: no AI was involved in producing any figure. AI was
            used only to write the summary and suggestions marked as
            AI-generated, and to cross-check the reading of the worksheet.
            AI-written text can be mistaken even when the figures it cites are
            correct.
          </Text>
        </>
      ) : null}
    </View>
  );
}
