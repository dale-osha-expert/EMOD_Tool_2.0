"use client";

/**
 * Counting, not tracking.
 *
 * This talks to Vercel Web Analytics through the script the platform already
 * serves at /_vercel/insights/script.js, rather than through @vercel/analytics.
 * The package is a thin wrapper around that script and pulls in a SvelteKit
 * peer dependency that conflicts with this project's test toolchain, so the
 * wrapper costs a dependency and a resolution override for nothing.
 *
 * Vercel Web Analytics is cookieless and stores nothing on the device. No
 * identifier follows a visitor between sessions or between sites.
 *
 * What is never sent: anything from an uploaded worksheet. No company name, no
 * claim number, no figure, no filename, and never the fact that a particular
 * worksheet produced a particular mod. Events carry only which control was
 * used and where it sits on the page. The allowlist below is what keeps that
 * true as the page grows - an event not named here is dropped.
 */

const ALLOWED_EVENTS = [
  "cta_click",
  "worksheet_parsed",
  "report_downloaded",
] as const;

export type AnalyticsEvent = (typeof ALLOWED_EVENTS)[number];

/** Values are short labels chosen in code, never anything a user supplied. */
export type EventProps = Record<string, string | number | boolean>;

type VercelAnalytics = (
  kind: "event",
  payload: { name: string; data?: EventProps },
) => void;

export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (!ALLOWED_EVENTS.includes(event)) return;
  try {
    const va = (globalThis as { va?: VercelAnalytics }).va;
    va?.("event", { name: event, ...(props ? { data: props } : {}) });
  } catch {
    // Analytics must never break the tool. A blocked script, an ad blocker, or
    // analytics simply not being enabled on the project is not an error worth
    // surfacing to someone trying to read their worksheet.
  }
}
