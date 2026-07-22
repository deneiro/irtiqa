import { describe, expect, it } from 'vitest';
import { buildChronicle, lastCompleteWeek, type ChronicleSource } from '../game/chronicle';
import { addDaysStr, weekKey } from '../game/engine';
import { DEFAULT_DASHBOARD_ORDER } from '../game/constants';
import { reconcileOrder } from '../pages/Dashboard';
import type { DashboardWidgetId, Habit, JournalEntry, Quest, QuickTask } from '../game/types';

const TODAY = '2026-07-22'; // a Wednesday
const WEEK = lastCompleteWeek(TODAY); // Monday of the previous full week
const DAYS = Array.from({ length: 7 }, (_, i) => addDaysStr(WEEK, i));

function habit(id: string, name: string, over: Partial<Habit> = {}): Habit {
  return {
    id,
    name,
    kind: 'good',
    freq: 'daily',
    attrs: ['health'],
    streak: 0,
    best: 0,
    createdAt: '2026-01-01',
    ...over,
  };
}

function src(over: Partial<ChronicleSource> = {}): ChronicleSource {
  return { habits: [], habitLog: {}, journal: [], quests: [], quickTasks: [], dayLog: {}, ...over };
}

/** Marks a habit done on the given day indices within the week. */
function log(habitId: string, doneIdx: number[]) {
  const days: Record<string, 'done' | 'failed'> = {};
  DAYS.forEach((d, i) => {
    days[d] = doneIdx.includes(i) ? 'done' : 'failed';
  });
  return { [habitId]: days };
}

describe('chronicle week boundaries', () => {
  it('lastCompleteWeek is entirely in the past', () => {
    const c = buildChronicle(src(), lastCompleteWeek(TODAY));
    expect(c.week).toBe(WEEK);
    expect(c.week).not.toBe(weekKey(TODAY)); // never the week in progress
    expect(addDaysStr(c.week, 6) < TODAY).toBe(true);
  });

  it('normalizes any day in a week to that weeks Monday', () => {
    const monday = buildChronicle(src(), WEEK);
    // TODAY is a Wednesday; passing it must not produce a Wed-to-Tue window
    for (let i = 0; i < 7; i++) {
      const c = buildChronicle(src(), addDaysStr(WEEK, i));
      expect(c.week).toBe(WEEK);
      expect(c.range).toBe(monday.range);
    }
  });
});

describe('chronicle honesty', () => {
  it('flags a week with nothing in it as thin rather than inventing a narrative', () => {
    const c = buildChronicle(src(), WEEK);
    expect(c.thin).toBe(true);
    expect(c.stats).toHaveLength(0);
  });

  it('never reports habit activity that did not happen', () => {
    const h = habit('h1', 'Fajr');
    const c = buildChronicle(src({ habits: [h], habitLog: log('h1', []) }), WEEK);
    const text = c.paragraphs.join(' ');
    expect(text).not.toMatch(/\b7 of 7\b/);
    expect(text).toContain('Fajr');
    // A zero week is narrated as fact, not as encouragement
    expect(text).toMatch(/did not happen at all/);
  });

  it('counts only days the habit was actually due', () => {
    // Due Mondays only — one day in the week, and it was done
    const h = habit('h1', 'Gym', { freq: 'weekly', weekdays: [1] });
    const c = buildChronicle(src({ habits: [h], habitLog: { h1: { [DAYS[0]]: 'done' } } }), WEEK);
    expect(c.stats.find(s => s.label === 'habits')?.value).toBe('1/1');
  });

  it('ignores activity from outside the described week', () => {
    const h = habit('h1', 'Fajr');
    const outside = addDaysStr(WEEK, -3);
    const c = buildChronicle(src({ habits: [h], habitLog: { h1: { [outside]: 'done' } } }), WEEK);
    expect(c.stats.find(s => s.label === 'habits')?.value).toBe('0/7');
  });
});

