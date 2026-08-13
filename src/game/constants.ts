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
import { t } from '../i18n';

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

const ATTR_COLORS: Record<AttributeKey, string> = {
  health: '#ef4444',
  friends: '#f97316',
  family: '#eab308',
  money: '#22c55e',
  career: '#10b981',
  spirituality: '#a855f7',
  development: '#3b82f6',
  brightness: '#ec4899',
};

// The icon name always equals the attribute key, so `<Icon name={attrKey} />` is
// valid anywhere an attribute is in hand — no lookup table needed at the call site.
//
// `label`/`short` are getters rather than plain strings: they resolve against the
// active language every time they're read, which is what lets ~40 existing call
// sites keep saying `ATTRIBUTES[k].label` with no idea that translation exists.
// The same trick carries every other display name in this file.
export const ATTRIBUTES = Object.fromEntries(
  ATTR_KEYS.map(k => [
    k,
    {
      get label() {
        return t(`attr.${k}.label`);
      },
      get short() {
        return t(`attr.${k}.short`);
      },
      color: ATTR_COLORS[k],
    },
  ]),
) as Record<AttributeKey, { label: string; short: string; color: string }>;

// The seven classes are the seven radicals of Ponomarenko's practical characterology,
// each turned into a *driver* rather than an attribute. A player picks 1–3 in ranked
// order; the order sets attunement (see engine.attunements) — slot 1 is full power, and
// picking fewer classes concentrates the same 100% budget into deeper, mastered perks.
// Structure only — every string lives in the dictionaries under `class.<id>.*`.
// The Warden's perk was once "Reduces all HP damage you take": worth ~4 HP a miss
// when misses cost 6-16, worth 0-1 once they cost 2-4 (see the note in engine.ts).
// It now guards the streak, which is the part of a missed day that was ever really
// at stake, and which this class's Signature had already been promising.
const CLASS_SHAPE: { id: ClassId; affinity: AttributeKey[] }[] = [
  { id: 'bard', affinity: ['brightness', 'friends'] },
  { id: 'warden', affinity: ['health', 'money'] },
  { id: 'sovereign', affinity: ['career', 'money'] },
  { id: 'healer', affinity: ['family', 'friends'] },
  { id: 'magician', affinity: ['development', 'spirituality'] },
  { id: 'herald', affinity: ['health', 'friends'] },
  { id: 'sentinel', affinity: ['money', 'health'] },
];

export const CLASSES: ClassDef[] = CLASS_SHAPE.map(({ id, affinity }) => ({
  id,
  affinity,
  get name() {
    return t(`class.${id}.name`);
  },
  get tagline() {
    return t(`class.${id}.tagline`);
  },
  get radical() {
    return t(`class.${id}.radical`);
  },
  get perk() {
    return t(`class.${id}.perk`);
  },
  get signature() {
    return t(`class.${id}.signature`);
  },
}));

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
/** Five statements per sector, keyed `wheel.<sector>.<0-4>` in the dictionaries. */
const WHEEL_STATEMENTS_PER_SECTOR = 5;

export const WHEEL_SURVEY: WheelSectorDef[] = ATTR_KEYS.map(key => ({
  key,
  get statements() {
    return Array.from({ length: WHEEL_STATEMENTS_PER_SECTOR }, (_, i) => t(`wheel.${key}.${i}`));
  },
}));

