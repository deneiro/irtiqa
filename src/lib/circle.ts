/**
 * The circle: who is close, who has gone quiet, and who costs Eldar something.
 *
 * Both halves read data he already keeps. Closeness is his own 1–10 scale on
 * the person page; the trigger tags («trigger-smoking», «триггер-курение»)
 * were written from his own words. The app only adds dates — when he last
 * wrote, when he last met — and counts what broke on the days they met.
 */
import type { Page } from "./types";
import type { Day, Habit } from "./life";
import { markOf } from "./life";
import { personName, type LifeEvent } from "./events";
import { categoryOf, closenessOf, daysSinceContact } from "./people";

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
  lastContact: string | undefined;
  sinceContact: number | undefined;
  lastMeet: string | undefined;
  sinceMeet: number | undefined;
  /** Days past the cadence; 0 or less means still in time. */
  overdue: number | undefined;
  triggers: string[];
  support: boolean;
}

export function buildCircle(people: Page[], events: LifeEvent[], today: string): CircleItem[] {
  const met = new Map<string, string>(); // lowercased name -> latest date
  for (const e of events) {
    for (const p of e.people) {
      const k = personName(p).toLowerCase();
      if (!met.has(k) || (met.get(k) ?? "") < e.date) met.set(k, e.date);
    }
  }
  const items = people.map((page) => {
    const closeness = closenessOf(page);
    const cadence = cadenceFor(closeness);
    const last = typeof page.fm.last_contact === "string" ? page.fm.last_contact : undefined;
    const since = daysSinceContact(last, today);
    const names = [page.title, page.file, ...page.aliases].map((s) => s.toLowerCase());
    let lastMeet: string | undefined;
    for (const n of names) { const d = met.get(n); if (d && (!lastMeet || d > lastMeet)) lastMeet = d; }
    const touch = [last, lastMeet].filter(Boolean).sort().pop();
    const sinceTouch = daysSinceContact(touch, today);
    return {
      page, name: page.title, closeness, category: categoryOf(page), cadence,
      lastContact: last, sinceContact: since,
      lastMeet, sinceMeet: daysSinceContact(lastMeet, today),
      overdue: cadence !== undefined && sinceTouch !== undefined ? sinceTouch - cadence : undefined,
      triggers: triggersOf(page), support: isSupport(page),
    };
  });
  // No contact recorded at all is not "fine": it sorts above everyone still in time.
  const key = (i: CircleItem) => i.overdue ?? (i.cadence !== undefined && !i.lastContact && !i.lastMeet ? 0 : -1e9);
  return items.sort((a, b) =>
    key(b) - key(a) ||
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
  /** Of those, days the habit broke. */
  brokeOnMet: number;
  /** Days the habit broke without any of them around. */
  brokeApart: number;
  otherDays: number;
}

/** What actually happens on the days he sees them. Empty until events exist. */
export function triggerStats(
  items: CircleItem[], events: LifeEvent[], days: Map<string, Day>, habits: Habit[], today: string, window = 90,
): TriggerStat[] {
  const from = new Date(new Date(today + "T12:00:00").getTime() - window * 86400000).toISOString().slice(0, 10);
  const recent = events.filter((e) => e.date >= from && e.date <= today);
  const dayList = [...days.values()].filter((d) => d.date >= from && d.date <= today);
  return TRIGGERS.map((t) => {
    const people = items.filter((i) => i.triggers.includes(t.key));
    const names = new Set(people.flatMap((i) => [i.name, i.page.file, ...i.page.aliases].map((s) => s.toLowerCase())));
    const metDates = new Set(recent.filter((e) => e.people.some((p) => names.has(personName(p).toLowerCase()))).map((e) => e.date));
    const habit = habits.find((h) => h.title.toLowerCase() === t.habit.toLowerCase());
    let brokeOnMet = 0, brokeApart = 0, otherDays = 0;
    if (habit) {
      for (const d of dayList) {
        const broke = markOf(d, habit.title) === "failed";
        if (metDates.has(d.date)) { if (broke) brokeOnMet++; }
        else { otherDays++; if (broke) brokeApart++; }
      }
    }
    return { key: t.key, label: t.label, habit: habit?.title ?? "", people, metDays: metDates.size, brokeOnMet, brokeApart, otherDays };
  }).filter((s) => s.people.length > 0);
}

export const MEETING_TITLE = "Встреча";
