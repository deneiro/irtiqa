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

/** `circle`: the six close people silent longest — name · days. */
export function CircleOrgan(p: OrganProps) {
  const q = quietClose(p.vault, p.life, p.theme, p.today).slice(0, 6);
  const more = partUrl(p.theme, "circle");
  if (!q.length) return <OrganEmpty title="Круг" more={more} />;
  return (
    <Organ title="Круг" right="дольше всех без связи" more={more}>
      <ul className="t-rows">
        {q.map((x) => (
          <li key={x.page.rel} className={x.overdue ? "t-late" : ""}>
            <Link to={pageUrl(x.page)}>{x.name}</Link>
            <span>{x.since === undefined ? "не отмечено" : `${x.since} дн`}{x.cadence ? <small> · ритм {x.cadence}</small> : null}</span>
          </li>
        ))}
      </ul>
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
      <ul className="t-games">
        {ts.map((t, i) => (
          <li key={i}>
            <span className="t-games-d">{shortDate(t.date)}</span>
            <div><b>{t.page ? <Link to={pageUrl(t.page)}>{t.who}</Link> : t.who}</b><span>{t.about || "—"}</span></div>
          </li>
        ))}
      </ul>
    </Organ>
  );
}

/** `horizon`: the debt — left · paid in · the pace · the month of zero. */
export function HorizonOrgan(p: OrganProps) {
  const more = partUrl(p.theme, "horizon");
  if (!p.life.debts.length) return <OrganEmpty title="Горизонт" more={more} />;
  const g = debtGlance(p.life, p.today);
  return (
    <Organ title="Горизонт" right="когда выйду в ноль" more={more}>
      <dl className="t-kv">
        <dt>Осталось</dt><dd>{money(g.owed)}</dd>
        <dt>Выплачено</dt><dd>{money(g.paid)}</dd>
        <dt>Темп</dt><dd>{g.pace > 0 ? `${money(g.pace)} в месяц${g.paceFrom ? ` с ${shortDate(g.paceFrom)}` : ""}` : "—"}</dd>
        <dt>Ноль</dt><dd>{g.freeDate ? g.freeDate.slice(0, 7) : "при нулевом темпе даты нет"}</dd>
      </dl>
    </Organ>
  );
}

/** `finance`: the read part of «Финансы», and the way to the whole screen. */
export function FinanceOrgan(p: OrganProps) {
  const g = financeGlance(p.life, p.today);
  if (g.accounts === undefined && !g.moneyDays && !g.subs && !g.openDebts) return <OrganEmpty title="Деньги" more="/finance" />;
  return (
    <Organ title="Деньги" right="этот месяц" more="/finance">
      <dl className="t-kv">
        <dt>На счетах</dt><dd>{g.accounts === undefined ? "—" : money(g.accounts)}</dd>
        <dt>Потрачено</dt><dd>{g.spent === undefined ? "—" : money(g.spent)}</dd>
        <dt>Получено</dt><dd>{g.earned === undefined ? "—" : money(g.earned)}</dd>
        <dt>Подписки</dt><dd>{g.subs ? `${money(g.subs)} в месяц` : "—"}</dd>
        <dt>Долгов</dt><dd>{g.openDebts || "—"}</dd>
      </dl>
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
      <div className="t-evs" style={{ ["--n" as string]: es.length }}>
        {es.map((e) => (
          <Link key={e.rel} to={eventUrl(e)} className="t-ev">
            {e.photos[0] ? <img src={mediaUrl(p.root, e.photos[0])} alt="" loading="lazy" /> : <span className="t-ev-none">нет фото</span>}
            <b>{e.title}</b>
            <span>{shortDate(e.date)}{e.place ? ` · ${e.place}` : ""}</span>
          </Link>
        ))}
      </div>
    </Organ>
  );
}

/** `wishes`: «хочу · делаю · сделал» as numbers and three «делаю». */
export function WishesOrgan(p: OrganProps) {
  const w = wishesGlance(p.life);
  const more = partUrl(p.theme, "wishes");
  if (!w.want && !w.doing && !w.done) return <OrganEmpty title="Хочу прожить" more={more} />;
  return (
    <Organ title="Хочу прожить" more={more}>
      <div className="t-wish">
        <span><b>{w.want}</b>хочу</span>
        <span><b>{w.doing}</b>делаю</span>
        <span><b>{w.done}</b>сделал</span>
      </div>
      {w.doingTitles.length > 0 && <ul className="t-views">{w.doingTitles.map((t) => <li key={t}>{t}</li>)}</ul>}
    </Organ>
  );
}
