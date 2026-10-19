import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The embed variant is the same tool without its page furniture, and
        // the API routes are not pages. Indexing either would split ranking
        // signals across duplicates of the one page that should rank.
        disallow: ["/embed", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
