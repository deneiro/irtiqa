import { describe, expect, it } from 'vitest';
import { THEMES } from '../game/constants';
import { isThemeUnlocked, motionForTheme } from '../game/engine';

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

describe('motionForTheme — the Phase 2 juice-layer signature', () => {
  it('returns each theme its declared motion key', () => {
    expect(motionForTheme('brutal')).toBe('stamp');
    expect(motionForTheme('clay')).toBe('squish');
    expect(motionForTheme('liquid')).toBe('specular');
    expect(motionForTheme('maximal')).toBe('confetti');
  });

  it('falls back to "none" for an unknown theme id', () => {
    expect(motionForTheme('does-not-exist')).toBe('none');
  });

  it('gives every registered theme a non-empty motion key', () => {
    for (const t of THEMES) {
      expect(motionForTheme(t.id).length).toBeGreaterThan(0);
    }
  });
});
