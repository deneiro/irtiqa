import { useMemo, useState } from 'react';
import { ATTR_KEYS, ATTRIBUTES, WHEEL_SURVEY } from '../game/constants';
import { wheelScoreToLevel } from '../game/engine';
import type { AttributeKey } from '../game/types';
import { useT } from '../i18n';
import { Icon } from './Icon';

/** Which statements are ticked, per sector. Exported so a caller can hand the exact
 *  answers back on a remount instead of a lossy reconstruction from the scores. */
export type WheelTicks = Record<AttributeKey, boolean[]>;

type Ticks = WheelTicks;

function emptyTicks(initial?: Record<AttributeKey, number>): Ticks {
  const t = {} as Ticks;
  for (const sec of WHEEL_SURVEY) {
    const score = initial?.[sec.key] ?? 0;
    const on = Math.round(score / 2); // score 0–10 → first `on` statements pre-ticked
    t[sec.key] = sec.statements.map((_, i) => i < on);
  }
  return t;
}

const scoreOf = (row: boolean[]) => row.filter(Boolean).length * 2; // 0–10

/**
 * The Wheel of Life audit — tick the true statements, watch the starting wheel take shape.
 * Reused by onboarding (seeds the wheel) and Settings (a later Wheel Check snapshot).
 */
export function WheelSurvey({
  initial,
  submitLabel,
  onSubmit,
  onSkip,
}: {
  initial?: Record<AttributeKey, number>;
  submitLabel: string;
  onSubmit: (scores: Record<AttributeKey, number>) => void;
  onSkip?: () => void;
}) {
  const t = useT();
  const [ticks, setTicks] = useState<Ticks>(() => emptyTicks(initial));

  const levels = useMemo(() => {
    const l = {} as Record<AttributeKey, number>;
    for (const sec of WHEEL_SURVEY) l[sec.key] = wheelScoreToLevel(scoreOf(ticks[sec.key]));
    return l;
  }, [ticks]);

  const weakest = useMemo(
    () => ATTR_KEYS.reduce((min, k) => (levels[k] < levels[min] ? k : min), ATTR_KEYS[0]),
    [levels],
  );

  const toggle = (key: AttributeKey, i: number) =>
    setTicks(prev => ({ ...prev, [key]: prev[key].map((v, j) => (j === i ? !v : v)) }));

  const submit = () => {
    const scores = {} as Record<AttributeKey, number>;
    for (const sec of WHEEL_SURVEY) scores[sec.key] = scoreOf(ticks[sec.key]);
    onSubmit(scores);
  };

  return (
    <div className="wheel-survey">
      <WheelRadar levels={levels} />
      <p className="wheel-weakest">
        {t('wheel.weakestSector')}{' '}
        <strong className="wheel-weakest-name">
          <Icon name={weakest} size={14} /> {ATTRIBUTES[weakest].label}
        </strong>{' '}
        {t('wheel.weakestTail', { lvl: levels[weakest] })}
      </p>

      <div className="wheel-sectors">
        {WHEEL_SURVEY.map(sec => {
          const done = ticks[sec.key].filter(Boolean).length;
          return (
            <div key={sec.key} className="wheel-sector card">
              <div className="wheel-sector-head">
                <span className="wheel-sector-name">
                  <Icon name={sec.key} size={14} /> {ATTRIBUTES[sec.key].label}
                </span>
                <span className="wheel-sector-meta">
                  {/* Forty checkboxes in one scroll reads as an exam with no end in sight.
                      A per-sector count turns it into eight short blocks you can see
                      yourself finishing — the total never moves, the progress does. */}
                  <span className="wheel-sector-count">{done}/{sec.statements.length}</span>
                  <span className="wheel-sector-lvl" style={{ color: ATTRIBUTES[sec.key].color }}>{t('common.lv')} {levels[sec.key]}</span>
                </span>
              </div>
              {sec.statements.map((st, i) => (
                <label key={i} className="wheel-statement">
                  <input type="checkbox" checked={ticks[sec.key][i]} onChange={() => toggle(sec.key, i)} />
                  <span>{st}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>

      <div className="wheel-actions">
        {onSkip && <button className="btn btn-ghost" onClick={onSkip}>{t('wheel.skipForNow')}</button>}
        <button className="btn btn-primary btn-lg" onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  );
}

/** Live 8-spoke radar of the current starting levels (1–7 band). Pure geometry, no deps. */
function WheelRadar({ levels }: { levels: Record<AttributeKey, number> }) {
  const t = useT();
  const R = 92, CX = 130, CY = 130, MAXLVL = 7;
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ATTR_KEYS.length;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const ring = (rr: number) =>
    ATTR_KEYS.map((_, i) => { const [x, y] = pt(i, rr); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ') + ' Z';
  const poly = ATTR_KEYS.map((k, i) => { const [x, y] = pt(i, (R * levels[k]) / MAXLVL); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');

  return (
    <svg className="wheel-radar" viewBox="0 0 260 260" width="260" height="260" role="img" aria-label={t('wheel.previewLabel')}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <path key={f} d={ring(R * f)} fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {ATTR_KEYS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--border)" strokeWidth="1" />; })}
      <polygon points={poly} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
      {ATTR_KEYS.map((k, i) => { const [x, y] = pt(i, (R * levels[k]) / MAXLVL); return <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={ATTRIBUTES[k].color} />; })}
      {/* An <Icon> is a React component and cannot live inside <svg>, so the spokes are
          labelled with the 3-letter attribute code in that attribute's own colour. It
          also survives at this size better than a glyph did: colour carries the sector,
          the letters carry the name. Label positions are the untouched original geometry. */}
      {ATTR_KEYS.map((k, i) => { const [x, y] = pt(i, R + 16); return <text key={k} x={x.toFixed(1)} y={(y + 5).toFixed(1)} textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="0.6" fill={ATTRIBUTES[k].color}>{ATTRIBUTES[k].short}</text>; })}
    </svg>
  );
}
