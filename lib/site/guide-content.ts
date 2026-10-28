import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Marked, type Tokens } from "marked";
import { GUIDES, guidePath } from "./guides";
import type { Faq } from "./content";

/**
 * Loads a pillar guide from content/guides/<slug>.md and renders it to HTML.
 *
 * The Markdown is the content pipeline's output, committed unedited, so a
 * revised draft can be dropped in over the old one. Everything that has to
 * change for it to sit on this site happens here, at build time, and anything
 * this code does not recognise stops the build rather than rendering wrong:
 *
 * - Chart colours are hard-coded hex in the draft's inline SVG. Each is mapped
 *   to a theme token so the charts follow light and dark like the rest of the
 *   page. An unmapped colour throws - a chart that silently stays light-only
 *   on a dark page is exactly the failure this mapping exists to prevent.
 * - Links to https://emodanalyzer.com become site-relative, so they work on
 *   localhost and staging, and must land on the tool or another guide.
 * - Relative image paths are rewritten to where the files live in public/.
 *
 * Read with fs, so only server code may import this. Every guide route is
 * statically generated, so the files are read at build time, never at runtime.
 */

const CONTENT_DIR = join(process.cwd(), "content", "guides");

/**
 * Hex colours the drafts use, by hue, to the CSS variable that replaces them.
 * The variables are defined for both schemes in app/globals.css. A new draft
 * using a new colour needs one line here and one pair there.
 */
export const CHART_COLORS: Record<string, string> = {
  "#2563eb": "--chart-blue",
  "#f59e0b": "--chart-amber",
  "#10b981": "--chart-green",
  "#64748b": "--chart-slate",
  "#f97316": "--chart-orange",
  "#0d9488": "--chart-teal",
  "#9ca3af": "--chart-muted",
  "#dc2626": "--chart-red",
};

export interface GuideFrontMatter {
  title: string;
  description: string;
  kicker: string;
  date: string;
  lastUpdated: string;
  heroAlt: string;
  tags: string[];
}

export interface Guide {
  slug: string;
  meta: GuideFrontMatter;
  /** Rendered article body, without its H1 (the page renders that). */
  html: string;
  /** The article's own FAQ section as plain text, for FAQPage structured data. */
  faqs: Faq[];
  /** Every heading id in the body, for checking table-of-contents anchors. */
  headingIds: string[];
  wordCount: number;
}

/**
 * The front matter is flat: quoted scalars and lists of quoted strings. Rather
 * than take a YAML dependency for that, read exactly that shape and refuse
 * anything else.
 */
export function parseFrontMatter(source: string): {
  data: Record<string, string | string[]>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error("Guide has no front matter block");
  const data: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = /^\s+-\s+(".*")\s*$/.exec(line);
    if (item && listKey) {
      (data[listKey] as string[]).push(JSON.parse(item[1]));
      continue;
    }
    const pair = /^([A-Za-z_]+):\s*(".*")?\s*$/.exec(line);
    if (!pair) throw new Error(`Unrecognised front matter line: ${line}`);
    if (pair[2] === undefined) {
      listKey = pair[1];
      data[listKey] = [];
    } else {
      listKey = null;
      data[pair[1]] = JSON.parse(pair[2]);
    }
  }
  return { data, body: source.slice(match[0].length) };
}

