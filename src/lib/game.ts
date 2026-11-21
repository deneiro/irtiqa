/**
 * The game of the day (2026-11-21): the day is a climb. Every mark is worth
 * points, the share of the points taken is the height reached, four camps stand
 * on the way and the last one is the summit. Everything here is pure and
 * computed from the day files: nothing of the game is stored.
 */
import { addDays } from "./dates";
import { habitDue, markOf, type Day, type Habit } from "./life";
import { PRAYER_ORDER } from "./dashboard";
import type { PrayerTimes } from "./maghrib";

export const POINTS = { prayer: 3, prayerLate: 2, habit: 2, task: 2, log: 1 };
/** Heights of the camps, in percent of the day; the last is the summit. */
export const CAMPS = [25, 50, 75, 100] as const;
export const CAMP_NAMES = ["Лагерь I", "Лагерь II", "Лагерь III", "Вершина"] as const;
/** A day keeps the fire when at least half of it is taken. */
export const FIRE_MIN = 50;

export type PartKey = "prayer" | "good" | "bad" | "task" | "log";
export interface ScorePart { key: PartKey; label: string; got: number; of: number }
export interface Score { parts: ScorePart[]; got: number; of: number; pct: number }

/** The four records of a day that count: mood, stress, a meal, a word about the day. */
export function logsOf(d: Day | undefined): { mood: boolean; stress: boolean; food: boolean; words: boolean } {
  return { mood: d?.mood !== undefined, stress: d?.stress !== undefined, food: !!d?.meals.length, words: !!d && (d.journal.trim() !== "" || d.done.length > 0) };
}

export function dayScore(habits: Habit[], d: Day | undefined, date: string): Score {
  const due = habits.filter((h) => habitDue(h, date));
  const mark = (h: Habit) => (d ? markOf(d, h.title) : undefined);
  const part = (key: PartKey, label: string, got: number, of: number): ScorePart => ({ key, label, got, of });
  const prayers = due.filter((h) => h.kind === "prayer");
  const good = due.filter((h) => h.kind === "good");
  const bad = due.filter((h) => h.kind === "bad");
  const tasks = d?.tasks ?? [];
  const logs = Object.values(logsOf(d));
  const parts = [
    part("prayer", "намаз", prayers.reduce((s, h) => s + (mark(h) === "done" ? POINTS.prayer : mark(h) === "late" ? POINTS.prayerLate : 0), 0), prayers.length * POINTS.prayer),
    part("good", "привычки", good.filter((h) => mark(h) === "done").length * POINTS.habit, good.length * POINTS.habit),
    part("bad", "держусь", bad.filter((h) => mark(h) === "done").length * POINTS.habit, bad.length * POINTS.habit),
    part("task", "задачи", tasks.filter((t) => t.done).length * POINTS.task, tasks.length * POINTS.task),
    part("log", "записи", logs.filter(Boolean).length * POINTS.log, logs.length * POINTS.log),
  ];
  const got = parts.reduce((s, p) => s + p.got, 0), of = parts.reduce((s, p) => s + p.of, 0);
  return { parts, got, of, pct: of ? Math.round((got / of) * 100) : 0 };
}

/** How many camps the height has passed: 0 at the foot, 4 on the summit. */
export function campsTaken(pct: number): number {
  return CAMPS.filter((c) => pct >= c).length;
}

/** Where he stands: the camp behind, the next one and the percent left to it. */
export function standing(pct: number): { at: string; next: string | undefined; left: number } {
  const n = campsTaken(pct);
  return { at: n ? CAMP_NAMES[n - 1] : "Подножие", next: CAMP_NAMES[n], left: n < CAMPS.length ? CAMPS[n] - pct : 0 };
}

