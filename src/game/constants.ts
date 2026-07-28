import type {
  AchievementDef,
  AttributeKey,
  ClassDef,
  ClassId,
  CosmeticDef,
  CosmeticRarity,
  DashboardWidgetId,
  IconName,
  ItemDef,
  Metrics,
  PersonalityArchetype,
  PrimaryGroup,
  QuestDuration,
  RankDef,
  ThemeDef,
  Tier,
  WheelSectorDef,
} from './types';

export const ATTR_KEYS: AttributeKey[] = [
  'health',
  'friends',
  'family',
  'money',
  'career',
  'spirituality',
  'development',
  'brightness',
];

// The icon name always equals the attribute key, so `<Icon name={attrKey} />` is
// valid anywhere an attribute is in hand — no lookup table needed at the call site.
export const ATTRIBUTES: Record<AttributeKey, { label: string; short: string; color: string }> = {
  health: { label: 'Health', short: 'HLT', color: '#ef4444' },
  friends: { label: 'Friends', short: 'FRD', color: '#f97316' },
  family: { label: 'Family', short: 'FAM', color: '#eab308' },
  money: { label: 'Money', short: 'MON', color: '#22c55e' },
  career: { label: 'Career', short: 'CAR', color: '#10b981' },
  spirituality: { label: 'Spirituality', short: 'SPI', color: '#a855f7' },
  development: { label: 'Development', short: 'DEV', color: '#3b82f6' },
  brightness: { label: 'Brightness', short: 'BRT', color: '#ec4899' },
};

// The seven classes are the seven radicals of Ponomarenko's practical characterology,
// each turned into a *driver* rather than an attribute. A player picks 1–3 in ranked
// order; the order sets attunement (see engine.attunements) — slot 1 is full power, and
// picking fewer classes concentrates the same 100% budget into deeper, mastered perks.
export const CLASSES: ClassDef[] = [
  {
    id: 'bard',
    name: 'Bard',
    tagline: 'I need to be seen — recognition matters more than gold.',
    radical: 'R1 · The Performer',
    affinity: ['brightness', 'friends'],
    perk: 'Bonus Gold on every habit check-in — the audience keeps you going',
    signature: 'The Stage — public, witnessed actions carry further; the first each day lifts you',
  },
  {
    id: 'warden',
    name: 'Warden',
    tagline: 'There is a right way, and no exceptions.',
    radical: 'R2 · The Systematizer',
    affinity: ['health', 'money'],
    perk: 'Reduces all HP damage you take — order absorbs the blow',
    signature: 'Standing Order — every stretch of exception-free days mints a free Streak Shield',
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    tagline: 'One goal, and everything serves it.',
    radical: 'R3 · The Founder',
    affinity: ['career', 'money'],
    perk: 'Priority quests — your Great Work — pay far more XP',
    signature: "The Great Work — the campaign's streak cannot be broken by a single miss",
  },
  {
    id: 'healer',
    name: 'Healer',
    tagline: 'The person in front of me comes first.',
    radical: 'R4 · The Empath',
    affinity: ['family', 'friends'],
    perk: 'Actions tied to a real person (settling debts, keeping bonds) pay more',
    signature: 'Bonds — the Family and Friends bosses fall in fewer hits',
  },
  {
    id: 'magician',
    name: 'Magician',
    tagline: "Everyone's looking at it wrong.",
    radical: 'R5 · The Inventor',
    affinity: ['development', 'spirituality'],
    perk: 'Journaling and reflection pay far more XP — thinking on the page is the work',
    signature: 'Novelty — the first act in any new domain pays double; exploration counts as work',
  },
  {
    id: 'herald',
    name: 'Herald',
    tagline: 'Move, connect, begin again.',
    radical: 'R6 · The Spark',
    affinity: ['health', 'friends'],
    perk: 'Every habit check-in pays extra XP — motion is its own reward',
    signature: 'Full Spectrum — deeper perfect-day momentum; a lighter road back from a lapse',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    tagline: 'Slow down. Is this safe?',
    radical: 'R7 · The Anchor',
    affinity: ['money', 'health'],
    perk: 'Staying inside your budget pays extra XP — caution is rewarded',
    signature: 'The Reserve — banked Gold builds a Ward that absorbs incoming HP damage',
  },
];

/** The 1–2 life areas a class champions, as a display label. */
export function classAffinityLabel(c: ClassDef): string {
  return c.affinity.map(a => ATTRIBUTES[a].label).join(' · ');
}

