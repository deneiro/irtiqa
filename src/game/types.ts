/**
 * The app's icon vocabulary.
 *
 * Declared here, in the data layer, rather than next to the glyph map in
 * components/Icon.tsx: the data tables below (items, ranks, bosses, themes,
 * achievement families) are what *choose* an icon, so they must be able to name
 * one without importing a component. Icon.tsx imports this and supplies the
 * Lucide component for each name.
 */
export type IconName =
  // modules / nav
  | 'dashboard' | 'habits' | 'quests' | 'journal' | 'social' | 'finances' | 'market' | 'achievements' | 'settings' | 'calendar'
  | 'life' | 'people' | 'more'
  // attributes
  | 'health' | 'friends' | 'family' | 'money' | 'career' | 'spirituality' | 'development' | 'brightness'
  // classes (the seven radicals)
  | 'bard' | 'warden' | 'sovereign' | 'healer' | 'magician' | 'herald' | 'sentinel'
  // market items
  | 'potionSmall' | 'potionMedium' | 'potionLarge' | 'shield' | 'pardon' | 'indulgence'
  | 'ghost' | 'feather' | 'focus' | 'boost' | 'identity'
  // weekly bosses, one per sector
  | 'bossHealth' | 'bossFriends' | 'bossFamily' | 'bossMoney'
  | 'bossCareer' | 'bossSpirituality' | 'bossDevelopment' | 'bossBrightness'
  // rank ladder
  | 'rankSeeker' | 'rankNovice' | 'rankApprentice' | 'rankAdept' | 'rankJourneyman'
  | 'rankExpert' | 'rankVeteran' | 'rankMaster' | 'rankGrandmaster' | 'rankLegend'
  // achievement families
  | 'famLeveling' | 'famDiscipline' | 'famStreaks' | 'famQuesting' | 'famDeepWork'
  | 'famReflection' | 'famConnections' | 'famCleanSlate' | 'famBookkeeping' | 'famFortune'
  | 'famShopping' | 'famAlchemy' | 'famErrands' | 'famBalance' | 'famBossHunter'
  // contact channels
  | 'instagram' | 'whatsapp' | 'telegram' | 'phone' | 'email'
  // cosmetics
  | 'frame' | 'title' | 'banner'
  // themes
  | 'themeMidnight' | 'themeParchment' | 'themeNeon' | 'themeSkeuo'
  // actions / chrome
  | 'gold' | 'check' | 'close' | 'edit' | 'trash' | 'plus' | 'minus' | 'starFilled' | 'starOutline'
  | 'play' | 'stop' | 'flag' | 'lock' | 'unlock' | 'trophy' | 'grip' | 'eye' | 'eyeOff'
  | 'cake' | 'target' | 'chevronLeft' | 'chevronRight' | 'chevronUp' | 'chevronDown'
  | 'chronicle' | 'wheel' | 'subscription' | 'chest' | 'flame' | 'sparkles'
  | 'upload' | 'download' | 'image' | 'camera' | 'search' | 'filter' | 'info' | 'warning'
  | 'arrowUp' | 'arrowDown' | 'bell' | 'palette' | 'sound' | 'logout' | 'link' | 'external'
  | 'book' | 'brain' | 'learn' | 'write' | 'quote' | 'receipt' | 'card' | 'banknote' | 'tasks';

export type AttributeKey =
  | 'health'
  | 'friends'
  | 'family'
  | 'money'
  | 'career'
  | 'spirituality'
  | 'development'
  | 'brightness';

// Each class is a Ponomarenko radical made playable — a *driver*, not an attribute.
export type ClassId =
  | 'bard' // R1 Performer
  | 'warden' // R2 Systematizer
  | 'sovereign' // R3 Founder
  | 'healer' // R4 Empath
  | 'magician' // R5 Inventor
  | 'herald' // R6 Spark
  | 'sentinel'; // R7 Anchor

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  /** e.g. "R5 · The Inventor" — the radical this class embodies. */
  radical: string;
  /** The 1–2 life areas this class pours energy into. Its magnitude comes from
   *  attunement (which slot it sits in), not a fixed number — see engine.attunements(). */
  affinity: AttributeKey[];
  /** The scalable perk, described for the player. Strength scales with the slot's attunement. */
  perk: string;
  /** The Signature: a unique identity line that reads as "mastered" only at ≥60% attunement
   *  (a Specialist, or the primary of a Duo). Deep mechanics land in a later pass. */
  signature: string;
}

