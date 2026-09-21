/**
 * Календарь: план по часам. Two tables in `life/calendar.md` — what repeats
 * every week (lessons, like a university timetable) and what is set for one
 * date. The fact side is not stored here: it is the timer's sessions in the
 * day files, which carry their start time as `quest: minutes @HH:MM`.
 *
 * Future plans live in this file, not in `life/days/`, so auto-close never
 * meets a day that has not happened yet.
 */
import { WEEKDAYS_RU, addDays, weekdayIndex } from "./dates";
import { emptyDay, normalizeTime, type Day, type Quest } from "./life";
import { sessionCalendarDate } from "./maghrib";
import type { LifeEvent } from "./events";

export { CALENDAR_FILE as CALENDAR_REL } from "./life";

export interface PlanBlock {
  /** Weekday indexes 0 = вс … 6 = сб for a weekly block; empty for a one-off. */
  days: number[];
  /** YYYY-MM-DD for a one-off; empty for a weekly block. */
  date: string;
  from: string; // HH:MM
  to: string; // HH:MM
  what: string;
  quest: string; // quest title, may be empty
  theme: string; // theme name, may be empty
}

export const isWeekly = (b: PlanBlock) => b.days.length > 0;

/** One thing drawn on the grid: a planned block or a timer session. */
export interface CalItem {
  kind: "plan" | "fact" | "event";
  date: string;
  from: number; // minutes since 00:00
  to: number;
  title: string;
  quest: string;
  theme: string | undefined;
  /** The plan row it came from, for editing. */
  block?: PlanBlock;
  /** Timer minutes of a fact; the drawn height has a floor so short ones stay clickable. */
  minutes?: number;
  /** The event page, for kind "event". */
  eventRel?: string;
}

export { normalizeTime };

/** An end time: like normalizeTime, but midnight is «24:00», the end of the day. */
export function normEnd(raw: string): string {
  const t = raw.trim();
  if (t === "24:00" || t === "24") return "24:00";
  const n = normalizeTime(t);
  return n === "00:00" ? "24:00" : n;
}

export function toMin(t: string): number {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

export function fromMin(n: number): string {
  const c = Math.max(0, Math.min(24 * 60, Math.round(n)));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}

// ---------- weekdays ----------

const ALL = [1, 2, 3, 4, 5, 6, 0];

/** "вт, чт", "пн–пт", "каждый день" → weekday indexes, Monday first. */
export function parseDays(raw: string): number[] {
  const s = raw.toLowerCase().trim();
  if (!s) return [];
  if (/кажд|ежеднев|daily/.test(s)) return ALL;
  const idx = (w: string) => WEEKDAYS_RU.indexOf(w.slice(0, 2) as (typeof WEEKDAYS_RU)[number]);
  const out = new Set<number>();
  for (const part of s.split(/[,\s]+/).filter(Boolean)) {
    const r = part.split(/[–—-]/);
    if (r.length === 2) {
      const a = ALL.indexOf(idx(r[0]));
      const b = ALL.indexOf(idx(r[1]));
      if (a >= 0 && b >= a) for (let i = a; i <= b; i++) out.add(ALL[i]);
    } else if (idx(part) >= 0) out.add(idx(part));
  }
  return ALL.filter((d) => out.has(d));
}

export function formatDays(days: number[]): string {
  if (days.length === 7) return "каждый день";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "пн–пт";
  return ALL.filter((d) => days.includes(d)).map((d) => WEEKDAYS_RU[d]).join(", ");
}

// ---------- file ----------

const unlink = (s: string) => s.replace(/^\[\[([^\]|]+)(\|[^\]]*)?\]\]$/, "$1").trim();