/**
 * Class → the radical it *is*.
 *
 * These were two separate questions in two vocabularies: onboarding asked for
 * 1–3 classes (Bard, Warden, …) and Settings asked, separately, for a "radical
 * profile" (hysteroid, epileptoid, …). They are the same seven drivers, so a
 * player could — and did — answer them inconsistently and get a template library
 * filtered against an identity they never meant to claim.
 *
 * One identity now: picking the loadout sets the profile. Settings still exposes
 * the profile for reordering or correction, but nothing is ever asked twice.
 */
export const CLASS_RADICAL: Record<ClassId, PersonalityArchetype> = {
  bard: 'hysteroid',
  warden: 'epileptoid',
  sovereign: 'paranoid',
  healer: 'emotive',
  magician: 'schizoid',
  herald: 'hyperthymic',
  sentinel: 'anxious',
};

/** The inverse: which class embodies a given radical. */
export const RADICAL_CLASS = Object.fromEntries(
  (Object.entries(CLASS_RADICAL) as [ClassId, PersonalityArchetype][]).map(([c, r]) => [r, c]),
) as Record<PersonalityArchetype, ClassId>;

// ---------- Wheel of Life audit (onboarding + quarterly retake) ----------
// Five plain, factual statements per sector — tick what's true today, no introspection.
// Each tick = 2 points → a 0–10 score, which seeds a starting level (see engine.wheelSeedXp).
// One statement per sector = 2 points; order follows ATTR_KEYS so the wheel lines up.
export const WHEEL_SURVEY: WheelSectorDef[] = [
  {
    key: 'health',
    statements: [
      'I move or exercise a few times a week',
      'I sleep enough most nights',
      "I don't have a health problem I'm ignoring",
      'I eat in a way I feel okay about',
      'I’m happy with my weight and energy',
    ],
  },
  {
    key: 'friends',
    statements: [
      'I have friends I see or talk to regularly',
      'I’ve spent time with friends in the last week',
      'I have someone I could call if I had a problem',
      "I don't feel lonely",
      'I’m happy with the people around me',
    ],
  },
  {
    key: 'family',
    statements: [
      'I talk to my family regularly',
      'I get along well with my family',
      'I have a partner',
      'I have no serious problems with my partner',
      'I’m content with my relationship situation',
    ],
  },
  {
    key: 'money',
    statements: [
      'My income covers my monthly needs',
      'I have no debts stressing me',
      'I have some savings',
      "I don't worry about money week to week",
      'I can buy small things I want without thinking hard',
    ],
  },
  {
    key: 'career',
    statements: [
      'I have a job or business right now',
      'I like the work I do',
      'I’m moving forward, not stuck',
      'I know what my next step is',
      'I’m satisfied with my career right now',
    ],
  },
  {
    key: 'spirituality',
    statements: [
      'I have a faith or set of values I live by',
      'I pray, meditate, or reflect regularly',
      'I make something regularly (write, draw, music, build)',
      'I make time for this side of life',
      'I feel calm and centered more often than not',
    ],
  },
  {
    key: 'development',
    statements: [
      'I’ve learned something new recently',
      'I’m reading a book or taking a course right now',
      'I have goals I’m working toward',
      'I’ve improved a skill in the last few months',
      'I feel like I’m growing as a person',
    ],
  },
  {
    key: 'brightness',
    statements: [
      'I do things that are just fun, not useful',
      'I’ve laughed a lot this week',
      'I have hobbies I enjoy',
      'My days feel varied, not repetitive',
      'I’ve had a new or exciting experience recently',
    ],
  },
];

// The ladder is named for where you're going, not what you're lacking. Rank 1 used
// to be "Weak 🪱" — the app's first act was to insult the player, on a screen that
// was otherwise empty. IrtiQa means "ascension"; the ladder should read like one.
export const RANKS: RankDef[] = [
  { minLevel: 1, name: 'Seeker', icon: 'rankSeeker' },
  { minLevel: 3, name: 'Novice', icon: 'rankNovice' },
  { minLevel: 6, name: 'Apprentice', icon: 'rankApprentice' },
  { minLevel: 10, name: 'Adept', icon: 'rankAdept' },
  { minLevel: 15, name: 'Journeyman', icon: 'rankJourneyman' },
  { minLevel: 21, name: 'Expert', icon: 'rankExpert' },
  { minLevel: 28, name: 'Veteran', icon: 'rankVeteran' },
  { minLevel: 36, name: 'Master', icon: 'rankMaster' },
  { minLevel: 45, name: 'Grandmaster', icon: 'rankGrandmaster' },
  { minLevel: 55, name: 'Legend', icon: 'rankLegend' },
];

