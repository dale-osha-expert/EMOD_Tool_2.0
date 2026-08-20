"use client";

import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function money(value: number | null, options?: { sign?: boolean }): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const formatted = Math.abs(rounded).toLocaleString("en-US");
  if (rounded < 0) return `−$${formatted}`;
  return `${options?.sign ? "+" : ""}$${formatted}`;
}

export function factor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function signedFactor(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0.00";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="@container flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-3.5 py-1.5 text-[14px]",
        variant === "primary" &&
          "border-transparent bg-[var(--color-accent)] text-white hover:opacity-90",
        variant === "secondary" &&
          "border-[var(--color-line-strong)] bg-[var(--color-canvas)] text-[var(--color-ink)] hover:bg-[var(--color-surface)]",
        variant === "ghost" &&
          "border-transparent text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  error:
    "bg-[var(--color-critical-soft)] text-[var(--color-critical)] border-[var(--color-critical)]/25",
  warning:
    "bg-[var(--color-caution-soft)] text-[var(--color-caution)] border-[var(--color-caution)]/25",
  info: "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/25",
};

export function Badge({
  severity = "info",
  children,
}: {
  severity?: Severity;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        SEVERITY_STYLE[severity],
      )}
    >
      {children}
    </span>
  );
}

/**
 * A labelled figure. Used for the handful of numbers that carry the whole
 * result, so they read as a headline rather than as another table cell.
 */
export function Stat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "positive" | "caution" | "critical";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--color-positive)]"
      : tone === "caution"
        ? "text-[var(--color-caution)]"
        : tone === "critical"
          ? "text-[var(--color-critical)]"
          : "text-[var(--color-ink)]";

  return (
    <div className="min-w-0 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className={cx("tabular mt-1 text-[22px] font-semibold leading-none", toneClass)}>
        {value}
      </div>
      {detail ? (
        <div className="mt-1.5 text-[12px] leading-snug text-[var(--color-ink-muted)]">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-muted)]">
      <span
        aria-hidden
        className="size-3.5 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-accent)]"
      />
      {label}
    </span>
  );
}
