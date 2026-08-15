import { beforeEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, ATTRIBUTES, CLASSES, ITEMS, QUEST_DURATIONS, RANKS, THEMES, TIER_LABEL, WHEEL_SURVEY, reflectionQuestions } from '../game/constants';
import { EN } from '../i18n/dict/en';
import { RU } from '../i18n/dict/ru';
import { getLang, plural, pluralRu, setLang, t } from '../i18n';

beforeEach(() => setLang('en'));

describe('dictionary parity', () => {
  // The real failure mode of a second language isn't a bad translation, it's a
  // forgotten one — a key added to a page in English and never mirrored. That
  // shows up as an English sentence marooned in a Russian screen, which is
  // exactly what these two tests refuse to let through.
  it('has a Russian entry for every English key outside the Library', () => {
    // The Library is 100 entries and ~67k words, translated sector by sector; see
    // the progress test below, which is what holds that migration honest. Every
    // other key must be present in both languages, always.
    const missing = Object.keys(EN).filter(k => !k.startsWith('lib.') && !(k in RU));
    expect(missing, `missing Russian for: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * Library translation progress.
   *
   * A missing `lib.*` key falls back to English, so an unfinished Library never
   * breaks a page — which is exactly why it needs a test that notices. This one
   * fails if the count ever drops, so finished sectors cannot be silently lost.
   * Raise TRANSLATED_LIBRARY_KEYS as sectors land.
   */
  const TRANSLATED_LIBRARY_KEYS = 142;

  it('does not lose ground on the Library', () => {
    const done = Object.keys(EN).filter(k => k.startsWith('lib.') && k in RU).length;
    const total = Object.keys(EN).filter(k => k.startsWith('lib.')).length;
    expect(
      done,
      `Library: ${done}/${total} keys translated — expected at least ${TRANSLATED_LIBRARY_KEYS}. ` +
        'If you translated more, raise TRANSLATED_LIBRARY_KEYS to match.',
    ).toBeGreaterThanOrEqual(TRANSLATED_LIBRARY_KEYS);
  });

  it('has no Russian Library key without an English original', () => {
    const orphans = Object.keys(RU).filter(k => k.startsWith('lib.') && !(k in EN));
    expect(orphans, `orphaned Russian Library keys: ${orphans.join(', ')}`).toEqual([]);
  });

  it('has an English entry for every Russian key', () => {
    const extra = Object.keys(RU).filter(k => !(k in EN));
    expect(extra, `Russian keys with no English original: ${extra.join(', ')}`).toEqual([]);
  });

  it('agrees on which keys take interpolation vars', () => {
    // A phrase that is a function in one language and a bare string in the other
    // means one side silently drops its numbers.
    const mismatched = Object.keys(EN).filter(
      k => k in RU && typeof EN[k] !== typeof RU[k],
    );
    expect(mismatched, `arity mismatch: ${mismatched.join(', ')}`).toEqual([]);
  });

  it('leaves no empty strings', () => {
    const blank = [...Object.entries(EN), ...Object.entries(RU)]
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);
    expect(blank).toEqual([]);
  });
});

describe('t()', () => {
  it('returns the active language', () => {
    expect(t('nav.habits')).toBe('Habits');
    setLang('ru');
    expect(t('nav.habits')).toBe('Привычки');
  });

  it('interpolates vars', () => {
    expect(t('layout.xpToLevel', { into: 10, need: 40, level: 3 })).toBe('10/40 XP to level 3');
  });

  it('falls back to English rather than rendering a raw key', () => {
    // Simulated gap: a key the Russian dictionary happens not to carry.
    expect(t('__nonexistent__')).toBe('__nonexistent__');
  });

  it('tracks the language it was last set to', () => {
    setLang('ru');
    expect(getLang()).toBe('ru');
  });
});

describe('Russian plurals', () => {
  it('picks the one/few/many forms by the real rule, not n === 1', () => {
    const f = (n: number) => pluralRu(n, 'день', 'дня', 'дней');
    expect(f(1)).toBe('день');
    expect(f(2)).toBe('дня');
    expect(f(4)).toBe('дня');
    expect(f(5)).toBe('дней');
    expect(f(11)).toBe('дней'); // 11 is NOT "one" despite ending in 1
    expect(f(14)).toBe('дней'); // 12-14 are NOT "few"
    expect(f(21)).toBe('день');
    expect(f(22)).toBe('дня');
    expect(f(25)).toBe('дней');
    expect(f(111)).toBe('дней');
    expect(f(0)).toBe('дней');
  });

  it('collapses to two forms in English', () => {
    setLang('en');
    expect(plural(1, 'day', 'days', 'days')).toBe('day');
    expect(plural(5, 'day', 'days', 'days')).toBe('days');
  });
});

describe('content constants follow the language', () => {
  // These are the getter-backed constants: the app reads `cls.name` in ~40 places
  // with no idea translation exists, so a getter that captured its value at module
  // load would strand the whole app in whichever language booted first.
  it('translates classes, items, ranks, themes and attributes', () => {
    const bard = () => CLASSES.find(c => c.id === 'bard')!;
    const potion = () => ITEMS.find(i => i.id === 'potion_s')!;

    expect(bard().name).toBe('Bard');
    expect(potion().name).toBe('Small Health Potion');
    expect(RANKS[0].name).toBe('Seeker');
    expect(THEMES[0].name).toBe('Midnight');
    expect(ATTRIBUTES.health.label).toBe('Health');
    expect(TIER_LABEL.bronze).toBe('Bronze');

    setLang('ru');

    expect(bard().name).toBe('Бард');
    expect(potion().name).toBe('Малое зелье здоровья');
    expect(RANKS[0].name).toBe('Искатель');
    expect(THEMES[0].name).toBe('Полночь');
    expect(ATTRIBUTES.health.label).toBe('Здоровье');
    expect(TIER_LABEL.bronze).toBe('Бронза');
  });

  it('keeps non-text structure intact across a switch', () => {
    const before = { price: ITEMS[0].price, heal: ITEMS[0].heal, color: ATTRIBUTES.health.color };
    setLang('ru');
    expect(ITEMS[0].price).toBe(before.price);
    expect(ITEMS[0].heal).toBe(before.heal);
    expect(ATTRIBUTES.health.color).toBe(before.color);
  });

  it('translates achievement names and their interpolated descriptions', () => {
    const streak = () => ACHIEVEMENTS.find(a => a.id === 'bestStreak_3')!;
    expect(streak().name).toBe('Kindling');
    expect(streak().desc).toBe('Reach a 3-day streak');

    setLang('ru');
    expect(streak().name).toBe('Растопка');
    // 3 takes the "few" form: дня, not день or дней
    expect(streak().desc).toBe('Достичь серии в 3 дня');
  });

  it('applies Russian plural rules inside achievement descriptions', () => {
    setLang('ru');
    const desc = (id: string) => ACHIEVEMENTS.find(a => a.id === id)!.desc;
    expect(desc('checkins_1')).toBe('Отметить 1 привычку');
    expect(desc('checkins_25')).toBe('Отметить 25 привычек');
    expect(desc('questsCompleted_1')).toBe('Завершить 1 квест');
    expect(desc('questsCompleted_5')).toBe('Завершить 5 квестов');
    expect(desc('questsCompleted_20')).toBe('Завершить 20 квестов');
  });

  it('translates the wheel survey, quest durations and reflection prompts', () => {
    expect(WHEEL_SURVEY[0].statements).toHaveLength(5);
    expect(QUEST_DURATIONS['1w'].label).toBe('1 Week');
    expect(reflectionQuestions()[0]).toBe('What went well today?');

    setLang('ru');
    expect(WHEEL_SURVEY[0].statements[0]).toBe('Я двигаюсь или тренируюсь несколько раз в неделю');
    expect(WHEEL_SURVEY[0].statements).toHaveLength(5);
    expect(QUEST_DURATIONS['1w'].label).toBe('1 неделя');
    expect(QUEST_DURATIONS['1w'].days).toBe(7); // structure survives
    expect(reflectionQuestions()[0]).toBe('Что сегодня прошло хорошо?');
  });
});