export function parseCalendar(content: string): PlanBlock[] {
  const out: PlanBlock[] = [];
  let cur: "weekly" | "once" | null = null;
  for (const line of content.split(/\r?\n/)) {
    if (/^##\s*Каждую неделю/i.test(line)) { cur = "weekly"; continue; }
    if (/^##\s*Разово/i.test(line)) { cur = "once"; continue; }
    if (/^#/.test(line)) { cur = null; continue; }
    const t = line.trim();
    if (!cur || !t.startsWith("|")) continue;
    const c = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((x) => x.trim());
    if (c.length < 4 || c.every((x) => /^:?-*:?$/.test(x)) || c[0] === "Дни" || c[0] === "Дата") continue;
    const from = normalizeTime(c[1]);
    const to = normEnd(c[2]);
    if (!from || !to || !c[3]) continue;
    const base = { from, to, what: c[3], quest: unlink(c[4] ?? ""), theme: c[5] ?? "" };
    if (cur === "weekly") {
      const days = parseDays(c[0]);
      if (days.length) out.push({ ...base, days, date: "" });
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(c[0])) {
      out.push({ ...base, days: [], date: c[0] });
    }
  }
  return out;
}

const HEAD = [
  "---",
  "type: ledger",
  "updated: {date}",
  "---",
  "# Календарь",
  "",
  "План по часам. «Каждую неделю» повторяется по дням недели, как расписание",
  "в университете; «Разово» стоит на одну дату. Факт сюда не пишется: это",
  "сессии таймера в `life/days/`, с временем начала (`квест: минуты @ЧЧ:ММ`).",
  "Пишет приложение, экран «Календарь».",
];

function row(first: string, b: PlanBlock): string {
  return `| ${first} | ${b.from} | ${b.to} | ${b.what} | ${b.quest ? `[[${b.quest}]]` : ""} | ${b.theme} |`;
}

export function serializeCalendar(blocks: PlanBlock[], today: string): string {
  const byTime = (a: PlanBlock, b: PlanBlock) => a.from.localeCompare(b.from) || a.what.localeCompare(b.what, "ru");
  const weekly = blocks.filter(isWeekly).sort((a, b) => ALL.indexOf(a.days[0]) - ALL.indexOf(b.days[0]) || byTime(a, b));
  // A one-off older than a month is history; the grid never goes back that far.
  const cutoff = addDays(today, -31);
  const once = blocks.filter((b) => !isWeekly(b) && b.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const lines = HEAD.map((l) => l.replace("{date}", today));
  lines.push("", "## Каждую неделю", "", "| Дни | С | До | Что | Квест | Тема |", "|---|---|---|---|---|---|");
  for (const b of weekly) lines.push(row(formatDays(b.days), b));
  lines.push("", "## Разово", "", "| Дата | С | До | Что | Квест | Тема |", "|---|---|---|---|---|---|");
  for (const b of once) lines.push(row(b.date, b));
  return lines.join("\n") + "\n";
}

// ---------- the grid ----------

export function blockOn(b: PlanBlock, date: string): boolean {
  return isWeekly(b) ? b.days.includes(weekdayIndex(date)) : b.date === date;
}

/** Monday of the week that holds `date`. */
export function weekStart(date: string): string {
  return addDays(date, -((weekdayIndex(date) + 6) % 7));
}

/**
 * The timed sessions that happened on a calendar date. Since the day runs
 * maghrib to maghrib, an evening session sits in the next day file.
 */
export function factDay(date: string, days: Map<string, Day>): Day | undefined {
  const own = days.get(date);
  const next = days.get(addDays(date, 1));
  const sessions = [
    ...(own?.sessions ?? []).filter((s) => !s.at || sessionCalendarDate(date, s.at) === date),
    ...(next?.sessions ?? []).filter((s) => s.at && sessionCalendarDate(next!.date, s.at) === date),
  ];
  if (!own && !sessions.length) return undefined;
  return { ...(own ?? emptyDay(date)), sessions };
}

export function itemsOn(date: string, blocks: PlanBlock[], day: Day | undefined, quests: Quest[], events: LifeEvent[] = []): CalItem[] {
  const themeOf = (quest: string, fallback: string) => quests.find((q) => q.title === quest)?.theme ?? (fallback || undefined);
  const out: CalItem[] = [];
  for (const b of blocks) {
    if (!blockOn(b, date)) continue;
    const from = toMin(b.from);
    let to = toMin(b.to);
    if (to <= from) to = 24 * 60; // «23:00–01:00» is drawn to midnight
    out.push({ kind: "plan", date, from, to, title: b.what, quest: b.quest, theme: themeOf(b.quest, b.theme), block: b });
  }
  for (const s of day?.sessions ?? []) {
    if (!s.at) continue;
    const from = toMin(s.at);
    out.push({ kind: "fact", date, from, to: Math.min(24 * 60, from + Math.max(s.minutes, 10)), title: s.quest, quest: s.quest, theme: themeOf(s.quest, ""), minutes: s.minutes });
  }
  for (const e of events) {
    if (e.date !== date || !e.from) continue;
    const from = toMin(e.from);
    let to = e.to ? toMin(e.to) : from + 60;
    if (to <= from) to = 24 * 60;
    out.push({ kind: "event", date, from, to, title: e.title, quest: "", theme: e.theme, eventRel: e.rel });
  }
  return out.sort((a, b) => a.from - b.from || b.to - a.to);
}

/** Side-by-side lanes for overlapping items, like any week calendar. */
export function layLanes(items: CalItem[]): { item: CalItem; lane: number; lanes: number }[] {
  const out: { item: CalItem; lane: number; lanes: number }[] = [];
  let group: { item: CalItem; lane: number; lanes: number }[] = [];
  let groupEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...group.map((g) => g.lane + 1));
    for (const g of group) g.lanes = n;
    out.push(...group);
    group = [];
  };
  for (const item of items) {
    if (item.from >= groupEnd && group.length) flush();
    const ends: number[] = [];
    for (const g of group) ends[g.lane] = Math.max(ends[g.lane] ?? -1, g.item.to);
    let lane = 0;
    while (ends[lane] !== undefined && ends[lane] > item.from) lane++;
    group.push({ item, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, item.to);
  }
  if (group.length) flush();
  return out;
}

export function sameBlock(a: PlanBlock, b: PlanBlock): boolean {
  return a.date === b.date && a.from === b.from && a.to === b.to && a.what === b.what && a.quest === b.quest && a.theme === b.theme && a.days.join() === b.days.join();
}
