import { addDaysStr, addMonthsClamp, habitDueOn, questTargetDate, todayStr } from '../game/engine';
import type { Contact, Habit, HabitDayStatus, JournalEntry, Quest, QuickTask, SocialEvent, Subscription } from '../game/types';

export type CalendarItemType = 'event' | 'birthday' | 'quickTask' | 'journal' | 'questTarget' | 'subscription' | 'habit';

export interface CalendarItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: CalendarItemType;
  title: string;
  link: string;
  done?: boolean;
}

interface CalendarSource {
  events: SocialEvent[];
  contacts: Contact[];
  quickTasks: QuickTask[];
  journal: JournalEntry[];
  quests: Quest[];
  subs?: Subscription[];
  /** Optional: callers that don't care about the daily loop (e.g. a short "what's coming up" strip) can omit both. */
  habits?: Habit[];
  habitLog?: Record<string, Record<string, HabitDayStatus>>;
  /** Injectable "now" so habit past/future phrasing is deterministic in tests. Defaults to the real today. */
  today?: string;
}

/** All yearly occurrences of a birthday's month/day that fall within [rangeStart, rangeEnd] (inclusive). */
function birthdaysInRange(birthday: string, rangeStart: string, rangeEnd: string): string[] {
  const [, m, d] = birthday.split('-');
  const startYear = Number(rangeStart.slice(0, 4));
  const endYear = Number(rangeEnd.slice(0, 4));
  const out: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const candidate = `${y}-${m}-${d}`;
    if (candidate >= rangeStart && candidate <= rangeEnd) out.push(candidate);
  }
  return out;
}

/**
 * Every monthly charge date from a subscription's `nextDue` onward that falls within [rangeStart, rangeEnd] (inclusive).
 * Anchored at `nextDue` rather than at the range's own start — a subscription never bills before its first due date,
 * so it must not show up in months prior to that (e.g. the month it was created in).
 */
function subscriptionOccurrencesInRange(sub: Subscription, rangeStart: string, rangeEnd: string): string[] {
  const out: string[] = [];
  let date = sub.nextDue;
  while (date <= rangeEnd) {
    if (date >= rangeStart) out.push(date);
    date = addMonthsClamp(date, 1, sub.dayOfMonth);
  }
  return out;
}

/**
 * One aggregate habit row per day — never one row per habit.
 *
 * A single daily habit would otherwise emit ~30 identical entries into a month view and
 * bury every event, birthday and quest target under itself. At month scale the count is
 * the whole signal; the per-habit detail already lives on /habits.
 *
 * Days with nothing due emit nothing, so an untracked stretch stays visibly empty rather
 * than filling up with "0 due".
 */
function habitItemsInRange(src: CalendarSource, rangeStart: string, rangeEnd: string, today: string): CalendarItem[] {
  const habits = src.habits ?? [];
  if (habits.length === 0) return [];
  const log = src.habitLog ?? {};
  const out: CalendarItem[] = [];

  for (let day = rangeStart; day <= rangeEnd; day = addDaysStr(day, 1)) {
    const due = habits.filter(h => habitDueOn(h, day));
    if (due.length === 0) continue;
    const plural = due.length === 1 ? 'habit' : 'habits';

    // A future day has no log to read, so it states the plan. Today and the past state the
    // result — and today counts as "result" on purpose: the day's progress is the useful read
    // while it is still in play.
    if (day > today) {
      out.push({ id: `habits-${day}`, date: day, type: 'habit', title: `${due.length} ${plural} due`, link: '/habits' });
      continue;
    }

    // Only an explicit 'done' counts. A pardon, shield or ghost day stops the damage but it
    // isn't a rep, and reporting it as one would make the history lie back to the player.
    const done = due.filter(h => log[h.id]?.[day] === 'done').length;
    out.push({
      id: `habits-${day}`,
      date: day,
      type: 'habit',
      title: `${done} of ${due.length} ${plural} done`,
      link: '/habits',
      done: done === due.length,
    });
  }

  return out;
}

/** Unifies every date-bearing thing in the app — habits due, events, birthdays, due quick tasks, journal entries, quest targets, subscription charges — into one list for a range. */
export function buildCalendarItems(src: CalendarSource, rangeStart: string, rangeEnd: string): CalendarItem[] {
  // Habits lead every day they appear on: the sort below is by date alone and is stable, so
  // pushing them first is what keeps the daily loop at the top of each day's stack.
  const items: CalendarItem[] = habitItemsInRange(src, rangeStart, rangeEnd, src.today ?? todayStr());

  for (const e of src.events) {
    if (e.date < rangeStart || e.date > rangeEnd) continue;
    const c = src.contacts.find(x => x.id === e.contactId);
    items.push({ id: `event-${e.id}`, date: e.date, type: 'event', title: c ? `${e.title} (${c.name})` : e.title, link: '/social' });
  }

  for (const c of src.contacts) {
    if (!c.birthday) continue;
    for (const date of birthdaysInRange(c.birthday, rangeStart, rangeEnd)) {
      items.push({ id: `birthday-${c.id}-${date}`, date, type: 'birthday', title: `${c.name}'s birthday`, link: '/social' });
    }
  }

  for (const t of src.quickTasks) {
    if (!t.dueDate || t.dueDate < rangeStart || t.dueDate > rangeEnd) continue;
    items.push({ id: `task-${t.id}`, date: t.dueDate, type: 'quickTask', title: t.title, link: '/', done: !!t.doneAt });
  }

  for (const j of src.journal) {
    if (j.date < rangeStart || j.date > rangeEnd) continue;
    items.push({ id: `journal-${j.id}`, date: j.date, type: 'journal', title: 'Journal written', link: '/journal' });
  }

  for (const q of src.quests) {
    if (q.completedAt) continue;
    const target = questTargetDate(q);
    if (!target || target < rangeStart || target > rangeEnd) continue;
    items.push({ id: `quest-${q.id}`, date: target, type: 'questTarget', title: `Quest target: ${q.title}`, link: `/quests/${q.id}` });
  }

  for (const sub of src.subs ?? []) {
    if (!sub.active) continue;
    for (const date of subscriptionOccurrencesInRange(sub, rangeStart, rangeEnd)) {
      items.push({ id: `sub-${sub.id}-${date}`, date, type: 'subscription', title: `${sub.name} bills (${sub.amount.toLocaleString()})`, link: '/finances' });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}
