import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { horizonOf } from "../lib/horizon";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
const HALAL_PAGE = "Халяль и харам";

function monthsWord(n: number): string {
  const r = Math.round(n * 10) / 10;
  const i = Math.round(r);
  const w = i % 10 === 1 && i % 100 !== 11 ? "месяц" : i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14) ? "месяца" : "месяцев";
  return `${r} ${w}`;
}

/** The debt, the pace, and the date the debt reaches zero if the pace holds. */
export default function HorizonSection() {
  const v = useVault();
  const { life } = useStore();
  const today = todayStr();
  const h = useMemo(
    () => (life ? horizonOf(life.debts, life.days, life.subscriptions, today) : null),
    [life, today],
  );
  const halal = useMemo(() => v.pages.find((p) => p.file === HALAL_PAGE), [v]);
  if (!h) return null;

  return (
    <section className="tblock">
      <h2 className="section">
        Горизонт <span className="n">{fmt(h.owed)} ₸ долга</span>
        <Link to="/finance" className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>открыть финансы</Link>
      </h2>
      <div className="card">
        <div className="bodynums">
          <div className="bnum"><b>{fmt(h.owed)}</b><span>я должен, остаток</span></div>
          {h.owedToMe > 0 && <div className="bnum"><b>{fmt(h.owedToMe)}</b><span>должны мне</span></div>}
          <div className="bnum"><b>{h.pace > 0 ? fmt(h.pace) : "—"}</b><span>{h.paceFrom ? `темп, ₸/мес с ${h.paceFrom}` : "темп погашения"}</span></div>
          <div className="bnum">
            <b className={h.freeDate ? "" : "faint"}>{h.freeDate ? h.freeDate.slice(0, 7) : "—"}</b>
            <span>{h.freeDate ? `в ноль через ${monthsWord(h.monthsLeft!)}` : "при нулевом темпе даты нет"}</span>
          </div>
        </div>

        {h.people.length > 0 && (
          <>
            <div className="mrow-head">Кому</div>
            {h.people.map((p) => (
              <div key={p.who} className="hbar">
                <span className="hname">{p.who}</span>
                <span className="htrack"><i style={{ width: `${Math.max(2, (100 * p.left) / h.owed)}%` }} /></span>
                <span className="mono">{fmt(p.left)}</span>
              </div>
            ))}
          </>
        )}

        <div className="mrow-head">Если платить</div>
        <div className="scen">
          {h.scenarios.map((s) => (
            <div key={s.perMonth} className="scencell">
              <b>{fmt(s.perMonth)} ₸/мес</b>
              <span>{s.date.slice(0, 7)} · {monthsWord(s.months)}</span>
            </div>
          ))}
        </div>

        {h.credit > 0 && (
          <div className="node" style={{ marginTop: 14 }}>
            <b>Кредит съедает {fmt(h.credit)} ₸ в месяц</b>
            <div className="small muted">
              {h.creditNames.join(", ")} — это списания, они не уменьшают долги выше.
              Кредит Каспи — риба{halal ? <> (см. <Link to={pageUrl(halal)}>{HALAL_PAGE}</Link>)</> : null}, поэтому закрывается первым не по математике, а по вере.
            </div>
          </div>
        )}

        <div className="mrow-head">Этот месяц</div>
        <div className="bodynums">
          <div className="bnum"><b className="ok">{fmt(h.month.earned)}</b><span>получено</span></div>
          <div className="bnum"><b>{fmt(h.month.spent)}</b><span>потрачено</span></div>
          <div className="bnum"><b>{fmt(h.month.paid)}</b><span>отдано по долгам</span></div>
        </div>
        <div className="small faint" style={{ marginTop: 8 }}>
          Темп считается по транзакциям с категорией «долг» — они пишутся сами, когда гасишь долг на экране финансов.
          {h.pace === 0 && " Пока таких транзакций нет, поэтому даты выхода в ноль тоже нет."}
        </div>
      </div>
    </section>
  );
}
