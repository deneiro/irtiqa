/**
 * Levels and the wheel. XP per theme comes from `xpForDay` over life/days;
 * the level curves are carried over from IrtiQa's engine.ts unchanged:
 * theme (attribute) levels need 60 + (L-1)*20 XP each, the overall level
 * 100 + (L-1)*25. No HP, no gold: XP is a balance metric, not a reward.
 */
import type { Page } from "./types";
import type { Life } from "./life";
import { XP, xpForDay, type XpContext } from "./life";
import { personName, type LifeEvent } from "./events";
import { findPerson } from "./people";
import { THEMES } from "./themes";
import { addDays } from "./dates";

export interface LevelProgress { level: number; into: number; need: number }

export function themeLevelProgress(xp: number): LevelProgress {
  let level = 1, rem = xp, need = 60;
  while (rem >= need) { rem -= need; level++; need = 60 + (level - 1) * 20; }
  return { level, into: rem, need };
}

export function overallLevelProgress(xp: number): LevelProgress {
  let level = 1, rem = xp, need = 100;
  while (rem >= need) { rem -= need; level++; need = 100 + (level - 1) * 25; }
  return { level, into: rem, need };
}

export interface ThemeXp {
  theme: string;
  total: number;
  last30: number;
  prev30: number;
  /** Last 8 ISO weeks, oldest first. */
  weeks: { week: string; xp: number }[];
  level: LevelProgress;
}

export function readsOf(pages: Page[]): { date: string; theme: string | undefined }[] {
  return pages
    .filter((p) => p.zone === "resource" && p.fm.read)
    .map((p) => ({ date: String(p.fm.read instanceof Date ? p.fm.read.toISOString() : p.fm.read).slice(0, 10), theme: p.theme }));
}

/**
 * What events earn: each one `XP.event` for its theme, and every person seen that day
 * `XP.personSeen` for the theme of their page — a person once a day, a theme at most
 * `XP.peopleCap` a day. Meeting people is the only thing the themes of friends and
 * family can be marked with, so without this they never leave level one.
 */
export function meetsOf(events: LifeEvent[], pages: Page[]): { date: string; theme: string | undefined; xp: number }[] {
  const people = pages.filter((p) => p.zone === "person");
  const out: { date: string; theme: string | undefined; xp: number }[] = [];
  const seen = new Map<string, Map<string, Set<string>>>();
  for (const e of events) {
    out.push({ date: e.date, theme: e.theme, xp: XP.event });
    for (const raw of e.people) {
      const page = findPerson(people, personName(raw));
      if (!page?.theme) continue;
      const day = seen.get(e.date) ?? new Map<string, Set<string>>();
      seen.set(e.date, day);
      day.set(page.theme, (day.get(page.theme) ?? new Set<string>()).add(page.file));
    }
  }
  for (const [date, day] of seen) for (const [theme, who] of day) out.push({ date, theme, xp: Math.min(XP.peopleCap, who.size * XP.personSeen) });
  return out;
}

function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

/** XP per theme per day, one pass over the days. Reads count on their `read:` day. */
export function xpByDay(life: Life, pages: Page[]): Map<string, Map<string, number>> {
  const ctx: XpContext = { habits: life.habits, quests: life.quests, days: life.days, reads: readsOf(pages), meets: meetsOf(life.events, pages) };
  const out = new Map<string, Map<string, number>>();
  for (const [date, d] of life.days) out.set(date, xpForDay(d, ctx));
  // Reads on days without a day file still count.
  for (const r of ctx.reads ?? []) {
    if (!r.theme || life.days.has(r.date)) continue;
    const m = out.get(r.date) ?? new Map<string, number>();
    m.set(r.theme, (m.get(r.theme) ?? 0) + 10);
    out.set(r.date, m);
  }
  for (const x of ctx.meets ?? []) {
    if (!x.theme || life.days.has(x.date)) continue;
    const m = out.get(x.date) ?? new Map<string, number>();
    m.set(x.theme, (m.get(x.theme) ?? 0) + x.xp);
    out.set(x.date, m);
  }
  return out;
}

export function themeXps(life: Life, pages: Page[], today: string): ThemeXp[] {
  const byDay = xpByDay(life, pages);
  const from30 = addDays(today, -29);
  const from60 = addDays(today, -59);
  const weekKeys: string[] = [];
  for (let i = 7; i >= 0; i--) weekKeys.push(weekKey(addDays(today, -7 * i)));
  return THEMES.map((t) => {
    let total = 0, last30 = 0, prev30 = 0;
    const weeks = new Map(weekKeys.map((w) => [w, 0]));
    for (const [date, m] of byDay) {
      const xp = m.get(t.name) ?? 0;
      if (!xp) continue;
      total += xp;
      if (date >= from30) last30 += xp;
      else if (date >= from60) prev30 += xp;
      const w = weekKey(date);
      if (weeks.has(w)) weeks.set(w, (weeks.get(w) ?? 0) + xp);
    }
    return { theme: t.name, total, last30, prev30, weeks: weekKeys.map((w) => ({ week: w, xp: weeks.get(w) ?? 0 })), level: themeLevelProgress(total) };
  });
}
