import { useId } from 'react';
import { ATTRIBUTES } from '../game/constants';
import { CORE_RATIO, petalPath, sigilSpec, type SigilSpec } from '../game/sigil';
import { useGame } from '../store';
import { Icon } from './Icon';

/**
 * The character as an emblem. Every visual property is derived from real state,
 * so it cannot look earned unless it was. See src/game/sigil.ts for the geometry.
 *
 * `interactive` adds per-petal tooltips and links; off for the small sidebar
 * instance and for anything being rasterized for sharing.
 */
export function Sigil({
  size = 240,
  interactive = false,
  spec: specOverride,
}: {
  size?: number;
  interactive?: boolean;
  spec?: SigilSpec;
}) {
  const attrs = useGame(s => s.attrs);
  const character = useGame(s => s.character);
  const momentum = useGame(s => s.momentum);
  const uid = useId().replace(/:/g, '');

  if (!character) return null;

  const spec =
    specOverride ??
    sigilSpec({ attrs, xp: character.xp, classId: character.classId, momentumStreak: momentum.streak });

  const c = size / 2;
  const R = c * 0.78;
  // Rings hug the actual silhouette rather than a fixed radius, so a young sigil
  // is a tight rosette instead of a speck inside an oversized hoop.
  const outer = R * spec.maxReach;
  const ringGap = Math.min((c - outer) / (spec.rings + 1), R * 0.055);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={`sigil ${spec.glow > 0 ? 'sigil-lit' : ''}`}
      role="img"
      aria-label={`Level ${spec.level} ${spec.rankName} sigil`}
    >
      <defs>
        <radialGradient id={`core-${uid}`}>
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        {spec.glow > 0 && (
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={2 + spec.glow * 5} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Rank rings — one per tier reached, outermost drawn brightest */}
      {Array.from({ length: spec.rings }, (_, i) => (
        <circle
          key={i}
          cx={c}
          cy={c}
          r={outer + ringGap * (i + 1)}
          className="sigil-ring"
          style={{ opacity: 0.18 + (i / Math.max(1, spec.rings - 1)) * 0.5 }}
        />
      ))}

      <g transform={`translate(${c} ${c})`} filter={spec.glow > 0 ? `url(#glow-${uid})` : undefined}>
        {/* Facet lines — inner structure that accrues with character level */}
        {Array.from({ length: spec.facets }, (_, i) => (
          <circle key={i} r={(outer * (i + 1)) / (spec.facets + 1)} className="sigil-facet" />
        ))}

        {/* The petals. Screen blending makes overlaps read as light, not mud. */}
        <g className="sigil-petals">
          {spec.petals.map(p => {
            const path = petalPath(p, R);
            const petal = (
              <>
                <path d={path} fill={p.color} fillOpacity={0.26} />
                <path d={path} fill="none" stroke={p.color} strokeWidth={1.4} strokeLinejoin="round" />
              </>
            );
            return interactive ? (
              <a
                key={p.attr}
                href={`#/attributes/${p.attr}`}
                className="sigil-petal-link"
                aria-label={`${ATTRIBUTES[p.attr].label}, level ${p.level}`}
              >
                <title>{ATTRIBUTES[p.attr].label} — level {p.level}</title>
                {petal}
              </a>
            ) : (
              <g key={p.attr}>{petal}</g>
            );
          })}
        </g>

        {/* Core: class glyph on a soft disc */}
        <circle r={outer * CORE_RATIO * 1.9} fill={`url(#core-${uid})`} />
        <circle r={outer * CORE_RATIO} className="sigil-core" />
        <Icon
          name={spec.classId}
          x={-outer * CORE_RATIO * 0.62}
          y={-outer * CORE_RATIO * 0.62}
          size={Math.max(9, Math.round(outer * CORE_RATIO * 1.24))}
          className="sigil-class"
        />
      </g>
    </svg>
  );
}
