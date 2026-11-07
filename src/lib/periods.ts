/**
 * The day in five parts by the prayers (Eldar, 2026-11-08): a task of the day
 * belongs to one of them. Not five equal spans of time — five purposes.
 *
 *   I   фаджр → зухр   work and money
 *   II  зухр → аср     study: what he has to learn
 *   III аср → магриб   for himself: what he wants, not what he must
 *   IV  магриб → иша   health: training
 *   V   иша → витр     the rest; usually empty (a meeting with friends)
 *
 * In the day file a task carries its part as ` · @зухр` — before the carry
 * suffix ` · с YYYY-MM-DD`, so a task that moves on keeps its part.
 */
import { prayerTimes, type PrayerTimes } from "./maghrib";

export type PeriodKey = "фаджр" | "зухр" | "аср" | "магриб" | "иша";

export interface Period { key: PeriodKey; n: number; roman: string; from: string; to: string; what: string }

export const PERIODS: Period[] = [
  { key: "фаджр", n: 1, roman: "I", from: "Фаджр", to: "Зухр", what: "работа и деньги" },
  { key: "зухр", n: 2, roman: "II", from: "Зухр", to: "Аср", what: "учёба" },
  { key: "аср", n: 3, roman: "III", from: "Аср", to: "Магриб", what: "для себя" },
  { key: "магриб", n: 4, roman: "IV", from: "Магриб", to: "Иша", what: "здоровье" },
  { key: "иша", n: 5, roman: "V", from: "Иша", to: "Витр", what: "остальное" },
];

const TOKEN = /\s·\s@(фаджр|зухр|аср|магриб|иша)(?=\s·\s|\s*$)/;
const CARRY = /\s·\sс\s\d{4}-(?:\d{2}-\d{2}|W\d{2})\s*$/;

export function periodOf(text: string): PeriodKey | undefined {
  return text.match(TOKEN)?.[1] as PeriodKey | undefined;
}

export function stripPeriod(text: string): string {
  return text.replace(TOKEN, "");
}

/** The task with its part set (or replaced), before the carry suffix when there is one. */
export function withPeriod(text: string, key: PeriodKey): string {
  const bare = stripPeriod(text);
  const m = bare.match(CARRY);
  return m ? `${bare.slice(0, m.index)} · @${key}${m[0]}` : `${bare.trimEnd()} · @${key}`;
}

/** «зухр», «2», «II», «@зухр» → the key. */
export function parsePeriod(s: string): PeriodKey | undefined {
  const t = s.trim().toLowerCase().replace(/^@/, "");
  return PERIODS.find((p) => p.key === t || String(p.n) === t || p.roman.toLowerCase() === t)?.key;
}

/** The part a moment falls in; before fajr it is still the night of V. */
export function periodAt(now: Date, times: PrayerTimes): PeriodKey {
  if (now < times.fajr) return "иша";
  if (now < times.zuhr) return "фаджр";
  if (now < times.asr) return "зухр";
  if (now < times.maghrib) return "аср";
  if (now < times.isha) return "магриб";
  return "иша";
}

export function todayTimes(date: string): PrayerTimes {
  return prayerTimes(date);
}

/** Tasks by part, in the order of the day; tasks with no part come last under `undefined`. */
export function byPeriod<T extends { text: string }>(tasks: T[]): { key: PeriodKey | undefined; tasks: T[] }[] {
  const out: { key: PeriodKey | undefined; tasks: T[] }[] = PERIODS.map((p) => ({ key: p.key, tasks: tasks.filter((t) => periodOf(t.text) === p.key) }));
  out.push({ key: undefined, tasks: tasks.filter((t) => !periodOf(t.text)) });
  return out;
}