// One symbolic price for every non-free theme. Display-only for now — no payment path.
// Owner mode (store.adminUnlockAll, default on) unlocks everything regardless.
export const THEME_PRICE = 4.99;

/**
 * Four themes, each finished.
 *
 * There were twelve. Twelve variations on the same layout does not read as
 * "customisable" — it reads as undecided, because no single one of them can have
 * had enough attention. The four kept here are deliberately far apart (deep dark,
 * warm light, high-contrast neon, tactile material) so the choice is a real one,
 * and each carries a distinct motion signature rather than just a palette swap.
 *
 * Removing a theme is safe for existing saves: store.setTheme and the load-time
 * fallback both resolve an unknown id back to Midnight.
 */
export const THEMES: ThemeDef[] = [
  // Midnight is the one free default — the safe fallback when a theme is locked.
  { id: 'midnight', name: 'Midnight', desc: 'The default: deep space blues and violet arcana.', icon: 'themeMidnight', free: true, motion: 'aurora' },
  { id: 'skeuo', name: 'Skeuomorphism', desc: 'Leather, stitching and beveled buttons. Real materials.', icon: 'themeSkeuo', price: THEME_PRICE, motion: 'bevel' },
  { id: 'parchment', name: 'Parchment', desc: 'Aged paper, ink and candlelight. Classic fantasy.', icon: 'themeParchment', price: THEME_PRICE, motion: 'none' },
  { id: 'neon', name: 'Neon Grid', desc: 'Cyberpunk terminal glow. Jack in.', icon: 'themeNeon', price: THEME_PRICE, motion: 'pulse' },
];

/** Themes that once existed and were removed. Any save still pointing at one of
 *  these is migrated to Midnight on load rather than rendering an unstyled app. */
export const RETIRED_THEME_IDS = ['sakura', 'glass', 'clay', 'minimal', 'maximal', 'brutal', 'liquid', 'neu'];

/**
 * Each theme's default --bg/--accent/--accent2, mirrored from the [data-theme] blocks in
 * styles.css. This is the color picker's source of truth: reading getComputedStyle instead
 * would race the theme-apply effect in App.tsx (child components render before that effect
 * runs), so the picker needs these values available synchronously in JS. Keep in sync with
 * styles.css when a theme's palette changes.
 */
export const THEME_BASE_COLORS: Record<string, { '--bg': string; '--accent': string; '--accent2': string }> = {
  midnight: { '--bg': '#0f1220', '--accent': '#8b5cf6', '--accent2': '#22d3ee' },
  skeuo: { '--bg': '#6b4a2f', '--accent': '#3a6ea5', '--accent2': '#b8742f' },
  parchment: { '--bg': '#efe3c8', '--accent': '#8b5e34', '--accent2': '#a44a3f' },
  neon: { '--bg': '#04060d', '--accent': '#00e5ff', '--accent2': '#ff2fd6' },
};

