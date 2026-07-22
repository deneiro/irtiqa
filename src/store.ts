import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  ACHIEVEMENTS,
  ATTR_KEYS,
  ATTRIBUTES,
  CLASSES,
  COSMETIC_RARITY_META,
  COSMETICS,
  DEFAULT_DASHBOARD_ORDER,
  ITEMS,
  PRIMARY_GROUP_KEYS,
  TIER_REWARDS,
  TRANSFER_CATEGORY,
} from './game/constants';
import { BOSS_REQUIRED, BOSS_REWARD, BOSSES } from './game/boss';
import { type ChestLoot, rollChest } from './game/chest';
import { contractStatus } from './game/contract';
import {
  accountBalance,
  addDaysStr,
  addMonthsClamp,
  attrLevel,
  boostCharges,
  charLevel,
  clampHp,
  COMEBACK_CHECKINS,
  COMEBACK_HP,
  COMEBACK_WINDOW_DAYS,
  computeMetrics,
  debtRemaining,
  fmtDay,
  GRACE_HOUR,
  habitDueOn,
  itemPrice,
  journalEditable,
  journalXp,
  MAX_CATCHUP_DAYS,
  MAX_SESSION_MINUTES,
  missDamage,
  momentumMult,
  monthKey,
  overspendDamage,
  PERFECT_DAY_HP,
  questPayout,
  rankFor,
  reduceDamage,
  todayStr,
  uid,
  weekKey,
} from './game/engine';
import type {
  Account,
  AttributeKey,
  BossState,
  Celebration,
  Character,
  ClassId,
  Contact,
  CosmeticSlot,
  DashboardWidgetId,
  Debt,
  Effects,
  FailureRecord,
  Goal,
  Habit,
  HabitDayStatus,
  ItemId,
  JournalEntry,
  PersonalityArchetype,
  Quest,
  QuestDuration,
  QuickTask,
  SocialEvent,
  Stats,
  Subscription,
  Tx,
  WishlistItem,
} from './game/types';

// ---------------- State shape ----------------

export interface GameState {
  character: Character | null;
  attrs: Record<AttributeKey, number>; // xp per attribute
  inventory: Partial<Record<ItemId, number>>;
  effects: Effects;
  ownedThemes: string[];
  theme: string;

  habits: Habit[];
  habitLog: Record<string, Record<string, HabitDayStatus>>; // habitId -> day -> status
  failures: FailureRecord[];

  quests: Quest[];
  activeSession: { questId: string; startedAt: number } | null;
  quickTasks: QuickTask[];
  goals: Goal[];

  journal: JournalEntry[];

  contacts: Contact[];
  debts: Debt[];
  events: SocialEvent[];

  accounts: Account[];
  txs: Tx[];
  budgets: Record<string, number>;
  subs: Subscription[];
  wishlist: WishlistItem[];

  unlocked: Record<string, string>; // achievementId -> ISO unlock time
  stats: Stats;
  celebrations: Celebration[];
  lastProcessedDay: string;

  dashboardOrder: DashboardWidgetId[];
  dashboardHidden: DashboardWidgetId[];

  /** Consecutive fully-perfect days (every due habit done). Feeds the XP multiplier and HP regen. */
  momentum: { streak: number; lastDay: string };
  /** XP/Gold earned per local day, pruned to ~60 days. Powers the recap and future insights. */
  dayLog: Record<string, { xp: number; gold: number }>;
  chestLastOpened: string; // day the daily chest was last opened
  lastChestLoot: (ChestLoot & { day: string }) | null;
  ownedCosmetics: string[];
  equippedCosmetics: Record<CosmeticSlot, string | null>;
  lastRecapDay: string; // last day the end-of-day recap was shown

  boss: BossState | null;
  soundOn: boolean;
  reminder: { enabled: boolean; time: string }; // HH:MM, fires while a tab is open
  lastReminderDay: string;

  // ---- actions ----
  createCharacter: (name: string, classId: ClassId) => void;
  resetGame: () => void;
  reconcile: () => void;
  dismissCelebration: (id: string) => void;

  addHabit: (h: Omit<Habit, 'id' | 'streak' | 'best' | 'createdAt'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  archiveHabit: (id: string, archived: boolean) => void;
  deleteHabit: (id: string) => void;
  checkinHabit: (id: string, day?: string) => void;
  relapseHabit: (id: string) => void;

  addQuest: (q: { title: string; description?: string; targetDuration: QuestDuration; attrs: AttributeKey[] }) => string;
  deleteQuest: (id: string) => void;
  setQuestPriority: (id: string, on: boolean) => void;
  startSession: (questId: string) => void;
  finishSession: (note: string) => void;
  completeQuest: (id: string) => void;

  addQuickTask: (title: string, attr: AttributeKey, dueDate?: string) => void;
  completeQuickTask: (id: string) => void;
  deleteQuickTask: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>) => void;
  updateGoal: (id: string, patch: Partial<Pick<Goal, 'title' | 'why' | 'targetDate' | 'attrs' | 'questIds'>>) => void;
  deleteGoal: (id: string) => void;
  completeGoal: (id: string) => void;
  setFailureTrigger: (failureId: string, trigger: string) => void;

  addJournalEntry: (mood: number, stress: number, answers: { q: string; a: string }[]) => void;
  updateJournalEntry: (id: string, mood: number, stress: number, answers: { q: string; a: string }[]) => void;