// The ladder is named for where you're going, not what you're lacking. Rank 1 used
// to be "Weak 🪱" — the app's first act was to insult the player, on a screen that
// was otherwise empty. IrtiQa means "ascension"; the ladder should read like one.
// The icon doubles as the dictionary key, so a rank has exactly one identifier.
export const RANKS: RankDef[] = (
  [
    [1, 'rankSeeker'],
    [3, 'rankNovice'],
    [6, 'rankApprentice'],
    [10, 'rankAdept'],
    [15, 'rankJourneyman'],
    [21, 'rankExpert'],
    [28, 'rankVeteran'],
    [36, 'rankMaster'],
    [45, 'rankGrandmaster'],
    [55, 'rankLegend'],
  ] as [number, IconName][]
).map(([minLevel, icon]) => ({
  minLevel,
  icon,
  get name() {
    return t(`rank.${icon}`);
  },
}));

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
export const THEMES: ThemeDef[] = (
  [
    // Midnight is the one free default — the safe fallback when a theme is locked.
    { id: 'midnight', icon: 'themeMidnight', free: true, motion: 'aurora' },
    { id: 'skeuo', icon: 'themeSkeuo', price: THEME_PRICE, motion: 'bevel' },
    { id: 'parchment', icon: 'themeParchment', price: THEME_PRICE, motion: 'none' },
    { id: 'neon', icon: 'themeNeon', price: THEME_PRICE, motion: 'pulse' },
  ] as Omit<ThemeDef, 'name' | 'desc'>[]
).map(shape => ({
  ...shape,
  get name() {
    return t(`theme.${shape.id}.name`);
  },
  get desc() {
    return t(`theme.${shape.id}.desc`);
  },
}));

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
//
// What a price BUYS decides the band, and there are only two things a miss can
// take from you: a couple of HP off a bar that gates nothing (see the note on
// HP in engine.ts), and a streak. The streak is the whole stake, so that is what
// the insurance items are priced against. They used to be priced against 6-16 HP
// of damage that no longer exists, which put a Streak Shield at 1.5 days of play
// to avoid losing two hit points — an item nobody would ever rationally buy.
//   · readout relief     ≈ ¼–1 day    (potions — HP gates nothing, so they are cheap)
//   · streak insurance   ≈ 1 day      (shield, indulgence, pardon)
//   · a whole day saved  ≈ 2.5 days   (ghost_day: every streak at once, momentum included)
//   · luxury             ≈ 1.5-3 days (feather, attr_boost, identity_scroll)
//   · permanents         ≈ 5+ days    (focus_unlock)
// Cosmetics are NOT sold here — they drop only from daily chests, so the
// chest stays the reason to finish the day and gold keeps a real exchange rate.
export const ITEMS: ItemDef[] = (
  [
    { id: 'potion_s', icon: 'potionSmall', price: 10, kind: 'consumable', heal: 15 },
    { id: 'potion_m', icon: 'potionMedium', price: 20, kind: 'consumable', heal: 35 },
    { id: 'potion_l', icon: 'potionLarge', price: 40, kind: 'consumable', heal: 75 },
    { id: 'streak_shield', icon: 'shield', price: 30, kind: 'consumable' },
    { id: 'habit_pardon', icon: 'pardon', price: 45, kind: 'consumable' },
    { id: 'indulgence', icon: 'indulgence', price: 30, kind: 'consumable' },
    { id: 'ghost_day', icon: 'ghost', price: 90, kind: 'consumable' },
    { id: 'feather', icon: 'feather', price: 50, kind: 'consumable' },
    { id: 'focus_unlock', icon: 'focus', price: 200, kind: 'permanent' },
    { id: 'attr_boost', icon: 'boost', price: 75, kind: 'consumable' },
    { id: 'identity_scroll', icon: 'identity', price: 150, kind: 'consumable' },
    // Themes are no longer bought with Gold — they live in one unified system priced
    // symbolically in real money (see THEMES / THEME_PRICE) and unlocked by owner mode.
  ] as Omit<ItemDef, 'name' | 'desc'>[]
).map(shape => ({
  ...shape,
  get name() {
    return t(`item.${shape.id}.name`);
  },
  get desc() {
    return t(`item.${shape.id}.desc`);
  },
}));

export const TIER_REWARDS: Record<Tier, { xp: number; gold: number }> = {
  bronze: { xp: 20, gold: 10 },
  silver: { xp: 50, gold: 25 },
  gold: { xp: 120, gold: 60 },
  platinum: { xp: 300, gold: 150 },
};

/**
 * A `Record<K, string>` whose values are resolved from the dictionary on every
 * read. Plain object literals can't express that (the value would be captured at
 * module-init time, freezing the app in whatever language loaded first), so the
 * getters are installed with defineProperty.
 */
function lazyLabels<K extends string>(keys: readonly K[], key: (k: K) => string): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of keys) {
    Object.defineProperty(out, k, { get: () => t(key(k)), enumerable: true });
  }
  return out;
}

