import type { Metadata, Viewport } from "next";
import { PUBLISHER, SITE_URL, TOOL_NAME } from "@/lib/site/brand";
import "./globals.css";

const TITLE = `${TOOL_NAME} — Free NCCI Experience Rating Worksheet Calculator`;

const DESCRIPTION =
  "Free experience mod calculator. Upload an NCCI experience rating worksheet to recalculate your EMR, verify it against the worksheet's own arithmetic, see what each claim costs in mod points and premium, and export a report. Read in your browser — nothing is uploaded or stored.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s — ${TOOL_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: TOOL_NAME,
  authors: [{ name: PUBLISHER.name, url: PUBLISHER.url }],
  creator: PUBLISHER.name,
  publisher: PUBLISHER.name,
  keywords: [
    "experience modification rate",
    "EMR calculator",
    "experience mod calculator",
    "e-mod calculator",
    "workers compensation experience rating",
    "NCCI experience rating worksheet",
    "experience rating worksheet calculator",
    "EMR rating",
    "mod factor",
    "workers comp mod",
    "split point",
    "primary and excess losses",
    "lower experience mod",
    "EMR for contractors",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: TOOL_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  category: "business",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Tints the mobile browser's toolbar to match the page in either scheme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#191d23" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/*
          Vercel Web Analytics. Cookieless, sets nothing on the device, and
          counts page views plus the small allowlist of events in
          lib/site/analytics.ts. Served by the platform, so it 404s harmlessly
          in local development and when analytics is not enabled on the
          project; nothing in the tool depends on it loading.
        */}
        <script defer src="/_vercel/insights/script.js" />
      </body>
    </html>
  );
}
