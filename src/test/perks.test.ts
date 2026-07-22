import { beforeEach, describe, expect, it } from 'vitest';
import { rollChest } from '../game/chest';
import { COSMETICS } from '../game/constants';
import { contractStatus } from '../game/contract';
import {
  addDaysStr,
  boostCharges,
  itemPrice,
  journalXp,
  momentumMult,
  questPayout,
  reduceDamage,
  todayStr,
} from '../game/engine';
import type { Quest } from '../game/types';
import { useGame } from '../store';

const g = () => useGame.getState();
const today = todayStr();
const daysAgo = (n: number) => addDaysStr(today, -n);

/** Deterministic "random" source: replays the given values in order. */
const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

const mkQuest = (patch: Partial<Quest> = {}): Quest => ({
  id: 'q1', title: 'Q', targetDuration: 'none', attrs: ['career'], priority: false,
  createdAt: new Date().toISOString(),
  sessions: [{ id: 's1', date: today, minutes: 60, note: '' }],
  ...patch,
});

beforeEach(() => {
  g().resetGame();
});

describe('class perk math (engine)', () => {
  it('guardian takes 25% less damage, floored at 1', () => {
    expect(reduceDamage(10, 'guardian')).toBe(8);
    expect(reduceDamage(10, 'warrior')).toBe(10);
    expect(reduceDamage(1, 'guardian')).toBe(1);
  });

  it('merchant pays 10% less for items', () => {
    const potion = { id: 'potion_s', price: 25 } as Parameters<typeof itemPrice>[0];
    expect(itemPrice(potion, 'merchant')).toBe(23);
    expect(itemPrice(potion, 'bard')).toBe(25);
  });

  it('scholar journals for +25% XP; magician gets 7 boost charges', () => {
    expect(journalXp('scholar')).toBe(50);
    expect(journalXp('warrior')).toBe(40);
    expect(boostCharges('magician')).toBe(7);
    expect(boostCharges('scholar')).toBe(5);
  });

  it('warrior gets +10% quest payouts; strategist deepens the priority bonus', () => {
    // 1h logged: base xp 80 + 40 = 120, gold 30 + 12 = 42
    expect(questPayout(mkQuest()).xp).toBe(120);
    expect(questPayout(mkQuest(), 'warrior').xp).toBe(132);
    expect(questPayout(mkQuest(), 'warrior').gold).toBe(46);
    expect(questPayout(mkQuest({ priority: true })).xp).toBe(150); // ×1.25
    expect(questPayout(mkQuest({ priority: true }), 'strategist').xp).toBe(168); // ×1.4
  });
});

describe('class perks (store)', () => {
  it('guardian relapse damage is reduced', () => {
    g().createCharacter('T', 'guardian');
    g().addHabit({ name: 'No smoking', kind: 'bad', freq: 'daily', attrs: ['health'], weekdays: [], dates: [] });
    g().relapseHabit(g().habits[0].id);
    expect(g().character!.hp).toBe(92); // raw 10 → guardian 8
  });

  it('bard earns +1 gold per check-in', () => {
    g().createCharacter('T', 'bard');
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    g().checkinHabit(g().habits[0].id);
    expect(g().character!.gold).toBe(16); // 5 + 1 bard + 10 First Step achievement
  });

  it('merchant discount is applied at purchase', () => {
    g().createCharacter('T', 'merchant');
    useGame.setState({ character: { ...g().character!, gold: 23 } });
    g().buyItem('potion_s'); // listed 25, merchant pays 23
    expect(g().inventory.potion_s).toBe(1);
    expect(g().character!.gold).toBe(10); // 0 left + First Purchase achievement gold
  });

  it('magician attribute boost grants 7 charges', () => {
    g().createCharacter('T', 'magician');
    useGame.setState({ inventory: { attr_boost: 1 } });
    g().useItem('attr_boost');
    expect(g().effects.xpBoostCharges).toBe(7);
  });
});

