import { describe, expect, it } from 'vitest';
import { SAVE_KEY, useGame } from '../store';

// A faithful version-5 save: what a real player had before the boss/chest/
// cosmetics/momentum systems existed. If migration ever eats this character,
// every real user's character dies on update — the one unforgivable bug.
const V5_SAVE = {
  version: 5,
  state: {
    character: { name: 'Veteran', classId: 'scholar', xp: 4200, hp: 73, gold: 310, createdAt: '2026-01-10T09:00:00.000Z' },
    attrs: { health: 500, friends: 200, family: 300, money: 800, career: 900, spirituality: 400, development: 1100, brightness: 150 },
    inventory: { potion_s: 2, streak_shield: 1 },
    effects: { indulgence: 1, xpBoostCharges: 3, maxPriority: 2, ghostDays: ['2026-08-01'] },
    ownedThemes: ['midnight', 'neon'],
    theme: 'neon',
    habits: [
      { id: 'h1', name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], streak: 21, best: 30, createdAt: '2026-01-11' },
    ],
    habitLog: { h1: { '2026-07-06': 'done' } },
    failures: [{ id: 'f1', habitId: 'h1', date: '2026-06-01', prevStreak: 9, damage: 9 }],
    quests: [
      // pre-duration quest shape (v2-era) — must be normalized, not dropped
      { id: 'q1', title: 'Old quest', estimateHours: 12, attrs: ['career'], sessions: [], priority: false, createdAt: '2026-05-01T10:00:00.000Z' },
    ],
    activeSession: null,
    quickTasks: [{ id: 't1', title: 'Old task', attr: 'money', createdAt: '2026-07-01T10:00:00.000Z' }],
    journal: [{ id: 'j1', date: '2026-07-01', createdAt: '2026-07-01T21:00:00.000Z', mood: 4, stress: 3, answers: [{ q: 'Q', a: 'A' }] }],
    contacts: [],
    debts: [],
    events: [],
    accounts: [{ id: 'a1', name: 'Cash', initialBalance: 500 }],
    txs: [],
    budgets: { Food: 300 },
    subs: [],
    wishlist: [],
    unlocked: { checkins_1: '2026-01-12T08:00:00.000Z' },
    stats: {
      checkins: 180, goldEarned: 900, questsCompleted: 4, sessionMinutes: 2000,
      itemsBought: 6, itemsUsed: 4, quickTasksDone: 30, debtsSettled: 2, bestStreak: 30,
      // no bossesDefeated — the field didn't exist yet
    },
    celebrations: [],
    lastProcessedDay: '2026-07-06',
    dashboardOrder: ['todayHabits', 'lifeBalance', 'attributes', 'quickTasks', 'quests', 'journal', 'calendar'],
    dashboardHidden: ['journal'],
  },
};

describe('save migration v5 → v6', () => {
  it('preserves the entire character and backfills every new field', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(V5_SAVE));
    await useGame.persist.rehydrate();
    const s = useGame.getState();

    // Nothing the player earned may be lost
    expect(s.character?.name).toBe('Veteran');
    expect(s.character?.gold).toBe(310);
    expect(s.character?.hp).toBe(73);
    expect(s.habits[0].streak).toBe(21);
    expect(s.attrs.development).toBe(1100);
    expect(s.inventory.potion_s).toBe(2);
    expect(s.ownedThemes).toContain('neon');
    expect(s.unlocked.checkins_1).toBeTruthy();
    expect(s.stats.checkins).toBe(180);
    expect(s.dashboardHidden).toEqual(['journal']);

    // Old quest shape converted, not dropped
    expect(s.quests[0].targetDuration).toBe('none');

    // New systems arrive with safe defaults
    expect(s.stats.bossesDefeated).toBe(0);
    expect(s.momentum).toEqual({ streak: 0, lastDay: '' });
    expect(s.ownedCosmetics).toEqual([]);
    expect(s.equippedCosmetics).toEqual({ frame: null, title: null, banner: null });
    expect(s.boss).toBeNull();
    expect(s.soundOn).toBe(true);
    expect(s.reminder).toEqual({ enabled: false, time: '20:00' });
    expect(s.effects.indulgence).toBe(1); // old effects fields intact
    expect(s.effects.comeback ?? null).toBeNull(); // new effects field backfilled

    // And the game engine can immediately run on the migrated save
    useGame.getState().reconcile();
    expect(useGame.getState().boss).not.toBeNull(); // boss spawns from weakest attr
    expect(useGame.getState().boss!.attr).toBe('brightness'); // 150 XP is the lowest
    expect(useGame.getState().character?.name).toBe('Veteran'); // still alive after reconcile

    // Clean up so this seeded save can't leak into other test files
    localStorage.removeItem(SAVE_KEY);
    useGame.getState().resetGame();
  });
});
