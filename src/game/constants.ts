import type {
  AchievementDef,
  AttributeKey,
  ClassDef,
  CosmeticDef,
  CosmeticRarity,
  DashboardWidgetId,
  ItemDef,
  Metrics,
  PersonalityArchetype,
  PrimaryGroup,
  QuestDuration,
  RankDef,
  ThemeDef,
  Tier,
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

export const ATTRIBUTES: Record<AttributeKey, { label: string; emoji: string; color: string }> = {
  health: { label: 'Health', emoji: '❤️‍🔥', color: '#ef4444' },
  friends: { label: 'Friends', emoji: '🤝', color: '#f97316' },
  family: { label: 'Family', emoji: '🏡', color: '#eab308' },
  money: { label: 'Money', emoji: '💰', color: '#22c55e' },
  career: { label: 'Career', emoji: '💼', color: '#10b981' },
  spirituality: { label: 'Spirituality', emoji: '🔮', color: '#a855f7' },
  development: { label: 'Development', emoji: '📚', color: '#3b82f6' },
  brightness: { label: 'Brightness', emoji: '✨', color: '#ec4899' },
};

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    emoji: '⚔️',
    tagline: 'Forge the body, and the mind will follow.',
    boosts: { health: 0.1 },
    perk: '+10% XP and Gold from quest completions',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    emoji: '📜',
    tagline: 'Every day you learn something is a day you win.',
    boosts: { development: 0.1 },
    perk: 'Journal entries give +25% XP',
  },
  {
    id: 'magician',
    name: 'Magician',
    emoji: '🔮',
    tagline: 'The unseen threads — spirit and kin — are the strongest.',
    boosts: { spirituality: 0.1, family: 0.1 },
    perk: 'Attribute Boost grants 7 charges instead of 5',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    emoji: '🛡️',
    tagline: 'No one fights alone. Keep your people close.',
    boosts: { friends: 0.1 },
    perk: 'All HP damage reduced by 25%',
  },
  {
    id: 'merchant',
    name: 'Merchant',
    emoji: '🪙',
    tagline: 'Gold is stored freedom. Stack it wisely.',
    boosts: { money: 0.1 },
    perk: '10% discount on every Market item',
  },
  {
    id: 'strategist',
    name: 'Strategist',
    emoji: '👑',
    tagline: 'A career is a campaign. Plan your victories.',
    boosts: { career: 0.1 },
    perk: 'Priority quests pay +40% XP instead of +25%',
  },
  {
    id: 'bard',
    name: 'Bard',
    emoji: '🎭',
    tagline: 'A life without joy is a quest not worth taking.',
    boosts: { brightness: 0.1 },
    perk: '+1 Gold on every habit check-in',
  },
];

// The ladder is named for where you're going, not what you're lacking. Rank 1 used
// to be "Weak 🪱" — the app's first act was to insult the player, on a screen that
// was otherwise empty. IrtiQa means "ascension"; the ladder should read like one.
export const RANKS: RankDef[] = [
  { minLevel: 1, name: 'Seeker', emoji: '🌘' },
  { minLevel: 3, name: 'Novice', emoji: '🌱' },
  { minLevel: 6, name: 'Apprentice', emoji: '🔰' },
  { minLevel: 10, name: 'Adept', emoji: '🗡️' },
  { minLevel: 15, name: 'Journeyman', emoji: '🧭' },
  { minLevel: 21, name: 'Expert', emoji: '⚜️' },
  { minLevel: 28, name: 'Veteran', emoji: '🦾' },
  { minLevel: 36, name: 'Master', emoji: '🏵️' },
  { minLevel: 45, name: 'Grandmaster', emoji: '💠' },
  { minLevel: 55, name: 'Legend', emoji: '🌟' },
];

