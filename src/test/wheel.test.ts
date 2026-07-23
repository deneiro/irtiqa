import { beforeEach, describe, expect, it } from 'vitest';
import { ATTR_KEYS } from '../game/constants';
import { attrLevel, wheelScoreToLevel, wheelSeedXp, xpForAttrLevel } from '../game/engine';
import type { AttributeKey } from '../game/types';
import { useGame } from '../store';

const g = () => useGame.getState();
const scores = (partial: Partial<Record<AttributeKey, number>>): Record<AttributeKey, number> => {
  const s = {} as Record<AttributeKey, number>;
  for (const k of ATTR_KEYS) s[k] = partial[k] ?? 0;
  return s;
};

beforeEach(() => g().resetGame());

describe('wheel audit math (engine)', () => {
  it('xpForAttrLevel is the exact inverse of the attribute curve', () => {
    expect(xpForAttrLevel(1)).toBe(0);
    expect(xpForAttrLevel(2)).toBe(60);
    expect(xpForAttrLevel(7)).toBe(660);
    for (let L = 1; L <= 10; L++) expect(attrLevel(xpForAttrLevel(L))).toBe(L);
  });

  it('a 0–10 survey score compresses to a 1–7 starting band', () => {
    expect(wheelScoreToLevel(0)).toBe(1); // never empty
    expect(wheelScoreToLevel(10)).toBe(7); // full, but headroom remains
    expect(wheelScoreToLevel(5)).toBe(4); // midpoint
    expect(wheelScoreToLevel(-3)).toBe(1); // clamped
    expect(wheelScoreToLevel(99)).toBe(7); // clamped
  });

  it('wheelSeedXp lands exactly on the start of the mapped level', () => {
    expect(attrLevel(wheelSeedXp(10))).toBe(7);
    expect(attrLevel(wheelSeedXp(0))).toBe(1);
    expect(wheelSeedXp(0)).toBe(0);
  });
});

describe('wheel audit seeding (store)', () => {
  it('seeds attribute levels from the survey but grants nothing else', () => {
    g().createCharacter('Audited', ['healer'], scores({ money: 0, career: 10, development: 6 }));
    const s = g();
    // Attributes reflect the audit…
    expect(attrLevel(s.attrs.money)).toBe(1);
    expect(attrLevel(s.attrs.career)).toBe(7);
    expect(attrLevel(s.attrs.development)).toBe(wheelScoreToLevel(6));
    // …but the character earned nothing: still level 1, no gold, full HP.
    expect(s.character!.xp).toBe(0);
    expect(s.character!.gold).toBe(0);
    expect(s.character!.hp).toBe(100);
    // Nothing unlocks from a survey.
    expect(Object.keys(s.unlocked).length).toBe(0);
  });

  it('records the first snapshot, and stays flat when skipped', () => {
    g().createCharacter('WithAudit', ['healer'], scores({ money: 4 }));
    expect(g().wheelSnapshots).toHaveLength(1);
    expect(g().wheelSnapshots[0].scores.money).toBe(4);

    g().resetGame();
    g().createCharacter('Skipped', ['healer']); // no wheel argument
    expect(g().wheelSnapshots).toHaveLength(0);
    expect(g().attrs.money).toBe(0); // flat wheel
  });

  it('a later Wheel Check adds a snapshot without touching earned attrs', () => {
    g().createCharacter('Grower', ['healer'], scores({ money: 2 }));
    const seeded = g().attrs.money;
    g().recordWheelCheck(scores({ money: 8 }));
    expect(g().wheelSnapshots).toHaveLength(2);
    expect(g().wheelSnapshots[1].scores.money).toBe(8);
    expect(g().attrs.money).toBe(seeded); // retake never re-seeds
  });
});
