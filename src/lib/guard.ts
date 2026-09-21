/**
 * Write guard for the ledgers the app rewrites whole: debts, accounts,
 * subscriptions, calendar. A rewrite is built from parsed rows, so a row the
 * parser skipped, or text outside the tables, would silently vanish. Before a
 * write the file on disk is checked, and anything the new version would lose
 * is returned so the write can be refused with the lines named.
 */
const cellsOf = (t: string) => t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
const isSeparator = (t: string) => t.startsWith("|") && cellsOf(t).every((c) => /^:?-+:?$/.test(c) || c === "");

export function ledgerLosses(onDisk: string, next: string, parse: (content: string) => unknown[]): string[] {
  const lost: string[] = [];
  const lines = onDisk.split(/\r?\n/);
  const kept = new Set(next.split(/\r?\n/).map((l) => l.trim()));
  let section = "";
  let inFm = lines[0]?.trim() === "---";
  // Frontmatter keys the rewrite no longer carries (ledgers regenerate their header).
  const nextKeys = new Set((next.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "").split(/\r?\n/).map((l) => l.match(/^([A-Za-z_][\w-]*):/)?.[1]).filter(Boolean));
  for (let i = inFm ? 1 : 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (inFm) {
      if (t === "---") { inFm = false; continue; }
      const k = t.match(/^([A-Za-z_][\w-]*):/)?.[1];
      if (k && !nextKeys.has(k)) lost.push(lines[i]);
      continue;
    }
    if (!t) continue;
    const h = t.match(/^##\s+(.*)$/);
    if (h) section = h[1].trim();
    if (t.startsWith("|")) {
      if (isSeparator(t) || isSeparator((lines[i + 1] ?? "").trim())) continue; // separator, or the header above one
      // One row, in its section, through the real parser: nothing parsed means the rewrite drops it.
      if (parse(`## ${section}\n${t}\n`).length === 0) lost.push(t);
      continue;
    }
    if (!kept.has(t)) lost.push(t);
  }
  return lost;
}

export class LedgerConflict extends Error {}
