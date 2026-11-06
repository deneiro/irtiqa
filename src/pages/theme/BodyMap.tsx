import { plural } from "../../lib/dates";
import { BODY_PARTS } from "../../lib/health";
import { painMap } from "../../lib/themeOrgans";
import { shortDate } from "../../lib/themeNumbers";
import type { OrganProps } from "./organs";
import { Organ, OrganEmpty, partUrl } from "./parts";

/** One anchor per word of BODY_PARTS on a front outline without sex or age; the back parts sit at the torso's edge. */
const ANCHOR = new Map<string, [number, number]>([
  ["голова", [96, 36]], ["шея", [96, 59]], ["плечо", [124, 80]], ["грудь", [96, 92]], ["спина", [116, 112]],
  ["живот", [96, 136]], ["поясница", [114, 166]], ["рука", [142, 150]], ["колено", [110, 250]], ["нога", [111, 298]],
]);
/** The words of BODY_PARTS this outline can draw. A new word without an anchor is not drawn: its rows are listed without a dot, like an unknown «Где». */
const DRAWN = BODY_PARTS.flatMap((part) => { const at = ANCHOR.get(part); return at ? [{ part, at }] : []; });
const DRAWABLE = DRAWN.map((x) => x.part);

/** «Где болит» (spec v4 `medical`): a dot where his «Где» says, bright for 30 days; the rows with dates; the nearest plan, the last visit. */
export function MedicalOrgan(p: OrganProps) {
  const m = painMap(p.life.health, p.today, DRAWABLE);
  const more = partUrl(p.theme, "medical");
  if (!m.rows.length && !m.plan && !m.visit) return <OrganEmpty title="Где болит" more={more} />;
  // Labels to the right of the figure, top to bottom, at least 26 apart so two near parts do not overlap.
  const labels = m.dots.flatMap((d) => { const at = ANCHOR.get(d.part); return at ? [{ d, at }] : []; }).sort((a, b) => a.at[1] - b.at[1]);
  let y = 0;
  const placed = labels.map(({ d, at }) => { y = Math.max(at[1], y + 26); return { d, at, y }; });
  return (
    <Organ title="Где болит" right="«Где» в таблице симптомов" more={more} wide>
      <div className="t-body">
        <svg viewBox="0 0 300 330" role="img" aria-label={m.dots.length ? `Где болит: ${m.dots.map((d) => d.part).join(", ")}` : "Схема тела: точек нет"}>
          <g fill="#252A37" stroke="#252A37" strokeLinecap="round">
            <circle cx={96} cy={36} r={19} stroke="none" />
            <rect x={89} y={52} width={14} height={14} rx={4} stroke="none" />
            <rect x={68} y={62} width={56} height={120} rx={22} stroke="none" />
            <line x1={66} y1={78} x2={48} y2={170} strokeWidth={15} />
            <line x1={126} y1={78} x2={144} y2={170} strokeWidth={15} />
            <line x1={84} y1={182} x2={80} y2={312} strokeWidth={19} />
            <line x1={108} y1={182} x2={112} y2={312} strokeWidth={19} />
          </g>
          {DRAWN.map(({ part, at }) => <circle key={part} cx={at[0]} cy={at[1]} r={2} fill="rgba(237,231,218,0.16)" />)}
          {placed.map(({ d, at, y: ly }) => {
            const [ax, ay] = at;
            return (
              <g key={d.part}>
                <path d={`M${ax} ${ay} L176 ${ly}`} stroke="rgba(237,231,218,0.22)" fill="none" />
                {d.fresh && <circle cx={ax} cy={ay} r={12} fill="#E26A61" opacity={0.16} />}
                <circle cx={ax} cy={ay} r={5} fill={d.fresh ? "#E26A61" : "#E2AB5E"} opacity={d.fresh ? 1 : 0.55}><title>{`${d.part}: ${d.what}, ${d.date}`}</title></circle>
                <text x={182} y={ly + 4}>{d.part}</text>
                <text className="t-m" x={182} y={ly + 17}>{d.count > 1 ? `${d.count} ${plural(d.count, "запись", "записи", "записей")} · ` : ""}{/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? shortDate(d.date) : d.date}</text>
              </g>
            );
          })}
        </svg>
        <ul className="t-pains">
          {m.rows.map((r, i) => (
            <li key={i} className={r.part ? "" : "t-pain-none"}>
              <i className={`t-mk ${r.part ? (r.fresh ? "t-mk-fresh" : "t-mk-old") : "t-mk-none"}`} />
              <div>
                <b>{r.what}</b>
                {r.note && <span>{r.note}</span>}
                <em>{r.date}{r.where ? ` · ${r.where}` : " · без «Где»"}</em>
              </div>
            </li>
          ))}
          {!m.rows.length && <li className="t-pain-none"><i className="t-mk t-mk-none" /><div><b>Симптомов не записано</b></div></li>}
        </ul>
      </div>
      <div className="t-foot">
        {m.plan ? `план: ${m.plan.doctor}${m.plan.by ? ` — к ${m.plan.by}` : " — без даты"}${m.plan.why ? ` · ${m.plan.why}` : ""}` : "планов нет"}
        {" · "}
        {m.visit ? `последний визит: ${m.visit.date} ${m.visit.doctor}${m.visit.result ? ` — ${m.visit.result}` : ""}` : "визитов нет"}
      </div>
    </Organ>
  );
}
