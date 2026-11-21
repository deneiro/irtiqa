import { Link } from "react-router-dom";
import { fmt } from "../../lib/dashboard";
import { eventUrl } from "../../lib/events";
import { mediaUrl } from "../../lib/native";
import { debtGlance, quietClose, shortDate } from "../../lib/themeNumbers";
import { financeGlance, recentTalks, themeEvents, wishesGlance } from "../../lib/themeOrgans";
import { pageUrl } from "../../lib/vault";
import type { OrganProps } from "./organs";
import { Organ, OrganEmpty, partUrl } from "./parts";

const money = (n: number) => `${fmt(n)} ₸`;

/** `circle`: the six close people silent longest — the name, the days, and how far the tie is into its rhythm. */
export function CircleOrgan(p: OrganProps) {
  const q = quietClose(p.vault, p.life, p.theme, p.today).slice(0, 6);
  const more = partUrl(p.theme, "circle");
  if (!q.length) return <OrganEmpty title="Круг" more={more} />;
  return (
    <Organ title="Круг" right="дольше всех без связи" more={more}>
      <div className="g-ties">
        {q.map((x) => {
          const warm = x.since === undefined || !x.cadence ? 0 : Math.max(0, Math.min(100, Math.round(100 - (x.since / x.cadence) * 100)));
          return (
            <Link key={x.page.rel} to={pageUrl(x.page)} className={x.overdue ? "late" : ""}>
              <b>{x.name}</b>
              <i><u style={{ width: `${warm}%` }} /></i>
              <em>{x.since === undefined ? "не отмечено" : `${x.since} дн`}{x.cadence ? <small> из {x.cadence}</small> : null}</em>
            </Link>
          );
        })}
      </div>
    </Organ>
  );
}

/** `talks`: the three last talks with the theme's people. */
export function TalksOrgan(p: OrganProps) {
  const ts = recentTalks(p.life, p.vault, p.theme);
  const more = partUrl(p.theme, "talks");
  if (!ts.length) return <OrganEmpty title="Разговоры" more={more} />;
  return (
    <Organ title="Разговоры" right="три последних" more={more}>
      <ul className="g-dated">
        {ts.map((t, i) => <li key={i}><span>{shortDate(t.date)}</span><div><b>{t.page ? <Link to={pageUrl(t.page)}>{t.who}</Link> : t.who}</b><small>{t.about || "—"}</small></div></li>)}
      </ul>
    </Organ>
  );
}

/** `horizon`: the debt as a road — what is paid, what is left, the pace, and the month of zero. */
export function HorizonOrgan(p: OrganProps) {
  const more = partUrl(p.theme, "horizon");
  if (!p.life.debts.length) return <OrganEmpty title="Горизонт" more={more} />;
  const g = debtGlance(p.life, p.today);
  const all = g.owed + g.paid;
  const pct = all ? Math.round((g.paid / all) * 100) : 0;
  return (
    <Organ title="Горизонт" right="когда выйду в ноль" more={more}>
      <div className="g-horizon">
        <div className="top"><b>{money(g.owed)}</b><span>осталось</span></div>
        <div className="road"><i style={{ width: `${pct}%` }} /><em style={{ left: `${pct}%` }} /></div>
        <div className="ends"><span>выплачено {money(g.paid)} · {pct} %</span><span>ноль — {g.freeDate ? g.freeDate.slice(0, 7) : "при нулевом темпе даты нет"}</span></div>
      </div>
      <p className="g-cap"><b>Темп:</b> {g.pace > 0 ? `${money(g.pace)} в месяц${g.paceFrom ? ` с ${shortDate(g.paceFrom)}` : ""}` : "—"}</p>
    </Organ>
  );
}

/** `finance`: the read part of «Финансы», and the way to the whole screen. */
export function FinanceOrgan(p: OrganProps) {
  const g = financeGlance(p.life, p.today);
  if (g.accounts === undefined && !g.moneyDays && !g.subs && !g.openDebts) return <OrganEmpty title="Деньги" more="/finance" />;
  return (
    <Organ title="Деньги" right="этот месяц" more="/finance">
      <div className="g-minis four">
        <div className={g.accounts !== undefined && g.accounts < 0 ? "bad" : ""}><b>{g.accounts === undefined ? "—" : fmt(g.accounts)}</b><span>на счетах, ₸</span></div>
        <div><b>{g.spent === undefined ? "—" : fmt(g.spent)}</b><span>потрачено, ₸</span></div>
        <div className={g.earned ? "good" : ""}><b>{g.earned === undefined ? "—" : fmt(g.earned)}</b><span>получено, ₸</span></div>
        <div><b>{g.openDebts || "—"}</b><span>открытых долгов</span></div>
      </div>
      {g.subs > 0 && <p className="g-cap"><b>Подписки:</b> {money(g.subs)} в месяц.</p>}
    </Organ>
  );
}

/** `events`: the six latest events of the theme, with their first photo. */
export function EventsOrgan(p: OrganProps) {
  const es = themeEvents(p.life, p.theme, p.today).slice(0, 6);
  const more = partUrl(p.theme, "events");
  if (!es.length) return <OrganEmpty title="События" more={more} />;
  return (
    <Organ title="События" right="последние" more={more} wide>
      <div className="g-evs">
        {es.map((e) => (
          <Link key={e.rel} to={eventUrl(e)}>
            {e.photos[0] ? <img src={mediaUrl(p.root, e.photos[0])} alt="" loading="lazy" /> : <span className="ph">нет фото</span>}
            <b>{e.title}</b>
            <small>{shortDate(e.date)}{e.place ? ` · ${e.place}` : ""}</small>
          </Link>
        ))}
      </div>
    </Organ>
  );
}

/** `wishes`: «хочу · делаю · сделал» as three numbers and what he is doing now. */
export function WishesOrgan(p: OrganProps) {
  const w = wishesGlance(p.life);
  const more = partUrl(p.theme, "wishes");
  if (!w.want && !w.doing && !w.done) return <OrganEmpty title="Хочу прожить" more={more} />;
  return (
    <Organ title="Хочу прожить" more={more}>
      <div className="g-minis">
        <div><b>{w.want}</b><span>хочу</span></div>
        <div className={w.doing ? "now" : ""}><b>{w.doing}</b><span>делаю</span></div>
        <div className={w.done ? "good" : ""}><b>{w.done}</b><span>сделал</span></div>
      </div>
      {w.doingTitles.length > 0 && <ul className="g-plain">{w.doingTitles.map((t) => <li key={t}>{t}</li>)}</ul>}
    </Organ>
  );
}
