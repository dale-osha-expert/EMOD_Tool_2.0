/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
