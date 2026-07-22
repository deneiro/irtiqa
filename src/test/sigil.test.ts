import { describe, expect, it } from 'vitest';
import { ATTR_KEYS } from '../game/constants';
import {
  CORE_RATIO,
  MIN_REACH,
  petalPath,
  sigilDescription,
  sigilSpec,
  type SigilSource,
} from '../game/sigil';
import type { AttributeKey } from '../game/types';

const flat = (xp: number) =>
  Object.fromEntries(ATTR_KEYS.map(k => [k, xp])) as Record<AttributeKey, number>;

function src(over: Partial<SigilSource> = {}): SigilSource {
  return { attrs: flat(0), xp: 0, classId: 'magician', momentumStreak: 0, ...over };
}

describe('sigil geometry invariants', () => {
  it('keeps the shortest petal clear of the central disc', () => {
    // The first build had MIN_REACH below CORE_RATIO, so a fresh character
    // rendered as an empty ring — every petal was hidden behind the core.
    expect(MIN_REACH).toBeGreaterThan(CORE_RATIO * 1.5);
  });

  it('always produces one petal per attribute, in wheel order', () => {
    const spec = sigilSpec(src());
    expect(spec.petals.map(p => p.attr)).toEqual(ATTR_KEYS);
  });

  it('never emits a zero-length petal, even at level 1', () => {
    const spec = sigilSpec(src());
    for (const p of spec.petals) expect(p.reach).toBeGreaterThan(0);
  });

  it('is deterministic — same state, same shape', () => {
    const s = src({ xp: 900, attrs: { ...flat(100), career: 800 } });
    expect(sigilSpec(s)).toEqual(sigilSpec(s));
  });
});

describe('sigil responds to progress', () => {
  it('grows the emblem as character level rises', () => {
    const low = sigilSpec(src({ xp: 0 }));
    const mid = sigilSpec(src({ xp: 2000 }));
    const high = sigilSpec(src({ xp: 20000 }));
    expect(low.scale).toBeLessThan(mid.scale);
    expect(mid.scale).toBeLessThan(high.scale);
    expect(high.scale).toBeLessThanOrEqual(1);
  });

  it('adds rank rings and facets with level', () => {
    const low = sigilSpec(src({ xp: 0 }));
    const high = sigilSpec(src({ xp: 20000 }));
    expect(high.rings).toBeGreaterThan(low.rings);
    expect(high.facets).toBeGreaterThan(low.facets);
  });

  it('lights up from a perfect-day streak, and only from that', () => {
    expect(sigilSpec(src({ momentumStreak: 0 })).glow).toBe(0);
    expect(sigilSpec(src({ momentumStreak: 5 })).glow).toBeCloseTo(0.5);
    expect(sigilSpec(src({ momentumStreak: 99 })).glow).toBe(1); // capped
  });

  it('makes a neglected sector visibly shorter than a strong one', () => {
    const spec = sigilSpec(src({ attrs: { ...flat(1200), health: 0 } }));
    const health = spec.petals.find(p => p.attr === 'health')!;
    const career = spec.petals.find(p => p.attr === 'career')!;
    expect(health.reach).toBeLessThan(career.reach * 0.6);
  });

  it('is round when every sector is equal', () => {
    const spec = sigilSpec(src({ attrs: flat(500) }));
    const reaches = new Set(spec.petals.map(p => p.reach.toFixed(6)));
    expect(reaches.size).toBe(1);
    expect(spec.balance).toBe(1);
  });

  it('scores balance by the gap between thinnest and fullest', () => {
    expect(sigilSpec(src({ attrs: flat(500) })).balance).toBe(1);
    const lopsided = sigilSpec(src({ attrs: { ...flat(0), career: 2000 } }));
    expect(lopsided.balance).toBeLessThan(0.3);
  });
});

describe('petalPath', () => {
  it('returns a closed path anchored at the centre', () => {
    const spec = sigilSpec(src({ attrs: flat(400) }));
    const d = petalPath(spec.petals[0], 100);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).not.toContain('NaN');
  });

  it('scales with the radius it is given', () => {
    const spec = sigilSpec(src({ attrs: flat(400) }));
    const small = petalPath(spec.petals[0], 50);
    const large = petalPath(spec.petals[0], 200);
    expect(small).not.toBe(large);
    expect(large).not.toContain('NaN');
  });

  it('puts the first petal straight up', () => {
    const spec = sigilSpec(src({ attrs: flat(400) }));
    // Second point of the path is the tip; for petal 0 it should be near x=0, y<0
    const tip = petalPath(spec.petals[0], 100).match(/Q [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)/);
    expect(tip).toBeTruthy();
    expect(Math.abs(Number(tip![1]))).toBeLessThan(0.01);
    expect(Number(tip![2])).toBeLessThan(0);
  });
});

describe('sigilDescription', () => {
  it('names a fresh character as unformed', () => {
    expect(sigilDescription(sigilSpec(src()))).toMatch(/Unformed/);
  });

  it('calls out the lopsided sector by name', () => {
    const spec = sigilSpec(src({ attrs: { ...flat(0), career: 2000 }, xp: 3000 }));
    const text = sigilDescription(spec);
    expect(text).toMatch(/lopsided/i);
    expect(text).toContain('Career');
  });

  it('recognises a round wheel', () => {
    const spec = sigilSpec(src({ attrs: flat(500), xp: 3000 }));
    expect(sigilDescription(spec)).toMatch(/round/i);
  });
});
