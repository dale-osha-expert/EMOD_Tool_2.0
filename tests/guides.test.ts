import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { CHART_COLORS, loadGuide, renderGuide } from "@/lib/site/guide-content";
import { GUIDES } from "@/lib/site/guides";
import { buildGuideSchema, buildSchema } from "@/lib/site/schema";
import { SITE_URL } from "@/lib/site/brand";
import { FAQS } from "@/lib/site/content";

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

function minimalGuide(body: string): string {
  return [
    "---",
    'title: "T"',
    'description: "D"',
    'kicker: "K"',
    'date: "2026-10-22"',
    'lastUpdated: "2026-10-22"',
    'coverImageAlt: "A"',
    "---",
    "",
    body,
  ].join("\n");
}

describe.each(GUIDES.map((g) => g.slug))("guide %s", (slug) => {
  const guide = loadGuide(slug);

  it("has the front matter the page and metadata need", () => {
    expect(guide.meta.title.length).toBeGreaterThan(20);
    expect(guide.meta.description.length).toBeGreaterThan(80);
    expect(guide.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(guide.meta.heroAlt).not.toBe("");
  });

  it("leaves the H1 to the page, and editorial comments out", () => {
    expect(guide.html).not.toMatch(/<h1/);
    expect(guide.html).not.toMatch(/<!--/);
  });

  it("themes every chart colour, so charts follow light and dark", () => {
    const svgs = guide.html.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
    for (const svg of svgs) {
      expect(svg).not.toMatch(/(fill|stroke)="#/);
      for (const [, token] of svg.matchAll(/var\((--chart-[a-z]+)\)/g)) {
        // Defined for light, for dark-by-preference and for dark-by-toggle.
        expect(css.split(`${token}:`).length - 1).toBe(3);
      }
    }
  });

  it("has a table of contents whose every link lands on a heading", () => {
    const toc = /<nav class="guide-toc"[\s\S]*?<\/nav>/.exec(guide.html)?.[0] ?? "";
    const anchors = [...toc.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(anchors.length).toBeGreaterThan(5);
    for (const anchor of anchors) expect(guide.headingIds).toContain(anchor);
  });

  it("links within the site relatively, and only to pages that exist", () => {
    expect(guide.html).not.toContain("emodanalyzer.com");
    const internal = [...guide.html.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]);
    expect(internal).toContain("/");
    const known = new Set(["/", ...GUIDES.map((g) => `/${g.slug}`)]);
    for (const path of internal) expect(known.has(path)).toBe(true);
  });

  it("references only images that are in public/", () => {
    expect(existsSync(join(process.cwd(), "public", "guides", slug, "hero.jpg"))).toBe(true);
    for (const [, src] of guide.html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
  });

  it("puts the visible FAQ, and only that, in structured data", () => {
    expect(guide.faqs.length).toBeGreaterThanOrEqual(4);
    for (const faq of guide.faqs) {
      const escaped = faq.question.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
      expect(guide.html).toContain(escaped);
      expect(faq.answer).not.toMatch(/\]\(|\*\*/);
    }
  });

  it("builds an Article graph tied to the site's publisher and tool", () => {
    const schema = buildGuideSchema({
      slug,
      title: guide.meta.title,
      description: guide.meta.description,
      datePublished: guide.meta.date,
      dateModified: guide.meta.lastUpdated,
      heroAlt: guide.meta.heroAlt,
      keywords: guide.meta.tags,
      wordCount: guide.wordCount,
      faqs: guide.faqs,
    });
    const types = schema["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(
      expect.arrayContaining(["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "FAQPage"]),
    );
    const home = buildSchema()["@graph"];
    const homeOrg = home.find((n) => n["@type"] === "Organization")!;
    const article = schema["@graph"].find((n) => n["@type"] === "Article") as Record<string, unknown>;
    expect(article.author).toEqual({ "@id": homeOrg["@id"] });
    expect(article.mentions).toEqual({ "@id": `${SITE_URL}/#tool` });
  });
});

describe("guide rendering refuses what it does not recognise", () => {
  it("rejects a chart colour with no theme token", () => {
    const doc = minimalGuide('<figure><svg><rect fill="#123456"></rect></svg></figure>');
    expect(() => renderGuide("x", doc)).toThrow(/#123456 has no theme token/);
  });

  it("maps a known chart colour to its token", () => {
    const [hex, token] = Object.entries(CHART_COLORS)[0];
    const doc = minimalGuide(`<figure><svg><rect x="1" fill="${hex}" stroke="${hex}"></rect></svg></figure>`);
    expect(renderGuide("x", doc).html).toContain(`style="fill:var(${token});stroke:var(${token})"`);
  });

  it("rejects a link to a page this site does not have", () => {
    const doc = minimalGuide("See [this](https://emodanalyzer.com/no-such-page/).");
    expect(() => renderGuide("x", doc)).toThrow(/not a page on this site/);
  });

  it("renders the TOC label the drafts put hard against the marker", () => {
    const doc = minimalGuide(
      "<!-- blog-hygiene:toc:begin -->\n**In this article:**\n\n- [A](#a)\n\n<!-- blog-hygiene:toc:end -->\n\n## A\n",
    );
    const html = renderGuide("x", doc).html;
    expect(html).toContain('<p class="guide-toc-title">In this article</p>');
    expect(html).toMatch(/<nav class="guide-toc"[^>]*>[\s\S]*<ul>[\s\S]*<\/ul>\s*<\/nav>/);
  });

  it("rejects Markdown that would reach the page unrendered", () => {
    const doc = minimalGuide('<div class="x">\n**stuck**\n</div>');
    expect(() => renderGuide("x", doc)).toThrow(/unrendered Markdown: \*\*stuck\*\*/);
  });

  it("rejects front matter missing a required field", () => {
    const doc = minimalGuide("Body").replace('kicker: "K"\n', "");
    expect(() => renderGuide("x", doc)).toThrow(/missing front matter "kicker"/);
  });
});

describe("the tool page links to the guides", () => {
  it("points every FAQ 'read more' link at a guide heading that exists", () => {
    const linked = FAQS.filter((f) => f.more);
    expect(linked.length).toBeGreaterThanOrEqual(6);
    for (const { more } of linked) {
      const [path, anchor] = more!.href.split("#");
      const guide = GUIDES.find((g) => `/${g.slug}` === path);
      expect(guide, more!.href).toBeDefined();
      if (anchor) expect(loadGuide(guide!.slug).headingIds).toContain(anchor);
    }
  });

  it("keeps 'read more' links out of the FAQ structured data", () => {
    const faq = buildSchema()["@graph"].find((n) => n["@type"] === "FAQPage") as {
      mainEntity: Record<string, unknown>[];
    };
    expect(JSON.stringify(faq)).not.toContain('"more"');
    expect(faq.mainEntity).toHaveLength(FAQS.length);
  });

  it("lists every guide in the sitemap, dated from its front matter", () => {
    const urls = sitemap().map((e) => e.url);
    for (const g of GUIDES) expect(urls).toContain(`${SITE_URL}/${g.slug}`);
  });

  it("names every guide in llms.txt", () => {
    const llms = readFileSync(join(process.cwd(), "public", "llms.txt"), "utf8");
    for (const g of GUIDES) expect(llms).toContain(`${SITE_URL}/${g.slug}`);
  });
});