export interface Character {
  name: string;
  /** Primary class = classes[0]. Kept in sync for every display component that shows one class. */
  classId: ClassId;
  /** The full ordered loadout, 1–3 classes, strongest first. Slot order sets attunement. */
  classes: ClassId[];
  xp: number;
  hp: number; // 0..100
  gold: number;
  createdAt: string; // ISO
  /**
   * Radical profile, strongest first (Ponomarenko's 7 — the same vocabulary the
   * Social hub uses for contacts). Optional and unset by default: when absent the
   * template library is shown unfiltered rather than guessing at a fit.
   */
  profile?: PersonalityArchetype[];
}

export interface RankDef {
  minLevel: number;
  name: string;
  icon: IconName;
}

/** One Wheel of Life self-audit: the subjective 0–10 score per sector at a point in time.
 *  The first seeds the starting wheel; later ones (quarterly Wheel Checks) build the arc. */
export interface WheelSnapshot {
  date: string; // YYYY-MM-DD
  scores: Record<AttributeKey, number>; // 0–10 per sector
}

/** One life sector's tick-box statements for the Wheel of Life audit. */
export interface WheelSectorDef {
  key: AttributeKey;
  statements: string[];
}

// ---------- Habits ----------
export type HabitKind = 'good' | 'bad';
export type HabitFreq = 'daily' | 'weekly' | 'dates';
export type HabitDayStatus = 'done' | 'failed' | 'pardoned' | 'shielded' | 'ghost' | 'indulged';

export interface Habit {
  id: string;
  name: string;
  kind: HabitKind;
  freq: HabitFreq;
  weekdays?: number[]; // 0 (Sun) .. 6 (Sat), for freq 'weekly'
  dates?: string[]; // YYYY-MM-DD list, for freq 'dates'
  attrs: AttributeKey[];
  streak: number;
  best: number;
  createdAt: string; // YYYY-MM-DD
  archived?: boolean;
}

export interface FailureRecord {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  prevStreak: number;
  damage: number;
  pardoned?: boolean;
  /** Optional one-line answer to "what triggered it?" — failure as information, not just punishment. */
  trigger?: string;
}

// ---------- Quests ----------
export interface QuestSession {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  note: string;
}

export type QuestDuration = '1d' | '1w' | '2w' | '1m' | '3m' | '6m' | '1y' | 'none';

export interface Quest {
  id: string;
  title: string;
  description?: string;
  targetDuration: QuestDuration;
  attrs: AttributeKey[];
  sessions: QuestSession[];
  priority: boolean;
  createdAt: string; // ISO
  completedAt?: string; // ISO
}

/** A long-horizon goal sitting above quests: the "why" behind the daily grind. Links quests; pays out once, only if real linked work got finished. */
export interface Goal {
  id: string;
  title: string;
  why?: string;
  targetDate: string; // YYYY-MM-DD
  attrs: AttributeKey[];
  questIds: string[];
  createdAt: string; // ISO
  completedAt?: string; // ISO
}

export interface QuickTask {
  id: string;
  title: string;
  attr: AttributeKey;
  createdAt: string;
  doneAt?: string;
  dueDate?: string; // YYYY-MM-DD, optional — lets the task appear on the Calendar
}

// ---------- Journal ----------
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD, one entry per day
  createdAt: string; // ISO
  mood: number; // 1..5
  stress: number; // 1..10
  answers: { q: string; a: string }[];
  unlocked?: boolean; // Feather of Time applied
}

// ---------- Social ----------
export type PersonalityArchetype =
  | 'hysteroid'
  | 'epileptoid'
  | 'anxious'
  | 'emotive'
  | 'schizoid'
  | 'paranoid'
  | 'hyperthymic';

export type PrimaryGroup = 'family' | 'relative' | 'colleague' | 'friend' | 'close';

export interface ContactChannels {
  instagram?: string;
  whatsapp?: string;
  telegram?: string;
  phone?: string;
  email?: string;
}

export interface Contact {
  id: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  birthday?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other';
  archetypes: PersonalityArchetype[];
  occupation?: string;
  primaryGroup: PrimaryGroup;
  channels: ContactChannels;
  notes: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  accountId?: string; // set when the payment was posted as a real transaction
}

export interface Debt {
  id: string;
  contactId: string;
  direction: 'iOwe' | 'theyOwe';
  amount: number; // original amount
  note: string;
  createdAt: string;
  payments: DebtPayment[];
  settledAt?: string; // set once payments cover the full amount
}

export interface SocialEvent {
  id: string;
  contactId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  /** Set when the meeting actually happened — the moment that earns, not the scheduling. */
  doneAt?: string;
}

