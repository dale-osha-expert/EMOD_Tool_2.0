import type { Metadata } from "next";

/**
 * The embed route is the same tool without its page furniture, for use inside
 * an iframe on another site. Letting it be indexed would put a second copy of
 * the tool in the index competing with the page that should rank.
 */
export const metadata: Metadata = {
  title: "Experience Mod Analyzer",
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
