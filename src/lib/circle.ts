/**
 * The circle: who is close, who has gone quiet, and who costs Eldar something.
 *
 * Both halves read data he already keeps. Closeness is his own 1–10 scale on
 * the person page; the trigger tags («trigger-smoking», «триггер-курение»)
 * were written from his own words. The app only adds dates — when he last
 * wrote, when he last met — and counts what broke on the days they met.
 */
import type { Page } from "./types";
import { markOf, type Habit, type Life } from "./life";
import type { Cell } from "./dashboard";
import { addDays } from "./dates";
import { personName, type LifeEvent } from "./events";
import { categoryOf, closenessOf, daysSinceContact, isGone } from "./people";

/** How often a tie at that closeness should be touched, in days. */
export function cadenceFor(closeness: number | undefined): number | undefined {
  if (closeness === undefined) return undefined;
  if (closeness >= 10) return 7;
  if (closeness >= 9) return 14;
  if (closeness >= 8) return 21;
  if (closeness >= 7) return 30;
  if (closeness >= 5) return 60;
  if (closeness >= 3) return 120;
  return 180;
}

/**
 * How often he actually sees a person, in his words, on the page as `rhythm:` (2026-11-22: an uncle he sees once a
 * year or two kept coming up as «gone cold» because closeness 7 means a month). It overrides the closeness rhythm;
 * «не считать» takes the tie out of every reminder. Empty means the closeness rhythm.
 */
export const RHYTHMS: { value: string; days: number | null }[] = [
  { value: "раз в неделю", days: 7 },
  { value: "раз в месяц", days: 30 },
  { value: "раз в 3 месяца", days: 90 },
  { value: "раз в полгода", days: 180 },
  { value: "раз в год", days: 365 },
  { value: "раз в 2 года", days: 730 },
  { value: "не считать", days: null },
];

/** `rhythm:` in days; null for «не считать»; undefined when not set or not understood. Numbers are days. */
export function rhythmDays(v: unknown): number | null | undefined {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().toLowerCase().replace(/ё/g, "е") : "";
  if (!s) return undefined;
  const known = RHYTHMS.find((r) => r.value === s);
  if (known) return known.days;
  if (/^не (считать|напоминать)$/.test(s)) return null;
  if (/^\d+$/.test(s)) return Number(s) || undefined;
  const m = s.match(/^раз в (\d+ )?(дн|день|дня|недел|месяц|месяца|месяцев|полгода|год|года|лет)/);
  if (!m) return undefined;
  const n = m[1] ? Number(m[1]) : 1;
  const u = m[2];
  const per = u.startsWith("д") ? 1 : u.startsWith("н") ? 7 : u.startsWith("м") ? 30 : u === "полгода" ? 182 : 365;
  return n * per;
}

/** The rhythm of a tie: his own `rhythm:` when he set one, else the one his closeness gives. */
export function cadenceOf(page: Page): { cadence: number | undefined; own: boolean } {
  const r = rhythmDays(page.fm.rhythm);
  if (r === null) return { cadence: undefined, own: true };
  if (r !== undefined) return { cadence: r, own: true };
  return { cadence: cadenceFor(closenessOf(page)), own: false };
}

export const BANDS: { title: string; min: number; max: number }[] = [
  { title: "Ядро", min: 9, max: 10 },
  { title: "Близкие", min: 7, max: 8 },
  { title: "Круг", min: 4, max: 6 },
  { title: "Дальние", min: 1, max: 3 },
];

/** What a person pulls Eldar into. Keys are the habit the trigger costs. */
export const TRIGGERS: { key: string; label: string; habit: string; tags: RegExp }[] = [
  { key: "smoking", label: "курение", habit: "Сигареты", tags: /^(trigger-smoking|триггер-курение)$/i },
  { key: "drinking", label: "алкоголь", habit: "Алкоголь", tags: /^(trigger-drinking|триггер-алкоголь|триггер-выпивка)$/i },
  { key: "gambling", label: "ставки", habit: "", tags: /^(trigger-gambling|триггер-ставки|триггер-азарт)$/i },
];

/** Only an explicit tag counts: «лучший друг» and «тянет вверх» are different things. */
const SUPPORT = /^(support|опора)$/i;

export function triggersOf(page: Page): string[] {
  return TRIGGERS.filter((t) => page.tags.some((tag) => t.tags.test(tag))).map((t) => t.key);
}
export function isSupport(page: Page): boolean {
  return page.tags.some((t) => SUPPORT.test(t));
}

