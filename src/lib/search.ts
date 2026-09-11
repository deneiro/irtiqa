import MiniSearch from "minisearch";
import type { Page } from "./types";

export interface SearchDoc {
  id: string;
  title: string;
  file: string;
  aliases: string;
  tags: string;
  body: string;
  theme: string;
  type: string;
}

export function buildIndex(pages: Page[]): MiniSearch<SearchDoc> {
  const ms = new MiniSearch<SearchDoc>({
    fields: ["title", "file", "aliases", "tags", "body"],
    storeFields: ["id"],
    searchOptions: {
      boost: { title: 6, file: 5, aliases: 4, tags: 3 },
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
    },
  });
  ms.addAll(
    pages.map((p) => ({
      id: p.rel,
      title: p.title,
      file: p.file,
      aliases: p.aliases.join(" "),
      tags: p.tags.join(" "),
      body: p.body,
      theme: p.theme ?? "",
      type: p.type,
    })),
  );
  return ms;
}

/** Pull a short snippet around the first occurrence of any query term. */
export function snippet(body: string, query: string, width = 160): string {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const lower = body.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  const clean = (s: string) => s.replace(/[#*_>`\[\]]|\n+/g, " ").replace(/\s+/g, " ").trim();
  if (pos < 0) return clean(body.slice(0, width));
  const start = Math.max(0, pos - width / 3);
  return (start > 0 ? "…" : "") + clean(body.slice(start, start + width)) + "…";
}
