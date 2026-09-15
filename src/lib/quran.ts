/**
 * The Quran side of the Spirituality theme: 114 sura pages carry `sura:` and
 * `memorized:` in their frontmatter, and the 99 names live in one table whose
 * last column the app owns. Memorisation is the only thing the app writes here
 * — the text itself is knowledge and never touched.
 */
import type { Page, Vault } from "./types";

export interface Sura {
  n: number;
  title: string;
  name: string; // "Аль-Ихлас (Очищение веры)"
  ayahs: number;
  revelation: string;
  memorized: string | undefined; // date
  page: Page;
}

export function suras(vault: Vault): Sura[] {
  const out: Sura[] = [];
  for (const p of vault.pages) {
    const n = Number(p.fm.sura);
    if (!Number.isInteger(n) || n < 1 || n > 114) continue;
    const m = typeof p.fm.memorized === "string" || p.fm.memorized instanceof Date ? String(p.fm.memorized).slice(0, 10) : "";
    out.push({
      n,
      title: p.title,
      name: p.title.replace(/^Сура \d+ — /, ""),
      ayahs: Number(p.fm.ayahs) || 0,
      revelation: typeof p.fm.revelation === "string" ? p.fm.revelation : "",
      memorized: /^\d{4}-\d{2}-\d{2}$/.test(m) ? m : undefined,
      page: p,
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

export interface DivineName {
  n: number;
  arabic: string;
  translit: string;
  meaning: string;
  learned: string | undefined;
}

const NAMES_ROW = /^\|\s*(\d{1,3})\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/;

export function parseNames(content: string): DivineName[] {
  const out: DivineName[] = [];
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(NAMES_ROW);
    if (!m) continue;
    const learned = m[6].trim();
    out.push({
      n: Number(m[1]),
      arabic: m[2].trim(),
      translit: m[3].trim(),
      meaning: m[4].trim(),
      learned: /^\d{4}-\d{2}-\d{2}$/.test(learned) ? learned : undefined,
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

/** Rewrite one row's last cell — the only part of that page the app owns. */
export function withNameLearned(content: string, n: number, date: string | undefined): string {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(NAMES_ROW);
      if (!m || Number(m[1]) !== n) return line;
      return `| ${m[1].trim()} |${m[2]}|${m[3]}|${m[4]}|${m[5]}| ${date ?? ""} |`;
    })
    .join("\n");
}

export const NAMES_PAGE = "99 имён Аллаха";
