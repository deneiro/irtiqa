import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { horizonOf } from "../lib/horizon";
import { useDayToday } from "../lib/useDayToday";
import { Block } from "../pages/main/Scene";
import { Mini } from "./SectionBits";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
const HALAL_PAGE = "Халяль и харам";

function monthsWord(n: number): string {
  const r = Math.round(n * 10) / 10;
  const i = Math.round(r);
  const w = i % 10 === 1 && i % 100 !== 11 ? "месяц" : i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14) ? "месяца" : "месяцев";
  return `${r} ${w}`;
}

/**
 * The debt, the pace, and the date the debt reaches zero if the pace holds. Rebuilt 2026-11-21: the numbers, who is
 * owed as bars against the whole debt, «если платить» as steps of a road — the more a month, the nearer the zero —
 * the instalments that eat the month, and the month itself.
 */
export default function HorizonSection() {
  const v = useVault();
  const { life } = useStore();
  const today = useDayToday();
  const h = useMemo(
    () => (life ? horizonOf(life.debts, life.days, life.subscriptions, today) : null),
    [life, today],
  );
  const halal = useMemo(() => v.pages.find((p) => p.file === HALAL_PAGE), [v]);
  if (!h) return null;

  const bars = (title: string, list: { who: string; left: number }[], sum: number) => (
    <Block title={title} right={`${fmt(sum)} ₸`}>
      <div className="g-owed">
        {list.map((p) => (
          <div key={p.who}>
            <span>{p.who}</span>
            <i><u style={{ width: `${Math.max(2, (100 * p.left) / h.owed)}%` }} /></i>
            <b>{fmt(p.left)}</b>
          </div>
        ))}
      </div>
    </Block>
  );
  const longest = Math.max(1, ...h.scenarios.map((s) => s.months));

  return (
    <div className="g-play">
      <Block title="Долг и темп" right={<Link className="g-more" to="/finance">финансы →</Link>}>
        <div className="g-minis auto">
          <Mini value={fmt(h.owed)} label="я должен, остаток, ₸" />
          {h.owedToMe > 0 && <Mini value={fmt(h.owedToMe)} label="должны мне, ₸" tone="good" />}
          <Mini value={h.pace > 0 ? fmt(h.pace) : "—"} label={h.paceFrom ? `темп, ₸ в месяц с ${h.paceFrom}` : "темп погашения"} />
          <Mini value={h.freeDate ? h.freeDate.slice(0, 7) : "—"} label={h.freeDate ? `в ноль через ${monthsWord(h.monthsLeft!)}` : "при нулевом темпе даты нет"} tone={h.freeDate ? "now" : undefined} />
        </div>
        <p className="g-cap">Темп считается по операциям с категорией «долг» — они пишутся сами, когда гасишь долг на экране финансов.{h.pace === 0 && " Пока таких операций нет, поэтому даты выхода в ноль тоже нет."}</p>
      </Block>

      {(h.institutions.length > 0 || h.people.length > 0) && (
        <div className={h.institutions.length > 0 && h.people.length > 0 ? "g-two" : ""}>
          {h.institutions.length > 0 && bars("Банкам и МФО", h.institutions, h.owedInstitutions)}
          {h.people.length > 0 && bars("Людям", h.people, h.owedPeople)}
        </div>
      )}

      {h.scenarios.length > 0 && (
        <Block title="Если платить" right="чем больше в месяц, тем короче дорога до нуля">
          <div className="g-scen">
            {h.scenarios.map((s) => (
              <div key={s.perMonth}>
                <b>{fmt(s.perMonth)}<small> ₸ в месяц</small></b>
                <i><u style={{ width: `${Math.max(4, (100 * s.months) / longest)}%` }} /></i>
                <span>{s.date.slice(0, 7)} · {monthsWord(s.months)}</span>
              </div>
            ))}
          </div>
        </Block>
      )}

      {h.credit > 0 && (
        <section className="g-block g-alarm honey">
          <h2>Рассрочки и кредит</h2>
          <b>Кредит съедает {fmt(h.credit)} ₸ в месяц</b>
          <p>
            {h.creditNames.join(", ")} — это списания, они не уменьшают долги выше.
            Кредит Каспи — риба{halal ? <> (см. <Link to={pageUrl(halal)}>{HALAL_PAGE}</Link>)</> : null}, поэтому закрывается первым не по математике, а по вере.
          </p>
        </section>
      )}

      <Block title="Этот месяц">
        <div className="g-minis">
          <Mini value={fmt(h.month.earned)} label="получено, ₸" tone={h.month.earned > 0 ? "good" : undefined} />
          <Mini value={fmt(h.month.spent)} label="потрачено, ₸" />
          <Mini value={fmt(h.month.paid)} label="отдано по долгам, ₸" tone={h.month.paid > 0 ? "now" : undefined} />
        </div>
      </Block>
    </div>
  );
}
