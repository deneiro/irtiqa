import { beforeEach, describe, expect, it } from 'vitest';
import { ATTR_KEYS } from '../game/constants';
import { LIBRARY, LIBRARY_READ_REWARD, libraryEntry, libraryFor } from '../game/library';
import { HABIT_TEMPLATES, QUEST_TEMPLATES } from '../game/templates';
import { useGame } from '../store';

/**
 * The library is data, and data rots quietly. These tests exist so that renaming
 * or deleting a template in `templates.ts` breaks the build here rather than
 * rendering a Library entry whose "turn it into practice" section is missing the
 * practice — the exact section the whole feature is for.
 */

describe('library data', () => {
  it('has unique slugs', () => {
    const slugs = LIBRARY.map(e => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('files every entry under a real attribute', () => {
    for (const e of LIBRARY) expect(ATTR_KEYS).toContain(e.attr);
  });

  it('resolves every habit practice to a real habit template', () => {
    const ids = new Set(HABIT_TEMPLATES.map(t => t.id));
    for (const e of LIBRARY) {
      for (const p of e.habits) {
        expect(ids.has(p.id), `${e.slug} → habit ${p.id}`).toBe(true);
      }
    }
  });

  it('resolves every quest practice to a real quest template', () => {
    const ids = new Set(QUEST_TEMPLATES.map(t => t.id));
    for (const e of LIBRARY) {
      for (const p of e.quests) {
        expect(ids.has(p.id), `${e.slug} → quest ${p.id}`).toBe(true);
      }
    }
  });

  it('never lists the same practice twice in one entry', () => {
    for (const e of LIBRARY) {
      const ids = [...e.habits, ...e.quests].map(p => p.id);
      expect(new Set(ids).size, e.slug).toBe(ids.length);
    }
  });

  it('gives every entry something to read and something to do', () => {
    for (const e of LIBRARY) {
      expect(e.thesis.length, e.slug).toBeGreaterThan(80);
      expect(e.ideas.length, e.slug).toBeGreaterThan(2);
      expect(e.practices.length, e.slug).toBeGreaterThan(2);
      expect(e.habits.length + e.quests.length, e.slug).toBeGreaterThan(0);
      // Provenance is not optional: an entry with no traceable source is exactly
      // the kind of confident, unattributed advice this app is trying not to be.
      expect(e.vaultSource.length, e.slug).toBeGreaterThan(0);
    }
  });

  it('looks entries up by slug and by sector', () => {
    const first = LIBRARY[0];
    expect(libraryEntry(first.slug)).toBe(first);
    expect(libraryEntry('nope')).toBeUndefined();
    expect(libraryFor(first.attr)).toContain(first);
    for (const e of libraryFor('health')) expect(e.attr).toBe('health');
  });
});

describe('marking an entry read', () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().createCharacter('Tester', ['bard']);
  });

  it('pays once and records the day', () => {
    const entry = LIBRARY[0];
    const before = useGame.getState().attrs[entry.attr];

    useGame.getState().markLibraryRead(entry.slug);
    const afterFirst = useGame.getState().attrs[entry.attr];
    expect(afterFirst).toBeGreaterThanOrEqual(before + LIBRARY_READ_REWARD.xp);
    expect(useGame.getState().libraryRead[entry.slug]).toBeTruthy();

    // Re-reading is free, in both directions: no second payout, no lost record.
    useGame.getState().markLibraryRead(entry.slug);
    expect(useGame.getState().attrs[entry.attr]).toBe(afterFirst);
  });

  it('ignores a slug that is not in the library', () => {
    useGame.getState().markLibraryRead('not-a-real-entry');
    expect(useGame.getState().libraryRead['not-a-real-entry']).toBeUndefined();
  });
});