export interface CircleItem {
  page: Page;
  name: string;
  closeness: number | undefined;
  category: string | undefined;
  cadence: number | undefined;
  /** The rhythm is his own `rhythm:`, not the closeness one: a tie with no record yet is then not «cold». */
  own: boolean;
  lastContact: string | undefined;
  sinceContact: number | undefined;
  lastMeet: string | undefined;
  sinceMeet: number | undefined;
  /** Days past the cadence; 0 or less means still in time. */
  overdue: number | undefined;
  triggers: string[];
  support: boolean;
}

export function buildCircle(all: Page[], events: LifeEvent[], today: string): CircleItem[] {
  const people = all.filter((p) => !isGone(p)); // the dead are in the family tree only
  const met = new Map<string, string>(); // lowercased name -> latest date
  for (const e of events) {
    for (const p of e.people) {
      const k = personName(p).toLowerCase();
      if (!met.has(k) || (met.get(k) ?? "") < e.date) met.set(k, e.date);
    }
  }
  // An alias that is another person's own name («Али» on Мухаммед's page, while Али has a page
  // of his own) would credit one man with the other's meetings: such an alias is not used.
  const own = new Set(people.flatMap((p) => [p.title, p.file].map((x) => x.toLowerCase())));
  const items = people.map((page) => {
    const closeness = closenessOf(page);
    const { cadence, own: mine } = cadenceOf(page);
    const last = typeof page.fm.last_contact === "string" ? page.fm.last_contact : undefined;
    const since = daysSinceContact(last, today);
    const self = [page.title, page.file].map((s) => s.toLowerCase());
    const names = [...self, ...page.aliases.map((s) => s.toLowerCase()).filter((a) => self.includes(a) || !own.has(a))];
    let lastMeet: string | undefined;
    for (const n of names) { const d = met.get(n); if (d && (!lastMeet || d > lastMeet)) lastMeet = d; }
    const touch = [last, lastMeet].filter(Boolean).sort().pop();
    const sinceTouch = daysSinceContact(touch, today);
    return {
      page, name: page.title, closeness, category: categoryOf(page), cadence, own: mine,
      lastContact: last, sinceContact: since,
      lastMeet, sinceMeet: daysSinceContact(lastMeet, today),
      overdue: cadence !== undefined && sinceTouch !== undefined ? sinceTouch - cadence : undefined,
      triggers: triggersOf(page), support: isSupport(page),
    };
  });
  // No contact recorded at all is not "fine": it sorts above everyone still in time.
  const key = (i: CircleItem) => i.overdue ?? (i.cadence !== undefined && !i.own && !i.lastContact && !i.lastMeet ? 0 : -1e9);
  return items.sort((a, b) =>
    key(b) - key(a) ||
    (b.closeness ?? 0) - (a.closeness ?? 0) ||
    a.name.localeCompare(b.name, "ru"));
}

/**
 * The later of `last_contact` and the last meeting in an event; undefined when neither exists.
 * Not the «latest touch» of themeNumbers.ts, which counts a talk too.
 */
export function lastContactOrMeeting(i: CircleItem): string | undefined {
  return [i.lastContact, i.lastMeet].filter((d): d is string => !!d).sort().pop();
}

/**
 * Whoever was in contact or met last comes first (the order «С кем?» offers in
 * the bot); people with no contact and no meeting follow, the closer ones first.
 * The overdue-first order of `buildCircle` answers another question: whom to write to.
 */
export function byLastContactOrMeeting(items: CircleItem[]): CircleItem[] {
  return [...items].sort((a, b) =>
    (lastContactOrMeeting(b) ?? "").localeCompare(lastContactOrMeeting(a) ?? "") ||
    (b.closeness ?? 0) - (a.closeness ?? 0) ||
    a.name.localeCompare(b.name, "ru"));
}

export interface TriggerStat {
  key: string;
  label: string;
  habit: string;
  people: CircleItem[];
  /** Days in the window when one of those people was met. */
  metDays: number;
  /** Of those, the days that have a day file: the only ones counted. */
  metWithFile: number;
  /** Of those, days the habit broke. */
  brokeOnMet: number;
  /** Days the habit broke without any of them around. */
  brokeApart: number;
  otherDays: number;
}

/**
 * What actually happens on the days he sees them, over the window ending yesterday (the evening survey of
 * today has not come yet). A meeting without a day file is in neither count. Empty until events exist.
 */