describe('chronicle prose', () => {
  it('names the habit that held, by name', () => {
    const h = habit('h1', 'Fajr', { streak: 20 });
    const c = buildChronicle(src({ habits: [h], habitLog: log('h1', [0, 1, 2, 3, 4, 5, 6]) }), WEEK);
    const text = c.paragraphs.join(' ');
    expect(text).toContain('**Fajr**');
    expect(text).toContain('20 days');
    expect(c.title).toBe('The week that held');
  });

  it('quotes the journal rather than summarizing it', () => {
    const entry: JournalEntry = {
      id: 'j1',
      date: DAYS[2],
      createdAt: new Date().toISOString(),
      mood: 5,
      stress: 2,
      answers: [{ q: 'What went well?', a: 'Finally called my father back.' }],
    };
    const c = buildChronicle(src({ journal: [entry] }), WEEK);
    expect(c.paragraphs.join(' ')).toContain('"Finally called my father back."');
  });

  it('quotes the most emotionally extreme day, not just the latest', () => {
    const mk = (date: string, mood: number, a: string): JournalEntry => ({
      id: date, date, createdAt: new Date().toISOString(), mood, stress: 5,
      answers: [{ q: 'How was it?', a }],
    });
    const c = buildChronicle(
      src({ journal: [mk(DAYS[1], 1, 'The worst day in months.'), mk(DAYS[5], 3, 'Fine, nothing much.')] }),
      WEEK,
    );
    expect(c.paragraphs.join(' ')).toContain('The worst day in months.');
  });

  it('breaks a mood tie on stress rather than on array order', () => {
    const mk = (date: string, mood: number, stress: number, a: string): JournalEntry => ({
      id: date, date, createdAt: new Date().toISOString(), mood, stress,
      answers: [{ q: 'How was it?', a }],
    });
    // Both are 1 away from neutral; the frantic one is the day worth re-reading
    const c = buildChronicle(
      src({ journal: [mk(DAYS[1], 4, 5, 'Pleasant and unremarkable.'), mk(DAYS[4], 2, 9, 'Everything came apart.')] }),
      WEEK,
    );
    expect(c.paragraphs.join(' ')).toContain('Everything came apart.');
    expect(c.paragraphs.join(' ')).not.toContain('Pleasant and unremarkable');
  });

  it('punctuates quotes that the player left unterminated', () => {
    const quest: Quest = {
      id: 'q1', title: 'Q', targetDuration: '1w', attrs: ['career'], priority: false,
      createdAt: `${WEEK}T09:00:00.000Z`,
      sessions: [{ id: 's1', date: DAYS[1], minutes: 60, note: 'no full stop here' }],
    };
    const c = buildChronicle(src({ quests: [quest] }), WEEK);
    expect(c.paragraphs.join(' ')).toContain('"no full stop here."');
  });

  it('reports the range instead of the mean when mood swung', () => {
    const mk = (date: string, mood: number): JournalEntry => ({
      id: date, date, createdAt: new Date().toISOString(), mood, stress: 5, answers: [],
    });
    // 4, 2, 4 averages to a misleading 3.3 — the swing is the real story
    const c = buildChronicle(src({ journal: [mk(DAYS[0], 4), mk(DAYS[3], 2), mk(DAYS[6], 4)] }), WEEK);
    const text = c.paragraphs.join(' ');
    expect(text).toContain('2/5 at the bottom, 4/5 at the top');
    expect(text).not.toContain('3.3');
  });

  it('reports quest work with the players own session note', () => {
    const quest: Quest = {
      id: 'q1',
      title: 'Ship the Chronicle',
      targetDuration: '1w',
      attrs: ['career'],
      priority: false,
      createdAt: `${WEEK}T09:00:00.000Z`,
      sessions: [
        { id: 's1', date: DAYS[1], minutes: 90, note: 'wrote the generator' },
        { id: 's2', date: DAYS[3], minutes: 150, note: 'tests and styling' },
      ],
    };
    const c = buildChronicle(src({ quests: [quest] }), WEEK);
    const text = c.paragraphs.join(' ');
    expect(text).toContain('**Ship the Chronicle**');
    expect(text).toContain('4 hours'); // 90 + 150 minutes
    expect(text).toContain('"tests and styling."'); // the latest note, verbatim
  });

  it('does not claim a mood trend from a single entry', () => {
    const entry: JournalEntry = {
      id: 'j1', date: DAYS[0], createdAt: new Date().toISOString(),
      mood: 5, stress: 1, answers: [],
    };
    const c = buildChronicle(src({ journal: [entry] }), WEEK);
    expect(c.paragraphs.join(' ')).not.toMatch(/averaged/);
  });

  it('names the single attribute a narrow week fed', () => {
    const h = habit('h1', 'Fajr', { attrs: ['spirituality'] });
    const c = buildChronicle(src({ habits: [h], habitLog: log('h1', [0, 1, 2]) }), WEEK);
    expect(c.paragraphs.join(' ')).toContain('fed one thing: Spirituality');
  });

  it('reports untouched attributes instead of silently omitting them', () => {
    const a = habit('h1', 'Fajr', { attrs: ['spirituality'] });
    const b = habit('h2', 'Run', { attrs: ['health'] });
    const c = buildChronicle(
      src({ habits: [a, b], habitLog: { ...log('h1', [0, 1, 2]), ...log('h2', [0, 1]) } }),
      WEEK,
    );
    expect(c.paragraphs.join(' ')).toMatch(/of the eight attributes got nothing at all/);
  });

  it('always produces an opening and a closing line', () => {
    const c = buildChronicle(src(), WEEK);
    expect(c.paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(c.paragraphs[0]).toBeTruthy();
    expect(c.paragraphs[c.paragraphs.length - 1]).toBeTruthy();
  });
});

describe('chronicle stats', () => {
  it('only reports stats that have something behind them', () => {
    const task: QuickTask = {
      id: 't1', title: 'Pay Bekbolat', attr: 'money',
      createdAt: `${DAYS[2]}T10:00:00.000Z`, doneAt: `${DAYS[2]}T12:00:00.000Z`,
    };
    const c = buildChronicle(src({ quickTasks: [task], dayLog: { [DAYS[2]]: { xp: 40, gold: 12 } } }), WEEK);
    const labels = c.stats.map(s => s.label);
    expect(labels).toContain('tasks');
    expect(labels).toContain('XP');
    expect(labels).not.toContain('habits'); // none were due
    expect(labels).not.toContain('tracked work'); // no sessions
  });
});

describe('dashboard widget order', () => {
  it('slots a new widget into its default position, not the bottom', () => {
    // A save from before the Chronicle existed: the old default order
    const legacy: DashboardWidgetId[] = [
      'dailyContract', 'weeklyBoss', 'todayHabits', 'lifeBalance',
      'attributes', 'quickTasks', 'quests', 'journal', 'calendar',
    ];
    const out = reconcileOrder(legacy);
    expect(out[0]).toBe('chronicle');
    expect(out).toHaveLength(DEFAULT_DASHBOARD_ORDER.length);
  });

  it('preserves a layout the player actually reordered', () => {
    const custom: DashboardWidgetId[] = ['journal', 'todayHabits', 'dailyContract'];
    const out = reconcileOrder(custom);
    // Their three stay in their chosen relative order
    expect(out.filter(id => custom.includes(id))).toEqual(custom);
    expect(out).toHaveLength(DEFAULT_DASHBOARD_ORDER.length);
  });

  it('drops widgets that no longer exist', () => {
    const stale = ['dailyContract', 'retiredWidget', 'journal'] as DashboardWidgetId[];
    const out = reconcileOrder(stale);
    expect(out).not.toContain('retiredWidget');
    expect(new Set(out)).toEqual(new Set(DEFAULT_DASHBOARD_ORDER));
  });
});