// ---------- Economy yardstick ----------
// One unit of measure keeps every number honest: a SOLID DAY of play
// (5 habits ≈ 25g, journal 8g, a couple of quick tasks ≈ 4g) earns ~35-40 Gold,
// plus ~15-30 more from the daily chest on a contract-complete day.
// Prices are set against that:
//   · small consumables  ≈ half a day  (potion_s)
//   · insurance items    ≈ 1-2 days    (shield, indulgence, pardon, potion_m)
//   · emergency / luxury ≈ 2.5-3 days  (potion_l, ghost_day, identity_scroll, themes)
//   · permanents         ≈ 5+ days     (focus_unlock)
// Cosmetics are NOT sold here — they drop only from daily chests, so the
// chest stays the reason to finish the day and gold keeps a real exchange rate.
export const ITEMS: ItemDef[] = [
  { id: 'potion_s', name: 'Small Health Potion', icon: 'potionSmall', price: 25, kind: 'consumable', heal: 15, desc: 'Restores 15 HP. A sip of courage.' },
  { id: 'potion_m', name: 'Medium Health Potion', icon: 'potionMedium', price: 55, kind: 'consumable', heal: 35, desc: 'Restores 35 HP. Brewed for rough weeks.' },
  { id: 'potion_l', name: 'Large Health Potion', icon: 'potionLarge', price: 110, kind: 'consumable', heal: 75, desc: 'Restores 75 HP. Emergency reserves.' },
  { id: 'streak_shield', name: 'Streak Shield', icon: 'shield', price: 60, kind: 'consumable', desc: 'Automatically protects your longest streak (3+ days) the next time you miss a day. No HP damage, streak survives.' },
  { id: 'habit_pardon', name: 'Habit Pardon', icon: 'pardon', price: 80, kind: 'consumable', desc: 'Retroactively forgive one missed habit: heals the damage and reconnects the broken streak.' },
  { id: 'indulgence', name: 'Indulgence', icon: 'indulgence', price: 70, kind: 'consumable', desc: 'Activate to forgive your next bad-habit relapse — no damage, streak survives.' },
  { id: 'ghost_day', name: 'Ghost Day', icon: 'ghost', price: 120, kind: 'consumable', desc: 'Freeze a whole day — today, tomorrow, or any future date. No penalties, streaks paused. For real sick days and trips.' },
  { id: 'feather', name: 'Feather of Time', icon: 'feather', price: 50, kind: 'consumable', desc: 'Unlock one locked journal entry for a single edit.' },
  { id: 'focus_unlock', name: 'Focus Unlock', icon: 'focus', price: 200, kind: 'permanent', desc: 'Permanently allows marking TWO priority quests at once instead of one.' },
  { id: 'attr_boost', name: 'Attribute Boost', icon: 'boost', price: 75, kind: 'consumable', desc: '+50% XP on your next 5 XP-earning actions.' },
  { id: 'identity_scroll', name: 'Identity Scroll', icon: 'identity', price: 150, kind: 'consumable', desc: 'Rewrite yourself: change your character name and/or class.' },
  // Themes are no longer bought with Gold — they live in one unified system priced
  // symbolically in real money (see THEMES / THEME_PRICE) and unlocked by owner mode.
];

export const TIER_REWARDS: Record<Tier, { xp: number; gold: number }> = {
  bronze: { xp: 20, gold: 10 },
  silver: { xp: 50, gold: 25 },
  gold: { xp: 120, gold: 60 },
  platinum: { xp: 300, gold: 150 },
};

export const TIER_LABEL: Record<Tier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

interface AchFamily {
  key: keyof Metrics;
  family: string;
  icon: IconName;
  names: [string, string, string, string];
  thresholds: [number, number, number, number];
  desc: (n: number) => string;
}

const FAMILIES: AchFamily[] = [
  { key: 'level', family: 'Leveling', icon: 'famLeveling', names: ['First Spark', 'Rising Star', 'Force of Nature', 'Apex Being'], thresholds: [2, 5, 15, 30], desc: n => `Reach level ${n}` },
  { key: 'checkins', family: 'Discipline', icon: 'famDiscipline', names: ['First Step', 'Habit Former', 'Iron Routine', 'Unbreakable'], thresholds: [1, 25, 100, 500], desc: n => `Complete ${n} habit check-in${n > 1 ? 's' : ''}` },
  { key: 'bestStreak', family: 'Streaks', icon: 'famStreaks', names: ['Kindling', 'On Fire', 'Inferno', 'Eternal Flame'], thresholds: [3, 7, 30, 100], desc: n => `Reach a ${n}-day streak` },
  { key: 'questsCompleted', family: 'Questing', icon: 'famQuesting', names: ['First Blood', 'Adventurer', 'Quest Hunter', 'Dragon Slayer'], thresholds: [1, 5, 20, 50], desc: n => `Complete ${n} quest${n > 1 ? 's' : ''}` },
  { key: 'sessionHours', family: 'Deep Work', icon: 'famDeepWork', names: ['Clocked In', 'Grinder', 'Machine', 'Time Lord'], thresholds: [1, 10, 50, 200], desc: n => `Log ${n} hour${n > 1 ? 's' : ''} of quest sessions` },
  { key: 'journalCount', family: 'Reflection', icon: 'famReflection', names: ['Dear Diary', 'Chronicler', 'Sage', 'Oracle'], thresholds: [1, 7, 30, 100], desc: n => `Write ${n} journal entr${n > 1 ? 'ies' : 'y'}` },
  { key: 'contacts', family: 'Connections', icon: 'famConnections', names: ['Not Alone', 'Circle', 'Community', 'Nexus'], thresholds: [1, 5, 15, 40], desc: n => `Add ${n} contact${n > 1 ? 's' : ''}` },
  { key: 'debtsSettled', family: 'Clean Slate', icon: 'famCleanSlate', names: ['Squared Up', 'Trustworthy', 'Honest Soul', 'Debt-Free Legend'], thresholds: [1, 5, 15, 50], desc: n => `Settle ${n} debt${n > 1 ? 's' : ''}` },
  { key: 'txs', family: 'Bookkeeping', icon: 'famBookkeeping', names: ['Penny Tracked', 'Ledger Keeper', 'Accountant', 'Master of Coin'], thresholds: [1, 20, 100, 500], desc: n => `Log ${n} transaction${n > 1 ? 's' : ''}` },
  { key: 'goldEarned', family: 'Fortune', icon: 'famFortune', names: ['First Coins', 'Full Pouch', 'Treasure Chest', 'Dragon Hoard'], thresholds: [50, 500, 2500, 10000], desc: n => `Earn ${n} Gold lifetime` },
  { key: 'itemsBought', family: 'Shopping', icon: 'famShopping', names: ['First Purchase', 'Regular', 'Patron', 'Whale'], thresholds: [1, 5, 15, 40], desc: n => `Buy ${n} item${n > 1 ? 's' : ''} from the Market` },
  { key: 'itemsUsed', family: 'Alchemy', icon: 'famAlchemy', names: ['Bottoms Up', 'Practitioner', 'Alchemist', 'Archmage'], thresholds: [1, 5, 15, 40], desc: n => `Use ${n} item${n > 1 ? 's' : ''}` },
  { key: 'quickTasks', family: 'Errands', icon: 'famErrands', names: ['Checked Off', 'Doer', 'Taskmaster', 'Executor'], thresholds: [1, 10, 50, 200], desc: n => `Finish ${n} quick task${n > 1 ? 's' : ''}` },
  { key: 'minAttrLevel', family: 'Balance', icon: 'famBalance', names: ['Awakening', 'Harmony', 'Equilibrium', 'Enlightenment'], thresholds: [2, 3, 5, 10], desc: n => `Get every attribute to level ${n}` },
  { key: 'bossesDefeated', family: 'Boss Hunter', icon: 'famBossHunter', names: ['First Strike', 'Slayer', 'Nemesis', 'Godslayer'], thresholds: [1, 5, 15, 40], desc: n => `Defeat ${n} weekly boss${n > 1 ? 'es' : ''}` },
];

