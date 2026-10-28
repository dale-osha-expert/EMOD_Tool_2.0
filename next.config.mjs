import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-hosted: build a minimal server bundle (.next/standalone) that runs
  // with plain `node server.js`, without node_modules. See the Dockerfile.
  output: "standalone",
  // Pinned because Next infers the root from the nearest lockfile upward: a
  // stray package-lock.json in a parent directory moves server.js deep inside
  // .next/standalone, where the Dockerfile and README do not look for it.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // The guides and sitemap read their Markdown with fs, which tracing cannot
  // see. Both are generated at build time, so this only matters if one is
  // ever rendered at runtime - and then a missing file would be a 500.
  outputFileTracingIncludes: { "/*": ["./content/guides/*.md"] },
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
