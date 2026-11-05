/**
 * «Главный» as a dashboard (spec v3, 2026-11-05): the numbers, signals and
 * views of its three tabs. Pure — no React, no writes — so the bot can call it
 * too (`--dashboard`). Nothing here names a habit, a person or a sum: the
 * repository is public, everything comes from the vault files.
 */
import { addDays, weekdayIndex } from "./dates";
import { habitDue, isLateMeal, markOf, type Day, type Life } from "./life";
import { heldOut } from "./wins";

export type Tab = "day" | "week" | "month";

/** The 1st opens Месяц (even on a Sunday), a Sunday opens Неделя, any other day Сегодня. */
export function defaultTab(today: string): Tab {
  if (today.endsWith("-01")) return "month";
  return weekdayIndex(today) === 0 ? "week" : "day";
}

const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
export const daysBetween = (from: string, to: string) => Math.round(dayNum(to) - dayNum(from));

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday to Sunday around a date. */
export function weekOf(date: string): { from: string; to: string } {
  const from = addDays(date, -((weekdayIndex(date) + 6) % 7));
  return { from, to: addDays(from, 6) };
}

export interface Count { due: number; done: number; late: number; failed: number; unmarked: number }

export interface Stats {
  from: string;
  to: string;
  length: number;
  /** One flag per day, oldest first: a day file with at least one habit mark. */
  coverage: boolean[];
  recorded: number;
  prayer: Count;
  falls: number;
  held: number;
  fallsBy: [string, number][];
  good: { done: number; total: number; missedBy: [string, number][] };
  mood: { avg: number | undefined; n: number };
  stress: { avg: number | undefined; n: number };
  money: { spent: number; earned: number; days: number };
  tasks: { done: number; total: number; days: number };
  lateMeals: number;
  mealDays: number;
}

const marked = (d: Day) => d.habitsDone.length + d.habitsLate.length + d.habitsFailed.length > 0;
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : undefined);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const ranked = (m: Map<string, number>): [string, number][] => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));

/**
 * The numbers of a window, as the spec reads them: a habit is known by the
 * `title` of its file, only active habits count, a day with records is a day
 * file with a mark, and nothing is filled in — no mark is «без отметки».
 */
export function windowStats(life: Life, from: string, to: string): Stats {
  const active = life.habits.filter((h) => h.status === "active");
  const range = dateRange(from, to);
  const prayer: Count = { due: 0, done: 0, late: 0, failed: 0, unmarked: 0 };
  const fallsBy = new Map<string, number>(), missedBy = new Map<string, number>();
  const mood: number[] = [], stress: number[] = [], coverage: boolean[] = [];
  const money = { spent: 0, earned: 0, days: 0 }, tasks = { done: 0, total: 0, days: 0 };
  let falls = 0, held = 0, goodDone = 0, lateMeals = 0, mealDays = 0;
  for (const date of range) {
    const d = life.days.get(date);
    coverage.push(!!d && marked(d));
    if (!d) continue;
    if (marked(d)) {
      for (const h of active) {
        if (!habitDue(h, date)) continue;
        const m = markOf(d, h.title);
        if (m === "skipped") continue;
        if (h.kind === "prayer") {
          prayer.due++;
          if (m) prayer[m]++;
          else prayer.unmarked++;
        } else if (h.kind === "bad") {
          if (m === "failed") { falls++; bump(fallsBy, h.title); } else if (m) held++;
        } else if (m === "failed") bump(missedBy, h.title);
        else if (m) goodDone++;
      }
    }
    if (d.mood !== undefined) mood.push(d.mood);
    if (d.stress !== undefined) stress.push(d.stress);
    if (d.txs.length) {
      money.days++;
      for (const t of d.txs) if (t.amount < 0) money.spent -= t.amount; else money.earned += t.amount;
    }
    if (d.tasks.length) { tasks.days++; tasks.total += d.tasks.length; tasks.done += d.tasks.filter((t) => t.done).length; }
    if (d.meals.length) { mealDays++; lateMeals += d.meals.filter(isLateMeal).length; }
  }
  const missed = ranked(missedBy);
  return {
    from, to, length: range.length, coverage, recorded: coverage.filter(Boolean).length,
    prayer, falls, held, fallsBy: ranked(fallsBy),
    good: { done: goodDone, total: goodDone + missed.reduce((a, [, n]) => a + n, 0), missedBy: missed },
    mood: { avg: avg(mood), n: mood.length }, stress: { avg: avg(stress), n: stress.length },
    money, tasks, lateMeals, mealDays,
  };
}

/**
 * Held-out run per active bad habit, longest first (`heldOut`). With `clean_since`: every day since the last failed day
 * (or since `clean_since`) counts as held. Without it: consecutive done/late marks on due days.
 */
export function streaks(life: Life, upTo: string): { habit: string; days: number }[] {
  return life.habits.filter((h) => h.status === "active" && h.kind === "bad")
    .map((h) => ({ habit: h.title, days: heldOut(h, life.days, upTo) }))
    .sort((a, b) => b.days - a.days || a.habit.localeCompare(b.habit, "ru"));
}

export interface Weight { date: string; value: number }

export function weightSeries(life: Life, upTo: string): Weight[] {
  return [...life.days.values()].filter((d) => d.weight !== undefined && d.date <= upTo)
    .map((d) => ({ date: d.date, value: d.weight as number })).sort((a, b) => a.date.localeCompare(b.date));
}

/** The latest weight and the last one taken at least 7 days before it. */
export function weightNow(life: Life, upTo: string): { last: Weight; before: Weight | undefined } | undefined {
  const ws = weightSeries(life, upTo);
  const last = ws[ws.length - 1];
  return last ? { last, before: ws.filter((w) => w.date <= addDays(last.date, -7)).pop() } : undefined;
}

/**
 * The 21-day trend carried to the deadline: does it reach the target? The direction is read from the first weight of
 * the window, so a target the last weight has already reached or passed is on track. Fewer than two weights — no data.
 */
export function weightPace(life: Life, today: string, target: number, by: string): "behind" | "ontrack" | "nodata" {
  const pts = weightSeries(life, today).filter((w) => w.date >= addDays(today, -21));
  if (pts.length < 2) return "nodata";
  const xs = pts.map((p) => dayNum(p.date)), ys = pts.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0;
  const last = pts[pts.length - 1];
  const down = target < pts[0].value;
  if (down ? last.value <= target : last.value >= target) return "ontrack";
  const projected = last.value + slope * (dayNum(by) - dayNum(last.date));
  return (down ? projected <= target : projected >= target) ? "ontrack" : "behind";
}