export const THEMES: ThemeDef[] = [
  { id: 'midnight', name: 'Midnight', desc: 'The default: deep space blues and violet arcana.', emoji: '🌌', free: true },
  { id: 'parchment', name: 'Parchment', desc: 'Aged paper, ink and candlelight. Classic fantasy.', emoji: '🏰' },
  { id: 'neon', name: 'Neon Grid', desc: 'Cyberpunk terminal glow. Jack in.', emoji: '🌆' },
  { id: 'sakura', name: 'Sakura', desc: 'Soft petals and pastel skies. Anime vibes.', emoji: '🌸' },
];

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
  { id: 'potion_s', name: 'Small Health Potion', emoji: '🧪', price: 25, kind: 'consumable', heal: 15, desc: 'Restores 15 HP. A sip of courage.' },
  { id: 'potion_m', name: 'Medium Health Potion', emoji: '⚗️', price: 55, kind: 'consumable', heal: 35, desc: 'Restores 35 HP. Brewed for rough weeks.' },
  { id: 'potion_l', name: 'Large Health Potion', emoji: '🍶', price: 110, kind: 'consumable', heal: 75, desc: 'Restores 75 HP. Emergency reserves.' },
  { id: 'streak_shield', name: 'Streak Shield', emoji: '🛡️', price: 60, kind: 'consumable', desc: 'Automatically protects your longest streak (3+ days) the next time you miss a day. No HP damage, streak survives.' },
  { id: 'habit_pardon', name: 'Habit Pardon', emoji: '📜', price: 80, kind: 'consumable', desc: 'Retroactively forgive one missed habit: heals the damage and reconnects the broken streak.' },
  { id: 'indulgence', name: 'Indulgence', emoji: '🕯️', price: 70, kind: 'consumable', desc: 'Activate to forgive your next bad-habit relapse — no damage, streak survives.' },
  { id: 'ghost_day', name: 'Ghost Day', emoji: '👻', price: 120, kind: 'consumable', desc: 'Freeze a whole day — today, tomorrow, or any future date. No penalties, streaks paused. For real sick days and trips.' },
  { id: 'feather', name: 'Feather of Time', emoji: '🪶', price: 50, kind: 'consumable', desc: 'Unlock one locked journal entry for a single edit.' },
  { id: 'focus_unlock', name: 'Focus Unlock', emoji: '🎯', price: 200, kind: 'permanent', desc: 'Permanently allows marking TWO priority quests at once instead of one.' },
  { id: 'attr_boost', name: 'Attribute Boost', emoji: '⚡', price: 75, kind: 'consumable', desc: '+50% XP on your next 5 XP-earning actions.' },
  { id: 'identity_scroll', name: 'Identity Scroll', emoji: '🎴', price: 150, kind: 'consumable', desc: 'Rewrite yourself: change your character name and/or class.' },
  { id: 'theme_parchment', name: 'Theme: Parchment', emoji: '🏰', price: 120, kind: 'theme', themeId: 'parchment', desc: 'Unlock the Parchment fantasy theme.' },
  { id: 'theme_neon', name: 'Theme: Neon Grid', emoji: '🌆', price: 120, kind: 'theme', themeId: 'neon', desc: 'Unlock the Neon Grid cyberpunk theme.' },
  { id: 'theme_sakura', name: 'Theme: Sakura', emoji: '🌸', price: 120, kind: 'theme', themeId: 'sakura', desc: 'Unlock the Sakura anime theme.' },
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
  emoji: string;
  names: [string, string, string, string];
  thresholds: [number, number, number, number];
  desc: (n: number) => string;
}

