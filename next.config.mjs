/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-hosted: build a minimal server bundle (.next/standalone) that runs
  // with plain `node server.js`, without node_modules. See the Dockerfile.
  output: "standalone",
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
