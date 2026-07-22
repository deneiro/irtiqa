import { COSMETIC_RARITY_META, COSMETICS } from './constants';
import type { CosmeticDef } from './types';

export type ChestBonus =
  | { kind: 'none' }
  | { kind: 'gold'; amount: number }
  | { kind: 'boost'; charges: number }
  | { kind: 'shield' }
  | { kind: 'cosmetic'; cosmetic: CosmeticDef };

export interface ChestLoot {
  gold: number;
  crit: boolean;
  bonus: ChestBonus;
}

/** Rarity-weighted pick among cosmetics the player doesn't own yet. */
function rollCosmetic(rand: () => number, owned: string[]): CosmeticDef | null {
  const pool = COSMETICS.filter(c => !owned.includes(c.id));
  if (pool.length === 0) return null;
  const total = pool.reduce((a, c) => a + COSMETIC_RARITY_META[c.rarity].weight, 0);
  let roll = rand() * total;
  for (const c of pool) {
    roll -= COSMETIC_RARITY_META[c.rarity].weight;
    if (roll <= 0) return c;
  }
  return pool[pool.length - 1];
}

/**
 * The daily chest: a variable reward you can only earn by actually living the
 * day well. Base gold always drops; a 10% crit doubles it; one bonus slot may
 * hold extra gold, boost charges, a streak shield, or a cosmetic.
 * `rand` is injected so tests can pin the outcome.
 */
export function rollChest(rand: () => number, ownedCosmetics: string[]): ChestLoot {
  const base = 12 + Math.floor(rand() * 14); // 12-25
  const crit = rand() < 0.1;
  const gold = crit ? base * 2 : base;

  const r = rand();
  let bonus: ChestBonus = { kind: 'none' };
  if (r < 0.15) {
    const cosmetic = rollCosmetic(rand, ownedCosmetics);
    // Full wardrobe → the slot falls through to gold so the roll never feels dead
    bonus = cosmetic ? { kind: 'cosmetic', cosmetic } : { kind: 'gold', amount: 15 };
  } else if (r < 0.3) {
    bonus = { kind: 'boost', charges: 2 };
  } else if (r < 0.4) {
    bonus = { kind: 'shield' };
  } else if (r < 0.6) {
    bonus = { kind: 'gold', amount: 8 + Math.floor(rand() * 13) }; // 8-20
  }

  return { gold, crit, bonus };
}
