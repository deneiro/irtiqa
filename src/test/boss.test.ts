import { beforeEach, describe, expect, it } from 'vitest';
import { BOSS_REQUIRED, BOSS_REWARD } from '../game/boss';
import { addDaysStr, todayStr, weekKey } from '../game/engine';
import { useGame } from '../store';

const g = () => useGame.getState();
const today = todayStr();

beforeEach(() => {
  g().resetGame();
});

describe('weekKey', () => {
  it('maps every day of a week to its Monday', () => {
    expect(weekKey('2026-07-06')).toBe('2026-07-06'); // Monday → itself
    expect(weekKey('2026-07-08')).toBe('2026-07-06'); // Wednesday
    expect(weekKey('2026-07-12')).toBe('2026-07-06'); // Sunday still belongs to Monday's week
    expect(weekKey('2026-07-13')).toBe('2026-07-06' === weekKey('2026-07-13') ? '2026-07-06' : '2026-07-13'); // next Monday starts fresh
    expect(weekKey('2026-07-13')).toBe('2026-07-13');
    expect(weekKey('2026-07-05')).toBe('2026-06-29'); // Sunday before → previous Monday
  });
});

describe('weekly boss', () => {
  it('spawns on reconcile from the weakest attribute', () => {
    g().createCharacter('T', 'warrior');
    useGame.setState({ attrs: { ...g().attrs, health: 100, friends: 100, family: 100, money: 100, career: 5, spirituality: 100, development: 100, brightness: 100 } });
    g().reconcile();
    expect(g().boss).not.toBeNull();
    expect(g().boss!.attr).toBe('career');
    expect(g().boss!.week).toBe(weekKey(today));
    expect(g().boss!.progress).toBe(0);
  });

  it('meaningful tagged actions strike it; the third strike slays it and pays out', () => {
    g().createCharacter('T', 'warrior');
    g().reconcile();
    const attr = g().boss!.attr;
    const goldBefore = g().character!.gold;

    // wrong attribute → no strike
    const other = attr === 'development' ? 'career' : 'development';
    g().addQuickTask('miss', other);
    g().completeQuickTask(g().quickTasks[0].id);
    expect(g().boss!.progress).toBe(0);

    for (let i = 0; i < BOSS_REQUIRED; i++) {
      g().addQuickTask(`hit${i}`, attr);
      const task = g().quickTasks.find(t => t.title === `hit${i}`)!;
      g().completeQuickTask(task.id);
    }
    expect(g().boss!.progress).toBe(BOSS_REQUIRED);
    expect(g().boss!.defeatedAt).toBeTruthy();
    expect(g().stats.bossesDefeated).toBe(1);
    expect(g().character!.gold).toBeGreaterThanOrEqual(goldBefore + BOSS_REWARD.gold);
    expect(g().unlocked['bossesDefeated_1']).toBeTruthy(); // First Strike achievement
  });

  it('tiny actions (under 8 base XP) never count as strikes', () => {
    g().createCharacter('T', 'warrior');
    g().reconcile();
    useGame.setState({ boss: { ...g().boss!, attr: 'money' } });
    g().addAccount('Cash', 0);
    // Income logging grants 6 XP tagged money — meaningful-action threshold is 8
    g().addTransaction({ accountId: g().accounts[0].id, type: 'income', amount: 100, category: 'Salary', note: '', date: today });
    expect(g().boss!.progress).toBe(0);
  });

  it('an unslain boss costs nothing at rollover and a fresh one spawns', () => {
    g().createCharacter('T', 'warrior');
    useGame.setState({
      boss: { week: addDaysStr(weekKey(today), -7), attr: 'health', required: BOSS_REQUIRED, progress: 1 },
      lastProcessedDay: today, // keep habit judging out of this test
    });
    g().reconcile();
    expect(g().character!.hp).toBe(100); // the boss is pure upside — it just leaves
    expect(g().boss!.week).toBe(weekKey(today)); // new boss for the new week
    expect(g().boss!.progress).toBe(0);
  });

  it('a slain boss expires quietly at rollover', () => {
    g().createCharacter('T', 'warrior');
    useGame.setState({
      boss: { week: addDaysStr(weekKey(today), -7), attr: 'health', required: BOSS_REQUIRED, progress: 3, defeatedAt: new Date().toISOString() },
      lastProcessedDay: today,
    });
    g().reconcile();
    expect(g().character!.hp).toBe(100);
    expect(g().boss!.week).toBe(weekKey(today));
  });

  it('a missed boss week never damages any class', () => {
    g().createCharacter('T', 'guardian');
    useGame.setState({
      boss: { week: addDaysStr(weekKey(today), -7), attr: 'health', required: BOSS_REQUIRED, progress: 0 },
      lastProcessedDay: today,
    });
    g().reconcile();
    expect(g().character!.hp).toBe(100);
  });
});