const FAMILIES: AchFamily[] = [
  { key: 'level', family: 'Leveling', emoji: '🚀', names: ['First Spark', 'Rising Star', 'Force of Nature', 'Apex Being'], thresholds: [2, 5, 15, 30], desc: n => `Reach level ${n}` },
  { key: 'checkins', family: 'Discipline', emoji: '✅', names: ['First Step', 'Habit Former', 'Iron Routine', 'Unbreakable'], thresholds: [1, 25, 100, 500], desc: n => `Complete ${n} habit check-in${n > 1 ? 's' : ''}` },
  { key: 'bestStreak', family: 'Streaks', emoji: '🔥', names: ['Kindling', 'On Fire', 'Inferno', 'Eternal Flame'], thresholds: [3, 7, 30, 100], desc: n => `Reach a ${n}-day streak` },
  { key: 'questsCompleted', family: 'Questing', emoji: '⚔️', names: ['First Blood', 'Adventurer', 'Quest Hunter', 'Dragon Slayer'], thresholds: [1, 5, 20, 50], desc: n => `Complete ${n} quest${n > 1 ? 's' : ''}` },
  { key: 'sessionHours', family: 'Deep Work', emoji: '⏳', names: ['Clocked In', 'Grinder', 'Machine', 'Time Lord'], thresholds: [1, 10, 50, 200], desc: n => `Log ${n} hour${n > 1 ? 's' : ''} of quest sessions` },
  { key: 'journalCount', family: 'Reflection', emoji: '📖', names: ['Dear Diary', 'Chronicler', 'Sage', 'Oracle'], thresholds: [1, 7, 30, 100], desc: n => `Write ${n} journal entr${n > 1 ? 'ies' : 'y'}` },
  { key: 'contacts', family: 'Connections', emoji: '🤝', names: ['Not Alone', 'Circle', 'Community', 'Nexus'], thresholds: [1, 5, 15, 40], desc: n => `Add ${n} contact${n > 1 ? 's' : ''}` },
  { key: 'debtsSettled', family: 'Clean Slate', emoji: '🧾', names: ['Squared Up', 'Trustworthy', 'Honest Soul', 'Debt-Free Legend'], thresholds: [1, 5, 15, 50], desc: n => `Settle ${n} debt${n > 1 ? 's' : ''}` },
  { key: 'txs', family: 'Bookkeeping', emoji: '💳', names: ['Penny Tracked', 'Ledger Keeper', 'Accountant', 'Master of Coin'], thresholds: [1, 20, 100, 500], desc: n => `Log ${n} transaction${n > 1 ? 's' : ''}` },
  { key: 'goldEarned', family: 'Fortune', emoji: '🪙', names: ['First Coins', 'Full Pouch', 'Treasure Chest', 'Dragon Hoard'], thresholds: [50, 500, 2500, 10000], desc: n => `Earn ${n} Gold lifetime` },
  { key: 'itemsBought', family: 'Shopping', emoji: '🛒', names: ['First Purchase', 'Regular', 'Patron', 'Whale'], thresholds: [1, 5, 15, 40], desc: n => `Buy ${n} item${n > 1 ? 's' : ''} from the Market` },
  { key: 'itemsUsed', family: 'Alchemy', emoji: '⚗️', names: ['Bottoms Up', 'Practitioner', 'Alchemist', 'Archmage'], thresholds: [1, 5, 15, 40], desc: n => `Use ${n} item${n > 1 ? 's' : ''}` },
  { key: 'quickTasks', family: 'Errands', emoji: '📌', names: ['Checked Off', 'Doer', 'Taskmaster', 'Executor'], thresholds: [1, 10, 50, 200], desc: n => `Finish ${n} quick task${n > 1 ? 's' : ''}` },
  { key: 'minAttrLevel', family: 'Balance', emoji: '☯️', names: ['Awakening', 'Harmony', 'Equilibrium', 'Enlightenment'], thresholds: [2, 3, 5, 10], desc: n => `Get every attribute to level ${n}` },
  { key: 'bossesDefeated', family: 'Boss Hunter', emoji: '🐲', names: ['First Strike', 'Slayer', 'Nemesis', 'Godslayer'], thresholds: [1, 5, 15, 40], desc: n => `Defeat ${n} weekly boss${n > 1 ? 'es' : ''}` },
];

const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

export const ACHIEVEMENTS: AchievementDef[] = FAMILIES.flatMap(f =>
  f.thresholds.map((t, i) => ({
    id: `${f.key}_${t}`,
    family: f.family,
    familyEmoji: f.emoji,
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
  'Wishlist',
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

export const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

export const GOLD_ICON = '🪙';

// ---------- Social Hub: intel-dossier contact fields ----------
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

export const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'dailyContract', 'weeklyBoss', 'todayHabits', 'lifeBalance', 'attributes', 'quickTasks', 'quests', 'journal', 'calendar',
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
