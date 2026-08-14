import { ATTRIBUTES, ATTR_KEYS } from '../game/constants';
import { attrLevel } from '../game/engine';
import { useT } from '../i18n';
import { useGame } from '../store';
import { Icon } from './Icon';

export function RadarChart({ size = 300 }: { size?: number }) {
  const t = useT();
  const attrs = useGame(s => s.attrs);
  const levels = ATTR_KEYS.map(k => attrLevel(attrs[k]));
  const maxLevel = Math.max(5, ...levels);
  const N = ATTR_KEYS.length;
  const c = size / 2;
  const R = c - 46;

  const pt = (i: number, r: number): [number, number] => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [c + r * Math.cos(ang), c + r * Math.sin(ang)];
  };
  const poly = (r: number) => ATTR_KEYS.map((_, i) => pt(i, r).join(',')).join(' ');
  const valuePoly = ATTR_KEYS.map((_, i) => pt(i, (R * levels[i]) / maxLevel).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label={t('radar.label')}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={poly(R * f)} className="radar-ring" />
      ))}
      {ATTR_KEYS.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-axis" />;
      })}
      <polygon points={valuePoly} className="radar-value" />
      {ATTR_KEYS.map((k, i) => {
        const [x, y] = pt(i, (R * levels[i]) / maxLevel);
        return <circle key={k} cx={x} cy={y} r={3.5} className="radar-dot" />;
      })}
      {ATTR_KEYS.map((k, i) => {
        const [x, y] = pt(i, R + 26);
        return (
          // A plain hash href rather than react-router's <Link>: the app uses
          // HashRouter, and SVG anchors take href directly without needing the
          // router's click handling.
          <a key={k} href={`#/attributes/${k}`} className="radar-label">
            <title>{ATTRIBUTES[k].label} — open the sector</title>
            <Icon name={k} x={x - 9} y={y - 21} size={18} />
            <text x={x} y={y + 11} textAnchor="middle" className="radar-label-lv">Lv {levels[i]}</text>
          </a>
        );
      })}
    </svg>
  );
}