// ---------- Finances ----------
export interface Account {
  id: string;
  name: string;
  initialBalance: number;
}

export interface Tx {
  id: string;
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  subId?: string; // set when auto-posted by a subscription
  transferId?: string; // links the two legs of one account-to-account transfer
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  accountId: string;
  category: string;
  dayOfMonth: number; // 1..28
  nextDue: string; // YYYY-MM-DD
  active: boolean;
}

/** A player-created real-world reward — bought with Gold AND real money from a chosen account. */
export interface WishlistItem {
  id: string;
  name: string;
  goldCost: number;
  moneyCost: number;
  createdAt: string;
  purchasedAt?: string;
}

// ---------- Market ----------
export type ItemId =
  | 'potion_s'
  | 'potion_m'
  | 'potion_l'
  | 'streak_shield'
  | 'habit_pardon'
  | 'indulgence'
  | 'ghost_day'
  | 'feather'
  | 'focus_unlock'
  | 'attr_boost'
  | 'identity_scroll';

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: IconName;
  price: number;
  desc: string;
  kind: 'consumable' | 'permanent';
  heal?: number;
}

// ---------- Achievements ----------
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Metrics {
  level: number;
  checkins: number;
  bestStreak: number;
  questsCompleted: number;
  sessionHours: number;
  journalCount: number;
  contacts: number;
  debtsSettled: number;
  txs: number;
  goldEarned: number;
  itemsBought: number;
  itemsUsed: number;
  quickTasks: number;
  minAttrLevel: number;
  bossesDefeated: number;
}

export interface AchievementDef {
  id: string;
  family: string;
  familyIcon: IconName;
  tier: Tier;
  name: string;
  desc: string;
  cond: (m: Metrics) => boolean;
}

// ---------- Celebrations (animations queue) ----------
export type CelebrationType =
  | 'reward'
  | 'damage'
  | 'info'
  | 'item'
  | 'levelup'
  | 'rankup'
  | 'achievement';

export interface Celebration {
  id: string;
  type: CelebrationType;
  title: string;
  subtitle?: string;
  tier?: Tier;
  /** Rendered by CelebrationLayer. Titles used to carry a literal emoji, which meant
   *  the app's loudest, most-seen surface was the one place the icon system didn't reach. */
  icon?: IconName;
}

// ---------- Stats (counters used by achievements) ----------
export interface Stats {
  checkins: number;
  goldEarned: number;
  questsCompleted: number;
  sessionMinutes: number;
  itemsBought: number;
  itemsUsed: number;
  quickTasksDone: number;
  debtsSettled: number;
  bestStreak: number;
  bossesDefeated: number;
}

// ---------- Weekly boss ----------
/** One boss per week, spawned from the weakest attribute. Slay it with tagged actions or eat the penalty at rollover. */
export interface BossState {
  week: string; // Monday of the boss week (YYYY-MM-DD)
  attr: AttributeKey;
  required: number;
  progress: number;
  defeatedAt?: string; // ISO
}

export interface Effects {
  indulgence: number; // active charges: next bad-habit relapse forgiven
  xpBoostCharges: number; // +50% XP for next N xp-earning actions
  maxPriority: number; // 1, or 2 after Focus Unlock
  ghostDays: string[]; // dates fully frozen
  /** Set after a long absence: check in `remaining` habits before `expiresDay` to restore HP. */
  comeback?: { remaining: number; expiresDay: string } | null;
}

export interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  icon: IconName;
  /** The one always-unlocked default. Free themes never show a price and never lock. */
  free?: boolean;
  /** Symbolic real-money price shown on non-free themes. Display-only — no payment path yet. */
  price?: number;
  /**
   * Motion-signature key the juice layer reads in Phase 2 (e.g. 'specular', 'squish').
   * Stored now so themes are complete; ambient CSS motion in Phase 1 keys off `id` in styles.css.
   */
  motion?: string;
}

// ---------- Dashboard customization ----------
export type DashboardWidgetId =
  | 'chronicle'
  | 'dailyContract'
  | 'weeklyBoss'
  | 'todayHabits'
  | 'lifeBalance'
  | 'attributes'
  | 'quickTasks'
  | 'quests'
  | 'journal'
  | 'calendar';

// ---------- Cosmetics (chest loot: avatar frames, titles, dashboard banners) ----------
export type CosmeticSlot = 'frame' | 'title' | 'banner';
export type CosmeticRarity = 'common' | 'rare' | 'epic';

export interface CosmeticDef {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  desc: string;
}