/** Days in a row with at least half the day taken, through yesterday; today joins once it is taken, and never breaks the run. */
export function fire(habits: Habit[], days: Map<string, Day>, today: string): { days: number; today: boolean } {
  const took = (date: string) => dayScore(habits, days.get(date), date).pct >= FIRE_MIN;
  let n = 0;
  for (let cur = addDays(today, -1), i = 0; i < 3650 && took(cur); cur = addDays(cur, -1), i++) n++;
  const now = took(today);
  return { days: n + (now ? 1 : 0), today: now };
}

const RANKS: [number, string][] = [[50, "Хранитель вершины"], [30, "Проводник"], [15, "Восходитель"], [5, "Путник"], [1, "У подножия"]];
export function rankOf(level: number): string {
  return RANKS.find(([from]) => level >= from)![1];
}

export interface Medal { id: string; title: string; how: string; got: boolean; note: string }

/** Six medals counted over every day file; a medal not yet taken says how far it is. */
export function medals(habits: Habit[], days: Map<string, Day>, today: string): Medal[] {
  let camp = 0, summits = 0, five = 0, words = 0, tasks = 0, best = 0, run = 0, prev = "";
  for (const date of [...days.keys()].sort()) {
    if (date > today) break;
    const d = days.get(date)!;
    const s = dayScore(habits, d, date);
    if (s.pct >= CAMPS[0]) camp++;
    if (s.pct >= 100) summits++;
    const p = s.parts[0];
    if (p.of > 0 && p.got === p.of) five++;
    if (d.journal.trim()) words++;
    tasks += d.tasks.filter((t) => t.done).length;
    run = s.pct >= FIRE_MIN ? (prev && addDays(prev, 1) === date ? run + 1 : 1) : 0;
    if (s.pct >= FIRE_MIN) prev = date;
    best = Math.max(best, run);
  }
  const m = (id: string, title: string, how: string, n: number, need: number): Medal => ({ id, title, how, got: n >= need, note: n >= need ? (need === 1 && n > 1 ? `× ${n}` : "взята") : `${n} из ${need}` });
  return [
    m("camp", "Первый лагерь", "день на 25 %", camp, 1),
    m("five", "Все вовремя", "все намазы дня вовремя", five, 1),
    m("summit", "Вершина", "день на 100 %", summits, 1),
    m("week", "Неделя огня", "7 дней подряд от 50 %", best, 7),
    m("words", "Семь слов о дне", "7 дней с записью в журнале", words, 7),
    m("tasks", "Сто задач", "100 сделанных задач дня", tasks, 100),
  ];
}

// ---------- the check-in: one question at a time, in the order of the bot ----------

const PRAYER_TIME: Record<string, keyof PrayerTimes> = { "Фаджр": "fajr", "Зухр": "zuhr", "Жума": "zuhr", "Аср": "asr", "Магриб": "maghrib", "Иша": "isha", "Витр": "isha" };

/** Has the time of this prayer come? Any other habit is open all day. */
export function prayerOpen(title: string, now: Date, times: PrayerTimes): boolean {
  const k = PRAYER_TIME[title];
  return !k || now >= times[k];
}

