import type { ClassId, IconName } from './types';
import { t } from '../i18n';

/**
 * The guided first session.
 *
 * Not a slideshow. The player leaves having *done* every core action once — a
 * habit created from a blank field and checked in, a real quest with a real
 * session on the clock, a journal entry, a transaction, a budget, a contact.
 * Every reward that fires during the tour is the real reward; nothing here is
 * simulated, and nothing is awarded for watching.
 *
 * Steps are a flat array because that is what the store's cursor indexes. The
 * chapter is carried on each step rather than nesting, so inserting a step never
 * renumbers a chapter.
 */

export interface TutorialStepDef {
  id: string;
  chapter: number;
  chapterTitle: string;
  title: string;
  body: string;
  /** Route this step must be viewed on. The overlay navigates there if needed. */
  route?: string;
  /**
   * A route that can only be known at runtime — the quest chapter has to open the
   * quest the player just created, whose id did not exist when this file was written.
   * Returning null means "wherever they are is fine".
   */
  routeFor?: (s: TutorialSnapshot) => string | null;
  /**
   * CSS selector for the element to cut out of the dim. Targets are `[data-tour]`
   * hooks rather than layout classes: a class is a styling decision that someone
   * will rename, and the tour silently losing its spotlight is a bad failure mode.
   */
  target?: string;
  /** Radius override for spotlights on round or pill-shaped targets. */
  radius?: number;
  /** What the player must actually do. Rendered as the italic prompt line. */
  action?: string;
  /** Label for the advance button on read-only steps. Absent → the step is active. */
  cta?: string;
  /**
   * True when the required action has happened. Evaluated against store snapshots
   * on every change, plus once on mount so a step whose condition is *already*
   * satisfied (a returning player, a replayed tour) doesn't dead-end.
   */
  advanceOn?: (prev: TutorialSnapshot, next: TutorialSnapshot) => boolean;
  /** Skip this step entirely when it asks for something already done. */
  skipIf?: (s: TutorialSnapshot) => boolean;
  /** Runs once when the step is entered. Used to tidy up state the tour created. */
  onEnter?: 'finishTutorialSession';
  /** Shown instead of the class opener when a bespoke line matters more than flavour. */
  opener?: string;
}

/** The slice of game state the tour is allowed to reason about. */
export interface TutorialSnapshot {
  habitCount: number;
  checkinCount: number;
  questCount: number;
  sessionCount: number;
  hasActiveSession: boolean;
  journalCount: number;
  txCount: number;
  budgetCount: number;
  contactCount: number;
  accountCount: number;
  firstQuestId: string | null;
  pathname: string;
}

/**
 * Per-class narrator flavour.
 *
 * The spec asks for a class-specific opening line on every step. Authoring 7×38
 * bespoke sentences would produce 266 lines of filler that all say "look at this";
 * the *point* is that the narrator sounds like the driver you claimed. So each
 * class gets a small pool of openers in its own register, picked by step index —
 * deterministic, so a re-render never reshuffles the voice mid-sentence.
 */
/** Per-class opener lines, keyed `tut.voice.<class>.<i>` in the dictionaries. */
const CLASS_VOICE_COUNT = 6;

export function openerFor(classId: ClassId | undefined, stepIndex: number): string {
  const cls = classId ?? 'magician';
  return t(`tut.voice.${cls}.${stepIndex % CLASS_VOICE_COUNT}`);
}

const CH_KEYS = ['dashboard', 'attributes', 'habits', 'quests', 'journal', 'market', 'finances', 'social', 'done'];

