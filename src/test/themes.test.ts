import { describe, expect, it } from 'vitest';
import { THEME_BASE_COLORS, THEMES } from '../game/constants';
import { applyThemeOverrides, CUSTOM_THEME_TOKENS, isThemeUnlocked, motionForTheme } from '../game/engine';
import { useGame } from '../store';

const free = THEMES.find(t => t.free)!;              // midnight
const premium = THEMES.find(t => !t.free)!;         // skeuo

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
    expect(isThemeUnlocked(premium, { adminUnlockAll: false, ownedThemes: ['midnight', premium.id] })).toBe(true);
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
    expect(motionForTheme('midnight')).toBe('aurora');
    expect(motionForTheme('skeuo')).toBe('bevel');
    expect(motionForTheme('neon')).toBe('pulse');
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

describe('THEME_BASE_COLORS — the color picker\'s source of truth', () => {
  it('has an entry for every registered theme', () => {
    for (const t of THEMES) {
      expect(THEME_BASE_COLORS[t.id]).toBeDefined();
    }
  });

  it('every base color is a valid 6-digit hex (input[type=color] requires it)', () => {
    const hex6 = /^#[0-9a-f]{6}$/i;
    for (const colors of Object.values(THEME_BASE_COLORS)) {
      for (const value of Object.values(colors)) {
        expect(value).toMatch(hex6);
      }
    }
  });
});

// The suite runs in a plain Node environment (no jsdom — see vite.config.ts), so
// applyThemeOverrides is exercised against a minimal fake `style`, the only thing
// it actually touches on the element it's given.
function fakeRoot() {
  const props = new Map<string, string>();
  return {
    style: {
      setProperty: (k: string, v: string) => void props.set(k, v),
      removeProperty: (k: string) => void props.delete(k),
      getPropertyValue: (k: string) => props.get(k) ?? '',
    },
  } as unknown as HTMLElement;
}

describe('applyThemeOverrides — live recoloring', () => {
  it('sets each override token as an inline CSS variable on the root', () => {
    const root = fakeRoot();
    applyThemeOverrides(root, { '--accent': '#ff0055', '--bg': '#111111' });
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0055');
    expect(root.style.getPropertyValue('--bg')).toBe('#111111');
  });

  it('re-derives --accent-soft from an overridden accent', () => {
    const root = fakeRoot();
    applyThemeOverrides(root, { '--accent': '#ff0055' });
    expect(root.style.getPropertyValue('--accent-soft')).toContain('#ff0055');
  });

  it('clears every custom token (and --accent-soft) when there are no overrides', () => {
    const root = fakeRoot();
    applyThemeOverrides(root, { '--accent': '#ff0055' });
    applyThemeOverrides(root, undefined);
    for (const { token } of CUSTOM_THEME_TOKENS) {
      expect(root.style.getPropertyValue(token)).toBe('');
    }
    expect(root.style.getPropertyValue('--accent-soft')).toBe('');
  });
});

describe('setThemeColor / resetThemeColors — the store actions', () => {
  it('records an override for the given theme and token, leaving other themes untouched', () => {
    useGame.getState().setThemeColor('glass', '--accent', '#123456');
    expect(useGame.getState().themeOverrides.glass?.['--accent']).toBe('#123456');
    expect(useGame.getState().themeOverrides.midnight).toBeUndefined();
  });

  it('resetThemeColors clears only that theme\'s overrides', () => {
    useGame.getState().setThemeColor('glass', '--accent', '#123456');
    useGame.getState().setThemeColor('clay', '--bg', '#abcdef');
    useGame.getState().resetThemeColors('glass');
    expect(useGame.getState().themeOverrides.glass).toBeUndefined();
    expect(useGame.getState().themeOverrides.clay?.['--bg']).toBe('#abcdef');
    // clean up so this doesn't leak into other test files
    useGame.getState().resetThemeColors('clay');
  });
});
