import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysStr, todayStr } from '../game/engine';
import { buildInsights } from '../game/insights';
import type { FailureRecord, Habit, HabitDayStatus, JournalEntry, Tx } from '../game/types';
import { useGame } from '../store';

const g = () => useGame.getState();
const today = todayStr();
const daysAgo = (n: number) => addDaysStr(today, -n);

const dailyHabit = (id: string): Habit => ({
  id, name: id, kind: 'good', freq: 'daily', attrs: ['development'], streak: 0, best: 0, createdAt: daysAgo(50),
});

const entry = (day: string, mood: number, stress: number): JournalEntry => ({
  id: `j-${day}`, date: day, createdAt: `${day}T21:00:00.000Z`, mood, stress, answers: [],
});

const expense = (day: string, amount: number): Tx => ({
  id: `t-${day}-${amount}`, accountId: 'a1', type: 'expense', amount, category: 'Food', note: '', date: day,
});

describe('insights engine', () => {
  it('links mood to habit completion when both buckets have enough days', () => {
    const habitLog: Record<string, Record<string, HabitDayStatus>> = { h1: {} };
    const journal: JournalEntry[] = [];
    // 4 perfect high-mood days, 4 slipped low-mood days
    for (let i = 1; i <= 4; i++) {
      habitLog.h1[daysAgo(i)] = 'done';
      journal.push(entry(daysAgo(i), 5, 3));
    }
    for (let i = 5; i <= 8; i++) {
      habitLog.h1[daysAgo(i)] = 'failed';
      journal.push(entry(daysAgo(i), 2, 3));
    }
    const insights = buildInsights({ habits: [dailyHabit('h1')], habitLog, journal, txs: [], failures: [] }, today);
    const mood = insights.find(i => i.id === 'mood_habits');
    expect(mood).toBeTruthy();
    expect(mood!.text).toContain('5/5');
    expect(mood!.text).toContain('2/5');
  });

  it('stays silent when a bucket is too thin — no patterns from 2 data points', () => {
    const habitLog: Record<string, Record<string, HabitDayStatus>> = {
      h1: { [daysAgo(1)]: 'done', [daysAgo(2)]: 'failed' },
    };
    const journal = [entry(daysAgo(1), 5, 3), entry(daysAgo(2), 2, 3)];
    const insights = buildInsights({ habits: [dailyHabit('h1')], habitLog, journal, txs: [], failures: [] }, today);
    expect(insights.find(i => i.id === 'mood_habits')).toBeUndefined();
  });

  it('connects high-stress days to higher spending', () => {
    const journal: JournalEntry[] = [];
    const txs: Tx[] = [];
    for (let i = 1; i <= 3; i++) {
      journal.push(entry(daysAgo(i), 3, 8)); // stressed
      txs.push(expense(daysAgo(i), 60));
    }
    for (let i = 4; i <= 6; i++) {
      journal.push(entry(daysAgo(i), 3, 2)); // calm
      txs.push(expense(daysAgo(i), 10));
    }
    const insights = buildInsights({ habits: [], habitLog: {}, journal, txs, failures: [] }, today);
    const spend = insights.find(i => i.id === 'stress_spend');
    expect(spend).toBeTruthy();
    expect(spend!.text).toContain('60');
  });

  it('surfaces the player\'s own relapse triggers', () => {
    const failures: FailureRecord[] = [
      { id: 'f1', habitId: 'h1', date: daysAgo(3), prevStreak: 2, damage: 10, trigger: 'stress after work' },
      { id: 'f2', habitId: 'h1', date: daysAgo(1), prevStreak: 0, damage: 10, trigger: 'boredom at night' },
    ];
    const insights = buildInsights({ habits: [], habitLog: {}, journal: [], txs: [], failures }, today);
    const trig = insights.find(i => i.id === 'triggers');
    expect(trig).toBeTruthy();
    expect(trig!.text).toContain('boredom at night');
    expect(trig!.text).toContain('stress after work');
  });
});

describe('long-term goals', () => {
  beforeEach(() => {
    g().resetGame();
    g().createCharacter('T', 'warrior');
  });

  it('cannot be claimed until a linked quest is actually finished', () => {
    g().addGoal({ title: 'Launch the site', targetDate: addDaysStr(today, 90), attrs: ['career'], questIds: [] });
    const goal = g().goals[0];
    g().completeGoal(goal.id);
    expect(g().goals[0].completedAt).toBeUndefined(); // refused — no earned work behind it

    const qid = g().addQuest({ title: 'Build MVP', targetDuration: '1m', attrs: ['career'] });
    g().updateGoal(goal.id, { questIds: [qid] });
    g().completeGoal(goal.id);
    expect(g().goals[0].completedAt).toBeUndefined(); // linked but not finished — still refused
  });

  it('pays out once when claimed with real finished work behind it', () => {
    const qid = g().addQuest({ title: 'Build MVP', targetDuration: '1m', attrs: ['career'] });
    g().completeQuest(qid);
    g().addGoal({ title: 'Launch', targetDate: addDaysStr(today, 90), attrs: ['career'], questIds: [qid] });
    const goal = g().goals[0];
    const xpBefore = g().character!.xp;
    const goldBefore = g().character!.gold;

    g().completeGoal(goal.id);
    expect(g().goals[0].completedAt).toBeTruthy();
    expect(g().character!.xp).toBeGreaterThanOrEqual(xpBefore + 100);
    expect(g().character!.gold).toBeGreaterThanOrEqual(goldBefore + 50);

    // A completed goal is sealed: no double-claim, no edits
    const xpAfter = g().character!.xp;
    g().completeGoal(goal.id);
    expect(g().character!.xp).toBe(xpAfter);
    g().updateGoal(goal.id, { title: 'rewritten' });
    expect(g().goals[0].title).toBe('Launch');
  });
});

describe('relapse triggers', () => {
  beforeEach(() => {
    g().resetGame();
    g().createCharacter('T', 'warrior');
  });

  it('a relapse can be annotated with what triggered it', () => {
    g().addHabit({ name: 'No smoking', kind: 'bad', freq: 'daily', attrs: ['health'], weekdays: [], dates: [] });
    g().relapseHabit(g().habits[0].id);
    const failure = g().failures[0];
    expect(failure).toBeTruthy();
    g().setFailureTrigger(failure.id, '  drinks with friends  ');
    expect(g().failures[0].trigger).toBe('drinks with friends'); // trimmed
    g().setFailureTrigger(failure.id, '   ');
    expect(g().failures[0].trigger).toBe('drinks with friends'); // blank update ignored
  });
});
