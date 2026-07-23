import { useMemo, useState } from 'react';
import { ATTR_KEYS, ATTRIBUTES, WHEEL_SURVEY } from '../game/constants';
import { wheelScoreToLevel } from '../game/engine';
import type { AttributeKey } from '../game/types';

type Ticks = Record<AttributeKey, boolean[]>;

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
        Weakest sector → <strong>{ATTRIBUTES[weakest].emoji} {ATTRIBUTES[weakest].label}</strong> (Lv {levels[weakest]}) becomes your first weekly boss.
      </p>

      <div className="wheel-sectors">
        {WHEEL_SURVEY.map(sec => (
          <div key={sec.key} className="wheel-sector card">
            <div className="wheel-sector-head">
              <span className="wheel-sector-name">
                <span aria-hidden="true">{ATTRIBUTES[sec.key].emoji}</span> {ATTRIBUTES[sec.key].label}
              </span>
              <span className="wheel-sector-lvl" style={{ color: ATTRIBUTES[sec.key].color }}>Lv {levels[sec.key]}</span>
            </div>
            {sec.statements.map((st, i) => (
              <label key={i} className="wheel-statement">
                <input type="checkbox" checked={ticks[sec.key][i]} onChange={() => toggle(sec.key, i)} />
                <span>{st}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="wheel-actions">
        {onSkip && <button className="btn btn-ghost" onClick={onSkip}>Skip for now</button>}
        <button className="btn btn-primary btn-lg" onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  );
}

/** Live 8-spoke radar of the current starting levels (1–7 band). Pure geometry, no deps. */
function WheelRadar({ levels }: { levels: Record<AttributeKey, number> }) {
  const R = 92, CX = 130, CY = 130, MAXLVL = 7;
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ATTR_KEYS.length;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const ring = (rr: number) =>
    ATTR_KEYS.map((_, i) => { const [x, y] = pt(i, rr); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ') + ' Z';
  const poly = ATTR_KEYS.map((k, i) => { const [x, y] = pt(i, (R * levels[k]) / MAXLVL); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');

  return (
    <svg className="wheel-radar" viewBox="0 0 260 260" width="260" height="260" role="img" aria-label="Starting wheel preview">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <path key={f} d={ring(R * f)} fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {ATTR_KEYS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--border)" strokeWidth="1" />; })}
      <polygon points={poly} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
      {ATTR_KEYS.map((k, i) => { const [x, y] = pt(i, (R * levels[k]) / MAXLVL); return <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={ATTRIBUTES[k].color} />; })}
      {ATTR_KEYS.map((k, i) => { const [x, y] = pt(i, R + 16); return <text key={k} x={x.toFixed(1)} y={(y + 5).toFixed(1)} textAnchor="middle" fontSize="15">{ATTRIBUTES[k].emoji}</text>; })}
    </svg>
  );
}
