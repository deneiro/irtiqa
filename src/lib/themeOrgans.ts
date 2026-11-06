/**
 * What the compact organs of a theme page read (spec v4 «Ключи `sections:`»):
 * «Где болит», sport over 60 days, the food of 14 days, and the organs of
 * people, money and memories. Pure, so the numbers are tested and the
 * components only draw.
 */
import { addDays } from "./dates";
import { dateRange, daysBetween, windowStats } from "./dashboard";
import { personName, type LifeEvent } from "./events";
import { BODY_PARTS, parseHealth, type Plan, type Visit } from "./health";
import { debtLeft, isLateMeal, liveBalance, type Life, type Meal } from "./life";
import { parseTalks } from "./talks";
import { eventTheme } from "./themeDays";
import type { Page, Vault } from "./types";
import { parseWishes } from "./wishes";
export interface PainRow { date: string; what: string; where: string; note: string; part: string | undefined; fresh: boolean }
export interface PainDot { part: string; date: string; what: string; fresh: boolean; count: number }
export interface PainMap { rows: PainRow[]; dots: PainDot[]; plan: Plan | undefined; visit: Visit | undefined }

/**
 * The symptoms of `life/health.md`, newest first. A row whose «Где» is one of `parts` puts a dot on that part
 * (the newest row of the part); a dot is bright while its row is at most 30 days old. `parts` is BODY_PARTS unless
 * the caller can draw fewer: a word it cannot draw is a row without a dot, like an unknown «Где». Also the nearest
 * plan and the last visit.
 */
export function painMap(health: string | null, today: string, parts: readonly string[] = BODY_PARTS): PainMap {
  if (!health) return { rows: [], dots: [], plan: undefined, visit: undefined };
  const card = parseHealth(health);
  const rows = card.symptoms.map((s) => {
    const where = s.where.trim().toLowerCase();
    const part = parts.includes(where) ? where : undefined;
    const fresh = /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.date <= today && daysBetween(s.date, today) <= 30;
    return { date: s.date, what: s.what, where: s.where.trim(), note: s.note, part, fresh };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const dots: PainDot[] = [];
  for (const r of rows) {
    if (!r.part) continue;
    const d = dots.find((x) => x.part === r.part);
    if (d) d.count++;
    else dots.push({ part: r.part, date: r.date, what: r.what, fresh: r.fresh, count: 1 });
  }
  const plan = [...card.plans].sort((a, b) => (a.by || "9999").localeCompare(b.by || "9999"))[0];
  const visit = [...card.visits].sort((a, b) => b.date.localeCompare(a.date))[0];
  return { rows, dots, plan, visit };
}

export interface Game { date: string; title: string; from: string; to: string; people: string[] }

/** The theme's sport events (tag «спорт») of the `n` days through today, newest first, and one flag a day. */
export function sportGames(life: Life, theme: string, today: string, n = 60): { from: string; days: { date: string; on: boolean }[]; games: Game[] } {
  const from = addDays(today, -(n - 1));
  const games = life.events
    .filter((e) => eventTheme(e) === theme && e.tags.includes("спорт") && e.date >= from && e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || b.from.localeCompare(a.from))
    .map((e) => ({ date: e.date, title: e.title, from: e.from, to: e.to, people: e.people.map(personName) }));
  const on = new Set(games.map((g) => g.date));
  return { from, days: dateRange(from, today).map((date) => ({ date, on: on.has(date) })), games };
}

export interface FoodGlance { late: number; days: number; clean: number; last: { date: string; meals: Meal[] } | undefined }

/**
 * The food of the 14 days through today: meals after the late hour, days with records, the days in a row without
 * a late meal (counted back from today; today without a record yet does not break it), and the last record.
 */
export function nutritionGlance(life: Life, today: string): FoodGlance {
  const days = dateRange(addDays(today, -13), today);
  let late = 0, withMeals = 0;
  for (const d of days) {
    const meals = life.days.get(d)?.meals ?? [];
    if (meals.length) withMeals++;
    late += meals.filter(isLateMeal).length;
  }
  let clean = 0;
  for (const d of [...days].reverse()) {
    const meals = life.days.get(d)?.meals ?? [];
    if (meals.some(isLateMeal)) break;
    if (meals.length) clean++;
    else if (d !== today) break;
  }
  const lastDay = [...life.days.values()].filter((d) => d.date <= today && d.meals.length).sort((a, b) => b.date.localeCompare(a.date))[0];
  return { late, days: withMeals, clean, last: lastDay ? { date: lastDay.date, meals: lastDay.meals } : undefined };
}

// ---- the organs of people, money and memories ----

export interface FinanceGlance { accounts: number | undefined; spent: number | undefined; earned: number | undefined; moneyDays: number; subs: number; openDebts: number }

/**
 * The read part of «Финансы»: on the accounts, this month's spending and income through today, subscriptions a month,
 * open debts. The month is `windowStats` from the 1st, the one the `доход` tile reads. No data is undefined, never 0:
 * `accounts` without any account (no `accounts.md`, or one with only the header), `spent` and `earned` when the month has none.
 */
export function financeGlance(life: Life, today: string): FinanceGlance {
  const accounts = life.accounts?.length ? life.accounts.reduce((s, a) => s + liveBalance(a, life.days), 0) : undefined;
  const { money } = windowStats(life, `${today.slice(0, 7)}-01`, today);
  return {
    accounts, spent: money.spent || undefined, earned: money.earned || undefined, moneyDays: money.days,
    subs: life.subscriptions.reduce((s, x) => s + x.amount, 0),
    openDebts: life.debts.filter((d) => !d.closed && debtLeft(d) > 0).length,
  };
}

/** «хочу · делаю · сделал» as numbers and the first three «делаю». */
export function wishesGlance(life: Life): { want: number; doing: number; done: number; doingTitles: string[] } {
  const ws = parseWishes(life.wishes ?? "");
  const of = (s: string) => ws.filter((w) => w.state === s);
  return { want: of("want").length, doing: of("doing").length, done: of("done").length, doingTitles: of("doing").slice(0, 3).map((w) => w.title) };
}

/** The last `n` talks with people of the theme, newest first. */
export function recentTalks(life: Life, vault: Vault, theme: string, n = 3): { date: string; who: string; about: string; page: Page | undefined }[] {
  return parseTalks(life.talks ?? "")
    .map((t) => ({ ...t, who: personName(t.who), page: vault.resolve(personName(t.who)) }))
    .filter((t) => t.page?.theme === theme)
    .slice(0, n);
}

/** The theme's events through today, newest first (an event without a theme is Memories & Fun's; one without a date is skipped). */
export function themeEvents(life: Life, theme: string, today: string): LifeEvent[] {
  return life.events.filter((e) => e.date && eventTheme(e) === theme && e.date <= today).sort((a, b) => b.date.localeCompare(a.date));
}
