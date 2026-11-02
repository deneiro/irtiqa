import type { Vault } from "./types";

/**
 * The page's file text exactly as scanned (frontmatter included). The index is
 * keyed NFC; a path that came from elsewhere may be NFD, so normalise first.
 */
export function rawPageText(vault: Vault, rel: string): string | null {
  return vault.rawByRel.get(rel) ?? vault.rawByRel.get(rel.normalize("NFC")) ?? null;
}
