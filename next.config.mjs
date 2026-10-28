/**
 * Where this deployment permanently redirects to, once the site has moved.
 *
 * Unset (the default) means no redirect: the site serves as normal. Set
 * REDIRECT_TO=https://emodanalyzer.com in Vercel (Production) and redeploy to
 * send every path to the same path on the new domain, so each page's ranking
 * follows it. Validated here so a typo fails the deploy instead of redirecting
 * every visitor to a broken address.
 */
export function redirectTarget(raw = process.env.REDIRECT_TO) {
  const value = raw?.trim();
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`REDIRECT_TO is not a valid URL: "${value}"`);
  }
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `REDIRECT_TO must be a bare https origin such as https://emodanalyzer.com, got "${value}"`,
    );
  }
  return url.origin;
}

/**
 * Google re-checks this file to keep the Vercel property verified, and the
 * Search Console Change of Address tool needs the old property verified while
 * the move is processed, so it keeps being served here rather than redirected
 * to a domain that does not have it.
 */
const SEARCH_CONSOLE_FILE = "google199a05b29e91da57.html";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The guides and sitemap read their Markdown with fs, which tracing cannot
  // see. Both are generated at build time, so this only matters if one is
  // ever rendered at runtime - and then a missing file would be a 500.
  outputFileTracingIncludes: { "/*": ["./content/guides/*.md"] },
  async redirects() {
    const target = redirectTarget();
    if (!target) return [];
    return [
      {
        // Every path, query string included, except the verification file.
        source: `/:path((?!${SEARCH_CONSOLE_FILE.replace(/\./g, "\\.")}$).*)`,
        destination: `${target}/:path`,
        permanent: true,
      },
    ];
  },
  // The tool is designed to be embedded in a third-party "tools" page via iframe.
  // We therefore do NOT send X-Frame-Options: DENY. Framing is controlled by CSP
  // frame-ancestors instead, which is configurable per deployment.
  async headers() {
    const frameAncestors = process.env.ALLOWED_FRAME_ANCESTORS || "*";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // No client data is persisted anywhere; make caches respect that too.
          { key: "Cache-Control", value: "no-store" },
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors};`,
          },
        ],
      },
    ];
  },
};
export default nextConfig;
