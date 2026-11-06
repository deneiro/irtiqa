import { addDays, plural } from "../../lib/dates";
import { attentionShares, dayFiles } from "../../lib/themeDays";
import { shortDate, tileWindow } from "../../lib/themeNumbers";
import { THEMES } from "../../lib/themes";
import type { OrganProps } from "./organs";
import { Organ, OrganEmpty } from "./parts";

const CX = 200, CY = 162, R0 = 14, R = 112;
const rad = (a: number) => (a * Math.PI) / 180;
const pt = (r: number, a: number): [number, number] => [CX + r * Math.cos(rad(a)), CY + r * Math.sin(rad(a))];
const f1 = (n: number) => n.toFixed(1);
function sector(ra: number, rb: number, a0: number, a1: number): string {
  const [x0, y0] = pt(rb, a0), [x1, y1] = pt(rb, a1), [x2, y2] = pt(ra, a1), [x3, y3] = pt(ra, a0);
  return `M${f1(x0)},${f1(y0)} A${rb},${rb} 0 0 1 ${f1(x1)},${f1(y1)} L${f1(x2)},${f1(y2)} A${ra},${ra} 0 0 0 ${f1(x3)},${f1(y3)}Z`;
}
function arc(r: number, a0: number, a1: number): string {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${f1(x0)},${f1(y0)} A${r},${r} 0 0 1 ${f1(x1)},${f1(y1)}`;
}

/**
 * The focus wheel (spec v4 `focus`): eight fixed sectors, each petal as long as the theme's share of the 30
 * days; the solid ring is the same share over 20 days, the dashed one over 10 — where the attention is moving.
 */
export function FocusOrgan(p: OrganProps) {
  const { from, to } = tileWindow(p.today);
  const s30 = attentionShares(p.life, from, to);
  if (!s30.some((s) => s.days)) return <OrganEmpty title="Колесо фокуса" />;
  const s20 = attentionShares(p.life, addDays(to, -19), to), s10 = attentionShares(p.life, addDays(to, -9), to);
  const max = Math.max(1, ...[...s30, ...s20, ...s10].map((s) => s.share));
  const rr = (share: number) => R0 + ((R - R0) * share) / max;
  const files = dayFiles(p.life, from, to);
  const list = THEMES.map((t, i) => ({ t, s: s30[i] })).sort((a, b) => b.s.days - a.s.days);
  return (
    <Organ title="Колесо фокуса" right={`доля внимания по темам · ${shortDate(from)} – ${shortDate(to)}`} wide>
      <div className="t-wheel">
        <svg viewBox="0 0 400 324" role="img" aria-label={`Колесо фокуса: ${THEMES.map((t, i) => `${t.ru} ${s30[i].share} %`).join(", ")}`}>
          {THEMES.map((t, i) => {
            const mid = -90 + i * 45, a0 = mid - 22.5, a1 = mid + 22.5;
            const tip = `${t.ru} — ${s30[i].days} ${plural(s30[i].days, "день", "дня", "дней")} из 30 · ${s30[i].share} % · за 20 дней ${s20[i].share} % · за 10 дней ${s10[i].share} %`;
            const [lx, ly] = pt(R + 12, mid);
            const cos = Math.cos(rad(mid)), sin = Math.sin(rad(mid));
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            const y1 = sin < -0.3 ? ly - 14 : sin > 0.3 ? ly + 10 : ly - 1;
            return (
              <g key={t.name}>
                <path d={sector(R0, R, a0, a1)} fill={t.color} fillOpacity={0.07} stroke="#141720" strokeWidth={2}><title>{tip}</title></path>
                {s30[i].share > 0 && <path className="t-petal" style={{ animationDelay: `${0.1 + i * 0.05}s` }} d={sector(R0, rr(s30[i].share), a0, a1)} fill={t.color} fillOpacity={0.88} stroke="#141720" strokeWidth={2}><title>{tip}</title></path>}
                {s20[i].share > 0 && <path d={arc(rr(s20[i].share), a0 + 4, a1 - 4)} className="t-ring20" />}
                {s10[i].share > 0 && <path d={arc(rr(s10[i].share), a0 + 4, a1 - 4)} className="t-ring10" />}
                <text className="t-rose-lab" x={f1(lx)} y={f1(y1)} textAnchor={anchor}>{t.ru}</text>
                <text className="t-rose-pct" x={f1(lx)} y={f1(y1 + 13)} textAnchor={anchor}>{s30[i].share} %</text>
              </g>
            );
          })}
        </svg>
        <ul className="t-flist">
          {list.map(({ t, s }) => (
            <li key={t.name} className={s.days ? "" : "t-zero"}>
              <i className="t-fdot" style={{ background: t.color }} />
              <span className="t-fname">{t.ru}</span>
              <span className="t-track"><i style={{ width: `${(s.days / 30) * 100}%`, background: t.color }} /></span>
              <span className="t-fnum">{s.share}<small> %</small><br /><small>{s.days} дн</small></span>
            </li>
          ))}
        </ul>
      </div>
      <div className="t-foot">
        Как считали: день засчитан теме, если в нём её намаз или привычка «да» или «поздно», запись, отмеченный шаг или сессия её деятельности, её событие · удержания не в счёте · сплошное кольцо — доля за 20 дней, пунктир — за 10 · файлов дня {files} из 30
      </div>
    </Organ>
  );
}
