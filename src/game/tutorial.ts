import type { ClassId, IconName } from './types';

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
const CLASS_VOICE: Record<ClassId, string[]> = {
  bard: [
    'Watch closely — this is worth knowing.',
    'Every good story needs a stage. Here is yours.',
    'You will want an audience for this one.',
    'Let me show you the part people remember.',
    'This is the bit worth telling someone about.',
    'Now — the flourish.',
  ],
  warden: [
    'Rule one. Pay attention.',
    'There is a right way to do this.',
    'Learn the order and the rest follows.',
    'No exceptions here. Read it once, properly.',
    'This is the part that holds everything else up.',
    'Precision now saves you later.',
  ],
  sovereign: [
    'This is your domain. Learn it.',
    'Everything here serves the one goal.',
    'You will run this. So understand it.',
    'A ruler knows their own machinery.',
    'This is leverage. Use it.',
    'Command it, or it commands you.',
  ],
  healer: [
    'Take your time — let me show you.',
    'No rush. This one is simple.',
    'You are doing fine. Here is the next piece.',
    'Gently — this matters more than it looks.',
    'Let me walk you through it.',
    'This one is kinder than it sounds.',
  ],
  magician: [
    'Look at it this way.',
    'Everyone reads this wrong at first.',
    'Here is the part nobody expects.',
    'The obvious answer is not the useful one.',
    'Turn it around and it makes sense.',
    'This is where it gets interesting.',
  ],
  herald: [
    'Quick — here is what matters.',
    'Fast version: this is the bit you use daily.',
    'Keep moving. Next piece.',
    'Short one. Then we go.',
    'You will use this every single day.',
    'Right — onward.',
  ],
  sentinel: [
    'Understand the stakes first.',
    'Know what this costs before you use it.',
    'Careful here. It is worth reading twice.',
    'This one has consequences. Here they are.',
    'Better to know now than find out later.',
    'Steady. This is the safe way through.',
  ],
};

export function openerFor(classId: ClassId | undefined, stepIndex: number): string {
  const pool = CLASS_VOICE[classId ?? 'magician'];
  return pool[stepIndex % pool.length];
}

const CH = [
  'The Dashboard',
  'Attributes',
  'Habits',
  'Quests',
  'Journal',
  'Market',
  'Finances',
  'Social',
  'Done',
];