/** The habit's own question from its `ask:` key, as the bot asks it, split into a leading emoji and the text. */
export function askOf(h: Habit): { icon: string | undefined; text: string | undefined } {
  const raw = h.extraFm?.map((l) => l.match(/^ask:\s*(.+)$/)?.[1]).find(Boolean)?.trim().replace(/^(["'])(.*)\1$/, "$2");
  if (!raw) return { icon: undefined, text: undefined };
  const m = raw.match(/^((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️)+)\s*(.*)$/u);
  return m ? { icon: m[1], text: m[2] } : { icon: undefined, text: raw };
}

export type Ask =
  | { id: string; kind: "prayer" | "good" | "bad"; habit: string; icon: string | undefined; text: string }
  | { id: "mood" | "stress"; kind: "scale"; text: string }
  | { id: "food" | "words"; kind: "text"; text: string; hint: string }
  | { id: string; kind: "task"; index: number; text: string };

const prayerRank = (t: string) => { const i = PRAYER_ORDER.indexOf(t); return i < 0 ? PRAYER_ORDER.length : i; };

/** What the day has not answered yet: prayers whose time has come, what he holds out against, the good habits, mood, stress, food, the open tasks, a word of thanks. */
export function asks(habits: Habit[], d: Day | undefined, date: string, open: (prayer: string) => boolean): Ask[] {
  const due = habits.filter((h) => habitDue(h, date) && !(d && markOf(d, h.title)));
  const out: Ask[] = [];
  const habit = (h: Habit): Ask => {
    const a = askOf(h);
    return { id: `h:${h.title}`, kind: h.kind, habit: h.title, icon: a.icon, text: a.text ?? (h.kind === "prayer" ? `${h.title} — прочитал?` : h.kind === "bad" ? `${h.title} — было сегодня?` : `${h.title} — сделал?`) };
  };
  out.push(...due.filter((h) => h.kind === "prayer" && open(h.title)).sort((a, b) => prayerRank(a.title) - prayerRank(b.title)).map(habit));
  out.push(...due.filter((h) => h.kind === "bad").map(habit), ...due.filter((h) => h.kind === "good").map(habit));
  const logs = logsOf(d);
  if (!logs.mood) out.push({ id: "mood", kind: "scale", text: "Настроение за день?" });
  if (!logs.stress) out.push({ id: "stress", kind: "scale", text: "Стресс за день?" });
  if (!logs.food) out.push({ id: "food", kind: "text", text: "Что ел сегодня?", hint: "одно блюдо — потом можно ещё" });
  (d?.tasks ?? []).forEach((t, index) => { if (!t.done) out.push({ id: `t:${index}:${t.text}`, kind: "task", index, text: t.text }); });
  if (!logs.words) out.push({ id: "words", kind: "text", text: "Чему благодарен за этот день?", hint: "одна строка" });
  return out;
}

/** A point `pct` percent of the way along a polyline, by length. */
export function along(points: [number, number][], pct: number): [number, number] {
  const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let left = (Math.max(0, Math.min(100, pct)) / 100) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]) { const t = seg[i] ? left / seg[i] : 0; return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t]; }
    left -= seg[i];
  }
  return points[points.length - 1];
}

// ---------- a stretch of days: the week and the month as a climb ----------

export interface DayHeight { date: string; pct: number; xp: number; future: boolean }

/** The height and the XP of every day of a stretch; a day after `today` is still ahead. */
export function heights(habits: Habit[], days: Map<string, Day>, dates: string[], today: string, xpOf: (date: string) => number): DayHeight[] {
  return dates.map((date) => (date > today ? { date, pct: 0, xp: 0, future: true } : { date, pct: dayScore(habits, days.get(date), date).pct, xp: xpOf(date), future: false }));
}

export interface ClimbSummary { xp: number; avg: number; taken: number; summits: number; passed: number; best: DayHeight | undefined }

/** A stretch in five numbers: XP, the average height of the days that have come, days from 50 %, summits, and the best day. */
export function climbSummary(hs: DayHeight[]): ClimbSummary {
  const past = hs.filter((h) => !h.future);
  const best = past.reduce<DayHeight | undefined>((b, h) => (h.pct > (b?.pct ?? 0) ? h : b), undefined);
  return {
    xp: past.reduce((s, h) => s + h.xp, 0),
    avg: past.length ? Math.round(past.reduce((s, h) => s + h.pct, 0) / past.length) : 0,
    taken: past.filter((h) => h.pct >= FIRE_MIN).length,
    summits: past.filter((h) => h.pct >= 100).length,
    passed: past.length,
    best,
  };
}

/** The days of a calendar month, and how many empty cells stand before the 1st in a week that starts on Monday. */
export function monthDates(ym: string): { dates: string[]; lead: number } {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const first = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  return { dates: Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`), lead: (first + 6) % 7 };
}
