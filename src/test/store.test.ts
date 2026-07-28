import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysStr, todayStr } from '../game/engine';
import { useGame } from '../store';

const g = () => useGame.getState();
const today = todayStr();
const daysAgo = (n: number) => addDaysStr(today, -n);

beforeEach(() => {
  g().resetGame();
  // Warrior boosts only Health XP; tests use non-health attrs so multipliers stay 1.
  g().createCharacter('Tester', ['healer']);
});

describe('habits', () => {
  it('check-in rewards XP/gold and starts a streak', () => {
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    const id = g().habits[0].id;
    g().checkinHabit(id);
    // 12 XP + 20 XP "First Step" achievement; 5 + 10 gold
    expect(g().character!.xp).toBe(32);
    expect(g().character!.gold).toBe(15);
    expect(g().habits[0].streak).toBe(1);
    expect(g().habitLog[id][today]).toBe('done');
    // double check-in is a no-op
    g().checkinHabit(id);
    expect(g().character!.xp).toBe(32);
  });

  it('check-in for a day outside the grace window is rejected', () => {
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    const id = g().habits[0].id;
    g().checkinHabit(id, daysAgo(2));
    expect(g().habitLog[id]?.[daysAgo(2)]).toBeUndefined();
    expect(g().character!.xp).toBe(0);
  });

  it('relapse deals heavier bad-habit damage; indulgence forgives it', () => {
    g().addHabit({ name: 'No smoking', kind: 'bad', freq: 'daily', attrs: ['health'], weekdays: [], dates: [] });
    const id = g().habits[0].id;
    g().relapseHabit(id);
    expect(g().character!.hp).toBe(94); // base 6 for a confessed relapse

    g().resetGame();
    g().createCharacter('Tester', ['healer']);
    g().addHabit({ name: 'No smoking', kind: 'bad', freq: 'daily', attrs: ['health'], weekdays: [], dates: [] });
    const id2 = g().habits[0].id;
    useGame.setState({ effects: { ...g().effects, indulgence: 1 } });
    g().relapseHabit(id2);
    expect(g().character!.hp).toBe(100);
    expect(g().habitLog[id2][today]).toBe('indulged');
    expect(g().effects.indulgence).toBe(0);
  });
});

