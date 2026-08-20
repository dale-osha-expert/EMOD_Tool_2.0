import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ExtractedDocument } from "@/lib/parse/textLayer";

export function loadFixture(name: string): ExtractedDocument {
  const path = fileURLToPath(
    new URL(`../fixtures/${name}.json`, import.meta.url),
  );
  return JSON.parse(readFileSync(path, "utf8")) as ExtractedDocument;
}
