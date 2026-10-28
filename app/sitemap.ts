import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/brand";
import { loadGuide } from "@/lib/site/guide-content";
import { GUIDES, guidePath } from "@/lib/site/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    // Dated from each guide's own front matter, so a crawler revisits a guide
    // when it actually changes rather than on every deploy.
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}${guidePath(g.slug)}`,
      lastModified: new Date(`${loadGuide(g.slug).meta.lastUpdated}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