describe('reconciliation', () => {
  it('shields protect the longest streak (3+); short streaks just fail', () => {
    g().addHabit({ name: 'Big streak', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    g().addHabit({ name: 'Small streak', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    const [big, small] = g().habits;
    useGame.setState({
      habits: g().habits.map(h => ({
        ...h,
        createdAt: daysAgo(10),
        streak: h.id === big.id ? 5 : 1,
      })),
      inventory: { streak_shield: 1 },
      lastProcessedDay: daysAgo(3),
    });
    g().reconcile();
    expect(g().habitLog[big.id][daysAgo(2)]).toBe('shielded');
    expect(g().habitLog[small.id][daysAgo(2)]).toBe('failed');
    expect(g().inventory.streak_shield).toBe(0);
    expect(g().character!.hp).toBeLessThan(100);
    expect(g().habits.find(h => h.id === small.id)!.streak).toBe(0);
  });

  it('ghost days freeze everything', () => {
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    const id = g().habits[0].id;
    useGame.setState({
      habits: g().habits.map(h => ({ ...h, createdAt: daysAgo(10), streak: 4 })),
      effects: { ...g().effects, ghostDays: [daysAgo(2)] },
      lastProcessedDay: daysAgo(3),
    });
    g().reconcile();
    expect(g().habitLog[id][daysAgo(2)]).toBe('ghost');
  });

  it('lastProcessedDay is monotonic — a clock rollback cannot re-judge days', () => {
    g().addHabit({ name: 'Read', kind: 'good', freq: 'daily', attrs: ['development'], weekdays: [], dates: [] });
    useGame.setState({
      habits: g().habits.map(h => ({ ...h, createdAt: daysAgo(10) })),
      lastProcessedDay: today,
    });
    g().reconcile();
    expect(g().lastProcessedDay).toBe(today);
    expect(g().character!.hp).toBe(100);
  });
});

describe('quests', () => {
  it('sessions cap at 240 minutes — a forgotten timer cannot mint XP', () => {
    const id = g().addQuest({ title: 'Q', targetDuration: 'none', attrs: ['career'] });
    g().startSession(id);
    useGame.setState({ activeSession: { questId: id, startedAt: Date.now() - 500 * 60000 } });
    g().finishSession('worked');
    const quest = g().quests.find(q => q.id === id)!;
    expect(quest.sessions[0].minutes).toBe(240);
    expect(g().stats.sessionMinutes).toBe(240);
  });

  it('priority quests stay available at 0 HP', () => {
    const id = g().addQuest({ title: 'Q', targetDuration: 'none', attrs: ['career'] });
    useGame.setState({ character: { ...g().character!, hp: 0 } });
    g().setQuestPriority(id, true);
    // Being run down is when focusing on one thing matters most — it used to lock here
    expect(g().quests.find(q => q.id === id)!.priority).toBe(true);
  });
});

describe('HP & boost charges', () => {
  it('XP gains are not reduced at 0 HP', () => {
    g().addQuickTask('one', 'development');
    g().completeQuickTask(g().quickTasks[0].id); // 8 XP + first-task achievement
    const before = g().character!.xp;
    useGame.setState({ character: { ...g().character!, hp: 0 } });
    g().addQuickTask('two', 'development');
    g().completeQuickTask(g().quickTasks[1].id);
    // Effort is worth the same on your worst day as your best
    expect(g().character!.xp - before).toBe(8);
  });

  it('boost charges skip tiny actions and fire on real ones', () => {
    g().addAccount('Cash', 0);
    useGame.setState({ effects: { ...g().effects, xpBoostCharges: 5 } });
    g().addTransaction({ accountId: g().accounts[0].id, type: 'income', amount: 100, category: 'Salary', note: '', date: today });
    expect(g().effects.xpBoostCharges).toBe(5); // 6 base XP — below the threshold
    g().addQuickTask('task', 'development');
    g().completeQuickTask(g().quickTasks[0].id);
    expect(g().effects.xpBoostCharges).toBe(4); // 8 base XP — consumed
  });
});

describe('finances', () => {
  it('blowing a budget deals scaled HP damage', () => {
    g().addAccount('Cash', 1000);
    g().setBudget('Food', 100);
    g().addTransaction({ accountId: g().accounts[0].id, type: 'expense', amount: 150, category: 'Food', note: '', date: today });
    expect(g().character!.hp).toBe(90); // 50 over a 100 budget → 10 damage
  });

  it('only today\'s transactions can be deleted', () => {
    g().addAccount('Cash', 1000);
    const acc = g().accounts[0].id;
    g().addTransaction({ accountId: acc, type: 'expense', amount: 10, category: 'Food', note: 'old', date: daysAgo(1) });
    g().addTransaction({ accountId: acc, type: 'expense', amount: 10, category: 'Food', note: 'new', date: today });
    const [oldTx, newTx] = [...g().txs];
    g().deleteTransaction(oldTx.id);
    expect(g().txs.some(t => t.id === oldTx.id)).toBe(true); // sealed
    g().deleteTransaction(newTx.id);
    expect(g().txs.some(t => t.id === newTx.id)).toBe(false);
  });
});

describe('debts', () => {
  it('partial payments reduce the remaining balance without settling it', () => {
    g().addContact({ name: 'Sam', archetypes: [], primaryGroup: 'friend', channels: {}, notes: '' });
    const contactId = g().contacts[0].id;
    g().addDebt({ contactId, direction: 'theyOwe', amount: 100, note: 'lunch' });
    const debtId = g().debts[0].id;

    g().payDebt(debtId, 40);
    const debt = g().debts.find(d => d.id === debtId)!;
    expect(debt.payments).toHaveLength(1);
    expect(debt.settledAt).toBeUndefined();
    expect(g().stats.debtsSettled).toBe(0);
  });

  it('paying the full remaining amount settles the debt and pays out once', () => {
    g().addContact({ name: 'Sam', archetypes: [], primaryGroup: 'friend', channels: {}, notes: '' });
    const contactId = g().contacts[0].id;
    g().addDebt({ contactId, direction: 'theyOwe', amount: 100, note: '' });
    const debtId = g().debts[0].id;

    g().payDebt(debtId, 40);
    g().payDebt(debtId, 60);
    const debt = g().debts.find(d => d.id === debtId)!;
    expect(debt.settledAt).toBeDefined();
    expect(debt.payments.reduce((a, p) => a + p.amount, 0)).toBe(100);
    expect(g().stats.debtsSettled).toBe(1);

    const xpBefore = g().character!.xp;
    g().payDebt(debtId, 10); // already settled — no-op, no extra reward
    expect(g().character!.xp).toBe(xpBefore);
  });

  it('a payment cannot exceed the remaining balance', () => {
    g().addContact({ name: 'Sam', archetypes: [], primaryGroup: 'friend', channels: {}, notes: '' });
    const contactId = g().contacts[0].id;
    g().addDebt({ contactId, direction: 'iOwe', amount: 50, note: '' });
    const debtId = g().debts[0].id;

    g().payDebt(debtId, 500);
    const debt = g().debts.find(d => d.id === debtId)!;
    expect(debt.payments.reduce((a, p) => a + p.amount, 0)).toBe(50);
    expect(debt.settledAt).toBeDefined();
  });

  it('paying with an account posts a real transaction (expense when I owe, income when they owe)', () => {
    g().addContact({ name: 'Sam', archetypes: [], primaryGroup: 'friend', channels: {}, notes: '' });
    const contactId = g().contacts[0].id;
    g().addAccount('Cash', 500);
    const accountId = g().accounts[0].id;

    g().addDebt({ contactId, direction: 'iOwe', amount: 30, note: '' });
    g().payDebt(g().debts[0].id, 30, accountId);
    expect(g().txs).toHaveLength(1);
    expect(g().txs[0].type).toBe('expense');
    expect(g().txs[0].category).toBe('Debt');

    g().addDebt({ contactId, direction: 'theyOwe', amount: 20, note: '' });
    g().payDebt(g().debts[1].id, 20, accountId);
    expect(g().txs).toHaveLength(2);
    expect(g().txs[1].type).toBe('income');
  });

  it('settleDebt pays off whatever remains in one shot', () => {
    g().addContact({ name: 'Sam', archetypes: [], primaryGroup: 'friend', channels: {}, notes: '' });
    const contactId = g().contacts[0].id;
    g().addDebt({ contactId, direction: 'theyOwe', amount: 100, note: '' });
    const debtId = g().debts[0].id;

    g().payDebt(debtId, 70);
    g().settleDebt(debtId);
    const debt = g().debts.find(d => d.id === debtId)!;
    expect(debt.settledAt).toBeDefined();
    expect(debt.payments.reduce((a, p) => a + p.amount, 0)).toBe(100);
  });
});

describe('transfers', () => {
  it('splits into two linked legs and moves the balance without touching XP, gold, or budgets', () => {
    g().addAccount('Cash', 100);
    g().addAccount('Bank', 50);
    const [cash, bank] = g().accounts;
    g().setBudget('Other', 1000);
    const xpBefore = g().character!.xp;
    const goldBefore = g().character!.gold;

    g().transferMoney(cash.id, bank.id, 40);
    expect(g().txs).toHaveLength(2);
    const [out, into] = g().txs;
    expect(out.type).toBe('expense');
    expect(out.accountId).toBe(cash.id);
    expect(into.type).toBe('income');
    expect(into.accountId).toBe(bank.id);
    expect(out.transferId).toBe(into.transferId);
    expect(out.category).toBe('Transfer');
    expect(g().character!.xp).toBe(xpBefore);
    expect(g().character!.gold).toBe(goldBefore);
    expect(g().character!.hp).toBe(100); // no budget damage
  });

  it('is a no-op for the same account, zero amount, or an unknown account', () => {
    g().addAccount('Cash', 100);
    const cash = g().accounts[0];
    g().transferMoney(cash.id, cash.id, 10);
    g().transferMoney(cash.id, 'bank', 0);
    g().transferMoney(cash.id, 'does-not-exist', 10);
    expect(g().txs).toHaveLength(0);
  });

  it('deleting one leg removes both, but only on the day it was made', () => {
    g().addAccount('Cash', 100);
    g().addAccount('Bank', 50);
    const [cash, bank] = g().accounts;
    g().transferMoney(cash.id, bank.id, 40);
    const [leg1] = g().txs;
    g().deleteTransaction(leg1.id);
    expect(g().txs).toHaveLength(0);
  });

  it('cannot be farmed to unlock the transaction-count achievement', () => {
    g().addAccount('Cash', 1000);
    g().addAccount('Bank', 0);
    const [cash, bank] = g().accounts;
    // 10 transfers = 20 tx rows, well past the "Ledger Keeper" threshold of 20 real transactions
    for (let i = 0; i < 10; i++) g().transferMoney(cash.id, bank.id, 1);
    expect(g().txs).toHaveLength(20);

    // One genuine transaction triggers the achievement check against the *real* activity count
    g().addTransaction({ accountId: cash.id, type: 'income', amount: 5, category: 'Other income', note: '', date: today });
    expect(g().unlocked['txs_20']).toBeUndefined(); // only 1 real transaction — the 20 transfer legs don't count
    expect(g().unlocked['txs_1']).toBeDefined(); // the one real transaction still unlocks the first tier
  });
});

describe('market', () => {
  it('potions heal, are consumed, and refuse to waste at full HP', () => {
    useGame.setState({ character: { ...g().character!, hp: 50 }, inventory: { potion_s: 1 } });
    g().useItem('potion_s');
    expect(g().character!.hp).toBe(65);
    expect(g().inventory.potion_s).toBe(0);

    useGame.setState({ character: { ...g().character!, hp: 100 }, inventory: { potion_s: 1 } });
    g().useItem('potion_s');
    expect(g().character!.hp).toBe(100);
    expect(g().inventory.potion_s).toBe(1); // not consumed
  });
});


describe('one identity — the loadout is the radical profile', () => {
  it('derives the profile from the chosen classes, in the same order', () => {
    g().resetGame();
    g().createCharacter('Tester', ['magician', 'bard', 'herald']);
    // magician=schizoid, bard=hysteroid, herald=hyperthymic (see CLASS_RADICAL)
    expect(g().character!.profile).toEqual(['schizoid', 'hysteroid', 'hyperthymic']);
  });

  it('a single-class loadout still yields a one-radical profile, not an empty one', () => {
    g().resetGame();
    g().createCharacter('Solo', ['warden']);
    expect(g().character!.profile).toEqual(['epileptoid']);
  });
});

describe('Day One starter kit', () => {
  it('seeds the picked templates as real habits and quests, dated today', () => {
    g().resetGame();
    g().createCharacter('Tester', ['healer'], undefined, ['h_pushups', 'q_declutter']);
    expect(g().habits).toHaveLength(1);
    expect(g().habits[0].name).toBe('Ten push-ups');
    expect(g().habits[0].createdAt).toBe(today);
    expect(g().quests).toHaveLength(1);
    expect(g().quests[0].title).toBe('Clear the space');
  });

  it('grants nothing for seeding them — the kit is a starting point, not a payout', () => {
    g().resetGame();
    g().createCharacter('Tester', ['healer'], undefined, ['h_pushups', 'h_water', 'q_declutter']);
    expect(g().character!.xp).toBe(0);
    expect(g().character!.gold).toBe(0);
  });

  it('ignores unknown template ids rather than creating empty records', () => {
    g().resetGame();
    g().createCharacter('Tester', ['healer'], undefined, ['nope_not_a_template']);
    expect(g().habits).toHaveLength(0);
    expect(g().quests).toHaveLength(0);
  });

  it('does not open the previous-day recap for a character that did not exist yesterday', () => {
    g().resetGame();
    g().createCharacter('Tester', ['healer']);
    expect(g().lastRecapDay).toBe(today);
  });
});

describe('the data-entry XP faucet is closed', () => {
  const contact = { name: 'Alim', archetypes: [], primaryGroup: 'friend' as const, channels: {}, notes: '' };

  it('creating a contact pays nothing, so add-delete-repeat mints nothing', () => {
    const before = g().character!.xp;
    for (let i = 0; i < 5; i++) {
      g().addContact(contact);
      g().deleteContact(g().contacts[0].id);
    }
    expect(g().contacts).toHaveLength(0);
    // The one-time "Not Alone" achievement may fire on the first add; nothing may accrue after it.
    const afterFirstCycle = g().character!.xp;
    for (let i = 0; i < 5; i++) {
      g().addContact(contact);
      g().deleteContact(g().contacts[0].id);
    }
    expect(g().character!.xp).toBe(afterFirstCycle);
    expect(afterFirstCycle - before).toBeLessThanOrEqual(20); // at most the single bronze achievement
  });

  it('logging a debt pays nothing — paying it down is what pays', () => {
    g().addContact(contact);
    const contactId = g().contacts[0].id;
    const before = g().character!.xp;
    g().addDebt({ contactId, direction: 'iOwe', amount: 1000, note: '' });
    expect(g().character!.xp).toBe(before);

    g().payDebt(g().debts[0].id, 1000);
    expect(g().character!.xp).toBeGreaterThan(before); // settling is the payable moment
  });
});

describe('events pay when they happen, not when they are scheduled', () => {
  it('scheduling grants nothing; completing grants once', () => {
    const before = g().character!.xp;
    g().addEvent({ title: 'Coffee with Alim', date: today });
    expect(g().character!.xp).toBe(before);

    const id = g().events[0].id;
    g().completeEvent(id);
    const afterComplete = g().character!.xp;
    expect(afterComplete).toBeGreaterThan(before);
    expect(g().events[0].doneAt).toBeDefined();

    // Completing twice must not pay twice
    g().completeEvent(id);
    expect(g().character!.xp).toBe(afterComplete);
  });
});

describe('logManualSession — work done away from the timer', () => {
  const makeQuest = () => g().addQuest({ title: 'Ship it', targetDuration: '1m', attrs: ['career'] });

  it('records minutes against the quest without paying out early', () => {
    const id = makeQuest();
    const before = g().character!.xp;
    // Deliberately under an hour: crossing an hour would unlock the "Clocked In"
    // achievement, whose XP is a separate, legitimate award and would mask the
    // thing under test — that logging work does not itself pay.
    g().logManualSession(id, 45, 'Wrote the parser', today);
    expect(g().quests[0].sessions).toHaveLength(1);
    expect(g().quests[0].sessions[0].minutes).toBe(45);
    expect(g().stats.sessionMinutes).toBe(45);
    expect(g().character!.xp).toBe(before); // the payout lands on completion only
  });

  it('still counts toward the Deep Work achievement ladder, like a timed session', () => {
    const id = makeQuest();
    g().logManualSession(id, 60, 'An hour of real work', today);
    expect(g().unlocked['sessionHours_1']).toBeDefined();
  });

  it('caps a single sitting at four hours, same as the live timer', () => {
    const id = makeQuest();
    g().logManualSession(id, 10_000, 'Forgot to stop', today);
    expect(g().quests[0].sessions[0].minutes).toBe(240);
  });

  it('refuses a future date, clamping it to today', () => {
    const id = makeQuest();
    g().logManualSession(id, 30, 'Time traveller', addDaysStr(today, 5));
    expect(g().quests[0].sessions[0].date).toBe(today);
  });

  it('rounds sub-minute work up to one minute rather than storing zero', () => {
    const id = makeQuest();
    g().logManualSession(id, 0, 'Blink', today);
    expect(g().quests[0].sessions[0].minutes).toBe(1);
  });

  it('will not log against a completed quest', () => {
    const id = makeQuest();
    g().logManualSession(id, 60, 'Real work', today);
    g().completeQuest(id);
    g().logManualSession(id, 60, 'After the fact', today);
    expect(g().quests[0].sessions).toHaveLength(1);
  });
});

describe('currency', () => {
  it('defaults to tenge and only accepts codes the app actually knows', () => {
    expect(g().currency).toBe('KZT');
    g().setCurrency('USD');
    expect(g().currency).toBe('USD');
    g().setCurrency('DOGE');
    expect(g().currency).toBe('USD'); // unchanged
  });
});
