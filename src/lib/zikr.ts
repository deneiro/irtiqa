/**
 * Dhikr (Eldar, 2026-11-25: «добавь зикры… пока истигфар, салауат, и в главном экране счётчик, где я буду писать,
 * сколько раз повторил»). The list is the table of `Сунны/Зикры.md` — a new row is a new dhikr; the count of a day
 * is `zikr:` in its day file (lib/life.ts).
 */
import { addDays } from "./dates";
import type { Day } from "./life";
import type { Page } from "./types";

export const ZIKR_REL = "wiki/Spirituality & Religion/Wiki/Islamic knowledge/Сунны/Зикры.md";

export interface Zikr { name: string; words: string; meaning: string; goal: number | undefined }

const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** The rows of the first table whose header starts with «Зикр». */
export function parseZikrs(body: string): Zikr[] {
  const out: Zikr[] = [];
  let head: string[] | undefined;
  for (const line of body.split("\n")) {
    if (!line.trim().startsWith("|")) { if (head && out.length) break; head = undefined; continue; }
    const c = cells(line);
    if (!head) { if (c[0].toLowerCase() === "зикр") head = c.map((x) => x.toLowerCase()); continue; }
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    const at = (k: string) => c[head!.findIndex((h) => h.startsWith(k))] ?? "";
    if (!c[0]) continue;
    const goal = Number(at("цель").replace(/\s/g, ""));
    out.push({ name: c[0], words: at("слова"), meaning: at("смысл"), goal: goal > 0 ? goal : undefined });
  }
  return out;
}

export function zikrPage(pages: Page[]): Page | undefined {
  return pages.find((p) => p.rel.normalize("NFC") === ZIKR_REL);
}

/** The day's count with `n` added; never below zero, a zero takes the name off. */
export function addZikr(d: Day, name: string, n: number): Day {
  const cur = d.zikr ?? {};
  const next = Math.max(0, (cur[name] ?? 0) + Math.round(n));
  const zikr = { ...cur };
  if (next) zikr[name] = next; else delete zikr[name];
  return { ...d, zikr };
}

/** The count of the seven days ending on `date`. */
export function zikrWeek(days: Map<string, Day>, name: string, date: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) n += days.get(addDays(date, -i))?.zikr?.[name] ?? 0;
  return n;
}
