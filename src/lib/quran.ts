/**
 * The Quran side of the Spirituality theme: 114 sura pages carry `sura:`,
 * `learning:` and `memorized:` in their frontmatter, and the 99 names live in
 * one table whose last two columns the app owns. Memorisation is the only
 * thing the app writes here — the text itself is knowledge and never touched.
 *
 * Three states, on purpose: nothing, «учу» (taken into work, dated) and
 * «выучено». Eldar learns one name over two or three days, so the middle state
 * is the one he actually lives in.
 */
import type { Page, Vault } from "./types";

export type MemoState = "none" | "learning" | "done";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function asDate(v: unknown): string | undefined {
  const s = typeof v === "string" || v instanceof Date ? String(v).slice(0, 10) : "";
  return DATE.test(s) ? s : undefined;
}

/** Whole days since `date`, counting the day it was set as day 1. */
export function dayOf(date: string, today: string): number {
  const ms = Date.parse(`${today}T00:00:00`) - Date.parse(`${date}T00:00:00`);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86400000) + 1) : 1;
}

export interface Sura {
  n: number;
  title: string;
  name: string; // "Аль-Ихлас (Очищение веры)"
  ayahs: number;
  revelation: string;
  learning: string | undefined;
  memorized: string | undefined;
  state: MemoState;
  page: Page;
}

export function suras(vault: Vault): Sura[] {
  const out: Sura[] = [];
  for (const p of vault.pages) {
    const n = Number(p.fm.sura);
    if (!Number.isInteger(n) || n < 1 || n > 114) continue;
    const memorized = asDate(p.fm.memorized);
    const learning = memorized ? undefined : asDate(p.fm.learning);
    out.push({
      n,
      title: p.title,
      name: p.title.replace(/^Сура \d+ — /, ""),
      ayahs: Number(p.fm.ayahs) || 0,
      revelation: typeof p.fm.revelation === "string" ? p.fm.revelation : "",
      learning,
      memorized,
      state: memorized ? "done" : learning ? "learning" : "none",
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
  learning: string | undefined;
  learned: string | undefined;
  state: MemoState;
}

/** № | Имя | Транскрипция | Значение | Latin | Учу с | Выучено */
const NAMES_ROW = /^\|\s*(\d{1,3})\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/;

export function parseNames(content: string): DivineName[] {
  const out: DivineName[] = [];
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(NAMES_ROW);
    if (!m) continue;
    const learned = asDate(m[7].trim());
    const learning = learned ? undefined : asDate(m[6].trim());
    out.push({
      n: Number(m[1]),
      arabic: m[2].trim(),
      translit: m[3].trim(),
      meaning: m[4].trim(),
      learning,
      learned,
      state: learned ? "done" : learning ? "learning" : "none",
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

/** Rewrite one row's two last cells — the only part of that page the app owns. */
export function withNameState(content: string, n: number, state: MemoState, today: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(NAMES_ROW);
      if (!m || Number(m[1]) !== n) return line;
      const learning = state === "learning" ? today : "";
      const learned = state === "done" ? today : "";
      return `| ${m[1].trim()} |${m[2]}|${m[3]}|${m[4]}|${m[5]}| ${learning} | ${learned} |`;
    })
    .join("\n");
}

/** The frontmatter patch for a sura in a given state. */
export function suraPatch(state: MemoState, today: string): Record<string, string | null> {
  return {
    learning: state === "learning" ? today : null,
    memorized: state === "done" ? today : null,
  };
}

export const NAMES_PAGE = "99 имён Аллаха";
