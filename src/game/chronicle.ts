import { ATTRIBUTES } from './constants';
import { addDaysStr, fmtDay, habitDueOn, parseDay, weekKey } from './engine';
import type {
  AttributeKey,
  Habit,
  HabitDayStatus,
  JournalEntry,
  Quest,
  QuickTask,
} from './types';

// The Chronicle: the app's one surface that gives instead of takes.
//
// Every other page asks you to log something. This one reads back the week you
// already lived, as prose — not a stat block. It is the reason to open the app
// that isn't an audit.
//
// No AI and no network: every sentence is assembled from data the player already
// generated, and every beat self-suppresses when the data is too thin to say
// anything true. A Chronicle that invents a narrative is worse than no Chronicle,
// because the whole value is that it is *actually your week*.

export interface ChronicleStat {
  label: string;
  value: string;
}

export interface Chronicle {
  /** Monday of the week described, YYYY-MM-DD. Doubles as the archive key. */
  week: string;
  range: string;
  title: string;
  /** Ordered prose. Each entry is one paragraph. */
  paragraphs: string[];
  stats: ChronicleStat[];
  /** True when the week is too empty to narrate honestly. */
  thin: boolean;
}

export interface ChronicleSource {
  habits: Habit[];
  habitLog: Record<string, Record<string, HabitDayStatus>>;
  journal: JournalEntry[];
  quests: Quest[];
  quickTasks: QuickTask[];
  dayLog: Record<string, { xp: number; gold: number }>;
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Minimum real activity before the week is worth narrating at all. */
const THIN_THRESHOLD = 3;

function daysOfWeek(week: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysStr(week, i));
}

/** The Monday of the week containing `day` — the canonical Chronicle key. */
export function chronicleWeekOf(day: string): string {
  return weekKey(day);
}

