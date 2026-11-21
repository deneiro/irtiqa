import type { ReactNode } from "react";

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * A few series over the same days as lines with a dot a value (a gap in the values is bridged), three rules with their
 * numbers on the right, an optional dashed goal, and a date under every few days. Drawn for the full screens of a
 * theme, which stand outside «Главный» and its chart styles.
 */
export function Lines({ series, titles, lo, hi, goal, height = 130, wide = false }: { series: { word: string; color: string; vals: (number | undefined)[] }[]; titles: string[]; lo: number; hi: number; goal?: number; height?: number; wide?: boolean }) {
  const W = wide ? 1000 : 600; // a chart across the whole page is drawn on a wider field, so its text stays the size of the page's
  const n = titles.length, every = Math.max(1, Math.ceil(n / 8));
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => height - ((v - lo) / (hi - lo || 1)) * height;
  return (
    <svg className="g-lines" viewBox={`-6 -10 ${W + 44} ${height + 34}`} role="img" aria-label={series.map((s) => s.word).join(", ")}>
      {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line className="rule" x1={0} x2={W} y1={y(v)} y2={y(v)} /><text x={W + 8} y={y(v) + 3}>{r1(v)}</text></g>)}
      {goal !== undefined && <g className="goal"><line x1={0} x2={W} y1={y(goal)} y2={y(goal)} /><text x={2} y={y(goal) - 6}>цель {goal}</text></g>}
      {series.map((s) => {
        const pts = s.vals.map((v, i) => (v === undefined ? undefined : { i, v })).filter((p): p is { i: number; v: number } => !!p);
        return (
          <g key={s.word} style={{ color: s.color }}>
            {pts.length > 1 && <path d={pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join("")} />}
            {pts.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={3.2}><title>{`${titles[p.i]}: ${s.word} ${p.v}`}</title></circle>)}
          </g>
        );
      })}
      {titles.map((t, i) => ((n - 1 - i) % every === 0 ? <text key={i} x={x(i)} y={height + 18} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{t}</text> : null))}
    </svg>
  );
}

/** The key under a chart: a dot of the colour and the word. */
export function LineKey({ items }: { items: { word: string; color: string }[] }) {
  return <div className="g-linekey">{items.map((k) => <span key={k.word}><i style={{ background: k.color }} />{k.word}</span>)}</div>;
}

/** A small number with its line — the row of them on top of a full screen. */
export function Mini({ value, label, tone }: { value: ReactNode; label: ReactNode; tone?: "good" | "bad" | "now" }) {
  return <div className={tone ?? ""}><b>{value}</b><span>{label}</span></div>;
}

export const Err = ({ text }: { text: string | null }) => (text ? <p className="g-error">{text}</p> : null);
