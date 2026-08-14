import { ATTRIBUTES, ATTR_KEYS, RANKS } from './constants';
import { t } from '../i18n';
import { attrLevel, charLevelProgress, rankFor } from './engine';
import type { AttributeKey, ClassId } from './types';

// The Sigil: the character rendered as an object rather than a number.
//
// The problem it solves is that a "life RPG" whose hero is a static icon has no
// artifact of progress — level 20 looks exactly like level 1. The Sigil is
// derived entirely from real state, so it cannot look impressive without the
// play behind it having happened:
//
//   · eight petals, one per attribute, length driven by that attribute's level
//   · the asymmetry IS your Wheel — a neglected sector is a visibly short petal
//   · rank adds outer rings, character level adds inner facets
//   · a perfect-day streak lights it
//
// Pure geometry, no rendering, so the shape can be asserted in tests.

export interface SigilPetal {
  attr: AttributeKey;
  color: string;
  level: number;
  /** 0..1 — how far this petal reaches, relative to the longest possible. */
  reach: number;
  /** Radians, measured from straight up. */
  angle: number;
}

export interface SigilSpec {
  petals: SigilPetal[];
  /**
   * 0..1 overall size of the emblem. Grows with character level so a mature
   * sigil physically fills more of its frame than a new one — without this the
   * shape changes but the silhouette doesn't, which was the original complaint.
   */
  scale: number;
  /** The longest petal's reach, already scaled. Rings are placed just outside it. */
  maxReach: number;
  /** Concentric outer rings. One per rank tier reached. */
  rings: number;
  /** Inner facet lines. Grows with character level, capped so it stays legible. */
  facets: number;
  /** 0..1 glow strength, from perfect-day momentum. */
  glow: number;
  /** 0..1 — how even the wheel is. 1 is a perfect circle of petals. */
  balance: number;
  classId: ClassId;
  level: number;
  rankName: string;
}

export interface SigilSource {
  attrs: Record<AttributeKey, number>;
  xp: number;
  classId: ClassId;
  momentumStreak: number;
}

/**
 * Petals never collapse to nothing — a level-1 attribute still shows as a stub.
 * This must stay comfortably above CORE_RATIO or short petals disappear behind
 * the central disc, which is exactly what happened on the first attempt: a fresh
 * character rendered as an empty ring with a class icon in it.
 */
export const MIN_REACH = 0.4;
/** Radius of the central disc, as a fraction of the petal radius. */
export const CORE_RATIO = 0.22;
const MAX_FACETS = 6;
/** Emblem size at level 1, and the level at which it reaches full size. */
const SCALE_MIN = 0.5;
const SCALE_FULL_LEVEL = 25;

export function sigilSpec(src: SigilSource): SigilSpec {
  const levels = ATTR_KEYS.map(k => attrLevel(src.attrs[k]));
  const peak = Math.max(...levels);
  const { level } = charLevelProgress(src.xp);

  // Two independent axes, so both the shape AND the silhouette change with play:
  //   · scale  — how big the whole emblem is, from character level
  //   · reach  — each petal relative to your own best sector, showing imbalance
  const scale = SCALE_MIN + (1 - SCALE_MIN) * Math.min(1, (level - 1) / (SCALE_FULL_LEVEL - 1));

  const petals: SigilPetal[] = ATTR_KEYS.map((attr, i) => {
    const attrLvl = levels[i];
    const rel = peak <= 1 ? 0 : (attrLvl - 1) / (peak - 1);
    return {
      attr,
      color: ATTRIBUTES[attr].color,
      level: attrLvl,
      reach: (MIN_REACH + (1 - MIN_REACH) * rel) * scale,
      angle: (Math.PI * 2 * i) / ATTR_KEYS.length,
    };
  });
  const rank = rankFor(level);
  const rings = RANKS.filter(r => level >= r.minLevel).length;
  const facets = Math.min(MAX_FACETS, Math.floor(level / 5));

  // Balance: 1 minus the spread between the thinnest and fullest sector.
  const minL = Math.min(...levels);
  const maxL = Math.max(...levels);
  const balance = maxL === 0 ? 1 : minL / maxL;

  return {
    petals,
    scale,
    maxReach: Math.max(...petals.map(p => p.reach)),
    rings,
    facets,
    glow: Math.min(1, src.momentumStreak / 10),
    balance,
    classId: src.classId,
    level,
    rankName: rank.name,
  };
}

/**
 * The petal outline as an SVG path: a teardrop from the centre out to `reach`,
 * with shoulders that widen as the petal grows so a long sector reads as heavy
 * rather than merely long.
 */
export function petalPath(petal: SigilPetal, radius: number): string {
  const r = radius * petal.reach;
  const half = (Math.PI / ATTR_KEYS.length) * 0.82;
  // Shoulder width scales with reach — short petals stay slim, long ones broaden
  const shoulder = r * (0.42 + 0.22 * petal.reach);
  const a = petal.angle - Math.PI / 2; // 0 rad points up

  const tip: [number, number] = [Math.cos(a) * r, Math.sin(a) * r];
  const left: [number, number] = [Math.cos(a - half) * shoulder, Math.sin(a - half) * shoulder];
  const right: [number, number] = [Math.cos(a + half) * shoulder, Math.sin(a + half) * shoulder];

  const f = (n: number) => Math.round(n * 100) / 100;
  return [
    `M 0 0`,
    `Q ${f(left[0])} ${f(left[1])} ${f(tip[0])} ${f(tip[1])}`,
    `Q ${f(right[0])} ${f(right[1])} 0 0`,
    'Z',
  ].join(' ');
}

/** A one-line read of the shape, for the caption under the sigil. */
export function sigilDescription(spec: SigilSpec): string {
  const sorted = [...spec.petals].sort((a, b) => b.level - a.level);
  const strongest = ATTRIBUTES[sorted[0].attr].label;
  const thinnest = ATTRIBUTES[sorted[sorted.length - 1].attr].label;

  if (spec.level === 1 && spec.petals.every(p => p.level === 1)) {
    return t('sigil.unformed');
  }
  if (spec.balance >= 0.85) {
    return t('sigil.nearlyRound', { strongest });
  }
  if (spec.balance >= 0.5) {
    return t('sigil.leaning', { strongest, thinnest });
  }
  return t('sigil.lopsided', { strongest, thinnest });
}
