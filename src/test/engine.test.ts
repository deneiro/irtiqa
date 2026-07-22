import { describe, expect, it } from 'vitest';
import {
  addDaysStr,
  addMonthsClamp,
  attrLevel,
  charLevel,
  charLevelProgress,
  habitDueOn,
  journalEditable,
  missDamage,
  monthKey,
  overspendDamage,
  questDeadlineProgress,
  questPayout,
  questTargetDate,
  rankFor,
  todayStr,
  weekdayOf,
} from '../game/engine';
import type { Habit, JournalEntry, Quest, QuestDuration } from '../game/types';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'Test', kind: 'good', freq: 'daily', attrs: ['health'],
  streak: 0, best: 0, createdAt: '2026-01-01', ...over,
});

const quest = (minutes: number[], priority = false, over: Partial<Quest> = {}): Quest => ({
  id: 'q1', title: 'Q', targetDuration: 'none' as QuestDuration, attrs: ['career'], priority,
  createdAt: new Date().toISOString(),
  sessions: minutes.map((m, i) => ({ id: String(i), date: '2026-07-01', minutes: m, note: '' })),
  ...over,
});

describe('leveling', () => {
  it('level 1 needs 100 XP, thresholds rise by 25', () => {
    expect(charLevelProgress(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(charLevel(99)).toBe(1);
    expect(charLevel(100)).toBe(2);
    expect(charLevelProgress(100).need).toBe(125);
    expect(charLevel(100 + 125)).toBe(3);
  });

  it('attribute curve is lighter', () => {
    expect(attrLevel(59)).toBe(1);
    expect(attrLevel(60)).toBe(2);
  });

  it('ranks roll up from levels', () => {
    expect(rankFor(1).name).toBe('Seeker');
    expect(rankFor(5).name).toBe('Novice');
    expect(rankFor(10).name).toBe('Adept');
    expect(rankFor(99).name).toBe('Legend');
  });
});

describe('dates', () => {
  it('addDaysStr crosses month boundaries', () => {
    expect(addDaysStr('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysStr('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('monthKey and weekdayOf', () => {
    expect(monthKey('2026-07-05')).toBe('2026-07');
    expect(weekdayOf('2026-07-05')).toBe(0); // a Sunday
  });

  it('addMonthsClamp clamps day-of-month', () => {
    expect(addMonthsClamp('2026-01-31', 1, 31)).toBe('2026-02-28');
    expect(addMonthsClamp('2026-02-28', 1, 31)).toBe('2026-03-31');
  });
});

describe('habitDueOn', () => {
  it('daily is due every day after creation, never before', () => {
    expect(habitDueOn(habit(), '2026-07-05')).toBe(true);
    expect(habitDueOn(habit({ createdAt: '2026-07-10' }), '2026-07-05')).toBe(false);
  });

  it('weekly respects weekday set, dates respects the list', () => {
    expect(habitDueOn(habit({ freq: 'weekly', weekdays: [0] }), '2026-07-05')).toBe(true);
    expect(habitDueOn(habit({ freq: 'weekly', weekdays: [1] }), '2026-07-05')).toBe(false);
    expect(habitDueOn(habit({ freq: 'dates', dates: ['2026-07-05'] }), '2026-07-05')).toBe(true);
    expect(habitDueOn(habit({ freq: 'dates', dates: [] }), '2026-07-05')).toBe(false);
  });

  it('archived habits are never due', () => {
    expect(habitDueOn(habit({ archived: true }), '2026-07-05')).toBe(false);
  });
});

describe('damage & payouts', () => {
  it('a long streak cushions a miss instead of amplifying it', () => {
    expect(missDamage('good', 0)).toBe(4);
    expect(missDamage('bad', 0)).toBe(6);
    // The longer the streak you broke, the softer the landing
    expect(missDamage('good', 10)).toBe(3);
    expect(missDamage('good', 30)).toBe(2);
    expect(missDamage('bad', 30)).toBe(3);
    expect(missDamage('good', 300)).toBe(2); // credit capped at 30 days
    // Never free, never punitive
    expect(missDamage('good', 9999)).toBeGreaterThanOrEqual(2);
  });

  it('quest payout scales with logged hours, priority pays +25% XP', () => {
    expect(questPayout(quest([]))).toEqual({ xp: 80, gold: 30, minutes: 0 });
    expect(questPayout(quest([60]))).toEqual({ xp: 120, gold: 42, minutes: 60 });
    expect(questPayout(quest([60], true)).xp).toBe(150);
  });

  it('quest target date/progress derive from targetDuration, not from hours logged', () => {
    const openEnded = quest([], false, { targetDuration: 'none', createdAt: '2026-01-01T00:00:00.000Z' });
    expect(questTargetDate(openEnded)).toBeNull();
    expect(questDeadlineProgress(openEnded)).toBeNull();

    const oneWeek = quest([], false, { targetDuration: '1w', createdAt: '2026-01-01T00:00:00.000Z' });
    expect(questTargetDate(oneWeek)).toBe('2026-01-08');

    const halfway = quest([], false, {
      targetDuration: '1w',
      createdAt: new Date(Date.now() - 3.5 * 86400000).toISOString(),
    });
    // Exact to the millisecond in principle; allow a hair of slack for test-execution time.
    expect(questDeadlineProgress(halfway)).toBeGreaterThanOrEqual(49);
    expect(questDeadlineProgress(halfway)).toBeLessThanOrEqual(51);

    const overdue = quest([], false, { targetDuration: '1d', createdAt: '2020-01-01T00:00:00.000Z' });
    expect(questDeadlineProgress(overdue)).toBe(100); // clamped, doesn't run past 100
  });

  it('overspend damage hits only the incremental overage, clamped 2..30', () => {
    expect(overspendDamage(100, 0, 90)).toBe(0);
    expect(overspendDamage(100, 0, 150)).toBe(10);
    expect(overspendDamage(100, 150, 160)).toBe(2); // 10 over, but already past budget
    expect(overspendDamage(100, 0, 10000)).toBe(30); // capped
    expect(overspendDamage(0, 0, 500)).toBe(0); // no budget set
  });

});

describe('journal lock', () => {
  const entry = (hoursAgo: number, unlocked = false): JournalEntry => ({
    id: 'e1', date: todayStr(), mood: 3, stress: 5, answers: [],
    createdAt: new Date(Date.now() - hoursAgo * 3600e3).toISOString(), unlocked,
  });

  it('editable inside 72h, sealed after, feather unseals', () => {
    expect(journalEditable(entry(1))).toBe(true);
    expect(journalEditable(entry(80))).toBe(false);
    expect(journalEditable(entry(80, true))).toBe(true);
  });
});
