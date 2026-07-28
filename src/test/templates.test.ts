import { describe, expect, it } from 'vitest';
import { ARCHETYPE_KEYS, ATTR_KEYS } from '../game/constants';
import {
  HABIT_TEMPLATES,
  QUEST_TEMPLATES,
  habitTemplatesFor,
  questTemplatesFor,
  recommendedFor,
} from '../game/templates';
import { ATTRIBUTE_CONTENT, WHEEL_ORDER } from '../game/wheel';

describe('wheel content', () => {
  it('covers all eight attributes exactly once', () => {
    expect(new Set(WHEEL_ORDER)).toEqual(new Set(ATTR_KEYS));
    expect(WHEEL_ORDER).toHaveLength(8);
    for (const k of ATTR_KEYS) {
      const c = ATTRIBUTE_CONTENT[k];
      expect(c.wheelName).toBeTruthy();
      expect(c.definition).toBeTruthy();
      expect(c.why).toBeTruthy();
      expect(c.connection).toBeTruthy();
      expect(c.neglect).toBeTruthy();
    }
  });
});

describe('template library integrity', () => {
  it('gives every attribute something to add', () => {
    for (const k of ATTR_KEYS) {
      expect(habitTemplatesFor(k).length, `no habits for ${k}`).toBeGreaterThan(0);
      // An attribute page with an empty quest section reads as unfinished — and
      // spirituality shipped that way on the first pass, which is how this test exists
      expect(questTemplatesFor(k).length, `no quests for ${k}`).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = [...HABIT_TEMPLATES, ...QUEST_TEMPLATES].map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tags every template with real attributes and a source', () => {
    for (const t of [...HABIT_TEMPLATES, ...QUEST_TEMPLATES]) {
      expect(t.attrs.length, `${t.id} has no attributes`).toBeGreaterThan(0);
      for (const a of t.attrs) expect(ATTR_KEYS).toContain(a);
      expect(t.source, `${t.id} is uncited`).toBeTruthy();
    }
  });

  it('never lists a radical as both suited and avoided', () => {
    for (const t of [...HABIT_TEMPLATES, ...QUEST_TEMPLATES]) {
      const overlap = t.suits.filter(r => t.avoid?.includes(r));
      expect(overlap, `${t.id} contradicts itself`).toEqual([]);
    }
  });

  it('weekly habits specify which day', () => {
    for (const t of HABIT_TEMPLATES.filter(x => x.freq === 'weekly')) {
      expect(t.weekdays?.length, `${t.id} is weekly with no weekday`).toBeGreaterThan(0);
      for (const d of t.weekdays!) expect(d).toBeGreaterThanOrEqual(0);
      for (const d of t.weekdays!) expect(d).toBeLessThanOrEqual(6);
    }
  });

  it('gives every quest concrete steps', () => {
    for (const t of QUEST_TEMPLATES) {
      expect(t.steps.length, `${t.id} has no steps`).toBeGreaterThan(0);
    }
  });
});

describe('profile filtering', () => {
  it('returns the library untouched when no profile is set', () => {
    expect(recommendedFor(HABIT_TEMPLATES, undefined)).toEqual(HABIT_TEMPLATES);
    expect(recommendedFor(HABIT_TEMPLATES, [])).toEqual(HABIT_TEMPLATES);
  });

  it('drops templates that explicitly fail for a radical in the profile', () => {
    const out = recommendedFor(HABIT_TEMPLATES, ['hyperthymic']);
    expect(out.every(t => !t.avoid?.includes('hyperthymic'))).toBe(true);
    // "Eat the frog" is marked avoid: hyperthymic — it must not be recommended
    expect(out.find(t => t.id === 'c_frog')).toBeUndefined();
  });

  it('ranks a genuine match above a broad template', () => {
    // Schizoid-first profile: the deep-work block suits schizoid explicitly
    const out = recommendedFor(habitTemplatesFor('career'), ['schizoid']);
    const deep = out.findIndex(t => t.id === 'c_deepblock');
    expect(deep).toBeGreaterThanOrEqual(0);
    expect(deep).toBeLessThan(out.length - 1);
  });

  it('never empties a sector, because broad templates always survive', () => {
    for (const k of ATTR_KEYS) {
      for (const r of ['epileptoid', 'hyperthymic', 'schizoid', 'anxious'] as const) {
        expect(recommendedFor(habitTemplatesFor(k), [r]).length, `${k} emptied for ${r}`).toBeGreaterThan(0);
      }
    }
  });

  it("respects the profile's own ordering", () => {
    const all = habitTemplatesFor('career');
    const schizoidFirst = recommendedFor(all, ['schizoid', 'hysteroid']);
    const hysteroidFirst = recommendedFor(all, ['hysteroid', 'schizoid']);
    // c_ship suits hysteroid, c_deepblock suits schizoid — swapping the profile
    // order must swap which one leads
    const lead = (xs: typeof all) => xs[0].id;
    expect(lead(schizoidFirst)).not.toBe(lead(hysteroidFirst));
  });

  it('is a pure reordering — no template is invented or duplicated', () => {
    const out = recommendedFor(HABIT_TEMPLATES, ['emotive', 'schizoid']);
    expect(new Set(out.map(t => t.id)).size).toBe(out.length);
    for (const t of out) expect(HABIT_TEMPLATES).toContain(t);
  });
});

describe('library integrity', () => {
  const all = [...HABIT_TEMPLATES, ...QUEST_TEMPLATES];

  it('has no duplicate ids — createCharacter resolves the starter kit by id', () => {
    const ids = all.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every sector enough to choose from', () => {
    // A sector with three options is a sector nobody browses. The library used to
    // leave Friends, Family, Career and Money on three or four each.
    for (const key of ATTR_KEYS) {
      expect(habitTemplatesFor(key).length, `${key} habits`).toBeGreaterThanOrEqual(6);
      expect(questTemplatesFor(key).length, `${key} quests`).toBeGreaterThanOrEqual(1);
    }
  });

  it('is no longer sourced from a single pair of books', () => {
    // Every card wearing one of two citations made the library read as a book
    // summary with checkboxes. Most of it should now be ordinary practice.
    const sources = new Set(all.map(t => t.source));
    expect(sources.size).toBeGreaterThanOrEqual(4);
    const booky = all.filter(t => t.source.includes('Atomic Habits') || t.source.includes('Extreme Time Management'));
    expect(booky.length).toBeLessThan(all.length / 2);
  });

  it('never recommends a template against a radical it declares it fails for', () => {
    for (const r of ARCHETYPE_KEYS) {
      for (const t of recommendedFor(all, [r])) {
        expect(t.avoid ?? [], `${t.id} recommended to ${r}`).not.toContain(r);
      }
    }
  });

  it('keeps every weekly template on at least one real weekday', () => {
    for (const t of HABIT_TEMPLATES) {
      if (t.freq !== 'weekly') continue;
      expect(t.weekdays, `${t.id}`).toBeDefined();
      expect(t.weekdays!.length, `${t.id}`).toBeGreaterThan(0);
      for (const d of t.weekdays!) expect(d, `${t.id}`).toBeGreaterThanOrEqual(0), expect(d).toBeLessThanOrEqual(6);
    }
  });

  it('tags every template with at least one attribute, so XP always has somewhere to go', () => {
    for (const t of all) expect(t.attrs.length, `${t.id}`).toBeGreaterThan(0);
  });
});