const step = (chapter: number, s: Omit<TutorialStepDef, 'chapter' | 'chapterTitle'>): TutorialStepDef => ({
  ...s,
  chapter,
  chapterTitle: CH[chapter],
});

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  // ---------------- 0 · The Dashboard ----------------
  step(0, {
    id: 'welcome',
    route: '/',
    title: 'Welcome to IrtiQa',
    opener: 'Before you start — five minutes, and you will have used every part of this.',
    body: 'This is your Dashboard, and it is where every day begins. This tour walks the whole app, and every step asks you to actually do the thing — not just read about it. Everything you earn along the way is real and it stays.',
    cta: "Let's begin",
  }),
  step(0, {
    id: 'hp',
    route: '/',
    target: '[data-tour="hp"]',
    title: 'Your HP',
    body: 'HP drops when you miss a habit you scheduled or blow a budget you set. It never kills you and it never locks anything — a bad day costs you nothing but the HP itself. Potions in the Market restore it, and a perfect day restores a little for free.',
    cta: 'Got it',
  }),
  step(0, {
    id: 'xp',
    route: '/',
    target: '[data-tour="xp"]',
    title: 'XP and Level',
    body: 'Every real action pays XP — habits, quests, journal entries, settled debts. Your level is just the sum of what you have actually done. There is no way to buy it and no way to fake it.',
    cta: 'Got it',
  }),
  step(0, {
    id: 'gold',
    route: '/',
    target: '[data-tour="gold"]',
    radius: 999,
    title: 'Gold',
    body: 'Gold comes from the same actions that pay XP. The Market is the only place to spend it, and buying something there is the only way to soften a consequence. Earn first, then spend. Always that order.',
    cta: 'Got it',
  }),

  // ---------------- 1 · Attributes ----------------
  step(1, {
    id: 'attr-intro',
    route: '/attributes',
    title: 'Eight sectors of a life',
    body: 'Your life is split into eight attributes — Health, Friends, Family, Money, Career, Spirituality, Development and Brightness. Each levels independently, and neglecting one shows up as a dent in the shape. Let me show you.',
    cta: 'Show me',
  }),
  step(1, {
    id: 'attr-radar',
    route: '/attributes',
    target: '[data-tour="radar"]',
    title: 'The Wheel of Life',
    body: 'Eight spokes, one per attribute. A long spoke is a sector you have been feeding; a short one is a sector you have not. The goal is not to max everything — it is to keep the shape round enough to roll.',
    cta: 'Understood',
  }),
  step(1, {
    id: 'attr-card',
    route: '/attributes',
    target: '[data-tour="attr-card"]',
    title: 'How attributes level',
    body: 'Every action you log is tagged to one or more attributes. Its XP flows into each tagged attribute AND into your character level at the same time. So one habit tagged Health and Career grows three bars at once.',
    cta: 'Makes sense',
  }),
  step(1, {
    id: 'attr-open',
    route: '/attributes',
    target: '[data-tour="attr-card"]',
    title: 'Open a sector',
    body: 'Each sector has its own page: what it means, what neglect looks like, and a library of habits and quests aimed at it. That library is where most of your habits should come from.',
    action: 'Open the sector above',
    advanceOn: (_p, n) => n.pathname.startsWith('/attributes/'),
  }),
  step(1, {
    id: 'attr-detail',
    target: '[data-tour="attr-bar"]',
    title: 'Inside a sector',
    body: 'This is the sector\'s own level bar, filled by the XP from every action tagged to it. Below it sits the ready-made library — you never have to invent a habit from nothing.',
    cta: 'Back to the tour',
  }),

  // ---------------- 2 · Habits ----------------
  step(2, {
    id: 'habit-intro',
    route: '/habits',
    title: 'The daily engine',
    body: 'Good habits are things to do; bad habits are things to avoid. Both build streaks. You will not have to confess a miss — the app notices on its own, and yesterday is not judged until 9am so a late log still counts.',
    cta: 'Show me',
  }),
  step(2, {
    id: 'habit-new',
    route: '/habits',
    target: '[data-tour="new-habit"]',
    title: 'Make one from scratch',
    body: 'The library is the fast way, but you should see the manual form once so you know exactly what a habit is made of. Open it, then choose the "Write my own" tab.',
    action: 'Click "New habit"',
    advanceOn: () => !!document.querySelector('[data-tour="habit-tabs"]'),
  }),
  step(2, {
    id: 'habit-name',
    target: '[data-tour="habit-name"]',
    title: 'Name it plainly',
    body: 'Write it so that at the end of the day you can answer "did I?" with a clean yes or no. "Read for 20 minutes" works. "Be healthier" does not — you can never check it in.',
    action: 'Switch to "Write my own" and type a name',
    advanceOn: () => {
      const el = document.querySelector<HTMLInputElement>('[data-tour="habit-name"] input, input[data-tour="habit-name"]');
      return !!el && el.value.trim().length >= 2;
    },
  }),
  step(2, {
    id: 'habit-kind',
    target: '[data-tour="habit-kind"]',
    title: 'Good or bad',
    body: 'A good habit pays when you do it. A bad habit pays when you resist it, and costs HP when you relapse. Damage scales DOWN with the streak you broke, though — a long run is credit that cushions the miss, not exposure that amplifies it.',
    cta: 'Understood',
  }),
  step(2, {
    id: 'habit-freq',
    target: '[data-tour="habit-freq"]',
    title: 'How often',
    body: 'Daily means every day. "Days of week" lets you say Mon/Wed/Fri. "Specific dates" is for one-offs. Nothing counts against you on a day you never scheduled.',
    cta: 'Got it',
  }),
  step(2, {
    id: 'habit-attrs',
    target: '[data-tour="habit-attrs"]',
    title: 'Tag the sectors it feeds',
    body: 'This is the field that matters most. A morning run might feed Health and Brightness; a budget review might feed Money and Career. Every sector you tag receives XP on every check-in.',
    cta: 'Makes sense',
  }),
  step(2, {
    id: 'habit-save',
    target: '[data-tour="habit-save"]',
    title: 'Save it',
    body: 'Creating it earns nothing — a habit is a promise, not an achievement. It starts paying the first time you actually keep it.',
    action: 'Save the habit',
    advanceOn: (p, n) => n.habitCount > p.habitCount,
  }),
  step(2, {
    id: 'habit-checkin',
    route: '/habits',
    target: '[data-tour="habit-checkin"]',
    title: 'Check it in',
    body: 'Do it now. XP and Gold will fly out of the button — that is the whole loop, and it is the same reward you will get every day from here on.',
    action: 'Click "Done today"',
    advanceOn: (p, n) => n.checkinCount > p.checkinCount,
  }),
  step(2, {
    id: 'habit-streak',
    route: '/habits',
    target: '[data-tour="habit-streak"]',
    title: 'The streak',
    body: 'That is day one. The streak counts consecutive kept days, and it is the number worth protecting — not because breaking it is punished harshly, but because watching it grow is most of the point.',
    cta: 'Got it',
  }),

  // ---------------- 3 · Quests ----------------
  step(3, {
    id: 'quest-intro',
    route: '/quests',
    title: 'Work that takes weeks',
    body: 'A quest is a real project — a launch, a course, a book. You work it in timed sessions and write a line about what you did. Sessions pay nothing on their own; the entire payout lands when the quest is finished, scaled by the hours you actually logged.',
    cta: 'Show me',
  }),
  step(3, {
    id: 'quest-new',
    route: '/quests',
    target: '[data-tour="new-quest"]',
    title: 'Forge one',
    body: 'Pick something real you have been circling — a project you keep not starting. The library has ready-made ones too, but write your own here.',
    action: 'Click "New quest"',
    advanceOn: () => !!document.querySelector('[data-tour="quest-form"]'),
    skipIf: s => s.questCount > 0,
  }),
  step(3, {
    id: 'quest-save',
    target: '[data-tour="quest-title"]',
    title: 'Name the work',
    body: 'Give it a title and a rough horizon. The horizon is a pacing reference, not a deadline — nothing punishes you for passing it. Tag the sectors it feeds and save.',
    action: 'Write a title and save the quest',
    advanceOn: (p, n) => n.questCount > p.questCount,
    skipIf: s => s.questCount > 0,
  }),
  step(3, {
    id: 'quest-session',
    routeFor: s => (s.firstQuestId ? `/quests/${s.firstQuestId}` : null),
    target: '[data-tour="start-session"]',
    title: 'Start the clock',
    body: 'When you sit down to work, you start a session. The timer runs live, and when you stop you write one line about what you did — that line becomes the permanent record of the work.',
    action: 'Press "Start session"',
    advanceOn: (p, n) => n.hasActiveSession && !p.hasActiveSession,
  }),
  step(3, {
    id: 'quest-widget',
    target: '[data-tour="session-widget"]',
    title: 'It follows you',
    body: 'The running timer sits in the top bar on every page, so you can work anywhere in the app without losing it. Click it any time to jump back to the quest.',
    cta: 'Got it',
  }),
  step(3, {
    id: 'quest-log',
    routeFor: s => (s.firstQuestId ? `/quests/${s.firstQuestId}` : null),
    target: '[data-tour="session-log"]',
    title: 'No partial credit',
    onEnter: 'finishTutorialSession',
    body: 'I closed that session for you so nothing is left running. Every session lands in this log with its date, duration and note. The payout still waits for the finish — one real reward for one finished thing.',
    cta: 'Understood',
  }),

  // ---------------- 4 · Journal ----------------
  step(4, {
    id: 'journal-intro',
    route: '/journal',
    title: 'The daily reflection',
    body: 'Mood, stress, and a few rotating questions. It is the largest single daily payout in the app, and it feeds Spirituality and Development. It is also what the weekly Chronicle is built from.',
    cta: 'Show me',
  }),
  step(4, {
    id: 'journal-write',
    route: '/journal',
    target: '[data-tour="journal-form"]',
    title: 'Write today',
    body: 'Set your mood, drag the stress slider, and answer at least one question honestly — a single sentence is enough. Nothing here is graded, and nobody else will ever read it.',
    action: 'Fill it in and save the entry',
    advanceOn: (p, n) => n.journalCount > p.journalCount,
    skipIf: s => s.journalCount > 0,
  }),
  step(4, {
    id: 'journal-lock',
    route: '/journal',
    title: 'The past seals',
    body: 'Entries lock 72 hours after writing. You cannot go back and repaint a bad week as a good one — and a Feather of Time from the Market is the only way to reopen one. That constraint is what makes the archive worth anything.',
    cta: 'Got it',
  }),

  // ---------------- 5 · Market ----------------
  step(5, {
    id: 'market-intro',
    route: '/market',
    title: 'Where Gold goes',
    body: 'Everything here is bought AND used — there are no trophies you own and never touch. Nothing in the Market can be paid for with real money, only with Gold you earned by doing things.',
    cta: 'Show me',
  }),
  step(5, {
    id: 'market-consumables',
    route: '/market',
    target: '[data-tour="market-consumables"]',
    title: 'Consumables',
    body: 'Potions restore HP. A Streak Shield absorbs one missed day automatically. A Habit Pardon forgives a miss after the fact, and a Ghost Day freezes a whole date for illness or travel. These are the mercy layer, and you buy it with earned Gold.',
    cta: 'Got it',
  }),
  step(5, {
    id: 'market-permanent',
    route: '/market',
    target: '[data-tour="market-permanent"]',
    title: 'Permanent upgrades',
    body: 'These change the rules instead of being spent. A Focus Unlock lets you run two priority quests at once; an Identity Scroll rewrites the radicals you chose at the start. Expensive on purpose — you will know when you want one.',
    cta: 'Got it',
  }),

  // ---------------- 6 · Finances ----------------
  step(6, {
    id: 'fin-intro',
    route: '/finances',
    title: 'Money is a sector too',
    body: 'Log what actually moves — income, expenses, subscriptions, debts. Set a monthly cap on a category and going over it costs HP, scaled to how far over you went. Your wallet and your health bar are wired together on purpose.',
    cta: 'Show me',
  }),
  // Transactions post against an account, so "+ Transaction" is disabled until one
  // exists. Asking for the transaction first would strand a brand-new player on a
  // greyed-out button, so the account is its own step and only appears when needed.
  step(6, {
    id: 'fin-account',
    route: '/finances',
    target: '[data-tour="new-account"]',
    title: 'One account first',
    body: 'Money has to land somewhere. Add whatever you actually keep money in — a card, a wallet, cash — with roughly what is in it now. You can add the rest later.',
    action: 'Add an account',
    advanceOn: (p, n) => n.accountCount > p.accountCount,
    skipIf: s => s.accountCount > 0,
  }),
  step(6, {
    id: 'fin-tx',
    route: '/finances',
    target: '[data-tour="new-tx"]',
    title: 'Log something real',
    body: 'Your last coffee, this month\'s salary, anything that genuinely moved. Pick an account, a category and an amount. Honest logging is what makes every other number on this page mean something.',
    action: 'Add a transaction',
    advanceOn: (p, n) => n.txCount > p.txCount,
    skipIf: s => s.txCount > 0,
  }),
  step(6, {
    id: 'fin-networth',
    route: '/finances',
    target: '[data-tour="networth"]',
    title: 'Cash and net worth',
    body: 'Cash on hand is what is actually in your accounts. Net worth includes what you owe and what you are owed, so it can go negative — and seeing it negative is the point, not a bug.',
    cta: 'Got it',
  }),
  step(6, {
    id: 'fin-budget',
    route: '/finances',
    target: '[data-tour="advanced"]',
    title: 'Set one budget',
    body: 'Open Advanced and put a monthly cap on a single category — food, transport, anything. A budget is a promise you made to yourself, and this is the one place the app holds you to one.',
    action: 'Open Advanced and set a category limit',
    advanceOn: (p, n) => n.budgetCount > p.budgetCount,
    skipIf: s => s.budgetCount > 0,
  }),

  // ---------------- 7 · Social ----------------
  step(7, {
    id: 'social-intro',
    route: '/social',
    title: 'Your people, privately',
    body: 'A private record of the people who matter — birthdays, how to reach them, what they told you last time, and any money between you. It never leaves this app and it is never shared.',
    cta: 'Show me',
  }),
  step(7, {
    id: 'social-contact',
    route: '/social',
    target: '[data-tour="new-contact"]',
    title: 'Add one real person',
    body: 'Someone you actually know. Adding them earns nothing — an address book is not an achievement — but logging a meeting that really happened does, and so does settling a debt.',
    action: 'Add a contact',
    advanceOn: (p, n) => n.contactCount > p.contactCount,
    skipIf: s => s.contactCount > 0,
  }),
  step(7, {
    id: 'social-debts',
    route: '/social',
    target: '[data-tour="contact-card"]',
    title: 'Debts net out',
    body: 'Each person carries their own debts in either direction, and the app nets them: owe 100, owed 20, and it shows 80. Paying one down pays XP — the amount is not what is rewarded, the honesty is.',
    cta: 'Got it',
  }),

  // ---------------- 8 · Done ----------------
  step(8, {
    id: 'done',
    title: 'That is the whole system',
    opener: 'You did all of it. Nothing here was a demo.',
    body: 'Habits feed sectors, sectors show you the shape of your life, quests turn hours into progress, and the journal keeps the record the Chronicle reads back to you each Monday. Everything you just earned is yours. You can replay this tour any time from Settings.',
    cta: 'Begin your journey',
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
  '/journal': { icon: 'journal', text: 'Entries seal 72 hours after writing. Say what is true now — the past is not for retouching.' },
  '/market': { icon: 'market', text: 'Everything here is bought and used. Gold earned the hard way is the only currency that works.' },
  '/social': { icon: 'social', text: 'Your people, privately. Logging a meeting that happened pays — adding a name does not.' },
  '/finances': { icon: 'finances', text: 'Going over a budget you set costs HP, scaled to the overshoot. Your wallet is wired to your health bar.' },
  '/achievements': { icon: 'achievements', text: 'The early tiers come fast and pay well. The app is rewarding you for showing up at all.' },
  '/chronicle': { icon: 'chronicle', text: 'Every Monday, last week written back to you — assembled only from what you logged, never invented.' },
  '/attributes': { icon: 'wheel', text: 'Eight sectors, eight levels. Tag habits and quests to the right ones — that is how they grow.' },
  '/profile': { icon: 'sparkles', text: 'Your sigil is drawn from real state: its shape is your Wheel. It cannot look earned unless it was.' },
  '/calendar': { icon: 'calendar', text: 'Everything with a date lands here — habits due, events, birthdays, quest targets, subscriptions.' },
  '/quests': { icon: 'quests', text: 'Sessions log the hours; the payout waits for the finish and scales with what you actually logged.' },
  '/habits': { icon: 'habits', text: 'Miss a day and the app notices on its own. Yesterday is not judged until 9am, so a late log still counts.' },
};
