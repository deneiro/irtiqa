import type { ReactNode } from "react";
import { plural } from "../../lib/dates";
import { LATE_MEAL_HOUR, type Life } from "../../lib/life";
import { phraseOf, sectionCards, sectionTable, type SectionKey, type ThemeView } from "../../lib/overview";
import { SKILL_STATUS } from "../../lib/skills";
import { nutritionGlance, sportGames } from "../../lib/themeOrgans";
import { shortDate } from "../../lib/themeNumbers";
import type { Page, Vault } from "../../lib/types";
import { pageUrl } from "../../lib/vault";
import { MedicalOrgan } from "./BodyMap";
import { FocusOrgan } from "./Focus";
import { CircleOrgan, EventsOrgan, FinanceOrgan, HorizonOrgan, TalksOrgan, WishesOrgan } from "./organs2";
import { Inline, Organ, OrganEmpty, partUrl } from "./parts";

/** What every organ gets: the theme, the data, and the `sections:` string it was named by. */
export interface OrganProps { name: string; theme: string; life: Life; vault: Vault; today: string; root: string; overview: Page | undefined; view: ThemeView }
export type OrganComponent = (p: OrganProps) => ReactNode;

/** A `sections:` string that is not a key: the overview's own `## <name>` — a table as a table, a list as cards. */
function HeadingSection(p: OrganProps) {
  const sec = p.view.sections.find((s) => s.heading === p.name) ?? p.view.sections.find((s) => s.heading.toLowerCase() === p.name.toLowerCase());
  const more = p.overview ? pageUrl(p.overview) : undefined;
  if (!sec || !sec.md.trim()) return <OrganEmpty title={p.name} more={more} />;
  const table = sectionTable(sec.md);
  const cards = sectionCards(sec.md);
  const titled = cards.filter((c) => c.title), plain = cards.filter((c) => !c.title);
  const cellOf = (text: string) => { const c = phraseOf(text); return <><Inline md={c.md} />{c.note && <span className="t-w">{c.note}</span>}</>; };
  return (
    <Organ title={p.name} more={more} wide={!!table}>
      {table && (
        <div className="t-tbl" style={{ ["--cols" as string]: Math.max(1, table.head.length - 1) }}>
          <div className="t-tbl-row t-tbl-head">{table.head.map((h, i) => <span key={i}>{i ? h : ""}</span>)}</div>
          {table.rows.map((row, i) => (
            <div key={i} className="t-tbl-row">
              {table.head.map((h, j) => j === 0
                ? <span key={j} className="t-tbl-t">{row[0] ? <Inline md={row[0]} /> : ""}</span>
                : <span key={j} className={row[j] ? "" : "t-tbl-none"}><span className="t-tbl-lab">{h}</span>{row[j] ? cellOf(row[j]) : "—"}</span>)}
            </div>
          ))}
        </div>
      )}
      {titled.length > 0 && <div className="t-vals">{titled.map((c, i) => <div key={i} className="t-val"><b><Inline md={c.title!} /></b>{c.text && <span><Inline md={c.text} /></span>}</div>)}</div>}
      {plain.length > 0 && <ul className="t-views">{plain.map((c, i) => <li key={i}><Inline md={c.text} /></li>)}</ul>}
      {!table && !cards.length && <p className="t-plain"><Inline md={sec.md.replace(/\s+/g, " ")} /></p>}
    </Organ>
  );
}