export const TIER_LABEL = lazyLabels(['bronze', 'silver', 'gold', 'platinum'] as Tier[], k => `tier.${k}`);

interface AchFamily {
  key: keyof Metrics;
  icon: IconName;
  thresholds: [number, number, number, number];
}

// Names and descriptions live in the dictionaries under `ach.<key>.*`; only the
// thresholds and the metric they read are structural.
const FAMILIES: AchFamily[] = [
  { key: 'level', icon: 'famLeveling', thresholds: [2, 5, 15, 30] },
  { key: 'checkins', icon: 'famDiscipline', thresholds: [1, 25, 100, 500] },
  { key: 'bestStreak', icon: 'famStreaks', thresholds: [3, 7, 30, 100] },
  { key: 'questsCompleted', icon: 'famQuesting', thresholds: [1, 5, 20, 50] },
  { key: 'sessionHours', icon: 'famDeepWork', thresholds: [1, 10, 50, 200] },
  { key: 'journalCount', icon: 'famReflection', thresholds: [1, 7, 30, 100] },
  { key: 'contacts', icon: 'famConnections', thresholds: [1, 5, 15, 40] },
  { key: 'debtsSettled', icon: 'famCleanSlate', thresholds: [1, 5, 15, 50] },
  { key: 'txs', icon: 'famBookkeeping', thresholds: [1, 20, 100, 500] },
  { key: 'goldEarned', icon: 'famFortune', thresholds: [50, 500, 2500, 10000] },
  { key: 'itemsBought', icon: 'famShopping', thresholds: [1, 5, 15, 40] },
  { key: 'itemsUsed', icon: 'famAlchemy', thresholds: [1, 5, 15, 40] },
  { key: 'quickTasks', icon: 'famErrands', thresholds: [1, 10, 50, 200] },
  { key: 'minAttrLevel', icon: 'famBalance', thresholds: [2, 3, 5, 10] },
  { key: 'bossesDefeated', icon: 'famBossHunter', thresholds: [1, 5, 15, 40] },
];

const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

