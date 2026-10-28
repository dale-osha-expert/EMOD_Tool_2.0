import type { Metadata } from "next";
import { TOOL_NAME } from "@/lib/site/brand";

/**
 * The embed route is the same tool without its page furniture, for use inside
 * an iframe on another site. Letting it be indexed would put a second copy of
 * the tool in the index competing with the page that should rank.
 */
export const metadata: Metadata = {
  title: TOOL_NAME,
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