describe('comeback (the Long Sleep)', () => {
  it('short absences are judged normally with damage, no comeback', () => {
    g().createCharacter('T', 'warrior');
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    useGame.setState({
      habits: g().habits.map(h => ({ ...h, createdAt: daysAgo(10), streak: 5 })),
      lastProcessedDay: daysAgo(3),
    });
    g().reconcile();
    expect(g().effects.comeback ?? null).toBeNull();
    expect(g().character!.hp).toBeLessThan(100);
  });

  it('long absences skip the damage wall, reset streaks, and open a comeback quest', () => {
    g().createCharacter('T', 'warrior');
    for (const n of ['A', 'B', 'C']) {
      g().addHabit({ name: n, kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    }
    useGame.setState({
      habits: g().habits.map(h => ({ ...h, createdAt: daysAgo(20), streak: 9 })),
      momentum: { streak: 4, lastDay: daysAgo(8) },
      lastProcessedDay: daysAgo(7),
    });
    g().reconcile();
    expect(g().character!.hp).toBe(100); // no damage wall
    expect(g().habits.every(h => h.streak === 0)).toBe(true); // but streaks died
    expect(g().momentum.streak).toBe(0);
    expect(g().effects.comeback?.remaining).toBe(3);
    expect(g().failures.length).toBe(0); // nothing to pardon — the sleep was skipped, not judged
  });

  it('three check-ins after the Long Sleep restore HP', () => {
    g().createCharacter('T', 'warrior');
    for (const n of ['A', 'B', 'C']) {
      g().addHabit({ name: n, kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    }
    useGame.setState({
      character: { ...g().character!, hp: 50 },
      effects: { ...g().effects, comeback: { remaining: 3, expiresDay: addDaysStr(today, 2) } },
    });
    for (const h of g().habits) g().checkinHabit(h.id);
    expect(g().effects.comeback ?? null).toBeNull();
    expect(g().character!.hp).toBe(80); // 50 + 30 restored
  });
});

describe('perfect-day momentum', () => {
  it('a fully-done day increments momentum and regenerates HP', () => {
    g().createCharacter('T', 'warrior');
    g().addHabit({ name: 'One-off', kind: 'good', freq: 'dates', attrs: ['development'], weekdays: [], dates: [daysAgo(2)] });
    const id = g().habits[0].id;
    useGame.setState({
      character: { ...g().character!, hp: 50 },
      habits: g().habits.map(h => ({ ...h, createdAt: daysAgo(10) })),
      habitLog: { [id]: { [daysAgo(2)]: 'done' } },
      lastProcessedDay: daysAgo(3),
    });
    g().reconcile();
    expect(g().momentum.streak).toBe(1);
    expect(g().momentum.lastDay).toBe(daysAgo(2));
    expect(g().character!.hp).toBe(55); // +5 perfect-day regen
  });

  it('a failed day resets momentum to zero', () => {
    g().createCharacter('T', 'warrior');
    g().addHabit({ name: 'One-off', kind: 'good', freq: 'dates', attrs: ['development'], weekdays: [], dates: [daysAgo(2)] });
    useGame.setState({
      habits: g().habits.map(h => ({ ...h, createdAt: daysAgo(10) })),
      momentum: { streak: 6, lastDay: daysAgo(3) },
      lastProcessedDay: daysAgo(3),
    });
    g().reconcile();
    expect(g().momentum.streak).toBe(0);
  });

  it('momentum multiplies XP gains, capped at +20%', () => {
    expect(momentumMult(0)).toBe(1);
    expect(momentumMult(5)).toBeCloseTo(1.1);
    expect(momentumMult(25)).toBeCloseTo(1.2); // cap
    g().createCharacter('T', 'warrior');
    g().addQuickTask('warmup', 'development');
    g().completeQuickTask(g().quickTasks[0].id); // burns the first-task achievement
    const before = g().character!.xp;
    useGame.setState({ momentum: { streak: 5, lastDay: daysAgo(1) } });
    g().addQuickTask('boosted', 'development');
    g().completeQuickTask(g().quickTasks[1].id);
    expect(g().character!.xp - before).toBe(9); // round(8 × 1.1)
  });
});

describe('daily contract & chest', () => {
  it('contractStatus tracks all three legs', () => {
    g().createCharacter('T', 'warrior');
    let cs = contractStatus(g(), today);
    expect(cs.habitsOk).toBe(true); // nothing due — leg is free
    expect(cs.journalOk).toBe(false);
    expect(cs.extraOk).toBe(false);
    expect(cs.complete).toBe(false);

    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    cs = contractStatus(g(), today);
    expect(cs.habitsOk).toBe(false); // now something IS due

    g().checkinHabit(g().habits[0].id);
    g().addJournalEntry(3, 3, [{ q: 'q', a: 'a' }]);
    g().addQuickTask('extra', 'development');
    g().completeQuickTask(g().quickTasks[0].id);
    cs = contractStatus(g(), today);
    expect(cs).toMatchObject({ habitsOk: true, journalOk: true, extraOk: true, complete: true });
  });

  it('rollChest is deterministic under a seeded rand', () => {
    // base roll 0.5 → 19g; crit roll 0.5 → no crit; bonus roll 0.7 → none
    expect(rollChest(seq([0.5, 0.5, 0.7]), [])).toEqual({ gold: 19, crit: false, bonus: { kind: 'none' } });
    // crit doubles gold
    expect(rollChest(seq([0.5, 0.05, 0.7]), []).gold).toBe(38);
    // bonus < 0.15 → cosmetic; pick roll 0 → first weighted entry
    const loot = rollChest(seq([0, 0.9, 0.1, 0]), []);
    expect(loot.bonus.kind).toBe('cosmetic');
    // owning everything falls through to gold, never a dead slot
    const all = COSMETICS.map(c => c.id);
    expect(rollChest(seq([0, 0.9, 0.1, 0]), all).bonus).toEqual({ kind: 'gold', amount: 15 });
    // boost and shield bands
    expect(rollChest(seq([0, 0.9, 0.2]), []).bonus).toEqual({ kind: 'boost', charges: 2 });
    expect(rollChest(seq([0, 0.9, 0.35]), []).bonus).toEqual({ kind: 'shield' });
  });

  it('openChest pays once per day and only when the contract is complete', () => {
    g().createCharacter('T', 'warrior');
    g().openChest();
    expect(g().chestLastOpened).toBe(''); // contract not complete — nothing happened

    g().addJournalEntry(3, 3, [{ q: 'q', a: 'a' }]);
    g().addQuickTask('extra', 'development');
    g().completeQuickTask(g().quickTasks[0].id);
    const before = g().character!.gold;
    g().openChest();
    expect(g().chestLastOpened).toBe(today);
    expect(g().lastChestLoot?.day).toBe(today);
    expect(g().character!.gold).toBeGreaterThan(before);

    const after = g().character!.gold;
    g().openChest(); // second open is a hard no-op
    expect(g().character!.gold).toBe(after);
  });
});

describe('cosmetics', () => {
  it('only owned cosmetics can be equipped, and slots are enforced', () => {
    g().createCharacter('T', 'warrior');
    g().equipCosmetic('frame', 'frame_gilded');
    expect(g().equippedCosmetics.frame).toBeNull(); // not owned

    useGame.setState({ ownedCosmetics: ['frame_gilded', 'title_unbroken'] });
    g().equipCosmetic('frame', 'frame_gilded');
    expect(g().equippedCosmetics.frame).toBe('frame_gilded');

    g().equipCosmetic('banner', 'title_unbroken'); // wrong slot
    expect(g().equippedCosmetics.banner).toBeNull();

    g().equipCosmetic('frame', null); // unequip
    expect(g().equippedCosmetics.frame).toBeNull();
  });
});
