/**
 * Reads the PDF's text layer with pdf.js, entirely in the browser. The file is
 * never uploaded anywhere on this path.
 */

export interface TextItem {
  text: string;
  /** Left edge, in PDF points from the left of the page. */
  x: number;
  /** Baseline distance from the top of the page, in points. */
  y: number;
  /** Rendered width in points. Right edge is x + w. */
  w: number;
  h: number;
}

export interface PdfPage {
  pageNumber: number;
  width: number;
  height: number;
  items: TextItem[];
}

export interface ExtractedDocument {
  pages: PdfPage[];
  glyphCount: number;
  /**
   * False when the document carries no usable text layer, which in practice
   * means it is a scan or photograph. The caller must stop and say so rather
   * than parse whatever fragments came back.
   */
  hasTextLayer: boolean;
}

/**
 * A digital NCCI worksheet carries hundreds of glyphs per page. A scan that has
 * been through a "print to PDF" step may still expose a handful of stray
 * characters, so require a real density before treating the layer as usable.
 */
const MIN_GLYPHS_PER_PAGE = 100;

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Convert one pdf.js text content payload into positioned items. */
export function itemsFromTextContent(
  content: any,
  pageHeight: number,
): TextItem[] {
  const items: TextItem[] = [];
  for (const raw of content.items ?? []) {
    if (typeof raw?.str !== "string") continue;
    const text = raw.str.trim();
    if (!text) continue;
    const transform = raw.transform as number[];
    items.push({
      text,
      x: transform[4],
      // pdf.js reports the baseline from the bottom of the page; flip it so
      // that y increases downward and rows sort naturally.
      y: pageHeight - transform[5],
      w: raw.width ?? 0,
      h: raw.height ?? Math.abs(transform[3]) ?? 0,
    });
  }
  return items;
}

/** Walk every page of an open pdf.js document. */
export async function documentFromPdfJs(pdf: any): Promise<ExtractedDocument> {
  const pages: PdfPage[] = [];
  let glyphCount = 0;

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = itemsFromTextContent(content, viewport.height);
    glyphCount += items.reduce((acc, i) => acc + i.text.length, 0);
    pages.push({
      pageNumber: n,
      width: viewport.width,
      height: viewport.height,
      items,
    });
    page.cleanup();
  }

  return {
    pages,
    glyphCount,
    hasTextLayer:
      pages.length > 0 && glyphCount >= MIN_GLYPHS_PER_PAGE * pages.length,
  };
}

let workerConfigured = false;

/** Browser entry point. Loads the worker from our own bundle, never a CDN. */
export async function extractTextLayer(
  data: ArrayBuffer,
): Promise<ExtractedDocument> {
  const pdfjs = await import("pdfjs-dist");

  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    workerConfigured = true;
  }

  const pdf = await pdfjs.getDocument({
    data,
    // The worksheet is plain text and tables; none of this is needed, and
    // disabling it keeps the parse fast and avoids any external fetch.
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  try {
    return await documentFromPdfJs(pdf);
  } finally {
    await pdf.destroy();
  }
}