const step = (chapter: number, s: Omit<TutorialStepDef, 'chapter' | 'chapterTitle'>): TutorialStepDef => ({
  ...s,
  chapter,
  get chapterTitle() {
    return t(`tut.chapter.${CH_KEYS[chapter]}`);
  },
});

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  // ---------------- 0 · The Dashboard ----------------
  step(0, {
    id: 'welcome',
    route: '/',
    get title() { return t('tut.welcome.title'); },
    get opener() { return t('tut.welcome.opener'); },
    get body() { return t('tut.welcome.body'); },
    get cta() { return t('tut.welcome.cta'); },
  }),
  step(0, {
    id: 'hp',
    route: '/',
    target: '[data-tour="hp"]',
    get title() { return t('tut.hp.title'); },
    get body() { return t('tut.hp.body'); },
    get cta() { return t('tut.hp.cta'); },
  }),
  step(0, {
    id: 'xp',
    route: '/',
    target: '[data-tour="xp"]',
    get title() { return t('tut.xp.title'); },
    get body() { return t('tut.xp.body'); },
    get cta() { return t('tut.xp.cta'); },
  }),
  step(0, {
    id: 'gold',
    route: '/',
    target: '[data-tour="gold"]',
    radius: 999,
    get title() { return t('tut.gold.title'); },
    get body() { return t('tut.gold.body'); },
    get cta() { return t('tut.gold.cta'); },
  }),

  // ---------------- 1 · Attributes ----------------
  step(1, {
    id: 'attr-intro',
    route: '/attributes',
    get title() { return t('tut.attr-intro.title'); },
    get body() { return t('tut.attr-intro.body'); },
    get cta() { return t('tut.attr-intro.cta'); },
  }),
  step(1, {
    id: 'attr-radar',
    route: '/attributes',
    target: '[data-tour="radar"]',
    get title() { return t('tut.attr-radar.title'); },
    get body() { return t('tut.attr-radar.body'); },
    get cta() { return t('tut.attr-radar.cta'); },
  }),
  step(1, {
    id: 'attr-card',
    route: '/attributes',
    target: '[data-tour="attr-card"]',
    get title() { return t('tut.attr-card.title'); },
    get body() { return t('tut.attr-card.body'); },
    get cta() { return t('tut.attr-card.cta'); },
  }),
  step(1, {
    id: 'attr-open',
    route: '/attributes',
    target: '[data-tour="attr-card"]',
    get title() { return t('tut.attr-open.title'); },
    get body() { return t('tut.attr-open.body'); },
    get action() { return t('tut.attr-open.action'); },
    advanceOn: (_p, n) => n.pathname.startsWith('/attributes/'),
  }),
  step(1, {
    id: 'attr-detail',
    target: '[data-tour="attr-bar"]',
    get title() { return t('tut.attr-detail.title'); },
    get body() { return t('tut.attr-detail.body'); },
    get cta() { return t('tut.attr-detail.cta'); },
  }),

  // ---------------- 2 · Habits ----------------
  step(2, {
    id: 'habit-intro',
    route: '/habits',
    get title() { return t('tut.habit-intro.title'); },
    get body() { return t('tut.habit-intro.body'); },
    get cta() { return t('tut.habit-intro.cta'); },
  }),
  step(2, {
    id: 'habit-new',
    route: '/habits',
    target: '[data-tour="new-habit"]',
    get title() { return t('tut.habit-new.title'); },
    get body() { return t('tut.habit-new.body'); },
    get action() { return t('tut.habit-new.action'); },
    advanceOn: () => !!document.querySelector('[data-tour="habit-tabs"]'),
  }),
  step(2, {
    id: 'habit-name',
    target: '[data-tour="habit-name"]',
    get title() { return t('tut.habit-name.title'); },
    get body() { return t('tut.habit-name.body'); },
    get action() { return t('tut.habit-name.action'); },
    advanceOn: () => {
      const el = document.querySelector<HTMLInputElement>('[data-tour="habit-name"] input, input[data-tour="habit-name"]');
      return !!el && el.value.trim().length >= 2;
    },
  }),
  step(2, {
    id: 'habit-kind',
    target: '[data-tour="habit-kind"]',
    get title() { return t('tut.habit-kind.title'); },
    get body() { return t('tut.habit-kind.body'); },
    get cta() { return t('tut.habit-kind.cta'); },
  }),
  step(2, {
    id: 'habit-freq',
    target: '[data-tour="habit-freq"]',
    get title() { return t('tut.habit-freq.title'); },
    get body() { return t('tut.habit-freq.body'); },
    get cta() { return t('tut.habit-freq.cta'); },
  }),
  step(2, {
    id: 'habit-attrs',
    target: '[data-tour="habit-attrs"]',
    get title() { return t('tut.habit-attrs.title'); },
    get body() { return t('tut.habit-attrs.body'); },
    get cta() { return t('tut.habit-attrs.cta'); },
  }),
  step(2, {
    id: 'habit-save',
    target: '[data-tour="habit-save"]',
    get title() { return t('tut.habit-save.title'); },
    get body() { return t('tut.habit-save.body'); },
    get action() { return t('tut.habit-save.action'); },
    advanceOn: (p, n) => n.habitCount > p.habitCount,
  }),
  step(2, {
    id: 'habit-checkin',
    route: '/habits',
    target: '[data-tour="habit-checkin"]',
    get title() { return t('tut.habit-checkin.title'); },
    get body() { return t('tut.habit-checkin.body'); },
    get action() { return t('tut.habit-checkin.action'); },
    advanceOn: (p, n) => n.checkinCount > p.checkinCount,
  }),
  step(2, {
    id: 'habit-streak',
    route: '/habits',
    target: '[data-tour="habit-streak"]',
    get title() { return t('tut.habit-streak.title'); },
    get body() { return t('tut.habit-streak.body'); },
    get cta() { return t('tut.habit-streak.cta'); },
  }),

  // ---------------- 3 · Quests ----------------
  step(3, {
    id: 'quest-intro',
    route: '/quests',
    get title() { return t('tut.quest-intro.title'); },
    get body() { return t('tut.quest-intro.body'); },
    get cta() { return t('tut.quest-intro.cta'); },
  }),
  step(3, {
    id: 'quest-new',
    route: '/quests',
    target: '[data-tour="new-quest"]',
    get title() { return t('tut.quest-new.title'); },
    get body() { return t('tut.quest-new.body'); },
    get action() { return t('tut.quest-new.action'); },
    advanceOn: () => !!document.querySelector('[data-tour="quest-form"]'),
    skipIf: s => s.questCount > 0,
  }),
  step(3, {
    id: 'quest-save',
    target: '[data-tour="quest-title"]',
    get title() { return t('tut.quest-save.title'); },
    get body() { return t('tut.quest-save.body'); },
    get action() { return t('tut.quest-save.action'); },
    advanceOn: (p, n) => n.questCount > p.questCount,
    skipIf: s => s.questCount > 0,
  }),
  step(3, {
    id: 'quest-session',
    routeFor: s => (s.firstQuestId ? `/quests/${s.firstQuestId}` : null),
    target: '[data-tour="start-session"]',
    get title() { return t('tut.quest-session.title'); },
    get body() { return t('tut.quest-session.body'); },
    get action() { return t('tut.quest-session.action'); },
    advanceOn: (p, n) => n.hasActiveSession && !p.hasActiveSession,
  }),
  step(3, {
    id: 'quest-widget',
    target: '[data-tour="session-widget"]',
    get title() { return t('tut.quest-widget.title'); },
    get body() { return t('tut.quest-widget.body'); },
    get cta() { return t('tut.quest-widget.cta'); },
  }),
  step(3, {
    id: 'quest-log',
    routeFor: s => (s.firstQuestId ? `/quests/${s.firstQuestId}` : null),
    target: '[data-tour="session-log"]',
    get title() { return t('tut.quest-log.title'); },
    onEnter: 'finishTutorialSession',
    get body() { return t('tut.quest-log.body'); },
    get cta() { return t('tut.quest-log.cta'); },
  }),

  // ---------------- 4 · Journal ----------------
  step(4, {
    id: 'journal-intro',
    route: '/journal',
    get title() { return t('tut.journal-intro.title'); },
    get body() { return t('tut.journal-intro.body'); },
    get cta() { return t('tut.journal-intro.cta'); },
  }),
  step(4, {
    id: 'journal-write',
    route: '/journal',
    target: '[data-tour="journal-form"]',
    get title() { return t('tut.journal-write.title'); },
    get body() { return t('tut.journal-write.body'); },
    get action() { return t('tut.journal-write.action'); },
    advanceOn: (p, n) => n.journalCount > p.journalCount,
    skipIf: s => s.journalCount > 0,
  }),
  step(4, {
    id: 'journal-lock',
    route: '/journal',
    get title() { return t('tut.journal-lock.title'); },
    get body() { return t('tut.journal-lock.body'); },
    get cta() { return t('tut.journal-lock.cta'); },
  }),

  // ---------------- 5 · Market ----------------
  step(5, {
    id: 'market-intro',
    route: '/market',
    get title() { return t('tut.market-intro.title'); },
    get body() { return t('tut.market-intro.body'); },
    get cta() { return t('tut.market-intro.cta'); },
  }),
  step(5, {
    id: 'market-consumables',
    route: '/market',
    target: '[data-tour="market-consumables"]',
    get title() { return t('tut.market-consumables.title'); },
    get body() { return t('tut.market-consumables.body'); },
    get cta() { return t('tut.market-consumables.cta'); },
  }),
  step(5, {
    id: 'market-permanent',
    route: '/market',
    target: '[data-tour="market-permanent"]',
    get title() { return t('tut.market-permanent.title'); },
    get body() { return t('tut.market-permanent.body'); },
    get cta() { return t('tut.market-permanent.cta'); },
  }),

  // ---------------- 6 · Finances ----------------
  step(6, {
    id: 'fin-intro',
    route: '/finances',
    get title() { return t('tut.fin-intro.title'); },
    get body() { return t('tut.fin-intro.body'); },
    get cta() { return t('tut.fin-intro.cta'); },
  }),
  // Transactions post against an account, so "+ Transaction" is disabled until one
  // exists. Asking for the transaction first would strand a brand-new player on a
  // greyed-out button, so the account is its own step and only appears when needed.
  step(6, {
    id: 'fin-account',
    route: '/finances',
    target: '[data-tour="new-account"]',
    get title() { return t('tut.fin-account.title'); },
    get body() { return t('tut.fin-account.body'); },
    get action() { return t('tut.fin-account.action'); },
    advanceOn: (p, n) => n.accountCount > p.accountCount,
    skipIf: s => s.accountCount > 0,
  }),
  step(6, {
    id: 'fin-tx',
    route: '/finances',
    target: '[data-tour="new-tx"]',
    get title() { return t('tut.fin-tx.title'); },
    get body() { return t('tut.fin-tx.body'); },
    get action() { return t('tut.fin-tx.action'); },
    advanceOn: (p, n) => n.txCount > p.txCount,
    skipIf: s => s.txCount > 0,
  }),
  step(6, {
    id: 'fin-networth',
    route: '/finances',
    target: '[data-tour="networth"]',
    get title() { return t('tut.fin-networth.title'); },
    get body() { return t('tut.fin-networth.body'); },
    get cta() { return t('tut.fin-networth.cta'); },
  }),
  step(6, {
    id: 'fin-budget',
    route: '/finances',
    target: '[data-tour="advanced"]',
    get title() { return t('tut.fin-budget.title'); },
    get body() { return t('tut.fin-budget.body'); },
    get action() { return t('tut.fin-budget.action'); },
    advanceOn: (p, n) => n.budgetCount > p.budgetCount,
    skipIf: s => s.budgetCount > 0,
  }),

  // ---------------- 7 · Social ----------------
  step(7, {
    id: 'social-intro',
    route: '/social',
    get title() { return t('tut.social-intro.title'); },
    get body() { return t('tut.social-intro.body'); },
    get cta() { return t('tut.social-intro.cta'); },
  }),
  step(7, {
    id: 'social-contact',
    route: '/social',
    target: '[data-tour="new-contact"]',
    get title() { return t('tut.social-contact.title'); },
    get body() { return t('tut.social-contact.body'); },
    get action() { return t('tut.social-contact.action'); },
    advanceOn: (p, n) => n.contactCount > p.contactCount,
    skipIf: s => s.contactCount > 0,
  }),
  step(7, {
    id: 'social-debts',
    route: '/social',
    target: '[data-tour="contact-card"]',
    get title() { return t('tut.social-debts.title'); },
    get body() { return t('tut.social-debts.body'); },
    get cta() { return t('tut.social-debts.cta'); },
  }),

  // ---------------- 8 · Done ----------------
  step(8, {
    id: 'done',
    get title() { return t('tut.done.title'); },
    get opener() { return t('tut.done.opener'); },
    get body() { return t('tut.done.body'); },
    get cta() { return t('tut.done.cta'); },
  }),
];

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length;

