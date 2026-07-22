import type { AttributeKey } from './types';

// The weekly boss turns the radar chart's diagnosis into gameplay: it always
// spawns from whichever attribute you've fed the least, so slaying it IS
// rebalancing your life. The reward is about a day's worth of gold.
//
// It is pure upside: an unslain boss costs nothing, it just leaves Monday.
// It used to take 15 HP for going unchallenged — which meant a rough week
// ended by billing you for it, on the attribute you were already worst at.
export const BOSS_REQUIRED = 3; // meaningful tagged actions to slay it
export const BOSS_REWARD = { xp: 60, gold: 30 };

export const BOSSES: Record<AttributeKey, { name: string; emoji: string; taunt: string }> = {
  health: { name: 'The Sloth of Neglect', emoji: '🦥', taunt: 'Your body forgets what you refuse to remind it.' },
  friends: { name: "The Hermit's Shadow", emoji: '🕸️', taunt: 'Cobwebs grow where no one visits.' },
  family: { name: 'The Cold Hearth', emoji: '🧊', taunt: 'A fire untended is just a pile of ash.' },
  money: { name: 'The Debt Wraith', emoji: '💸', taunt: 'It feeds on every coin you refuse to count.' },
  career: { name: 'The Stagnation Serpent', emoji: '🐍', taunt: 'It coils tighter every week you drift.' },
  spirituality: { name: 'The Hollow Echo', emoji: '🕳️', taunt: 'Silence inside grows louder the longer you avoid it.' },
  development: { name: 'The Rust of Mind', emoji: '⚙️', taunt: 'An unsharpened blade dulls all on its own.' },
  brightness: { name: 'The Grey Fog', emoji: '🌫️', taunt: 'It drains the color out of days you never claim.' },
};