export const ACHIEVEMENTS: AchievementDef[] = FAMILIES.flatMap(f =>
  f.thresholds.map((threshold, i) => ({
    id: `${f.key}_${threshold}`,
    familyIcon: f.icon,
    tier: TIERS[i],
    cond: (m: Metrics) => m[f.key] >= threshold,
    get family() {
      return t(`ach.${f.key}.family`);
    },
    get name() {
      return t(`ach.${f.key}.name.${i}`);
    },
    get desc() {
      return t(`ach.${f.key}.desc`, { n: threshold });
    },
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
const QUEST_DURATION_DAYS: Record<QuestDuration, number | null> = {
  '1d': 1, '1w': 7, '2w': 14, '1m': 30, '3m': 90, '6m': 180, '1y': 365, none: null,
};

export const QUEST_DURATIONS = Object.fromEntries(
  (Object.keys(QUEST_DURATION_DAYS) as QuestDuration[]).map(k => [
    k,
    {
      days: QUEST_DURATION_DAYS[k],
      get label() {
        return t(`questDur.${k}`);
      },
    },
  ]),
) as Record<QuestDuration, { label: string; days: number | null }>;

export const QUEST_DURATION_KEYS: QuestDuration[] = ['1d', '1w', '2w', '1m', '3m', '6m', '1y', 'none'];

/** Nine prompts, keyed `reflect.<0-8>`. A function, not a const, so the language is
 *  read at call time — the Journal picks from these on every render. */
export const REFLECTION_QUESTION_COUNT = 9;
export function reflectionQuestions(): string[] {
  return Array.from({ length: REFLECTION_QUESTION_COUNT }, (_, i) => t(`reflect.${i}`));
}

/** The five mood faces. The one place emoji survive: a face carries an
 *  expression no line icon can, and here the glyph IS the datum. */
export const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

// ---------- Social Hub: contact fields ----------
const ARCHETYPE_COLORS: Record<PersonalityArchetype, string> = {
  hysteroid: '#ec4899',
  epileptoid: '#3b82f6',
  anxious: '#eab308',
  emotive: '#22c55e',
  schizoid: '#a855f7',
  paranoid: '#f43f5e',
  hyperthymic: '#f97316',
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPE_COLORS) as PersonalityArchetype[];

export const ARCHETYPES = Object.fromEntries(
  ARCHETYPE_KEYS.map(k => [
    k,
    {
      color: ARCHETYPE_COLORS[k],
      get label() {
        return t(`archetype.${k}`);
      },
    },
  ]),
) as Record<PersonalityArchetype, { label: string; color: string }>;

export const PRIMARY_GROUP_KEYS: PrimaryGroup[] = ['family', 'relative', 'colleague', 'friend', 'close'];

export const PRIMARY_GROUPS = Object.fromEntries(
  PRIMARY_GROUP_KEYS.map(k => [
    k,
    {
      get label() {
        return t(`group.${k}`);
      },
    },
  ]),
) as Record<PrimaryGroup, { label: string }>;

const DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  'chronicle', 'dailyContract', 'weeklyBoss', 'todayHabits', 'lifeBalance',
  'attributes', 'quickTasks', 'quests', 'journal', 'calendar',
];

export const DASHBOARD_WIDGETS = Object.fromEntries(
  DASHBOARD_WIDGET_IDS.map(k => [
    k,
    {
      get label() {
        return t(`widget.${k}`);
      },
    },
  ]),
) as Record<DashboardWidgetId, { label: string }>;

// Chronicle sits first: on the day a new one lands it is the reason to have opened
// the app at all. It renders as a slim teaser on the other six days.
export const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'chronicle', 'dailyContract', 'weeklyBoss', 'todayHabits', 'lifeBalance', 'attributes', 'quickTasks', 'quests', 'journal', 'calendar',
];

// ---------- Cosmetics ----------
// Drop only from daily chests. Frames ring the avatar, titles follow the
// character's name, banners paint the dashboard header.
export const COSMETICS: CosmeticDef[] = (
  [
    // Avatar frames
    { id: 'frame_frost', slot: 'frame', rarity: 'common' },
    { id: 'frame_petal', slot: 'frame', rarity: 'common' },
    { id: 'frame_gilded', slot: 'frame', rarity: 'rare' },
    { id: 'frame_ember', slot: 'frame', rarity: 'rare' },
    { id: 'frame_shadow', slot: 'frame', rarity: 'epic' },
    { id: 'frame_laurel', slot: 'frame', rarity: 'epic' },
    // Titles
    { id: 'title_wanderer', slot: 'title', rarity: 'common' },
    { id: 'title_early', slot: 'title', rarity: 'common' },
    { id: 'title_unbroken', slot: 'title', rarity: 'rare' },
    { id: 'title_relentless', slot: 'title', rarity: 'rare' },
    { id: 'title_flamekeeper', slot: 'title', rarity: 'epic' },
    // Dashboard banners
    { id: 'banner_dawn', slot: 'banner', rarity: 'common' },
    { id: 'banner_sakura', slot: 'banner', rarity: 'common' },
    { id: 'banner_aurora', slot: 'banner', rarity: 'rare' },
    { id: 'banner_dragonfire', slot: 'banner', rarity: 'epic' },
  ] as Omit<CosmeticDef, 'name' | 'desc'>[]
).map(shape => ({
  ...shape,
  get name() {
    return t(`cosmetic.${shape.id}.name`);
  },
  get desc() {
    return t(`cosmetic.${shape.id}.desc`);
  },
}));

const RARITY_SHAPE: Record<CosmeticRarity, { weight: number; color: string }> = {
  common: { weight: 6, color: '#9aa1c4' },
  rare: { weight: 3, color: '#3b82f6' },
  epic: { weight: 1, color: '#a855f7' },
};

export const COSMETIC_RARITY_META = Object.fromEntries(
  (Object.keys(RARITY_SHAPE) as CosmeticRarity[]).map(k => [
    k,
    {
      ...RARITY_SHAPE[k],
      get label() {
        return t(`rarity.${k}`);
      },
    },
  ]),
) as Record<CosmeticRarity, { label: string; weight: number; color: string }>;
