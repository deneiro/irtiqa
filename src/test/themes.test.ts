import { describe, expect, it } from 'vitest';
import { THEMES } from '../game/constants';
import { isThemeUnlocked } from '../game/engine';

const free = THEMES.find(t => t.free)!;              // midnight
const premium = THEMES.find(t => t.id === 'liquid')!; // a paid theme

describe('isThemeUnlocked — the owner-mode gate', () => {
  it('unlocks everything while owner mode is on', () => {
    const opts = { adminUnlockAll: true, ownedThemes: ['midnight'] };
    for (const t of THEMES) {
      expect(isThemeUnlocked(t, opts)).toBe(true);
    }
  });

  it('with owner mode off, the free default is still unlocked', () => {
    expect(isThemeUnlocked(free, { adminUnlockAll: false, ownedThemes: [] })).toBe(true);
  });

  it('with owner mode off, a priced theme is locked unless owned', () => {
    expect(isThemeUnlocked(premium, { adminUnlockAll: false, ownedThemes: ['midnight'] })).toBe(false);
  });

  it('respects a legacy owned theme even with owner mode off', () => {
    expect(isThemeUnlocked(premium, { adminUnlockAll: false, ownedThemes: ['midnight', 'liquid'] })).toBe(true);
  });

  it('every theme carries the data a picker needs (free flag or a price)', () => {
    for (const t of THEMES) {
      const hasPriceOrFree = t.free === true || typeof t.price === 'number';
      expect(hasPriceOrFree).toBe(true);
    }
  });
});
