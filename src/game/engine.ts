import { ATTR_KEYS, QUEST_DURATIONS, RANKS } from './constants';
import type { AttributeKey, ClassId, Debt, Habit, ItemDef, JournalEntry, Metrics, Quest, RankDef, Tx } from './types';

// ---------- Dates (local timezone, YYYY-MM-DD strings) ----------
const pad = (n: number) => String(n).padStart(2, '0');

export function toDayStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDayStr(new Date());
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysStr(s: string, n: number): string {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return toDayStr(d);
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

/** Monday of the week the given day falls in — the weekly boss's spawn key. */
export function weekKey(s: string): string {
  const d = parseDay(s);
  const back = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDaysStr(s, -back);
}

export function weekdayOf(s: string): number {
  return parseDay(s).getDay();
}

export function addMonthsClamp(s: string, months: number, dayOfMonth: number): string {
  const d = parseDay(s);
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(dayOfMonth, lastDay));
  return toDayStr(target);
}

export function fmtDay(s: string): string {
  return parseDay(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtDayFull(s: string): string {
  return parseDay(s).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------- Leveling ----------
// XP needed to go from level L to L+1: 100 + (L-1)*25 — steady, gently increasing.
export function charLevelProgress(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rem = xp;
  let need = 100;
  while (rem >= need) {
    rem -= need;
    level++;
    need = 100 + (level - 1) * 25;
  }
  return { level, into: rem, need };
}

export const charLevel = (xp: number) => charLevelProgress(xp).level;

// Attribute levels are lighter: 60 + (L-1)*20.
export function attrLevelProgress(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rem = xp;
  let need = 60;
  while (rem >= need) {
    rem -= need;
    level++;
    need = 60 + (level - 1) * 20;
  }
  return { level, into: rem, need };
}

export const attrLevel = (xp: number) => attrLevelProgress(xp).level;

export function rankFor(level: number): RankDef {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
}

export function nextRank(level: number): RankDef | null {
  return RANKS.find(r => r.minLevel > level) ?? null;
}

// ---------- Habits ----------
export function habitDueOn(h: Habit, day: string): boolean {
  if (h.archived) return false;
  if (h.createdAt > day) return false;
  if (h.freq === 'daily') return true;
  if (h.freq === 'weekly') return (h.weekdays ?? []).includes(weekdayOf(day));
  return (h.dates ?? []).includes(day);
}

/**
 * HP cost of missing a habit.
 *
 * This used to scale UP with the streak you broke (6 → 16 HP), so the better you
 * had been doing, the more a single bad day cost you. That is the mechanic that
 * turns one slip into a reason to stop opening the app.
 *
 * It now scales DOWN: a long streak is credit you've banked, and it cushions the
 * miss instead of amplifying it. Base costs are roughly halved too — the streak
 * reset is the real signal; the HP is just a nudge.
 */
export function missDamage(kind: 'good' | 'bad', streak: number): number {
  const base = kind === 'good' ? 4 : 6;
  const credit = Math.floor(Math.min(streak, 30) / 10);
  return Math.max(2, base - credit);
}

// ---------- Class perks ----------
/** Guardian takes 25% less damage from every source. Applied where damage is COMPUTED (not in damageD) so failure records store the value actually lost — pardons then refund exactly that. */
export function reduceDamage(raw: number, classId?: ClassId): number {
  if (raw <= 0) return 0;
  return classId === 'guardian' ? Math.max(1, Math.round(raw * 0.75)) : raw;
}

/** Merchant buys everything at 10% off. */
export function itemPrice(item: ItemDef, classId?: ClassId): number {
  return classId === 'merchant' ? Math.round(item.price * 0.9) : item.price;
}

/** Scholar's journal habit pays +25%. */
export function journalXp(classId?: ClassId): number {
  return classId === 'scholar' ? 50 : 40;
}

/** Magician squeezes extra charges out of every Attribute Boost. */
export function boostCharges(classId?: ClassId): number {
  return classId === 'magician' ? 7 : 5;
}

// ---------- Perfect-day momentum ----------
export const MOMENTUM_PER_DAY = 0.02; // +2% XP per consecutive perfect day…
export const MOMENTUM_CAP_DAYS = 10; // …capped at +20%
export const PERFECT_DAY_HP = 5; // free regen: the only non-purchased heal, earned by doing everything you promised

export function momentumMult(streak: number): number {
  return 1 + Math.min(Math.max(streak, 0), MOMENTUM_CAP_DAYS) * MOMENTUM_PER_DAY;
}

// ---------- Comeback (the Long Sleep) ----------
/** Absences longer than this many missed days are not judged day-by-day — streaks reset instead, and a comeback quest opens. */
export const MAX_CATCHUP_DAYS = 2;
export const COMEBACK_CHECKINS = 3; // habit check-ins required…
export const COMEBACK_WINDOW_DAYS = 2; // …within this many days of returning…
export const COMEBACK_HP = 30; // …to restore this much HP

// ---------- Social / Debts ----------
export function debtPaid(d: Debt): number {
  return d.payments.reduce((a, p) => a + p.amount, 0);
}

export function debtRemaining(d: Debt): number {
  return Math.max(0, Math.round((d.amount - debtPaid(d)) * 100) / 100);
}

// ---------- Quests ----------
export function questMinutes(q: Quest): number {
  return q.sessions.reduce((a, s) => a + s.minutes, 0);
}

/** One big payout at the end, scaled by actual logged work. Strategist's priority bonus is deeper; Warrior takes +10% on everything. */
export function questPayout(q: Quest, classId?: ClassId): { xp: number; gold: number; minutes: number } {
  const minutes = questMinutes(q);
  const hours = minutes / 60;
  const priorityMult = q.priority ? (classId === 'strategist' ? 1.4 : 1.25) : 1;
  const warriorMult = classId === 'warrior' ? 1.1 : 1;
  const xp = Math.round((80 + hours * 40) * priorityMult * warriorMult);
  const gold = Math.round((30 + hours * 12) * warriorMult);
  return { xp, gold, minutes };
}

/** The self-chosen target date implied by targetDuration, or null for an open-ended quest. */
export function questTargetDate(q: Quest): string | null {
  const days = QUEST_DURATIONS[q.targetDuration].days;
  return days === null ? null : addDaysStr(q.createdAt.slice(0, 10), days);
}

/** Percent of the way through the self-chosen window (0-100), or null when there's no deadline. Not tied to payout — purely a pacing reference. */
export function questDeadlineProgress(q: Quest): number | null {
  const days = QUEST_DURATIONS[q.targetDuration].days;
  if (days === null) return null;
  // Use the exact creation instant, not the day it fell on — truncating to a day loses up to
  // 24h of precision, which is huge against a 1-day or 1-week window.
  const startMs = Date.parse(q.createdAt);
  const totalMs = days * 86400000;
  const elapsedMs = Date.now() - startMs;
  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
}

// ---------- Finances ----------
/** Damage scales with how far past the budget this transaction pushed you. */
export function overspendDamage(budget: number, spentBefore: number, spentAfter: number): number {
  if (budget <= 0) return 0;
  const over = spentAfter - Math.max(budget, spentBefore);
  if (over <= 0) return 0;
  return Math.max(2, Math.min(30, Math.round((over / budget) * 20)));
}

/** A single account's current balance: opening balance plus every transaction posted against it. */
export function accountBalance(txs: Tx[], accountId: string, initialBalance: number): number {
  return txs
    .filter(t => t.accountId === accountId)
    .reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), initialBalance);
}

// ---------- Journal ----------
const LOCK_MS = 72 * 3600 * 1000;

export function journalEditable(e: JournalEntry): boolean {
  return !!e.unlocked || Date.now() - Date.parse(e.createdAt) < LOCK_MS;
}

export function journalLocked(e: JournalEntry): boolean {
  return !journalEditable(e);
}

export function questionsForDay(day: string, pool: string[], count = 3): string[] {
  const idx = Math.floor(parseDay(day).getTime() / 86400000);
  return Array.from({ length: count }, (_, i) => pool[(idx + i * 3) % pool.length]);
}

// ---------- Metrics for achievements ----------
export interface MetricSource {
  character: { xp: number } | null;
  attrs: Record<AttributeKey, number>;
  stats: {
    checkins: number;
    goldEarned: number;
    questsCompleted: number;
    sessionMinutes: number;
    itemsBought: number;
    itemsUsed: number;
    quickTasksDone: number;
    debtsSettled: number;
    bestStreak: number;
    bossesDefeated?: number; // optional: absent in pre-boss saves
  };
  journal: unknown[];
  contacts: unknown[];
  txs: Tx[];
}

export function computeMetrics(s: MetricSource): Metrics {
  return {
    level: charLevel(s.character?.xp ?? 0),
    checkins: s.stats.checkins,
    bestStreak: s.stats.bestStreak,
    questsCompleted: s.stats.questsCompleted,
    sessionHours: Math.floor(s.stats.sessionMinutes / 60),
    journalCount: s.journal.length,
    contacts: s.contacts.length,
    debtsSettled: s.stats.debtsSettled,
    // Transfers move the same money twice (out one account, into another) — real activity only, no free farming.
    txs: s.txs.filter(t => !t.transferId).length,
    goldEarned: s.stats.goldEarned,
    itemsBought: s.stats.itemsBought,
    itemsUsed: s.stats.itemsUsed,
    quickTasks: s.stats.quickTasksDone,
    minAttrLevel: Math.min(...ATTR_KEYS.map(k => attrLevel(s.attrs[k]))),
    // ?? 0: saves persisted before the boss system lack this counter
    bossesDefeated: s.stats.bossesDefeated ?? 0,
  };
}

export const uid = () => crypto.randomUUID();

export const clampHp = (hp: number) => Math.max(0, Math.min(100, hp));

/** One sitting caps at 4h — a timer forgotten overnight can't mint XP. */
export const MAX_SESSION_MINUTES = 240;

/** Yesterday's habits aren't judged until this hour, so a pre-midnight lapse in logging isn't a streak break. */
export const GRACE_HOUR = 9;

/**
 * Removed: low HP used to shrink XP gains (×0.75 at ≤25 HP, ×0.5 at 0).
 *
 * That paid you LESS exactly when you were struggling and had just come back —
 * the moment the app most needs to be worth opening. Effort is now worth the
 * same on your worst day as on your best. HP is a condition readout, not a tax.
 */