export function triggerStats(
  items: CircleItem[], life: Life, today: string, window = 90, triggers = TRIGGERS,
): TriggerStat[] {
  const { from, to } = meetWindow(today, window);
  return triggers.map((t) => {
    const people = items.filter((i) => i.triggers.includes(t.key));
    const names = new Set(people.flatMap((i) => [i.name, i.page.file, ...i.page.aliases].map((s) => s.toLowerCase())));
    const met = new Set(life.events.filter((e) => e.date >= from && e.date <= to && e.people.some((p) => names.has(personName(p).toLowerCase()))).map((e) => e.date));
    const habit = t.habit ? life.habits.find((h) => h.title.toLowerCase() === t.habit.toLowerCase()) : undefined;
    const c = habit ? countOnMeetings(life, habit, met, from, to) : undefined;
    return {
      key: t.key, label: t.label, habit: habit?.title ?? "", people, metDays: met.size,
      metWithFile: c?.counted ?? 0, brokeOnMet: c?.hits ?? 0, brokeApart: c?.apartHits ?? 0, otherDays: c?.apart ?? 0,
    };
  }).filter((s) => s.people.length > 0);
}

/** The days the meetings are counted over: `window` days ending yesterday. */
export function meetWindow(today: string, window = 90): { from: string; to: string } {
  const to = addDays(today, -1);
  return { from: addDays(to, -(window - 1)), to };
}

/** The lowercased names a person goes by in events, without an alias that is another person's own name (the rule of `buildCircle`). */
export function ownNames(page: Page, people: Page[]): string[] {
  const self = [page.title, page.file].map((s) => s.toLowerCase());
  const own = new Set(people.flatMap((p) => [p.title, p.file].map((x) => x.toLowerCase())));
  return [...new Set([...self, ...page.aliases.map((s) => s.toLowerCase()).filter((a) => self.includes(a) || !own.has(a))])];
}

/** The events a person was at, newest first as `life.events` keeps them. */
export function eventsWith(page: Page, people: Page[], events: LifeEvent[]): LifeEvent[] {
  const names = new Set(ownNames(page, people));
  return events.filter((e) => e.people.some((p) => names.has(personName(p).toLowerCase())));
}

/**
 * A day as the count of meetings sees it, in the words of the beads of «Главный»: no day file, no mark, or
 * the mark. Only the file and the mark decide (spec v5): the habit's schedule and creation do not enter.
 */
function dayMark(life: Life, h: Habit, date: string): Cell {
  const d = life.days.get(date);
  if (!d) return "nofile";
  const m = markOf(d, h.title);
  if (!m) return "unmarked";
  if (m === "skipped") return "skip";
  if (h.kind === "bad") return m === "failed" ? "fall" : "held";
  return m;
}

/** One habit on the days of the meetings, against the other days with a day file. */
export interface HabitCount {
  habit: Habit;
  /** Each meeting day of the window, oldest first, with the habit's bead that day. */
  beads: { date: string; cell: Cell }[];
  /** Meetings with a day file (a «пропуск» mark aside): the only ones counted. */
  counted: number;
  /** Of those, the days with a mark. */
  marked: number;
  /** Of those, the falls of a bad habit, or the days a good one was done. */
  hits: number;
  /** Days with a day file and no meeting; and the falls (or the days done) among them. */
  apart: number;
  apartHits: number;
}

export function countOnMeetings(life: Life, habit: Habit, met: Set<string>, from: string, to: string): HabitCount {
  const hit = (c: Cell) => (habit.kind === "bad" ? c === "fall" : c === "done" || c === "late");
  const beads = [...met].filter((d) => d >= from && d <= to).sort().map((date) => ({ date, cell: dayMark(life, habit, date) }));
  const counted = beads.filter((b) => b.cell !== "nofile" && b.cell !== "skip");
  let apart = 0, apartHits = 0;
  for (const date of life.days.keys()) {
    if (date < from || date > to || met.has(date)) continue;
    const c = dayMark(life, habit, date);
    if (c === "skip") continue;
    apart++;
    if (hit(c)) apartHits++;
  }
  return { habit, beads, counted: counted.length, marked: counted.filter((b) => b.cell !== "unmarked").length, hits: counted.filter((b) => hit(b.cell)).length, apart, apartHits };
}

export interface PersonInfluence {
  /** The days he met the person in the window, oldest first: any event with them, «Встреча» too. */
  meetings: string[];
  /** Of those, the days that have a day file. */
  withFile: string[];
  /** One count a habit, in the order given. */
  rows: HabitCount[];
}