const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

export const ACHIEVEMENTS: AchievementDef[] = FAMILIES.flatMap(f =>
  f.thresholds.map((t, i) => ({
    id: `${f.key}_${t}`,
    family: f.family,
    familyIcon: f.icon,
    tier: TIERS[i],
    name: f.names[i],
    desc: f.desc(t),
    cond: (m: Metrics) => m[f.key] >= t,
  })),
);

export const EXPENSE_CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Health',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Education',
  'Debt',
  'Other',
];

export const INCOME_CATEGORIES = ['Salary', 'Business', 'Gift', 'Debt', 'Other income'];

// Internal category for account-to-account transfers — never user-selectable, never budgetable.
export const TRANSFER_CATEGORY = 'Transfer';

// Quest target durations — a soft self-chosen deadline instead of an hour estimate nobody can predict.
export const QUEST_DURATIONS: Record<QuestDuration, { label: string; days: number | null }> = {
  '1d': { label: '1 Day', days: 1 },
  '1w': { label: '1 Week', days: 7 },
  '2w': { label: '2 Weeks', days: 14 },
  '1m': { label: '1 Month', days: 30 },
  '3m': { label: '3 Months', days: 90 },
  '6m': { label: '6 Months', days: 180 },
  '1y': { label: '1 Year', days: 365 },
  none: { label: 'No deadline', days: null },
};

export const QUEST_DURATION_KEYS: QuestDuration[] = ['1d', '1w', '2w', '1m', '3m', '6m', '1y', 'none'];

export const REFLECTION_QUESTIONS = [
  'What went well today?',
  'What drained your energy today?',
  'What are you grateful for right now?',
  'What will you do differently tomorrow?',
  'What did you learn today?',
  'Who made your day better, and how?',
  'What did you avoid today that you should face?',
  'What small win deserves celebration?',
  'If today repeated forever, what would you change first?',
];

/** The five mood faces. The one place emoji survive: a face carries an
 *  expression no line icon can, and here the glyph IS the datum. */
export const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