/** Steps per chapter, for the progress dots. */
export const CHAPTER_STEPS = TUTORIAL_STEPS.reduce<Record<number, number>>((acc, s) => {
  acc[s.chapter] = (acc[s.chapter] ?? 0) + 1;
  return acc;
}, {});

// ---------------- Layer 2: first-visit coach tips ----------------

export interface CoachTip {
  icon: IconName;
  text: string;
}

/**
 * One line, once, the first time a page is opened without the tour having covered
 * it — for the player who skipped, and for the pages the tour never visits.
 */
export const COACH_TIPS: Record<string, CoachTip> = {
  '/journal': { icon: 'journal', get text() { return t('tut.tip.journal'); } },
  '/market': { icon: 'market', get text() { return t('tut.tip.market'); } },
  '/social': { icon: 'social', get text() { return t('tut.tip.social'); } },
  '/finances': { icon: 'finances', get text() { return t('tut.tip.finances'); } },
  '/achievements': { icon: 'achievements', get text() { return t('tut.tip.achievements'); } },
  '/chronicle': { icon: 'chronicle', get text() { return t('tut.tip.chronicle'); } },
  '/attributes': { icon: 'wheel', get text() { return t('tut.tip.attributes'); } },
  '/profile': { icon: 'sparkles', get text() { return t('tut.tip.profile'); } },
  '/calendar': { icon: 'calendar', get text() { return t('tut.tip.calendar'); } },
  '/quests': { icon: 'quests', get text() { return t('tut.tip.quests'); } },
  '/habits': { icon: 'habits', get text() { return t('tut.tip.habits'); } },
};
