import { NextResponse } from "next/server";

/**
 * Request guards for the two routes that spend the deployment's API quota.
 *
 * Neither route can be authenticated - the tool is public and deliberately has
 * no accounts - so this raises the cost of abuse rather than eliminating it.
 * Three cheap layers: require a browser origin, cap body size, and rate limit
 * per caller and per instance.
 *
 * The rate limiter is in-memory and therefore per serverless instance, not
 * global. Vercel reuses warm instances, so sustained abuse from one source is
 * caught, but a determined attacker spreading across cold starts is not. That
 * is an accepted limit: a shared store would mean persistent state, which this
 * tool does not have and does not want.
 */

export interface GuardOptions {
  /** Identifies the limiter bucket, so routes do not share a budget. */
  route: string;
  /** Reject bodies larger than this, from Content-Length, before reading them. */
  maxBytes: number;
  /** Requests per caller per minute. */
  perMinute: number;
  /** Requests per caller per hour. */
  perHour: number;
  /**
   * Requests this instance will serve per hour across all callers, protecting
   * the shared API quota. Skipped when the caller supplies their own key.
   */
  instancePerHour: number;
  /** True when the caller is spending their own quota rather than ours. */
  usesOwnKey?: boolean;
}

type Bucket = number[];
const buckets = new Map<string, Bucket>();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Run every guard. Returns a response to send back, or null to proceed. */
export function guardRequest(
  request: Request,
  options: GuardOptions,
): NextResponse | null {
  const origin = checkOrigin(request);
  if (origin) return origin;

  const size = checkSize(request, options.maxBytes);
  if (size) return size;

  return checkRate(request, options);
}

/* ------------------------------------------------------------------ *
 * Origin
 * ------------------------------------------------------------------ */

/**
 * Browsers attach an Origin header to every POST, same-origin included, so its
 * absence means the caller is not a page in a browser. That is the cheapest
 * available signal of scripted use and costs legitimate users nothing.
 *
 * When ALLOWED_FRAME_ANCESTORS names specific sites, those are exactly the
 * sites permitted to embed the tool, so they are also the only ones whose
 * pages should be calling these routes.
 */
export function checkOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return deny(
      403,
      "forbidden_origin",
      "This endpoint only accepts requests from the tool itself.",
      "If you reached this by opening the URL directly, use the tool at the site root instead.",
    );
  }

  const allowed = allowedOrigins();
  if (allowed === "any") return null;

  const self = selfOrigin(request);
  if (origin === self || allowed.includes(origin)) return null;

  return deny(
    403,
    "forbidden_origin",
    "This endpoint only accepts requests from the tool itself.",
    "The origin this request came from is not on this deployment's allowed list.",
  );
}

function allowedOrigins(): string[] | "any" {
  const raw = process.env.ALLOWED_FRAME_ANCESTORS?.trim();
  if (!raw || raw === "*") return "any";

  const entries = raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim().replace(/;$/, ""))
    .filter(Boolean);

  if (entries.includes("*")) return "any";
  // 'self' is a CSP keyword, not an origin; selfOrigin covers it separately.
  return entries.filter((entry) => entry !== "'self'" && entry !== "self");
}

function selfOrigin(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    try {
      return new URL(request.url).origin;
    } catch {
      return null;
    }
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/* ------------------------------------------------------------------ *
 * Size
 * ------------------------------------------------------------------ */

function checkSize(request: Request, maxBytes: number): NextResponse | null {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return deny(
      413,
      "too_large",
      "That request is larger than this tool accepts.",
      `Requests are capped at ${Math.round(maxBytes / 1024)} KB.`,
    );
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Rate
 * ------------------------------------------------------------------ */

function checkRate(
  request: Request,
  options: GuardOptions,
): NextResponse | null {
  const now = Date.now();
  const caller = callerKey(request);

  const perCaller = take(`${options.route}:${caller}`, now);
  if (
    count(perCaller, now, MINUTE) > options.perMinute ||
    count(perCaller, now, HOUR) > options.perHour
  ) {
    return throttled(
      "You have made a lot of requests in a short time.",
      "Waiting a minute should clear it. Everything already on your screen was calculated in your browser and is unaffected.",
    );
  }

  // A caller spending their own quota is not a threat to ours.
  if (!options.usesOwnKey) {
    const instance = take(`${options.route}:__instance`, now);
    if (count(instance, now, HOUR) > options.instancePerHour) {
      return throttled(
        "This tool has reached its hourly limit for AI requests.",
        "The free API tier it runs on is shared between everyone using it. Trying again later, or adding your own API key under Options, will work. Your calculations are complete and unaffected.",
      );
    }
  }

  return null;
}

/** Records this request and returns the caller's recent timestamps. */
function take(key: string, now: number): Bucket {
  const kept = (buckets.get(key) ?? []).filter((t) => now - t < HOUR);
  kept.push(now);
  buckets.set(key, kept);

  // Keep the map from growing without bound on a long-lived instance.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.length === 0 || now - v[v.length - 1] > HOUR) buckets.delete(k);
    }
  }

  return kept;
}

function count(bucket: Bucket, now: number, window: number): number {
  return bucket.reduce((acc, t) => (now - t < window ? acc + 1 : acc), 0);
}

function callerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Test seam: the limiter is process-global and would otherwise leak between tests. */
export function resetRateLimits(): void {
  buckets.clear();
}

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

function deny(
  status: number,
  code: string,
  message: string,
  hint: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, hint, retryable: false } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function throttled(message: string, hint: string): NextResponse {
  return NextResponse.json(
    { error: { code: "throttled", message, hint, retryable: true } },
    { status: 429, headers: { "cache-control": "no-store" } },
  );
}