/** Most recent complete week, i.e. the one that ended yesterday-or-earlier. */
export function lastCompleteWeek(today: string): string {
  return addDaysStr(weekKey(today), -7);
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h > 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

function list(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Trims a journal answer to a quotable clause without cutting mid-word. */
function clip(text: string, max = 140): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}

/**
 * Quotes `text`, adding terminal punctuation if the player's own words didn't
 * have any — otherwise the next sentence runs straight into the closing quote.
 */
function quote(text: string): string {
  const t = clip(text);
  return /[.!?…]$/.test(t) ? `"${t}"` : `"${t}."`;
}

interface WeekFacts {
  days: string[];
  checkins: number;
  due: number;
  perfectDays: string[];
  missedDays: string[];
  bestHabit: { habit: Habit; done: number; due: number } | null;
  slippedHabit: { habit: Habit; done: number; due: number } | null;
  questWork: { quest: Quest; minutes: number; notes: string[] }[];
  totalMinutes: number;
  questsCompleted: Quest[];
  tasksDone: number;
  entries: JournalEntry[];
  moods: number[];
  stresses: number[];
  xp: number;
  gold: number;
  attrTouched: Map<AttributeKey, number>;
}

function gather(src: ChronicleSource, week: string): WeekFacts {
  const days = daysOfWeek(week);
  const daySet = new Set(days);

  let checkins = 0;
  let due = 0;
  const perfectDays: string[] = [];
  const missedDays: string[] = [];
  const attrTouched = new Map<AttributeKey, number>();

  const bump = (attrs: AttributeKey[]) => {
    for (const a of attrs) attrTouched.set(a, (attrTouched.get(a) ?? 0) + 1);
  };

  for (const day of days) {
    const dueToday = src.habits.filter(h => habitDueOn(h, day));
    const doneToday = dueToday.filter(h => src.habitLog[h.id]?.[day] === 'done');
    due += dueToday.length;
    checkins += doneToday.length;
    for (const h of doneToday) bump(h.attrs);
    if (dueToday.length > 0 && doneToday.length === dueToday.length) perfectDays.push(day);
    if (dueToday.length > 0 && doneToday.length === 0) missedDays.push(day);
  }

  // Per-habit completion across the week, so the Chronicle can name the thread
  // that held and the one that didn't — by name, not as a percentage.
  const perHabit = src.habits
    .map(habit => {
      const habitDue = days.filter(d => habitDueOn(habit, d));
      const habitDone = habitDue.filter(d => src.habitLog[habit.id]?.[d] === 'done');
      return { habit, done: habitDone.length, due: habitDue.length };
    })
    .filter(x => x.due > 0);

  const bestHabit =
    perHabit.filter(x => x.done === x.due && x.due >= 2).sort((a, b) => b.due - a.due)[0] ?? null;
  const slippedHabit =
    perHabit.filter(x => x.done < x.due).sort((a, b) => a.done / a.due - b.done / b.due)[0] ?? null;

  const questWork = src.quests
    .map(quest => {
      const sessions = quest.sessions.filter(s => daySet.has(s.date));
      return {
        quest,
        minutes: sessions.reduce((a, s) => a + s.minutes, 0),
        notes: sessions.map(s => s.note).filter(n => n.trim()),
      };
    })
    .filter(x => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  for (const { quest } of questWork) bump(quest.attrs);

  const questsCompleted = src.quests.filter(q => q.completedAt && daySet.has(q.completedAt.slice(0, 10)));

  const doneTasks = src.quickTasks.filter(t => t.doneAt && daySet.has(t.doneAt.slice(0, 10)));
  for (const t of doneTasks) bump([t.attr]);

  const entries = src.journal
    .filter(e => daySet.has(e.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  let xp = 0;
  let gold = 0;
  for (const day of days) {
    const log = src.dayLog[day];
    if (log) {
      xp += log.xp;
      gold += log.gold;
    }
  }

  return {
    days,
    checkins,
    due,
    perfectDays,
    missedDays,
    bestHabit,
    slippedHabit,
    questWork,
    totalMinutes: questWork.reduce((a, q) => a + q.minutes, 0),
    questsCompleted,
    tasksDone: doneTasks.length,
    entries,
    moods: entries.map(e => e.mood),
    stresses: entries.map(e => e.stress),
    xp,
    gold,
    attrTouched,
  };
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Opening line. Names the week's shape before any number appears. */
function openingParagraph(f: WeekFacts): string {
  const rate = f.due > 0 ? f.checkins / f.due : 0;
  const perfect = f.perfectDays.length;

  if (f.due === 0 && f.totalMinutes === 0 && f.entries.length === 0) {
    return 'A quiet week — nothing logged. Some weeks are like that, and the record keeps them honestly rather than pretending otherwise.';
  }
  if (perfect >= 5) {
    return `This was one of the good ones. ${perfect} days where everything you asked of yourself actually happened — that is not a streak you stumble into.`;
  }
  if (rate >= 0.8) {
    return `A week that mostly held. ${f.checkins} of ${f.due} habits landed, and the days you missed were the exception rather than the shape of the week.`;
  }
  if (rate >= 0.5) {
    return `A mixed week — ${f.checkins} of ${f.due} habits done. Not the week you drew up, but not a lost one either.`;
  }
  if (f.checkins > 0) {
    return `A hard week. ${f.checkins} of ${f.due} habits made it through. Worth reading what else was going on before calling it a failure.`;
  }
  return 'The habits went untouched this week. What follows is what did happen — because something usually did.';
}

/** The strongest thread, named. */
function heldParagraph(f: WeekFacts): string | null {
  if (!f.bestHabit) return null;
  const { habit, due } = f.bestHabit;
  const streakNote =
    habit.streak >= 14
      ? ` It is at ${habit.streak} days now — long past the point where it needs deciding each morning.`
      : habit.streak >= 5
        ? ` That is ${habit.streak} days running.`
        : '';
  const verb = habit.kind === 'bad' ? 'held the line on' : 'kept';
  return `You ${verb} **${habit.name}** every one of the ${due} days it was due.${streakNote}`;
}

/** The thread that slipped — reported, never scolded. */
function slippedParagraph(f: WeekFacts): string | null {
  if (!f.slippedHabit) return null;
  const { habit, done, due } = f.slippedHabit;
  if (done === 0 && due >= 3) {
    return `**${habit.name}** did not happen at all this week — ${due} days, none of them. That is information, not a verdict: either the week was wrong for it, or the habit is.`;
  }
  const missed = due - done;
  return `**${habit.name}** slipped ${missed} time${missed > 1 ? 's' : ''} out of ${due}.`;
}

/** What the work actually was, in the player's own session notes. */
function workParagraph(f: WeekFacts): string | null {
  if (f.questWork.length === 0) return null;

  const top = f.questWork[0];
  const parts: string[] = [];

  if (f.questWork.length === 1) {
    parts.push(`You put ${fmtHours(top.minutes)} into **${top.quest.title}**.`);
  } else {
    parts.push(
      `${fmtHours(f.totalMinutes)} of tracked work across ${f.questWork.length} quests, most of it — ${fmtHours(top.minutes)} — on **${top.quest.title}**.`,
    );
  }

  // Quote their own words about the work rather than paraphrasing it
  const note = top.notes[top.notes.length - 1];
  if (note) parts.push(`Your last note on it: ${quote(note)}`);

  if (f.questsCompleted.length > 0) {
    const names = f.questsCompleted.map(q => `**${q.title}**`);
    parts.push(
      f.questsCompleted.length === 1
        ? `You finished ${names[0]} this week.`
        : `You closed out ${list(names)}.`,
    );
  }

  return parts.join(' ');
}

/** The week in their own voice, pulled from the journal. */
function voiceParagraph(f: WeekFacts): string | null {
  if (f.entries.length === 0) return null;

  const withAnswers = f.entries.filter(e => e.answers.some(a => a.a.trim()));
  if (withAnswers.length === 0) {
    return `You checked in to the journal ${f.entries.length} time${f.entries.length > 1 ? 's' : ''} but left the questions blank. The mood is on record even when the words aren't.`;
  }

  // Pick the day that carried the most weight, not the latest one and not
  // whichever happened to sort first. Mood distance from neutral is the main
  // signal; stress breaks ties, because a calm 4 and a frantic 4 are not the
  // same day and only one of them is worth re-reading.
  const weight = (e: JournalEntry) => Math.abs(e.mood - 3) + Math.abs(e.stress - 5) / 3;
  const pick = withAnswers.reduce((best, e) => (weight(e) > weight(best) ? e : best));
  const answer = pick.answers.find(a => a.a.trim())!;
  const day = WEEKDAY[parseDay(pick.date).getDay()];

  return `On ${day} you wrote, on "${answer.q}": ${quote(answer.a)}`;
}

/** Mood and stress as a trend line, not a score. */
function feelingParagraph(f: WeekFacts): string | null {
  if (f.moods.length < 2) return null;
  const m = avg(f.moods);
  const s = f.stresses.length > 0 ? avg(f.stresses) : null;

  const hi = Math.max(...f.moods);
  const lo = Math.min(...f.moods);

  const first = f.moods[0];
  const last = f.moods[f.moods.length - 1];
  const arc =
    last - first >= 1.5 ? ' It ended better than it started.'
      : first - last >= 1.5 ? ' It got harder as it went.'
        : '';

  const stressNote = s !== null && s >= 7
    ? ` Stress averaged ${r1(s)}/10 — high enough to be worth naming.`
    : s !== null && s <= 3
      ? ` Stress stayed low, averaging ${r1(s)}/10.`
      : '';

  // A swinging week and a flat week can share an average. Reporting only the
  // mean would erase both the good days and the bad one — say the range instead.
  if (hi - lo >= 2) {
    return `Mood ran the whole range this week — ${lo}/5 at the bottom, ${hi}/5 at the top, across ${f.moods.length} entries. Averaging that would hide both ends.${arc}${stressNote}`;
  }

  const moodPhrase =
    m >= 4.2 ? 'a genuinely good week to be inside'
      : m >= 3.4 ? 'steady'
        : m >= 2.6 ? 'level, without much lift'
          : 'heavy';

  return `Across ${f.moods.length} entries, mood averaged ${r1(m)}/5 — ${moodPhrase}.${arc}${stressNote}`;
}

/** Where the week's effort actually landed across the eight attributes. */
function balanceParagraph(f: WeekFacts): string | null {
  if (f.attrTouched.size === 0) return null;
  const sorted = [...f.attrTouched.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 2).map(([k]) => ATTRIBUTES[k].label);
  const untouched = (Object.keys(ATTRIBUTES) as AttributeKey[]).filter(k => !f.attrTouched.has(k));

  if (f.attrTouched.size === 1) {
    return `Everything you did this week fed one thing: ${top[0]}.`;
  }
  const lead = `The week's weight went to ${list(top)}.`;
  if (untouched.length >= 5) {
    return `${lead} ${untouched.length} of the eight attributes got nothing at all.`;
  }
  if (untouched.length > 0) {
    return `${lead} Nothing reached ${list(untouched.map(k => ATTRIBUTES[k].label))}.`;
  }
  return `${lead} Every one of the eight got something — a rare week.`;
}

/** Closing line. Never a verdict, never a prescription. */
function closingParagraph(f: WeekFacts): string {
  if (f.perfectDays.length >= 5) {
    return 'Whatever you were doing this week, the record says it worked.';
  }
  if (f.missedDays.length >= 5) {
    return 'Weeks like this are part of the record too. The next one starts clean.';
  }
  if (f.totalMinutes >= 300) {
    return 'The hours are the part nobody sees. They are here.';
  }
  if (f.entries.length >= 5) {
    return 'You kept writing, even through the parts that were not going well. That is the archive earning its keep.';
  }
  return 'Filed. The next week starts clean.';
}

function titleFor(f: WeekFacts): string {
  if (f.due === 0 && f.totalMinutes === 0 && f.entries.length === 0) return 'A quiet week';
  if (f.perfectDays.length >= 5) return 'The week that held';
  if (f.questsCompleted.length > 0) return `The week you finished ${f.questsCompleted[0].title}`;
  if (f.totalMinutes >= 600) return 'The week of the long hours';
  if (f.missedDays.length >= 5) return 'The week that got away';
  if (f.bestHabit) return `The week of ${f.bestHabit.habit.name}`;
  if (f.moods.length >= 3 && avg(f.moods) >= 4.2) return 'A good week';
  return 'The week in the record';
}

/**
 * `week` may be any day inside the target week — it is normalized to that week's
 * Monday. Without this, passing a Wednesday would silently produce a Wed–Tue
 * window that looks like a week but isn't one.
 */
export function buildChronicle(src: ChronicleSource, week: string): Chronicle {
  const monday = weekKey(week);
  const f = gather(src, monday);

  const paragraphs = [
    openingParagraph(f),
    heldParagraph(f),
    slippedParagraph(f),
    workParagraph(f),
    voiceParagraph(f),
    feelingParagraph(f),
    balanceParagraph(f),
    closingParagraph(f),
  ].filter((p): p is string => p !== null);

  const stats: ChronicleStat[] = [];
  if (f.due > 0) stats.push({ label: 'habits', value: `${f.checkins}/${f.due}` });
  if (f.perfectDays.length > 0) stats.push({ label: 'perfect days', value: String(f.perfectDays.length) });
  if (f.totalMinutes > 0) stats.push({ label: 'tracked work', value: fmtHours(f.totalMinutes) });
  if (f.tasksDone > 0) stats.push({ label: 'tasks', value: String(f.tasksDone) });
  if (f.entries.length > 0) stats.push({ label: 'entries', value: String(f.entries.length) });
  if (f.xp > 0) stats.push({ label: 'XP', value: `+${f.xp}` });

  const activity = f.checkins + f.questWork.length + f.tasksDone + f.entries.length;

  return {
    week: monday,
    range: `${fmtDay(f.days[0])} – ${fmtDay(f.days[6])}`,
    title: titleFor(f),
    paragraphs,
    stats,
    thin: activity < THIN_THRESHOLD,
  };
}

/** Every week that has any record at all, newest first — the Chronicle archive. */
export function chronicleWeeks(src: ChronicleSource, today: string, limit = 12): string[] {
  const weeks: string[] = [];
  let w = lastCompleteWeek(today);
  for (let i = 0; i < limit; i++) {
    weeks.push(w);
    w = addDaysStr(w, -7);
  }
  return weeks;
}
