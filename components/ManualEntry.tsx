"use client";

import { useState } from "react";
import type { Worksheet } from "@/lib/types";
import { Button, Card, CardHeader } from "./ui";

interface Draft {
  riskName: string;
  ratingEffectiveDate: string;
  weight: string;
  expectedLosses: string;
  expectedPrimary: string;
  ballast: string;
  actualIncurred: string;
  actualPrimary: string;
  publishedMod: string;
  subjectPremium: string;
  claims: {
    claimNumber: string;
    injuryType: string;
    status: string;
    actualIncurred: string;
    actualPrimary: string;
  }[];
}

const EMPTY_CLAIM = {
  claimNumber: "",
  injuryType: "",
  status: "O",
  actualIncurred: "",
  actualPrimary: "",
};

/**
 * The fallback route for a worksheet we cannot read: a scan the user does not
 * want to send anywhere, or a layout the parser does not recognise. Only the
 * lettered summary row is required — that is all the mod calculation needs.
 * Claims are optional and unlock the per-claim scenarios.
 */
export function ManualEntry({
  onSubmit,
  onCancel,
}: {
  onSubmit: (worksheet: Worksheet) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    riskName: "",
    ratingEffectiveDate: "",
    weight: "",
    expectedLosses: "",
    expectedPrimary: "",
    ballast: "",
    actualIncurred: "",
    actualPrimary: "",
    publishedMod: "",
    subjectPremium: "",
    claims: [{ ...EMPTY_CLAIM }],
  });
  const [problem, setProblem] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const required = {
      weight: num(draft.weight),
      expectedLosses: num(draft.expectedLosses),
      expectedPrimary: num(draft.expectedPrimary),
      ballast: num(draft.ballast),
      actualIncurred: num(draft.actualIncurred),
      actualPrimary: num(draft.actualPrimary),
    };

    const missing = Object.entries(required)
      .filter(([, v]) => v === null)
      .map(([k]) => LABELS[k as keyof typeof LABELS]);

    if (missing.length > 0) {
      setProblem(
        `These are needed to calculate the mod: ${missing.join(", ")}.`,
      );
      return;
    }

    const t = required as { [K in keyof typeof required]: number };

    const claims = draft.claims
      .filter((c) => c.claimNumber.trim() && num(c.actualIncurred) !== null)
      .map((c, i) => ({
        claimNumber: c.claimNumber.trim(),
        injuryType: /^\d{1,2}$/.test(c.injuryType.trim())
          ? c.injuryType.trim().padStart(2, "0")
          : null,
        status: (c.status === "O" || c.status === "F" ? c.status : null) as
          | "O"
          | "F"
          | null,
        actualIncurred: num(c.actualIncurred) ?? 0,
        actualPrimary: num(c.actualPrimary) ?? num(c.actualIncurred) ?? 0,
        flags: [],
        policyIndex: 0,
      }));

    const totals = {
      state: "TOTAL",
      weight: t.weight,
      expectedExcess: t.expectedLosses - t.expectedPrimary,
      expectedLosses: t.expectedLosses,
      expectedPrimary: t.expectedPrimary,
      actualExcess: t.actualIncurred - t.actualPrimary,
      ballast: t.ballast,
      actualIncurred: t.actualIncurred,
      actualPrimary: t.actualPrimary,
      splitPoint: null,
    };

    onSubmit({
      riskName: draft.riskName.trim() || null,
      riskId: null,
      ratingEffectiveDate: draft.ratingEffectiveDate.trim() || null,
      productionDate: null,
      state: null,
      stateRows: [],
      totals,
      factors: {
        arap: null,
        flarap: null,
        sarap: null,
        maarap: null,
        stabilizingValue: null,
        ratableExcessActual: null,
        ratableExcessExpected: null,
        numerator: null,
        denominator: null,
        publishedMod: num(draft.publishedMod),
      },
      policies:
        num(draft.subjectPremium) !== null
          ? [
              {
                state: "—",
                firmId: null,
                firmName: null,
                carrier: null,
                policyNumber: null,
                effectiveDate: draft.ratingEffectiveDate.trim() || null,
                expirationDate: null,
                classRows: [],
                subjectPremium: num(draft.subjectPremium),
                totalPayroll: null,
                totalExpectedLosses: null,
                totalActualIncurred: null,
                page: 1,
              },
            ]
          : [],
      claims,
      notes: [],
      sourceLines: [],
      eraReduction: null,
      pageCount: 0,
    });
  };

  return (
    <Card>
      <CardHeader
        title="Enter the summary figures"
        subtitle="From the lettered (A)–(I) row on the first page of the worksheet. Nothing here leaves your browser."
      />

      <div className="space-y-5 px-4 py-4">
        <Group title="Rating">
          <Field
            label="Company name"
            optional
            value={draft.riskName}
            onChange={(v) => set("riskName", v)}
          />
          <Field
            label="Rating effective date"
            optional
            placeholder="06/01/2024"
            value={draft.ratingEffectiveDate}
            onChange={(v) => set("ratingEffectiveDate", v)}
          />
          <Field
            label="Mod as printed"
            optional
            placeholder="0.84"
            value={draft.publishedMod}
            onChange={(v) => set("publishedMod", v)}
          />
          <Field
            label="Annual subject premium"
            optional
            hint="Enables premium estimates"
            value={draft.subjectPremium}
            onChange={(v) => set("subjectPremium", v)}
          />
        </Group>

        <Group title="Summary row (A)–(I)">
          <Field
            label="(A) Weight"
            placeholder="0.19"
            value={draft.weight}
            onChange={(v) => set("weight", v)}
          />
          <Field
            label="(D) Expected losses"
            value={draft.expectedLosses}
            onChange={(v) => set("expectedLosses", v)}
          />
          <Field
            label="(E) Expected primary"
            value={draft.expectedPrimary}
            onChange={(v) => set("expectedPrimary", v)}
          />
          <Field
            label="(G) Ballast"
            value={draft.ballast}
            onChange={(v) => set("ballast", v)}
          />
          <Field
            label="(H) Actual incurred"
            value={draft.actualIncurred}
            onChange={(v) => set("actualIncurred", v)}
          />
          <Field
            label="(I) Actual primary"
            value={draft.actualPrimary}
            onChange={(v) => set("actualPrimary", v)}
          />
        </Group>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
            Claims (optional)
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-ink-muted)]">
            Adding claims unlocks the per-claim scenarios. Injury type 06 is
            medical only; status O is open.
          </p>
          <div className="mt-2 space-y-2">
            {draft.claims.map((claim, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-md border border-[var(--color-line)] p-2.5 @lg:grid-cols-5"
              >
                <Field
                  label="Claim number"
                  compact
                  value={claim.claimNumber}
                  onChange={(v) => updateClaim(setDraft, i, "claimNumber", v)}
                />
                <Field
                  label="Injury type"
                  compact
                  placeholder="05"
                  value={claim.injuryType}
                  onChange={(v) => updateClaim(setDraft, i, "injuryType", v)}
                />
                <label className="block text-[12px]">
                  <span className="font-medium">Status</span>
                  <select
                    value={claim.status}
                    onChange={(e) =>
                      updateClaim(setDraft, i, "status", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-2 py-1 text-[13px]"
                  >
                    <option value="O">Open</option>
                    <option value="F">Closed</option>
                  </select>
                </label>
                <Field
                  label="Incurred"
                  compact
                  value={claim.actualIncurred}
                  onChange={(v) => updateClaim(setDraft, i, "actualIncurred", v)}
                />
                <Field
                  label="Primary"
                  compact
                  value={claim.actualPrimary}
                  onChange={(v) => updateClaim(setDraft, i, "actualPrimary", v)}
                />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              setDraft((d) => ({ ...d, claims: [...d.claims, { ...EMPTY_CLAIM }] }))
            }
          >
            Add another claim
          </Button>
        </div>

        {problem ? (
          <p className="rounded-md border border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)] px-3 py-2 text-[13px]">
            {problem}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={submit}>
            Calculate
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

const LABELS = {
  weight: "(A) weight",
  expectedLosses: "(D) expected losses",
  expectedPrimary: "(E) expected primary",
  ballast: "(G) ballast",
  actualIncurred: "(H) actual incurred",
  actualPrimary: "(I) actual primary",
};

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
        {title}
      </h3>
      <div className="mt-2 grid gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  optional,
  hint,
  compact,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <label className={compact ? "block text-[12px]" : "block text-[13px]"}>
      <span className="font-medium">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-[var(--color-ink-faint)]">
            optional
          </span>
        ) : null}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        inputMode="text"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-2 py-1 text-[13px]"
      />
      {hint ? (
        <span className="mt-0.5 block text-[11.5px] text-[var(--color-ink-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function updateClaim(
  setDraft: React.Dispatch<React.SetStateAction<Draft>>,
  index: number,
  key: keyof Draft["claims"][number],
  value: string,
) {
  setDraft((d) => ({
    ...d,
    claims: d.claims.map((c, i) => (i === index ? { ...c, [key]: value } : c)),
  }));
}

/** Accepts what people actually type: "$1,234", "1234", ".19". */
function num(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
