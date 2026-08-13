import { beforeEach, describe, expect, it } from 'vitest';
import { rollChest } from '../game/chest';
import { COSMETICS } from '../game/constants';
import { contractStatus } from '../game/contract';
import {
  addDaysStr,
  attunements,
  bardGold,
  boostCharges,
  classWeight,
  healerBondMult,
  heraldHabitMult,
  itemPrice,
  journalXp,
  momentumMult,
  questPayout,
  wardsStreak,
  sentinelBudgetMult,
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

describe('attunement budget (engine)', () => {
  it('splits a fixed 100% budget by how many classes are picked', () => {
    expect(attunements(['magician']).map(a => a.weight)).toEqual([1]);
    expect(attunements(['magician', 'herald']).map(a => a.weight)).toEqual([0.65, 0.35]);
    expect(attunements(['magician', 'herald', 'bard']).map(a => a.weight)).toEqual([0.5, 0.3, 0.2]);
    expect(attunements([])).toEqual([]);
  });

  it('marks a class mastered only at ≥60% attunement (Specialist or Duo-primary)', () => {
    expect(attunements(['magician'])[0].mastered).toBe(true); // 100%
    const duo = attunements(['magician', 'herald']);
    expect(duo[0].mastered).toBe(true); // 65%
    expect(duo[1].mastered).toBe(false); // 35%
    expect(attunements(['magician', 'herald', 'bard']).every(a => a.mastered)).toBe(false); // 50/30/20
  });

  it('classWeight reports a class share, 0 when unchosen', () => {
    expect(classWeight(['warden'], 'warden')).toBe(1);
    expect(classWeight(['magician', 'warden'], 'warden')).toBe(0.35);
    expect(classWeight(['magician'], 'warden')).toBe(0);
  });
});

describe('class perk math (engine)', () => {
  it('the Warden ward needs mastery, not merely a Warden in the loadout', () => {
    expect(wardsStreak(['warden'])).toBe(true); // solo: 100%
    expect(wardsStreak(['warden', 'magician'])).toBe(true); // lead: 65%
    expect(wardsStreak(['magician', 'warden'])).toBe(false); // second: 35%, below mastery
    expect(wardsStreak(['magician', 'warden', 'bard'])).toBe(false); // 30%
    expect(wardsStreak(['magician'])).toBe(false); // not a Warden
    expect(wardsStreak()).toBe(false);
  });

  it('itemPrice is the flat listed price (no class discount)', () => {
    const potion = { id: 'potion_s', price: 10 } as Parameters<typeof itemPrice>[0];
    expect(itemPrice(potion)).toBe(10);
  });

  it('Magician journals for up to +50% XP; boost charges are flat 5', () => {
    expect(journalXp(['magician'])).toBe(60); // solo: round(40 × 1.5)
    expect(journalXp(['warden', 'magician'])).toBe(47); // 35%: round(40 × 1.175)
    expect(journalXp(['warden'])).toBe(40);
    expect(journalXp()).toBe(40);
    expect(boostCharges()).toBe(5);
  });

  it('Sovereign deepens the Great Work (priority) quest bonus', () => {
    // 1h logged: base xp 80 + 40 = 120, gold 30 + 12 = 42
    expect(questPayout(mkQuest()).xp).toBe(120);
    expect(questPayout(mkQuest()).gold).toBe(42);
    expect(questPayout(mkQuest({ priority: true })).xp).toBe(150); // ×1.25
    expect(questPayout(mkQuest({ priority: true }), ['sovereign']).xp).toBe(210); // ×(1.25 + 0.5)
    expect(questPayout(mkQuest({ priority: true }), ['sovereign']).gold).toBe(42); // gold unaffected
  });

  it('scalable helpers scale with attunement weight', () => {
    expect(bardGold(['bard'])).toBe(2);
    expect(bardGold(['magician', 'bard'])).toBe(1); // round(2 × 0.35)
    expect(heraldHabitMult(['herald'])).toBeCloseTo(1.25);
    expect(healerBondMult(['healer'])).toBeCloseTo(1.4);
    expect(sentinelBudgetMult(['sentinel'])).toBeCloseTo(1.5);
  });
});

describe('class perks (store)', () => {
  /** A habit due on exactly one past day, so reconcile judges that day and nothing else. */
  const oneDayHabit = (name: string, streak: number) => {
    g().addHabit({ name, kind: 'good', freq: 'dates', attrs: ['development'], weekdays: [], dates: [daysAgo(2)] });
    const h = g().habits[g().habits.length - 1];
    useGame.setState({ habits: g().habits.map(x => (x.id === h.id ? { ...x, createdAt: daysAgo(10), streak } : x)) });
    return h.id;
  };

  it('the Warden ward saves a streak for free, without spending a paid Shield', () => {
    g().createCharacter('T', ['warden']);
    const id = oneDayHabit('Read', 9);
    useGame.setState({ inventory: { streak_shield: 1 }, lastProcessedDay: daysAgo(3) });
    g().reconcile();

    expect(g().habitLog[id][daysAgo(2)]).toBe('shielded');
    expect(g().habits[0].streak).toBe(9); // the streak is what the perk protects
    expect(g().character!.hp).toBe(100);
    expect(g().inventory.streak_shield).toBe(1); // free ward spends first — the item is untouched
    expect(g().stats.itemsUsed).toBe(0);
    expect(g().failures.length).toBe(0); // nothing to pardon — the miss never landed
  });

  it('the ward is once a week, and a relapse still costs a non-Warden', () => {
    g().createCharacter('T', ['warden']);
    const long = oneDayHabit('Long run', 9);
    const other = oneDayHabit('Other run', 4);
    useGame.setState({ lastProcessedDay: daysAgo(3) });
    g().reconcile();
    expect(g().habitLog[long][daysAgo(2)]).toBe('shielded'); // longest streak wins the ward
    expect(g().habitLog[other][daysAgo(2)]).toBe('failed'); // one ward a week, and it is spent

    g().resetGame();
    g().createCharacter('T', ['magician']);
    g().addHabit({ name: 'No smoking', kind: 'bad', freq: 'daily', attrs: ['health'], weekdays: [], dates: [] });
    g().relapseHabit(g().habits[0].id);
    expect(g().character!.hp).toBe(94); // base 6 for a confessed relapse, no reduction anywhere
  });

  it('Bard earns bonus gold per check-in at full attunement', () => {
    g().createCharacter('T', ['bard']);
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    g().checkinHabit(g().habits[0].id);
    expect(g().character!.gold).toBe(17); // 5 base + 2 Bard + 10 First Step achievement
  });

  it('a solo class grants deeper affinity XP than the same class in a trio', () => {
    // Magician solo (affinity 0.14) vs Magician as a trio's primary (affinity 0.08) on a
    // development check-in (12 base) — the gap is wide enough to survive rounding.
    g().createCharacter('Solo', ['magician']);
    g().addHabit({ name: 'Study', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    g().checkinHabit(g().habits[0].id); // round(12 × 1.14) = 14, + First Step achievement
    const solo = g().character!.xp;

    g().resetGame();
    g().createCharacter('Trio', ['magician', 'warden', 'bard']);
    g().addHabit({ name: 'Study', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    g().checkinHabit(g().habits[0].id); // round(12 × 1.08) = 13, + same achievement
    const trio = g().character!.xp;

    expect(solo).toBeGreaterThan(trio);
  });
});

describe('comeback (the Long Sleep)', () => {
  it('short absences are judged normally with damage, no comeback', () => {
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['healer']); // no development affinity — keeps the base number clean
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
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['magician']);
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
    g().createCharacter('T', ['magician']);
    useGame.setState({ adminUnlockAll: false }); // real ownership gate, not the owner-mode preview
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

  it('owner mode previews any cosmetic, without granting real ownership', () => {
    g().createCharacter('T', ['magician']);
    useGame.setState({ adminUnlockAll: true, ownedCosmetics: [] });

    g().equipCosmetic('frame', 'frame_gilded');
    expect(g().equippedCosmetics.frame).toBe('frame_gilded');
    expect(g().ownedCosmetics).toEqual([]); // preview only — the real collection is untouched

    // Turning owner mode off unequips anything that was never actually earned,
    // same trap-avoidance as the theme fallback to Midnight.
    g().setAdminUnlockAll(false);
    expect(g().equippedCosmetics.frame).toBeNull();
  });

  it('an owner-mode-off toggle leaves genuinely owned equipped cosmetics alone', () => {
    g().createCharacter('T', ['magician']);
    useGame.setState({ adminUnlockAll: true, ownedCosmetics: ['frame_gilded'] });
    g().equipCosmetic('frame', 'frame_gilded');

    g().setAdminUnlockAll(false);
    expect(g().equippedCosmetics.frame).toBe('frame_gilded');
  });
});