  addContact: (c: Omit<Contact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addDebt: (d: Omit<Debt, 'id' | 'createdAt' | 'settledAt' | 'payments'>) => void;
  settleDebt: (id: string) => void;
  payDebt: (id: string, amount: number, accountId?: string) => void;
  deleteDebt: (id: string) => void;
  addEvent: (e: Omit<SocialEvent, 'id' | 'createdAt'>) => void;
  deleteEvent: (id: string) => void;

  addAccount: (name: string, initialBalance: number) => void;
  deleteAccount: (id: string) => void;
  addTransaction: (tx: Omit<Tx, 'id' | 'subId'>) => void;
  deleteTransaction: (id: string) => void;
  transferMoney: (fromAccountId: string, toAccountId: string, amount: number, note?: string) => void;
  setBudget: (category: string, amount: number) => void;
  addSubscription: (s: Omit<Subscription, 'id' | 'nextDue' | 'active'>) => void;
  cancelSubscription: (id: string) => void;
  addWishlistItem: (name: string, goldCost: number, moneyCost: number) => void;
  deleteWishlistItem: (id: string) => void;
  buyWishlistItem: (id: string, accountId: string) => void;

  buyItem: (id: ItemId) => void;
  useItem: (id: ItemId, payload?: UseItemPayload) => void;
  setTheme: (themeId: string) => void;

  setDashboardOrder: (order: DashboardWidgetId[]) => void;
  toggleDashboardWidget: (id: DashboardWidgetId) => void;
  resetDashboardLayout: () => void;

  openChest: () => void;
  equipCosmetic: (slot: CosmeticSlot, id: string | null) => void;
  dismissRecap: () => void;

  setProfile: (profile: PersonalityArchetype[]) => void;
  setSoundOn: (on: boolean) => void;
  setReminder: (patch: Partial<{ enabled: boolean; time: string }>) => void;
  markReminderFired: () => void;
}

export interface UseItemPayload {
  failureId?: string;
  entryId?: string;
  date?: string;
  name?: string;
  classId?: ClassId;
}

type D = GameState; // immer draft of GameState

// ---------------- Internal helpers (operate on the immer draft) ----------------

function pushCeleb(d: D, c: Omit<Celebration, 'id'>) {
  d.celebrations.push({ id: uid(), ...c });
}

/**
 * Grant XP/Gold. Applies class boost (highest matching tagged attribute) and
 * Attribute Boost charges. Emits reward toast + level-up / rank-up popups.
 */
function grantD(d: D, xp: number, gold: number, attrs: AttributeKey[], label: string) {
  if (!d.character) return;
  const beforeLevel = charLevel(d.character.xp);
  const beforeRank = rankFor(beforeLevel).name;

  let mult = 1;
  const cls = CLASSES.find(c => c.id === d.character!.classId);
  let clsBoost = 0;
  for (const a of attrs) clsBoost = Math.max(clsBoost, cls?.boosts[a] ?? 0);
  mult += clsBoost;

  // Perfect-day momentum: +2% per consecutive perfect day, capped at +20%
  mult += momentumMult(d.momentum.streak) - 1;

  let boosted = false;
  // Boost charges only fire on meaningful actions (>= 8 base XP) so they aren't wasted on 3-XP expense logs
  if (xp >= 8 && d.effects.xpBoostCharges > 0) {
    mult += 0.5;
    d.effects.xpBoostCharges--;
    boosted = true;
  }

  const finalXp = Math.round(xp * mult);
  d.character.xp += finalXp;

  const attrUps: string[] = [];
  for (const a of attrs) {
    const before = attrLevel(d.attrs[a]);
    d.attrs[a] += finalXp;
    const after = attrLevel(d.attrs[a]);
    if (after > before) attrUps.push(`${ATTRIBUTES[a].emoji} ${ATTRIBUTES[a].label} reached level ${after}`);
  }

  if (gold > 0) {
    d.character.gold += gold;
    d.stats.goldEarned += gold;
  }

  if (finalXp > 0 || gold > 0) {
    const dl = (d.dayLog[todayStr()] ??= { xp: 0, gold: 0 });
    dl.xp += finalXp;
    dl.gold += gold;
    pushCeleb(d, {
      type: 'reward',
      title: `+${finalXp} XP${gold > 0 ? ` · +${gold} 🪙` : ''}${boosted ? ' ⚡' : ''}`,
      subtitle: label,
    });
  }

  // Weekly boss: meaningful actions (>= 8 base XP) tagged with the boss's attribute strike it
  if (
    d.boss && !d.boss.defeatedAt && xp >= 8 &&
    d.boss.week === weekKey(todayStr()) && attrs.includes(d.boss.attr)
  ) {
    d.boss.progress++;
    if (d.boss.progress >= d.boss.required) {
      d.boss.defeatedAt = new Date().toISOString();
      d.stats.bossesDefeated++;
      d.character.xp += BOSS_REWARD.xp;
      d.attrs[d.boss.attr] += BOSS_REWARD.xp;
      d.character.gold += BOSS_REWARD.gold;
      d.stats.goldEarned += BOSS_REWARD.gold;
      const dl = (d.dayLog[todayStr()] ??= { xp: 0, gold: 0 });
      dl.xp += BOSS_REWARD.xp;
      dl.gold += BOSS_REWARD.gold;
      const bossDef = BOSSES[d.boss.attr];
      pushCeleb(d, {
        type: 'reward',
        title: `⚔️ ${bossDef.name} defeated!`,
        subtitle: `+${BOSS_REWARD.xp} XP · +${BOSS_REWARD.gold} 🪙 — your weakest front just got stronger.`,
      });
    }
  }

  const afterLevel = charLevel(d.character.xp);
  if (afterLevel > beforeLevel) {
    pushCeleb(d, { type: 'levelup', title: `Level ${afterLevel}!`, subtitle: `You leveled up. Keep going.` });
    const afterRank = rankFor(afterLevel);
    if (afterRank.name !== beforeRank) {
      pushCeleb(d, { type: 'rankup', title: `${afterRank.emoji} New Rank: ${afterRank.name}`, subtitle: 'Your title has grown with you.' });
    }
  }
  for (const up of attrUps) pushCeleb(d, { type: 'info', title: 'Attribute Level Up', subtitle: up });
}

function damageD(d: D, amount: number, label: string) {
  if (!d.character || amount <= 0) return;
  d.character.hp = clampHp(d.character.hp - amount);
  pushCeleb(d, { type: 'damage', title: `-${amount} HP`, subtitle: label });
}

function checkAchievementsD(d: D) {
  if (!d.character) return;
  const beforeLevel = charLevel(d.character.xp);
  for (let pass = 0; pass < 5; pass++) {
    const m = computeMetrics(d);
    let any = false;
    for (const a of ACHIEVEMENTS) {
      if (d.unlocked[a.id]) continue;
      if (a.cond(m)) {
        d.unlocked[a.id] = new Date().toISOString();
        const r = TIER_REWARDS[a.tier];
        d.character.xp += r.xp;
        d.character.gold += r.gold;
        d.stats.goldEarned += r.gold;
        const dl = (d.dayLog[todayStr()] ??= { xp: 0, gold: 0 });
        dl.xp += r.xp;
        dl.gold += r.gold;
        pushCeleb(d, {
          type: 'achievement',
          title: a.name,
          subtitle: `${a.desc} · +${r.xp} XP · +${r.gold} 🪙`,
          tier: a.tier,
        });
        any = true;
      }
    }
    if (!any) break;
  }
  const afterLevel = charLevel(d.character.xp);
  if (afterLevel > beforeLevel) {
    pushCeleb(d, { type: 'levelup', title: `Level ${afterLevel}!`, subtitle: 'Achievement rewards pushed you over the edge.' });
    const beforeRank = rankFor(beforeLevel).name;
    const afterRank = rankFor(afterLevel);
    if (afterRank.name !== beforeRank) {
      pushCeleb(d, { type: 'rankup', title: `${afterRank.emoji} New Rank: ${afterRank.name}`, subtitle: 'Your title has grown with you.' });
    }
  }
}

/** Post a transaction: applies budget-overspend HP damage; optionally grants logging XP. */
function postTxD(d: D, tx: Omit<Tx, 'id'>, reward: boolean) {
  d.txs.push({ ...tx, id: uid() });
  if (tx.type === 'expense') {
    const budget = d.budgets[tx.category] ?? 0;
    if (budget > 0) {
      const mk = monthKey(tx.date);
      const spentAfter = d.txs
        .filter(t => t.type === 'expense' && t.category === tx.category && monthKey(t.date) === mk)
        .reduce((a, t) => a + t.amount, 0);
      const spentBefore = spentAfter - tx.amount;
      const dmg = reduceDamage(overspendDamage(budget, spentBefore, spentAfter), d.character?.classId);
      if (dmg > 0) {
        damageD(d, dmg, `Over budget: ${tx.category}`);
        return;
      }
    }
    if (reward) grantD(d, 3, 0, ['money'], 'Expense logged in budget');
  } else if (reward) {
    grantD(d, 6, 0, ['money'], 'Income logged');
  }
}

/** Records a debt payment (partial or full), optionally posting it as a real transaction. */
function payDebtD(d: D, debt: Debt, amount: number, accountId?: string) {
  if (amount <= 0) return;
  debt.payments.push({ id: uid(), amount, date: todayStr(), accountId });

  if (accountId) {
    postTxD(d, {
      accountId,
      type: debt.direction === 'iOwe' ? 'expense' : 'income',
      amount,
      category: 'Debt',
      note: debt.direction === 'iOwe' ? 'Debt repayment' : 'Debt collected',
      date: todayStr(),
    }, false);
  }

  if (debtRemaining(debt) <= 0) {
    debt.settledAt = new Date().toISOString();
    d.stats.debtsSettled++;
    grantD(d, 15, 0, ['money'], 'Debt settled');
  } else {
    grantD(d, 5, 0, ['money'], 'Partial debt payment');
  }
  checkAchievementsD(d);
}

function consumeD(d: D, id: ItemId): boolean {
  const n = d.inventory[id] ?? 0;
  if (n < 1) return false;
  d.inventory[id] = n - 1;
  d.stats.itemsUsed++;
  return true;
}

/** Old saves stored freeform `groups: string[]` + a single `contactInfo` string. Fold those into the new dossier shape. */
function normalizeContact(c: Record<string, unknown>): Contact {
  const legacyGroups = Array.isArray(c.groups) ? (c.groups as string[]) : [];
  const legacyGroup = legacyGroups[0]?.toLowerCase() ?? '';
  const matched = PRIMARY_GROUP_KEYS.find(g => legacyGroup.includes(g));
  return {
    id: c.id as string,
    name: c.name as string,
    avatarUrl: (c.avatarUrl as string) || undefined,
    city: (c.city as string) || undefined,
    birthday: (c.birthday as string) || undefined,
    gender: (c.gender as Contact['gender']) || undefined,
    archetypes: Array.isArray(c.archetypes) ? (c.archetypes as Contact['archetypes']) : [],
    occupation: (c.occupation as string) || undefined,
    primaryGroup: (c.primaryGroup as Contact['primaryGroup']) ?? matched ?? 'friend',
    channels: (c.channels as Contact['channels']) ?? { phone: (c.contactInfo as string) || undefined },
    notes: (c.notes as string) ?? '',
    createdAt: c.createdAt as string,
  };
}

/** Old saves had no `payments` ledger — backfill a single payment for already-settled debts so remaining computes to 0. */
function normalizeDebt(dbt: Record<string, unknown>): Debt {
  if (Array.isArray(dbt.payments)) return dbt as unknown as Debt;
  const settledAt = dbt.settledAt as string | undefined;
  return {
    ...(dbt as unknown as Debt),
    payments: settledAt
      ? [{ id: uid(), amount: dbt.amount as number, date: settledAt.slice(0, 10) }]
      : [],
  };
}

/** Old saves had a free-text `estimateHours` instead of a duration preset — drop it, default to open-ended. */
function normalizeQuest(q: Record<string, unknown>): Quest {
  if (typeof q.targetDuration === 'string') return q as unknown as Quest;
  const { estimateHours: _estimateHours, ...rest } = q;
  return { ...(rest as unknown as Quest), targetDuration: 'none' };
}

const initialData = () => ({
  character: null as Character | null,
  attrs: {
    health: 0, friends: 0, family: 0, money: 0,
    career: 0, spirituality: 0, development: 0, brightness: 0,
  } as Record<AttributeKey, number>,
  inventory: {} as Partial<Record<ItemId, number>>,
  effects: { indulgence: 0, xpBoostCharges: 0, maxPriority: 1, ghostDays: [] as string[] },
  ownedThemes: ['midnight'],
  theme: 'midnight',
  habits: [] as Habit[],
  habitLog: {} as Record<string, Record<string, HabitDayStatus>>,
  failures: [] as FailureRecord[],
  quests: [] as Quest[],
  activeSession: null as { questId: string; startedAt: number } | null,
  quickTasks: [] as QuickTask[],
  goals: [] as Goal[],
  journal: [] as JournalEntry[],
  contacts: [] as Contact[],
  debts: [] as Debt[],
  events: [] as SocialEvent[],
  accounts: [] as Account[],
  txs: [] as Tx[],
  budgets: {} as Record<string, number>,
  subs: [] as Subscription[],
  wishlist: [] as WishlistItem[],
  unlocked: {} as Record<string, string>,
  stats: {
    checkins: 0, goldEarned: 0, questsCompleted: 0, sessionMinutes: 0,
    itemsBought: 0, itemsUsed: 0, quickTasksDone: 0, debtsSettled: 0, bestStreak: 0,
    bossesDefeated: 0,
  } as Stats,
  celebrations: [] as Celebration[],
  lastProcessedDay: todayStr(),
  dashboardOrder: [...DEFAULT_DASHBOARD_ORDER] as DashboardWidgetId[],
  dashboardHidden: [] as DashboardWidgetId[],
  momentum: { streak: 0, lastDay: '' },
  dayLog: {} as Record<string, { xp: number; gold: number }>,
  chestLastOpened: '',
  lastChestLoot: null as (ChestLoot & { day: string }) | null,
  ownedCosmetics: [] as string[],
  equippedCosmetics: { frame: null, title: null, banner: null } as Record<CosmeticSlot, string | null>,
  lastRecapDay: todayStr(),
  boss: null as BossState | null,
  soundOn: true,
  reminder: { enabled: false, time: '20:00' },
  lastReminderDay: '',
});

// ---------------- Store ----------------

export const useGame = create<GameState>()(
  persist(
    immer((set, get) => ({
      ...initialData(),

      createCharacter: (name, classId) =>
        set(d => {
          d.character = { name: name.trim(), classId, xp: 0, hp: 100, gold: 0, createdAt: new Date().toISOString() };
          d.lastProcessedDay = addDaysStr(todayStr(), -1);
          const cls = CLASSES.find(c => c.id === classId);
          pushCeleb(d, {
            type: 'info',
            title: `Welcome, ${d.character.name} the ${cls?.name ?? ''}`,
            subtitle: 'Your journey begins. Everything you earn here, you earn for real.',
          });
        }),

      resetGame: () => set(() => ({ ...initialData() })),

      dismissCelebration: id =>
        set(d => {
          d.celebrations = d.celebrations.filter(c => c.id !== id);
        }),

      // ------- End-of-day reconciliation: auto-fail missed habits, post subscriptions -------
      reconcile: () =>
        set(d => {
          if (!d.character) return;
          const today = todayStr();
          // Grace window: yesterday isn't judged until GRACE_HOUR, so "did it but fell asleep before logging" is recoverable
          const cutoff = new Date().getHours() >= GRACE_HOUR ? today : addDaysStr(today, -1);
          let day = addDaysStr(d.lastProcessedDay, 1);

          // A comeback offer that wasn't taken in time quietly lapses
          if (d.effects.comeback && today > d.effects.comeback.expiresDay) d.effects.comeback = null;

          // Count pending un-judged days
          let gap = 0;
          for (let t = day; t < cutoff && gap <= 60; t = addDaysStr(t, 1)) gap++;

          if (gap > MAX_CATCHUP_DAYS) {
            // The Long Sleep. Judging a week of absence habit-by-habit would nuke the
            // character to 0 HP at the exact moment they found the will to return — and
            // that's when people uninstall. Absence still has real costs (streaks and
            // momentum die, days earn nothing, chests unopened), but no damage wall.
            // Instead: a short comeback quest that restores HP for actually showing up.
            for (const h of d.habits) {
              if (h.streak === 0) continue;
              for (let t = day; t < cutoff; t = addDaysStr(t, 1)) {
                if (habitDueOn(h, t) && !d.habitLog[h.id]?.[t]) { h.streak = 0; break; }
              }
            }
            d.momentum.streak = 0;
            d.effects.comeback = { remaining: COMEBACK_CHECKINS, expiresDay: addDaysStr(today, COMEBACK_WINDOW_DAYS) };
            pushCeleb(d, {
              type: 'info',
              title: '🌙 The Long Sleep',
              subtitle: `You were away ${gap} days. Streaks faded — no damage taken. Check in ${COMEBACK_CHECKINS} habits by ${fmtDay(d.effects.comeback.expiresDay)} to restore ${COMEBACK_HP} HP.`,
            });
            day = cutoff; // the sleep itself is not judged
          }

          let missed = 0, dmgTotal = 0, shields = 0, indulged = 0, perfectDays = 0, regen = 0;
          let guard = 0;

          while (day < cutoff && guard < 400) {
            const isGhost = d.effects.ghostDays.includes(day);
            // Shields protect the longest streaks first, and only streaks worth saving (3+ days)
            const due = d.habits
              .filter(h => habitDueOn(h, day) && !d.habitLog[h.id]?.[day])
              .sort((a, b) => b.streak - a.streak);
            for (const h of due) {
              const log = (d.habitLog[h.id] ??= {});
              if (isGhost) { log[day] = 'ghost'; continue; }

              if (h.kind === 'good' && h.streak >= 3 && (d.inventory.streak_shield ?? 0) > 0) {
                d.inventory.streak_shield!--;
                d.stats.itemsUsed++;
                log[day] = 'shielded';
                shields++;
                continue;
              }
              if (h.kind === 'bad' && d.effects.indulgence > 0) {
                d.effects.indulgence--;
                log[day] = 'indulged';
                indulged++;
                continue;
              }
              // An unlogged day is not a confessed relapse: both habit kinds take the lighter miss damage here.
              // The heavier bad-habit damage applies only to explicit relapses (relapseHabit).
              const dmg = reduceDamage(missDamage('good', h.streak), d.character.classId);
              d.failures.push({ id: uid(), habitId: h.id, date: day, prevStreak: h.streak, damage: dmg });
              h.streak = 0;
              log[day] = 'failed';
              d.character.hp = clampHp(d.character.hp - dmg);
              missed++;
              dmgTotal += dmg;
            }

            // Perfect-day verdict: every due habit ended the day 'done' (shields and pardons
            // save streaks, not perfection). Ghost days are neutral — frozen, not judged.
            const dueAll = d.habits.filter(h => habitDueOn(h, day));
            if (dueAll.length > 0 && !isGhost) {
              if (dueAll.every(h => d.habitLog[h.id]?.[day] === 'done')) {
                d.momentum.streak++;
                d.momentum.lastDay = day;
                regen += Math.min(100 - d.character.hp, PERFECT_DAY_HP);
                d.character.hp = clampHp(d.character.hp + PERFECT_DAY_HP);
                perfectDays++;
              } else {
                d.momentum.streak = 0;
              }
            }

            day = addDaysStr(day, 1);
            guard++;
          }
          // Monotonic: a clock rolled backwards must never re-open already-judged days
          const processedThrough = addDaysStr(cutoff, -1);
          if (processedThrough > d.lastProcessedDay) d.lastProcessedDay = processedThrough;
          d.effects.ghostDays = d.effects.ghostDays.filter(g => g >= cutoff);

          // Keep the day log to a rolling ~60 days
          const dayLogFloor = addDaysStr(today, -60);
          for (const k of Object.keys(d.dayLog)) if (k < dayLogFloor) delete d.dayLog[k];

          // ---- Weekly boss lifecycle ----
          const wk = weekKey(today);
          if (d.boss && d.boss.week !== wk) {
            // An unslain boss simply leaves. It used to bill you 15 HP on the way out.
            d.boss = null;
          }
          if (!d.boss) {
            // The boss always rises from the least-fed attribute — slaying it IS rebalancing
            const weakest = ATTR_KEYS.reduce((min, k) => (d.attrs[k] < d.attrs[min] ? k : min), ATTR_KEYS[0]);
            d.boss = { week: wk, attr: weakest, required: BOSS_REQUIRED, progress: 0 };
            const bossDef = BOSSES[weakest];
            pushCeleb(d, {
              type: 'info',
              title: `${bossDef.emoji} A boss stalks your week: ${bossDef.name}`,
              subtitle: `It feeds on ${ATTRIBUTES[weakest].label}, your thinnest attribute. Land ${BOSS_REQUIRED} ${ATTRIBUTES[weakest].label}-tagged actions before Sunday to claim it.`,
            });
          }

          if (perfectDays > 0) {
            const pct = Math.round((momentumMult(d.momentum.streak) - 1) * 100);
            pushCeleb(d, {
              type: 'reward',
              title: `🔥 Perfect day${perfectDays > 1 ? 's' : ''}!`,
              subtitle: `Every habit done. Momentum ${d.momentum.streak} (+${pct}% XP)${regen > 0 ? ` · +${regen} HP` : ''}`,
            });
          }

          // Auto-post due subscriptions
          for (const sub of d.subs) {
            if (!sub.active) continue;
            let g = 0;
            while (sub.nextDue <= today && g < 24) {
              postTxD(d, {
                accountId: sub.accountId, type: 'expense', amount: sub.amount,
                category: sub.category, note: `Subscription: ${sub.name}`, date: sub.nextDue, subId: sub.id,
              }, false);
              sub.nextDue = addMonthsClamp(sub.nextDue, 1, sub.dayOfMonth);
              g++;
            }
          }

          if (missed > 0) pushCeleb(d, { type: 'damage', title: `-${dmgTotal} HP`, subtitle: `${missed} habit${missed > 1 ? 's' : ''} went unlogged. Today starts clean.` });
          if (shields > 0) pushCeleb(d, { type: 'item', title: '🛡️ Streak Shield activated', subtitle: `${shields} streak${shields > 1 ? 's' : ''} protected automatically` });
          if (indulged > 0) pushCeleb(d, { type: 'item', title: '🕯️ Indulgence consumed', subtitle: `${indulged} relapse${indulged > 1 ? 's' : ''} forgiven` });
          checkAchievementsD(d);
        }),

      // ------- Habits -------
      addHabit: h =>
        set(d => {
          d.habits.push({ ...h, id: uid(), streak: 0, best: 0, createdAt: todayStr() });
        }),

      updateHabit: (id, patch) =>
        set(d => {
          const h = d.habits.find(x => x.id === id);
          if (h) Object.assign(h, patch);
        }),

      archiveHabit: (id, archived) =>
        set(d => {
          const h = d.habits.find(x => x.id === id);
          if (h) h.archived = archived;
        }),

      deleteHabit: id =>
        set(d => {
          d.habits = d.habits.filter(x => x.id !== id);
          delete d.habitLog[id];
          d.failures = d.failures.filter(f => f.habitId !== id);
        }),

      checkinHabit: (id, day) =>
        set(d => {
          const h = d.habits.find(x => x.id === id);
          if (!h) return;
          const today = todayStr();
          const target = day ?? today;
          // Only today is checkable — plus yesterday during the morning grace window
          if (target !== today && (target !== addDaysStr(today, -1) || new Date().getHours() >= GRACE_HOUR)) return;
          if (!habitDueOn(h, target)) return;
          const log = (d.habitLog[id] ??= {});
          if (log[target]) return;
          log[target] = 'done';
          h.streak += 1;
          h.best = Math.max(h.best, h.streak);
          d.stats.checkins++;
          d.stats.bestStreak = Math.max(d.stats.bestStreak, h.best);
          const late = target !== today ? ' (late)' : '';
          const bard = d.character?.classId === 'bard' ? 1 : 0; // Bard perk: +1 Gold per check-in
          if (h.kind === 'good') grantD(d, 12, 5 + bard, h.attrs, `${h.name}${late} · 🔥 ${h.streak}`);
          else grantD(d, 8, 3 + bard, h.attrs, `Resisted: ${h.name}${late} · 🔥 ${h.streak}`);

          // Comeback quest: each check-in after the Long Sleep counts toward the HP restore
          if (d.effects.comeback && d.character) {
            d.effects.comeback.remaining--;
            if (d.effects.comeback.remaining <= 0) {
              d.character.hp = clampHp(d.character.hp + COMEBACK_HP);
              d.effects.comeback = null;
              pushCeleb(d, { type: 'reward', title: '🌅 The Hero Returns', subtitle: `+${COMEBACK_HP} HP restored. The road continues.` });
            }
          }
          checkAchievementsD(d);
        }),

      relapseHabit: id =>
        set(d => {
          const h = d.habits.find(x => x.id === id);
          const t = todayStr();
          if (!h || h.kind !== 'bad' || !habitDueOn(h, t)) return;
          const log = (d.habitLog[id] ??= {});
          if (log[t]) return;
          if (d.effects.indulgence > 0) {
            d.effects.indulgence--;
            log[t] = 'indulged';
            pushCeleb(d, { type: 'item', title: '🕯️ Indulgence consumed', subtitle: `${h.name}: relapse forgiven, no damage.` });
            return;
          }
          const dmg = reduceDamage(missDamage('bad', h.streak), d.character?.classId);
          d.failures.push({ id: uid(), habitId: h.id, date: t, prevStreak: h.streak, damage: dmg });
          h.streak = 0;
          log[t] = 'failed';
          damageD(d, dmg, `Relapse: ${h.name}`);
        }),

      // ------- Quests -------
      addQuest: q => {
        const id = uid();
        set(d => {
          d.quests.push({ ...q, id, sessions: [], priority: false, createdAt: new Date().toISOString() });
        });
        return id;
      },

      deleteQuest: id =>
        set(d => {
          if (d.activeSession?.questId === id) d.activeSession = null;
          d.quests = d.quests.filter(q => q.id !== id);
        }),

      setQuestPriority: (id, on) =>
        set(d => {
          const q = d.quests.find(x => x.id === id);
          if (!q || q.completedAt) return;
          // Removed: priority quests used to lock at 0 HP. Being run down is exactly
          // when choosing one thing to focus on matters most — locking it was backwards.
          if (on) {
            const count = d.quests.filter(x => x.priority && !x.completedAt).length;
            if (count >= d.effects.maxPriority) {
              pushCeleb(d, {
                type: 'info',
                title: 'Priority limit reached',
                subtitle: d.effects.maxPriority === 1
                  ? 'Only one priority quest allowed. Focus Unlock (Market) allows a second.'
                  : 'You can mark at most two priority quests.',
              });
              return;
            }
          }
          q.priority = on;
        }),

      startSession: questId =>
        set(d => {
          const q = d.quests.find(x => x.id === questId);
          if (!q || q.completedAt) return;
          if (d.activeSession) {
            pushCeleb(d, { type: 'info', title: 'Session already running', subtitle: 'Finish your current session first.' });
            return;
          }
          d.activeSession = { questId, startedAt: Date.now() };
        }),

      finishSession: note =>
        set(d => {
          const as = d.activeSession;
          if (!as) return;
          const q = d.quests.find(x => x.id === as.questId);
          d.activeSession = null;
          if (!q) return;
          const raw = Math.round((Date.now() - as.startedAt) / 60000);
          const minutes = Math.max(1, Math.min(raw, MAX_SESSION_MINUTES));
          q.sessions.push({ id: uid(), date: todayStr(), minutes, note: note.trim() });
          d.stats.sessionMinutes += minutes;
          pushCeleb(d, {
            type: 'info',
            title: 'Session logged',
            subtitle: raw > MAX_SESSION_MINUTES
              ? `Capped at 4h — a single sitting pays out at most ${MAX_SESSION_MINUTES / 60} hours.`
              : `${Math.floor(minutes / 60)}h ${minutes % 60}m recorded. The payout comes when the quest is done.`,
          });
          checkAchievementsD(d);
        }),

      completeQuest: id =>
        set(d => {
          const q = d.quests.find(x => x.id === id);
          if (!q || q.completedAt) return;
          if (d.activeSession?.questId === id) {
            pushCeleb(d, { type: 'info', title: 'Finish your session first', subtitle: 'Stop the running timer before completing the quest.' });
            return;
          }
          const payout = questPayout(q, d.character?.classId);
          q.completedAt = new Date().toISOString();
          q.priority = false;
          d.stats.questsCompleted++;
          grantD(d, payout.xp, payout.gold, q.attrs, `Quest complete: ${q.title}`);
          checkAchievementsD(d);
        }),

      // ------- Quick tasks -------
      addQuickTask: (title, attr, dueDate) =>
        set(d => {
          d.quickTasks.push({ id: uid(), title: title.trim(), attr, createdAt: new Date().toISOString(), dueDate });
        }),

      completeQuickTask: id =>
        set(d => {
          const t = d.quickTasks.find(x => x.id === id);
          if (!t || t.doneAt) return;
          t.doneAt = new Date().toISOString();
          d.stats.quickTasksDone++;
          grantD(d, 8, 2, [t.attr], t.title);
          checkAchievementsD(d);
        }),

      deleteQuickTask: id =>
        set(d => {
          d.quickTasks = d.quickTasks.filter(x => x.id !== id);
        }),

      // ------- Long-term goals -------
      addGoal: g =>
        set(d => {
          d.goals.push({ ...g, title: g.title.trim(), id: uid(), createdAt: new Date().toISOString() });
        }),

      updateGoal: (id, patch) =>
        set(d => {
          const goal = d.goals.find(x => x.id === id);
          if (!goal || goal.completedAt) return;
          Object.assign(goal, patch);
        }),

      deleteGoal: id =>
        set(d => {
          d.goals = d.goals.filter(x => x.id !== id);
        }),

      completeGoal: id =>
        set(d => {
          const goal = d.goals.find(x => x.id === id);
          if (!goal || goal.completedAt || !d.character) return;
          // A goal is earned, not declared: at least one linked quest must actually be finished
          const finishedLinked = goal.questIds.some(qid => d.quests.find(q => q.id === qid)?.completedAt);
          if (!finishedLinked) {
            pushCeleb(d, {
              type: 'info',
              title: 'A goal must be earned',
              subtitle: 'Link at least one quest to this goal and finish it — then come claim the milestone.',
            });
            return;
          }
          goal.completedAt = new Date().toISOString();
          grantD(d, 100, 50, goal.attrs, `Goal achieved: ${goal.title}`);
          checkAchievementsD(d);
        }),

      setFailureTrigger: (failureId, trigger) =>
        set(d => {
          const f = d.failures.find(x => x.id === failureId);
          if (f && trigger.trim()) f.trigger = trigger.trim();
        }),

      // ------- Journal -------
      addJournalEntry: (mood, stress, answers) =>
        set(d => {
          const t = todayStr();
          if (d.journal.some(e => e.date === t)) return;
          d.journal.push({ id: uid(), date: t, createdAt: new Date().toISOString(), mood, stress, answers });
          grantD(d, journalXp(d.character?.classId), 8, ['spirituality', 'development'], 'Journal entry written');
          checkAchievementsD(d);
        }),

      updateJournalEntry: (id, mood, stress, answers) =>
        set(d => {
          const e = d.journal.find(x => x.id === id);
          if (!e || !journalEditable(e)) return;
          e.mood = mood;
          e.stress = stress;
          e.answers = answers;
          if (e.unlocked && Date.now() - Date.parse(e.createdAt) >= 72 * 3600 * 1000) {
            e.unlocked = false; // Feather grants exactly one edit
            pushCeleb(d, { type: 'info', title: 'Entry rewritten', subtitle: 'The Feather of Time crumbles to dust. The entry is sealed again.' });
          }
        }),

      // ------- Social -------
      addContact: c =>
        set(d => {
          d.contacts.push({ ...c, id: uid(), createdAt: new Date().toISOString() });
          grantD(d, 6, 0, ['friends'], `New contact: ${c.name}`);
          checkAchievementsD(d);
        }),

      updateContact: (id, patch) =>
        set(d => {
          const c = d.contacts.find(x => x.id === id);
          if (c) Object.assign(c, patch);
        }),

      deleteContact: id =>
        set(d => {
          d.contacts = d.contacts.filter(x => x.id !== id);
          d.debts = d.debts.filter(x => x.contactId !== id);
          d.events = d.events.filter(x => x.contactId !== id);
        }),

      addDebt: debt =>
        set(d => {
          d.debts.push({ ...debt, id: uid(), createdAt: new Date().toISOString(), payments: [] });
          grantD(d, 4, 0, ['money'], 'Debt logged');
          checkAchievementsD(d);
        }),

      settleDebt: id =>
        set(d => {
          const debt = d.debts.find(x => x.id === id);
          if (!debt || debt.settledAt) return;
          payDebtD(d, debt, debtRemaining(debt));
        }),

      payDebt: (id, amount, accountId) =>
        set(d => {
          const debt = d.debts.find(x => x.id === id);
          if (!debt || debt.settledAt || amount <= 0) return;
          payDebtD(d, debt, Math.min(amount, debtRemaining(debt)), accountId);
        }),

      deleteDebt: id =>
        set(d => {
          d.debts = d.debts.filter(x => x.id !== id);
        }),

      addEvent: e =>
        set(d => {
          d.events.push({ ...e, id: uid(), createdAt: new Date().toISOString() });
          grantD(d, 2, 0, ['friends'], `Event added: ${e.title}`);
        }),

      deleteEvent: id =>
        set(d => {
          d.events = d.events.filter(x => x.id !== id);
        }),

      // ------- Finances -------
      addAccount: (name, initialBalance) =>
        set(d => {
          d.accounts.push({ id: uid(), name: name.trim(), initialBalance });
        }),

      deleteAccount: id =>
        set(d => {
          if (d.txs.some(t => t.accountId === id) || d.subs.some(s => s.accountId === id && s.active)) {
            pushCeleb(d, { type: 'info', title: 'Account in use', subtitle: 'This account has transactions or subscriptions and cannot be deleted.' });
            return;
          }
          d.accounts = d.accounts.filter(a => a.id !== id);
        }),

      addTransaction: tx =>
        set(d => {
          postTxD(d, tx, true);
          checkAchievementsD(d);
        }),

      deleteTransaction: id =>
        set(d => {
          const t = d.txs.find(x => x.id === id);
          if (!t) return;
          // Only same-day deletes (typo correction). Older entries are sealed so budget damage can't be laundered away.
          if (t.date !== todayStr()) {
            pushCeleb(d, { type: 'info', title: 'The ledger is sealed', subtitle: 'Only entries logged today can be deleted.' });
            return;
          }
          // A transfer is two linked legs — remove both so one account isn't left with a phantom half.
          d.txs = t.transferId ? d.txs.filter(x => x.transferId !== t.transferId) : d.txs.filter(x => x.id !== id);
        }),

      transferMoney: (fromAccountId, toAccountId, amount, note) =>
        set(d => {
          if (fromAccountId === toAccountId || amount <= 0) return;
          const from = d.accounts.find(a => a.id === fromAccountId);
          const to = d.accounts.find(a => a.id === toAccountId);
          if (!from || !to) return;
          const transferId = uid();
          const date = todayStr();
          const trimmed = note?.trim();
          // Plain bookkeeping: no XP/gold, no budget check, no achievement roll — moving your own money isn't income or spending.
          d.txs.push({ id: uid(), accountId: fromAccountId, type: 'expense', amount, category: TRANSFER_CATEGORY, note: trimmed || `To ${to.name}`, date, transferId });
          d.txs.push({ id: uid(), accountId: toAccountId, type: 'income', amount, category: TRANSFER_CATEGORY, note: trimmed || `From ${from.name}`, date, transferId });
        }),

      setBudget: (category, amount) =>
        set(d => {
          if (amount > 0) d.budgets[category] = amount;
          else delete d.budgets[category];
        }),

      addSubscription: s =>
        set(d => {
          const today = todayStr();
          const thisMonth = addMonthsClamp(today, 0, s.dayOfMonth);
          const nextDue = thisMonth >= today ? thisMonth : addMonthsClamp(today, 1, s.dayOfMonth);
          d.subs.push({ ...s, id: uid(), nextDue, active: true });
        }),

      cancelSubscription: id =>
        set(d => {
          const s = d.subs.find(x => x.id === id);
          if (s) s.active = false;
        }),

      addWishlistItem: (name, goldCost, moneyCost) =>
        set(d => {
          if (!name.trim() || goldCost < 0 || moneyCost < 0) return;
          d.wishlist.push({ id: uid(), name: name.trim(), goldCost, moneyCost, createdAt: new Date().toISOString() });
        }),

      deleteWishlistItem: id =>
        set(d => {
          d.wishlist = d.wishlist.filter(w => w.id !== id);
        }),

      buyWishlistItem: (id, accountId) =>
        set(d => {
          const item = d.wishlist.find(w => w.id === id);
          if (!item || item.purchasedAt || !d.character) return;
          if (d.character.gold < item.goldCost) {
            pushCeleb(d, { type: 'info', title: 'Not enough Gold', subtitle: `${item.name} needs ${item.goldCost} 🪙.` });
            return;
          }
          // Gold-only wishes need no account at all — only look one up when real money is involved.
          if (item.moneyCost > 0) {
            const account = d.accounts.find(a => a.id === accountId);
            if (!account) return;
            const balance = accountBalance(d.txs, accountId, account.initialBalance);
            if (balance < item.moneyCost) {
              pushCeleb(d, { type: 'info', title: 'Not enough money', subtitle: `${account.name} doesn't cover the ${item.moneyCost} needed.` });
              return;
            }
            // Real spending, real consequences: this still respects a Wishlist budget if one is set.
            postTxD(d, {
              accountId, type: 'expense', amount: item.moneyCost, category: 'Wishlist',
              note: `Wishlist: ${item.name}`, date: todayStr(),
            }, false);
          }
          d.character.gold -= item.goldCost;
          item.purchasedAt = new Date().toISOString();
          pushCeleb(d, {
            type: 'item',
            title: `🎁 Claimed: ${item.name}`,
            subtitle: `Paid ${item.goldCost} 🪙${item.moneyCost > 0 ? ` + ${item.moneyCost}` : ''} — earned the real way.`,
          });
        }),

      // ------- Market -------
      buyItem: id =>
        set(d => {
          const item = ITEMS.find(i => i.id === id);
          if (!item || !d.character) return;
          if (item.kind === 'theme' && d.ownedThemes.includes(item.themeId!)) return;
          if (item.id === 'focus_unlock' && d.effects.maxPriority >= 2) return;
          const price = itemPrice(item, d.character.classId); // Merchant perk: 10% off
          if (d.character.gold < price) {
            pushCeleb(d, { type: 'info', title: 'Not enough Gold', subtitle: `${item.name} costs ${price} 🪙. Earn it — no cheat codes.` });
            return;
          }
          d.character.gold -= price;
          d.stats.itemsBought++;
          if (item.kind === 'theme') {
            d.ownedThemes.push(item.themeId!);
            d.theme = item.themeId!;
            pushCeleb(d, { type: 'item', title: `${item.emoji} Theme unlocked & applied`, subtitle: item.name });
          } else if (item.id === 'focus_unlock') {
            d.effects.maxPriority = 2;
            pushCeleb(d, { type: 'item', title: '🎯 Focus Unlock active', subtitle: 'You can now mark two priority quests at once.' });
          } else {
            d.inventory[item.id] = (d.inventory[item.id] ?? 0) + 1;
            pushCeleb(d, { type: 'item', title: `${item.emoji} Purchased: ${item.name}`, subtitle: 'Find it in your inventory below.' });
          }
          checkAchievementsD(d);
        }),

      useItem: (id, payload) =>
        set(d => {
          if (!d.character) return;
          const item = ITEMS.find(i => i.id === id);
          if (!item) return;

          switch (id) {
            case 'potion_s':
            case 'potion_m':
            case 'potion_l': {
              if (d.character.hp >= 100) {
                pushCeleb(d, { type: 'info', title: 'HP already full', subtitle: 'Save the potion for a darker day.' });
                return;
              }
              if (!consumeD(d, id)) return;
              const healed = Math.min(100 - d.character.hp, item.heal!);
              d.character.hp = clampHp(d.character.hp + item.heal!);
              pushCeleb(d, { type: 'item', title: `${item.emoji} +${healed} HP`, subtitle: `${item.name} restored your health.` });
              break;
            }
            case 'indulgence': {
              if (!consumeD(d, id)) return;
              d.effects.indulgence++;
              pushCeleb(d, { type: 'item', title: '🕯️ Indulgence active', subtitle: 'Your next bad-habit relapse will be forgiven.' });
              break;
            }
            case 'attr_boost': {
              if (!consumeD(d, id)) return;
              const charges = boostCharges(d.character.classId); // Magician perk: 7 instead of 5
              d.effects.xpBoostCharges += charges;
              pushCeleb(d, { type: 'item', title: '⚡ Attribute Boost active', subtitle: `+50% XP on your next ${charges} actions.` });
              break;
            }
            case 'ghost_day': {
              const day = payload?.date ?? todayStr();
              if (d.effects.ghostDays.includes(day)) {
                pushCeleb(d, { type: 'info', title: 'Already a Ghost Day', subtitle: 'That day is already frozen.' });
                return;
              }
              if (!consumeD(d, id)) return;
              d.effects.ghostDays.push(day);
              // retroactively clear anything already marked failed today
              if (day === todayStr()) {
                for (const h of d.habits) {
                  const log = d.habitLog[h.id];
                  if (log && log[day] === 'failed') log[day] = 'ghost';
                }
              }
              pushCeleb(d, { type: 'item', title: '👻 Ghost Day set', subtitle: `${day} is frozen: no penalties, streaks paused.` });
              break;
            }
            case 'habit_pardon': {
              const f = d.failures.find(x => x.id === payload?.failureId && !x.pardoned);
              if (!f) return;
              if (!consumeD(d, id)) return;
              f.pardoned = true;
              const log = (d.habitLog[f.habitId] ??= {});
              log[f.date] = 'pardoned';
              d.character.hp = clampHp(d.character.hp + f.damage);
              const h = d.habits.find(x => x.id === f.habitId);
              if (h) {
                const laterBreak = d.failures.some(x => x.habitId === f.habitId && !x.pardoned && x.date > f.date);
                if (!laterBreak) {
                  h.streak = f.prevStreak + 1 + h.streak; // reconnect the chain, pardoned day counts
                  h.best = Math.max(h.best, h.streak);
                  d.stats.bestStreak = Math.max(d.stats.bestStreak, h.best);
                }
              }
              pushCeleb(d, { type: 'item', title: '📜 Habit pardoned', subtitle: `+${f.damage} HP restored, streak reconnected.` });
              break;
            }
            case 'feather': {
              const e = d.journal.find(x => x.id === payload?.entryId);
              if (!e || e.unlocked) return;
              if (!consumeD(d, id)) return;
              e.unlocked = true;
              pushCeleb(d, { type: 'item', title: '🪶 Entry unlocked', subtitle: `The ${e.date} entry can be edited once.` });
              break;
            }
            case 'identity_scroll': {
              if (!payload?.name || !payload.classId) return;
              if (!consumeD(d, id)) return;
              d.character.name = payload.name.trim();
              d.character.classId = payload.classId;
              const cls = CLASSES.find(c => c.id === payload.classId);
              pushCeleb(d, { type: 'item', title: '🎴 Identity rewritten', subtitle: `You are now ${d.character.name} the ${cls?.name}.` });
              break;
            }
            case 'streak_shield': {
              pushCeleb(d, { type: 'info', title: '🛡️ Shields are automatic', subtitle: 'A shield activates by itself the moment a streak would break.' });
              return;
            }
            default:
              return;
          }
          checkAchievementsD(d);
        }),

      setTheme: themeId =>
        set(d => {
          if (d.ownedThemes.includes(themeId)) d.theme = themeId;
        }),

      setDashboardOrder: order =>
        set(d => {
          d.dashboardOrder = order;
        }),

      toggleDashboardWidget: id =>
        set(d => {
          d.dashboardHidden = d.dashboardHidden.includes(id)
            ? d.dashboardHidden.filter(x => x !== id)
            : [...d.dashboardHidden, id];
        }),

      resetDashboardLayout: () =>
        set(d => {
          d.dashboardOrder = [...DEFAULT_DASHBOARD_ORDER];
          d.dashboardHidden = [];
        }),

      openChest: () =>
        set(d => {
          if (!d.character) return;
          const today = todayStr();
          if (d.chestLastOpened === today) return; // one chest per day, no exceptions
          if (!contractStatus(d, today).complete) return; // the contract is the key
          d.chestLastOpened = today;

          const loot = rollChest(Math.random, d.ownedCosmetics);
          const goldTotal = loot.gold + (loot.bonus.kind === 'gold' ? loot.bonus.amount : 0);
          d.character.gold += goldTotal;
          d.stats.goldEarned += goldTotal;
          const dl = (d.dayLog[today] ??= { xp: 0, gold: 0 });
          dl.gold += goldTotal;

          let bonusLabel = '';
          switch (loot.bonus.kind) {
            case 'boost':
              d.effects.xpBoostCharges += loot.bonus.charges;
              bonusLabel = ` · ⚡ +${loot.bonus.charges} boost charges`;
              break;
            case 'shield':
              d.inventory.streak_shield = (d.inventory.streak_shield ?? 0) + 1;
              bonusLabel = ' · 🛡️ Streak Shield';
              break;
            case 'cosmetic':
              if (!d.ownedCosmetics.includes(loot.bonus.cosmetic.id)) d.ownedCosmetics.push(loot.bonus.cosmetic.id);
              break;
          }
          d.lastChestLoot = { ...loot, day: today };

          pushCeleb(d, {
            type: 'reward',
            title: `🎁 ${loot.crit ? 'CRITICAL CHEST! ' : ''}+${goldTotal} 🪙`,
            subtitle: `Daily Three fulfilled${bonusLabel}`,
          });
          if (loot.bonus.kind === 'cosmetic') {
            pushCeleb(d, {
              type: 'item',
              title: `✨ ${COSMETIC_RARITY_META[loot.bonus.cosmetic.rarity].label} drop: ${loot.bonus.cosmetic.name}`,
              subtitle: 'New cosmetic! Equip it in your Profile wardrobe.',
            });
          }
          checkAchievementsD(d);
        }),

      equipCosmetic: (slot, id) =>
        set(d => {
          if (id !== null) {
            const c = COSMETICS.find(x => x.id === id);
            if (!c || c.slot !== slot || !d.ownedCosmetics.includes(id)) return;
          }
          d.equippedCosmetics[slot] = id;
        }),

      dismissRecap: () =>
        set(d => {
          d.lastRecapDay = todayStr();
        }),

      setProfile: profile =>
        set(d => {
          if (!d.character) return;
          // Empty clears it, which returns the library to unfiltered
          d.character.profile = profile.length > 0 ? profile : undefined;
        }),

      setSoundOn: on =>
        set(d => {
          d.soundOn = on;
        }),

      setReminder: patch =>
        set(d => {
          Object.assign(d.reminder, patch);
        }),

      markReminderFired: () =>
        set(d => {
          d.lastReminderDay = todayStr();
        }),
    })),
    {
      name: 'irtiqa-save',
      version: 6,
      // Older saves get new fields filled with defaults instead of being discarded
      migrate: persisted => {
        const merged = { ...initialData(), ...(persisted as Partial<GameState>) } as GameState;
        merged.contacts = (merged.contacts ?? []).map(c => normalizeContact(c as unknown as Record<string, unknown>));
        merged.debts = (merged.debts ?? []).map(dbt => normalizeDebt(dbt as unknown as Record<string, unknown>));
        merged.quests = (merged.quests ?? []).map(q => normalizeQuest(q as unknown as Record<string, unknown>));
        // Nested objects come wholesale from the persisted save — backfill counters added later (e.g. bossesDefeated)
        merged.stats = { ...initialData().stats, ...merged.stats };
        merged.effects = { ...initialData().effects, ...merged.effects };
        return merged;
      },
      partialize: state => {
        const { celebrations, ...rest } = state;
        return { ...rest, celebrations: [] } as GameState;
      },
    },
  ),
);

export const SAVE_KEY = 'irtiqa-save';
