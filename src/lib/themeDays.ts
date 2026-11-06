/**
 * Days of attention per theme (spec v4 «Внимание») — one rule for the numbers
 * `внимание` and `тема` and for the focus wheel. A day counts for a theme when
 * it holds a «да» or «поздно» on one of the theme's good habits or prayers
 * (known by title, archived ones too: the day was given then), a journal line,
 * a ticked step (`✓ date`) or a session of one of its activities, or one of its
 * events. A held-out bad habit is not attention. A day without a file adds
 * nothing by itself; the share is a theme's days over the sum of all themes'.
 */
import { moves } from "./dashboard";
import type { LifeEvent } from "./events";
import type { Life } from "./life";
import { THEMES } from "./themes";

/** An event without a theme belongs to Memories & Fun, as the events screen has it. */
export const eventTheme = (e: LifeEvent): string => e.theme ?? "Memories & Fun";

/** Theme → the dates in [from, to] it got attention. `from` may be "" for all of history. */
export function themeDays(life: Life, from: string, to: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>(THEMES.map((t) => [t.name, new Set<string>()]));
  const add = (theme: string | undefined, date: string) => {
    // `date &&`: "" is not a day, and with from = "" it would pass the window
    if (theme && date && date >= from && date <= to) out.get(theme)?.add(date);
  };
  const byTitle = new Map(life.habits.map((h) => [h.title, h]));
  for (const [date, d] of life.days) {
    if (date < from || date > to) continue;
    for (const t of [...d.habitsDone, ...d.habitsLate]) {
      const h = byTitle.get(t);
      if (h && h.kind !== "bad") add(h.theme, date);
    }
  }
  for (const q of life.quests) for (const date of moves(q, life.days, to)) add(q.theme, date);
  for (const e of life.events) add(eventTheme(e), e.date);
  return out;
}

export interface Share { theme: string; days: number; share: number }

/** Whole percents that add up to 100: the largest remainders get the leftover points, a theme with no days gets none. */
function largestRemainder(xs: number[]): number[] {
  const total = xs.reduce((a, b) => a + b, 0);
  if (!total) return xs.map(() => 0);
  const raw = xs.map((x) => (x * 100) / total);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ frac: r - Math.floor(r), i })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    if (xs[i] > 0) { out[i]++; left--; }
  }
  return out;
}

/** Each theme's days in [from, to] and its share of all themes' days, in THEMES order. */
export function attentionShares(life: Life, from: string, to: string): Share[] {
  const days = themeDays(life, from, to);
  const counts = THEMES.map((t) => days.get(t.name)?.size ?? 0);
  const shares = largestRemainder(counts);
  return THEMES.map((t, i) => ({ theme: t.name, days: counts[i], share: shares[i] }));
}

/** How many day files there are in [from, to] — the wheel says it under the circle. */
export function dayFiles(life: Life, from: string, to: string): number {
  let n = 0;
  for (const date of life.days.keys()) if (date >= from && date <= to) n++;
  return n;
}