// ---------- Social Hub: contact fields ----------
export const ARCHETYPES: Record<PersonalityArchetype, { label: string; color: string }> = {
  hysteroid: { label: 'Hysteroid', color: '#ec4899' },
  epileptoid: { label: 'Epileptoid', color: '#3b82f6' },
  anxious: { label: 'Anxious', color: '#eab308' },
  emotive: { label: 'Emotive', color: '#22c55e' },
  schizoid: { label: 'Schizoid', color: '#a855f7' },
  paranoid: { label: 'Paranoid', color: '#f43f5e' },
  hyperthymic: { label: 'Hyperthymic', color: '#f97316' },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES) as PersonalityArchetype[];

export const PRIMARY_GROUPS: Record<PrimaryGroup, { label: string }> = {
  family: { label: 'Family' },
  relative: { label: 'Relative' },
  colleague: { label: 'Colleague' },
  friend: { label: 'Friend' },
  close: { label: 'Close' },
};

export const PRIMARY_GROUP_KEYS = Object.keys(PRIMARY_GROUPS) as PrimaryGroup[];

export const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string }> = {
  chronicle: { label: 'The Chronicle' },
  dailyContract: { label: 'Daily Three' },
  weeklyBoss: { label: 'Weekly boss' },
  todayHabits: { label: "Today's habits" },
  lifeBalance: { label: 'Life balance' },
  attributes: { label: 'Attributes' },
  quickTasks: { label: 'Quick tasks' },
  quests: { label: 'Quests' },
  journal: { label: 'Journal' },
  calendar: { label: 'Calendar' },
};

// Chronicle sits first: on the day a new one lands it is the reason to have opened
// the app at all. It renders as a slim teaser on the other six days.
export const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'chronicle', 'dailyContract', 'weeklyBoss', 'todayHabits', 'lifeBalance', 'attributes', 'quickTasks', 'quests', 'journal', 'calendar',
];

// ---------- Cosmetics ----------
// Drop only from daily chests. Frames ring the avatar, titles follow the
// character's name, banners paint the dashboard header.
export const COSMETICS: CosmeticDef[] = [
  // Avatar frames
  { id: 'frame_frost', name: 'Frost Ring', slot: 'frame', rarity: 'common', desc: 'A thin ring of winter light.' },
  { id: 'frame_petal', name: 'Petal Wreath', slot: 'frame', rarity: 'common', desc: 'Soft pink blossoms, always in season.' },
  { id: 'frame_gilded', name: 'Gilded Frame', slot: 'frame', rarity: 'rare', desc: 'Solid gold. Earned, not bought.' },
  { id: 'frame_ember', name: 'Ember Ring', slot: 'frame', rarity: 'rare', desc: 'Smolders quietly, like a kept streak.' },
  { id: 'frame_shadow', name: 'Shadow Aura', slot: 'frame', rarity: 'epic', desc: 'The dark pulse of relentless discipline.' },
  { id: 'frame_laurel', name: "Champion's Laurel", slot: 'frame', rarity: 'epic', desc: 'A double ring for those who never stop.' },
  // Titles
  { id: 'title_wanderer', name: 'the Wanderer', slot: 'title', rarity: 'common', desc: 'For those still finding the road.' },
  { id: 'title_early', name: 'the Early Riser', slot: 'title', rarity: 'common', desc: 'The day belongs to those who greet it first.' },
  { id: 'title_unbroken', name: 'the Unbroken', slot: 'title', rarity: 'rare', desc: 'Bent, maybe. Never broken.' },
  { id: 'title_relentless', name: 'the Relentless', slot: 'title', rarity: 'rare', desc: 'Stopping was never on the table.' },
  { id: 'title_flamekeeper', name: 'the Flame Keeper', slot: 'title', rarity: 'epic', desc: 'Guardian of the perfect-day fire.' },
  // Dashboard banners
  { id: 'banner_dawn', name: 'Dawn Banner', slot: 'banner', rarity: 'common', desc: 'First light over the dashboard.' },
  { id: 'banner_sakura', name: 'Sakura Banner', slot: 'banner', rarity: 'common', desc: 'Petals drifting across your mornings.' },
  { id: 'banner_aurora', name: 'Aurora Banner', slot: 'banner', rarity: 'rare', desc: 'Northern lights for northern discipline.' },
  { id: 'banner_dragonfire', name: 'Dragonfire Banner', slot: 'banner', rarity: 'epic', desc: 'The hoard is guarded. The hoard is yours.' },
];

export const COSMETIC_RARITY_META: Record<CosmeticRarity, { label: string; weight: number; color: string }> = {
  common: { label: 'Common', weight: 6, color: '#9aa1c4' },
  rare: { label: 'Rare', weight: 3, color: '#3b82f6' },
  epic: { label: 'Epic', weight: 1, color: '#a855f7' },
};
