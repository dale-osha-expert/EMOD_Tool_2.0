"use client";

/**
 * Counting, not tracking.
 *
 * There is currently no provider. This talked to Vercel Web Analytics through
 * a script the platform served, which does not exist now the site is
 * self-hosted, so every call below is a no-op until one is chosen. Whatever
 * replaces it should be cookieless and store nothing on the device (Plausible
 * and Umami both qualify and can be self-hosted); wire it in at the one call
 * site in track() and keep the allowlist.
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

/** The call shape Vercel's script exposed; kept until a replacement is wired. */
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