/** The count of `triggerStats` for one person and the habits their page links to. */
export function personInfluence(page: Page, people: Page[], life: Life, habits: Habit[], today: string, window = 90): PersonInfluence {
  const { from, to } = meetWindow(today, window);
  const met = new Set(eventsWith(page, people, life.events).filter((e) => e.date >= from && e.date <= to).map((e) => e.date));
  const meetings = [...met].sort();
  return { meetings, withFile: meetings.filter((d) => life.days.has(d)), rows: habits.map((h) => countOnMeetings(life, h, met, from, to)) };
}

/**
 * Who was at the same events with the person most often, `min` times and more, the most first.
 * The day's «Встреча» record is left out: it lists everyone met that day, not the ones who were together.
 */
export function coMet(page: Page, people: Page[], events: LifeEvent[], min = 2): { name: string; page: Page | undefined; n: number }[] {
  const own = new Set(ownNames(page, people));
  const pageOf = (k: string) => people.find((p) => p.title.toLowerCase() === k || p.file.toLowerCase() === k) ?? people.find((p) => p.aliases.some((a) => a.toLowerCase() === k));
  const count = new Map<string, { name: string; page: Page | undefined; n: number }>();
  for (const e of eventsWith(page, people, events)) {
    if (isMeetingRecord(e)) continue;
    const seen = new Set<string>();
    for (const raw of e.people) {
      const name = personName(raw);
      const k = name.toLowerCase();
      if (own.has(k)) continue;
      const p = pageOf(k);
      if (p?.rel === page.rel) continue;
      const key = p?.rel ?? k;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = count.get(key) ?? { name: p?.title ?? name, page: p, n: 0 };
      c.n++;
      count.set(key, c);
    }
  }
  return [...count.values()].filter((c) => c.n >= min).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "ru"));
}

/** The tag on the page of someone he lives with: he sees them every day, so they are never «давно без связи». */
export const HOUSEHOLD_TAG = "household";
export function atHome(page: Page): boolean {
  return page.tags.some((t) => t.toLowerCase() === HOUSEHOLD_TAG);
}

export const MEETING_TITLE = "Встреча";

/**
 * The day's meeting record that «виделись» keeps (`contactEdits`: the title «Встреча» and the tag «встреча»):
 * everyone met that day, not a memory. A memory he named «Встреча» himself (the bot's «📸 Воспоминание») has
 * no such tag and stays a memory.
 */
export function isMeetingRecord(e: LifeEvent): boolean {
  return e.title === MEETING_TITLE && e.tags.some((t) => t.toLowerCase() === "встреча");
}

// ---------- the warmth of a tie and of the circle (2026-11-21) ----------

export type TieState = "тёплая" | "остывает" | "остыла" | "нет записей";
export interface TieWarmth { pct: number; state: TieState; since: number | undefined; cadence: number }

/**
 * How warm a tie is: full on the day of a touch (a contact or a meeting), cooling evenly to nothing when its rhythm
 * runs out. Undefined for a tie with no closeness, which has no rhythm to hold.
 */
export function tieWarmth(i: Pick<CircleItem, "cadence" | "overdue">): TieWarmth | undefined {
  if (i.cadence === undefined) return undefined;
  if (i.overdue === undefined) return { pct: 0, state: "нет записей", since: undefined, cadence: i.cadence };
  const since = i.overdue + i.cadence;
  const pct = Math.max(0, Math.min(100, Math.round(100 - (since / i.cadence) * 100)));
  return { pct, state: pct >= 50 ? "тёплая" : pct > 0 ? "остывает" : "остыла", since, cadence: i.cadence };
}

export interface CircleWarmth { bands: { title: string; total: number; warm: number }[]; total: number; warm: number; pct: number }

/** The circle by its four bands: how many ties are still within their rhythm. People he lives with and ties with no closeness are left out. */
export function circleWarmth(items: CircleItem[]): CircleWarmth {
  // a tie he took out («не считать») or gave his own rhythm without a record yet is not counted
  const counted = items.filter((i) => i.closeness !== undefined && !atHome(i.page) && i.cadence !== undefined && !(i.own && i.overdue === undefined));
  const isWarm = (i: CircleItem) => (tieWarmth(i)?.pct ?? 0) > 0;
  const bands = BANDS.map((b) => { const of = counted.filter((i) => i.closeness! >= b.min && i.closeness! <= b.max); return { title: b.title, total: of.length, warm: of.filter(isWarm).length }; });
  const total = bands.reduce((s, b) => s + b.total, 0), warm = bands.reduce((s, b) => s + b.warm, 0);
  return { bands, total, warm, pct: total ? Math.round((warm / total) * 100) : 0 };
}