/** `skills`: every skill by its status — name · level 0–5 · status, Eldar's own marks in `life/skills`. */
function SkillsOrgan(p: OrganProps) {
  const more = partUrl(p.theme, "skills");
  if (!p.life.skills.length) return <OrganEmpty title="Навыки" more={more} />;
  return (
    <Organ title="Навыки" right="уровень 0–5 и статус — твои отметки" more={more} wide>
      <div className="t-skills">
        {SKILL_STATUS.map((st) => {
          const list = p.life.skills.filter((s) => s.status === st.key);
          if (!list.length) return null;
          return (
            <div key={st.key} className={`t-sk-row t-sk-${st.key}`}>
              <span className="t-label">{st.label} · {list.length}</span>
              <div className="t-chips">
                {list.map((s) => (
                  <span key={s.rel} className="t-chip">
                    {s.title}
                    {st.key !== "gap" && <span className="t-lv" aria-label={`уровень ${s.level} из 5`}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= s.level ? "t-on" : ""} />)}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Organ>
  );
}

const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** `sport`: what he played in 60 days — a day strip and the list: date · what · time · with whom. */
function SportOrgan(p: OrganProps) {
  const g = sportGames(p.life, p.theme, p.today);
  const more = partUrl(p.theme, "sport");
  if (!g.games.length) return <OrganEmpty title="Спорт" more={more} />;
  return (
    <Organ title="Спорт" right="что играл · 60 дней" more={more}>
      <div className="t-strip" role="img" aria-label={`60 дней: ${g.games.length}`}>
        {g.days.map((d) => <i key={d.date} className={d.on ? "t-on" : ""} title={shortDate(d.date)} />)}
      </div>
      <div className="t-strip-ax">
        {g.days.map((d, i) => (i === 0 || d.date.endsWith("-01")) && <span key={d.date} style={{ left: `${(i / g.days.length) * 100}%` }}>{i === 0 ? shortDate(d.date) : MON[Number(d.date.slice(5, 7)) - 1]}</span>)}
      </div>
      <ul className="t-games">
        {g.games.map((x, i) => (
          <li key={i}>
            <span className="t-games-d">{shortDate(x.date)}</span>
            <div><b>{x.title}</b><span>{[x.from && (x.to ? `${x.from}–${x.to}` : x.from), x.people.length ? `с ${x.people.join(", ")}` : ""].filter(Boolean).join(", ") || "—"}</span></div>
          </li>
        ))}
      </ul>
    </Organ>
  );
}

/** `nutrition`: late meals in 14 days, days in a row without one, the last record. No record in the 14 days: the first two are «—», not 0. */
function NutritionOrgan(p: OrganProps) {
  const n = nutritionGlance(p.life, p.today);
  const more = partUrl(p.theme, "nutrition");
  if (!n.days && !n.last) return <OrganEmpty title="Питание" more={more} />;
  return (
    <Organ title="Питание" right="14 дней" more={more}>
      <dl className="t-kv">
        <dt>После {LATE_MEAL_HOUR}:00</dt><dd>{n.days ? <>{n.late ? `${n.late} ${plural(n.late, "раз", "раза", "раз")} за 14 дней` : "ни разу за 14 дней"} · записи за {n.days} дн</> : <>—<span className="t-w">нет записей за 14 дней</span></>}</dd>
        <dt>Подряд без</dt><dd>{n.days ? `${n.clean} дн` : "—"}</dd>
        <dt>Последняя запись</dt><dd>{n.last ? `${shortDate(n.last.date)}: ${n.last.meals.map((m) => (m.time ? `${m.what} в ${m.time}` : m.what)).join(", ")}` : "—"}</dd>
      </dl>
    </Organ>
  );
}

/** Key → its organ (spec v4 «Ключи `sections:`»). A key without one is a button in «Страницы». */
export const ORGANS: Partial<Record<SectionKey, OrganComponent>> = {
  focus: FocusOrgan,
  skills: SkillsOrgan,
  medical: MedicalOrgan,
  sport: SportOrgan,
  nutrition: NutritionOrgan,
  circle: CircleOrgan,
  talks: TalksOrgan,
  horizon: HorizonOrgan,
  finance: FinanceOrgan,
  events: EventsOrgan,
  wishes: WishesOrgan,
};

/** The organ of a `sections:` string that is not a key: the overview's own `## <name>` section. */
export const HEADING: OrganComponent | undefined = HeadingSection;
