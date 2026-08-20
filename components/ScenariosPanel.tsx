"use client";

import { useMemo, useState } from "react";
import type { Analysis } from "@/lib/types";
import { Card, CardHeader, cx, factor, money, signedFactor } from "./ui";

/**
 * What-if scenarios, all computed locally and exactly. Nothing here comes from
 * a model, so these figures are as reliable as the worksheet itself.
 */
export function ScenariosPanel({ analysis }: { analysis: Analysis }) {
  const [showReserves, setShowReserves] = useState(false);
  const { computed, scenarios } = analysis;

  const headline = useMemo(
    () =>
      scenarios.filter(
        (s) => !s.id.startsWith("reserve:") && !s.id.startsWith("remove:"),
      ),
    [scenarios],
  );
  const removals = useMemo(
    () =>
      scenarios
        .filter((s) => s.id.startsWith("remove:"))
        .sort((a, b) => a.modDelta - b.modDelta),
    [scenarios],
  );
  const reserves = useMemo(
    () => scenarios.filter((s) => s.id.startsWith("reserve:")),
    [scenarios],
  );

  const worst = Math.max(
    ...scenarios.map((s) => Math.abs(s.modDelta)),
    0.01,
  );

  return (
    <Card>
      <CardHeader
        title="What each change would be worth"
        subtitle={
          analysis.subjectPremium !== null
            ? `Premium figures are estimates, scaled from the ${money(analysis.subjectPremium)} average annual subject premium printed on the worksheet.`
            : "No subject premium is printed on this worksheet, so only the mod change is shown."
        }
      />

      <div className="divide-y divide-[var(--color-line)]">
        <Group title="Overall">
          {headline.map((s) => (
            <ScenarioRow key={s.id} scenario={s} base={computed.mod} worst={worst} />
          ))}
        </Group>

        {removals.length > 0 ? (
          <Group
            title="If a single claim carried no loss dollars"
            note="Shows how much of the current mod each claim accounts for. Closed claims cannot usually be changed; they are here to size the problem, not to suggest they are actionable."
          >
            {removals.map((s) => (
              <ScenarioRow key={s.id} scenario={s} base={computed.mod} worst={worst} />
            ))}
          </Group>
        ) : null}

        {reserves.length > 0 ? (
          <Group
            title="If an open claim settled below its current reserve"
            note="Only open claims appear here, because only their reserves can still move."
            action={
              <button
                onClick={() => setShowReserves((v) => !v)}
                className="text-[12.5px] text-[var(--color-accent)] underline underline-offset-2"
              >
                {showReserves ? "Hide" : `Show ${reserves.length}`}
              </button>
            }
          >
            {showReserves
              ? reserves.map((s) => (
                  <ScenarioRow
                    key={s.id}
                    scenario={s}
                    base={computed.mod}
                    worst={worst}
                  />
                ))
              : null}
          </Group>
        ) : null}
      </div>
    </Card>
  );
}

function Group({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {action}
      </div>
      {note ? (
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
          {note}
        </p>
      ) : null}
      <div className="mt-2.5 space-y-1.5">{children}</div>
    </div>
  );
}

function ScenarioRow({
  scenario,
  base,
  worst,
}: {
  scenario: Analysis["scenarios"][number];
  base: number;
  worst: number;
}) {
  const improves = scenario.modDelta < 0;
  const magnitude = Math.min(Math.abs(scenario.modDelta) / worst, 1);

  return (
    <div className="@container rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="min-w-0 flex-1 text-[13px] font-medium">
          {scenario.label}
        </span>
        <span className="flex items-center gap-3 text-[13px]">
          <span className="tabular text-[var(--color-ink-muted)]">
            {factor(base)} → <span className="font-semibold text-[var(--color-ink)]">{factor(scenario.mod)}</span>
          </span>
          <span
            className={cx(
              "tabular w-14 text-right font-semibold",
              improves
                ? "text-[var(--color-positive)]"
                : scenario.modDelta > 0
                  ? "text-[var(--color-caution)]"
                  : "text-[var(--color-ink-muted)]",
            )}
          >
            {signedFactor(scenario.modDelta)}
          </span>
          {scenario.premiumDelta !== null ? (
            <span
              className={cx(
                "tabular w-24 text-right",
                improves
                  ? "text-[var(--color-positive)]"
                  : "text-[var(--color-ink-muted)]",
              )}
            >
              {scenario.premiumDelta === 0
                ? "—"
                : `${scenario.premiumDelta < 0 ? "saves " : "costs "}${money(Math.abs(scenario.premiumDelta))}`}
            </span>
          ) : null}
        </span>
      </div>

      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
        aria-hidden
      >
        <div
          className={cx(
            "h-full rounded-full",
            improves ? "bg-[var(--color-positive)]" : "bg-[var(--color-caution)]",
          )}
          style={{ width: `${Math.max(magnitude * 100, 2)}%` }}
        />
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
        {scenario.description}
      </p>
    </div>
  );
}