function requireString(
  data: Record<string, string | string[]>,
  key: string,
  slug: string,
): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Guide ${slug} is missing front matter "${key}"`);
  }
  return value;
}

/** GitHub-style heading slug, which is what the drafts' tables of contents link to. */
export function headingId(text: string): string {
  return plainText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");
}

/** Strips the inline Markdown the drafts use, for headings and structured data. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function themeSvgColors(svg: string, slug: string): string {
  return svg.replace(/<([a-zA-Z]+)(\s[^>]*?)?(\/?)>/g, (tag, name, attrs = "", selfClose) => {
    if (!/\b(fill|stroke)="#/.test(attrs)) return tag;
    if (/\bstyle=/.test(attrs)) {
      throw new Error(`Guide ${slug}: <${name}> has both a hex colour and a style attribute`);
    }
    const styles: string[] = [];
    const rest = attrs.replace(
      /\s(fill|stroke)="(#[0-9a-fA-F]{3,8})"/g,
      (_: string, prop: string, hex: string) => {
        const token = CHART_COLORS[hex.toLowerCase()];
        if (!token) {
          throw new Error(
            `Guide ${slug}: chart colour ${hex} has no theme token. Add it to CHART_COLORS and app/globals.css.`,
          );
        }
        styles.push(`${prop}:var(${token})`);
        return "";
      },
    );
    return `<${name}${rest} style="${styles.join(";")}"${selfClose}>`;
  });
}

const KNOWN_PATHS = new Set(["/", ...GUIDES.map((g) => guidePath(g.slug))]);

function rewriteSiteLinks(markdown: string, slug: string): string {
  return markdown.replace(
    /https:\/\/emodanalyzer\.com\/([a-z0-9-]*)\/?(#[a-z0-9-]+)?/g,
    (_, segment: string, hash = "") => {
      const path = segment ? `/${segment}` : "/";
      if (!KNOWN_PATHS.has(path)) {
        throw new Error(`Guide ${slug} links to ${path}, which is not a page on this site`);
      }
      return path + hash;
    },
  );
}

function extractFaqs(body: string): Faq[] {
  const section = /^## Frequently Asked Questions\s*$([\s\S]*?)(?=^## )/m.exec(body);
  if (!section) return [];
  return section[1]
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [heading, ...rest] = block.split(/\r?\n/);
      return {
        question: plainText(heading),
        answer: plainText(rest.join(" ")),
      };
    })
    .filter((faq) => faq.question && faq.answer);
}

export function renderGuide(slug: string, source: string): Guide {
  const { data, body: raw } = parseFrontMatter(source);
  const meta: GuideFrontMatter = {
    title: requireString(data, "title", slug),
    description: requireString(data, "description", slug),
    kicker: requireString(data, "kicker", slug),
    date: requireString(data, "date", slug),
    lastUpdated: requireString(data, "lastUpdated", slug),
    heroAlt: requireString(data, "coverImageAlt", slug),
    tags: Array.isArray(data.tags) ? data.tags : [],
  };

  const body = rewriteSiteLinks(
    raw
      // The page renders the H1 with the kicker and dates around it.
      .replace(/^# .*\r?\n/m, "")
      // The drafts put the TOC's bold label on the line straight after the
      // marker. A raw HTML line runs on until a blank line, so without the
      // blank lines here the label renders as literal **asterisks**.
      .replace(
        /<!-- blog-hygiene:toc:begin -->\s*(?:\*\*([^*\n]+?):?\*\*)?\s*/,
        (_, label = "In this article") =>
          `<nav class="guide-toc" aria-label="${label}">\n<p class="guide-toc-title">${label}</p>\n\n`,
      )
      .replace(/\s*<!-- blog-hygiene:toc:end -->/, "\n\n</nav>\n")
      // Editorial markers such as <!-- [UNIQUE INSIGHT] --> are not for readers.
      .replace(/<!--[\s\S]*?-->\r?\n?/g, "")
      .replace(/<svg[\s\S]*?<\/svg>/g, (svg) => themeSvgColors(svg, slug))
      // Each chart's drawn width, so CSS can let it grow in proportion on a
      // wide page without blowing a narrow diagram up to full width.
      .replace(/<svg([^>]*?)\swidth="(\d+)"/g, '<svg$1 width="$2" style="--svg-w:$2px"')
      .replace(/src="images\//g, `src="/guides/${slug}/images/`),
    slug,
  );

  const headingIds: string[] = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const id = headingId(text);
        headingIds.push(id);
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });

  const html = (marked.parse(body, { async: false }) as string)
    // Wide tables scroll inside their own box; the page never scrolls sideways.
    .replace(/<table>/g, '<div class="scroll-x guide-table"><table>')
    .replace(/<\/table>/g, "</table></div>");

  // Markdown placed directly against raw HTML is passed through unparsed and
  // reaches the reader as literal syntax. The drafts' own previews hide it,
  // so catch it here rather than on the live page.
  const leftover = /\*\*[^*\s][^*]*\*\*|\]\([^)\s]+\)/.exec(
    html.replace(/<code>[\s\S]*?<\/code>/g, "").replace(/<[^>]+>/g, " "),
  );
  if (leftover) {
    throw new Error(`Guide ${slug} has unrendered Markdown: ${leftover[0]}`);
  }

  return {
    slug,
    meta,
    html,
    faqs: extractFaqs(raw),
    headingIds,
    wordCount: plainText(raw.replace(/<[^>]+>/g, " ")).split(" ").length,
  };
}

const cache = new Map<string, Guide>();

export function loadGuide(slug: string): Guide {
  if (!GUIDES.some((g) => g.slug === slug)) {
    throw new Error(`Unknown guide: ${slug}`);
  }
  let guide = cache.get(slug);
  if (!guide) {
    guide = renderGuide(slug, readFileSync(join(CONTENT_DIR, `${slug}.md`), "utf8"));
    cache.set(slug, guide);
  }
  return guide;
}
