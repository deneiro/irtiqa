import type { Vault } from "./types";

/** The page's file text exactly as scanned (frontmatter included). */
export function rawPageText(vault: Vault, rel: string): string | null {
  return vault.rawByRel.get(rel) ?? null;
}
