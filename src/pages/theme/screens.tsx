import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import EventForm from "../../components/EventForm";
import { buildCircle } from "../../lib/circle";
import { plainStep } from "../../lib/dashboard";
import { addDays, plural } from "../../lib/dates";
import { eventUrl, personName, type LifeEvent } from "../../lib/events";
import { LATE_MEAL_HOUR, isLateMeal, type Life } from "../../lib/life";
import { mediaUrl } from "../../lib/native";
import { sectionGroups, type SectionCard } from "../../lib/overview";
import { extractPractices } from "../../lib/practices";
import { shortDate } from "../../lib/themeNumbers";
import { summaryGroups, wikiLists, type ProjectCard } from "../../lib/themePages";
import type { Nutrition } from "../../lib/trainingMap";
import type { Page } from "../../lib/types";
import { pageUrl } from "../../lib/vault";
import { Block } from "../main/Scene";
import { PersonCard } from "../People";
import { NutritionPlan } from "../Training";
import { Inline } from "./parts";

/*
 * The full screens `/theme/:name/:key` that are drawn here (rebuilt 2026-11-21 the way «Сегодня» is): blocks under the
 * painted header that `ThemePart` puts over every full screen. Their classes are `g-`, the styles in main/Play.css.
 * A part that still has the old controls inside (the event form, the nutrition plan) stands outside `.g-play`,
 * which resets every button.
 */

/** A mark as a dot and a word, in the palette of the full screens. */
const Mark = ({ tone, children }: { tone: string; children: ReactNode }) => <span className={`g-st ${tone}`}>{children}</span>;

const Empty = ({ children }: { children: ReactNode }) => <p className="g-faint">{children}</p>;

function CardView({ card }: { card: SectionCard }) {
  return (
    <div className={`g-fcard${card.struck ? " x" : ""}`}>
      <b><Inline md={card.title} /></b>
      {card.text && <p><Inline md={card.text} /></p>}
      {card.fields && card.fields.length > 0 && (
        <dl>{card.fields.map((f, i) => <div key={i}><dt>{f.label}</dt><dd><Inline md={f.md} />{f.note && <small> · {f.note}</small>}</dd></div>)}</dl>
      )}
      {card.note && <small>{card.note}</small>}
    </div>
  );
}

/** How many cards a section of the overview holds: the number in its header. */
export const headingCount = (md: string) => sectionGroups(md).reduce((a, g) => a + g.cards.length, 0);

/** An overview `##` section named in `sections:`: a card a bullet or a table row, `###` as blocks. */
export function HeadingScreen({ title, md }: { title: string; md: string }) {
  const groups = useMemo(() => sectionGroups(md), [md]);
  const shown = groups.filter((g) => g.cards.length || g.notes.length);
  if (!shown.length) return <div className="g-play"><Block title={title}><Empty>Раздел пуст.</Empty></Block></div>;
  return (
    <div className="g-play">
      {shown.map((g, i) => (
        <Block key={i} title={g.title || title} right={g.cards.length > 0 ? `${g.cards.length} ${plural(g.cards.length, "пункт", "пункта", "пунктов")}` : undefined}>
          {g.notes.map((x, j) => <p key={j} className="g-quote"><Inline md={x} /></p>)}
          {g.cards.length > 0 && <div className="g-fcards">{g.cards.map((c, j) => <CardView key={j} card={c} />)}</div>}
        </Block>
      ))}
    </div>
  );
}

/** The theme's own base: a row of folders to jump to, then a block per folder with its pages by title. */
export function WikiScreen({ pages }: { pages: Page[] }) {
  const { lists, overview } = useMemo(() => wikiLists(pages), [pages]);
  const total = lists.reduce((a, l) => a + l.pages.length, 0);
  const jump = (i: number) => document.getElementById(`g-wl-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!total) return <div className="g-play"><Block title="Своя база знаний"><Empty>Здесь пока пусто: сюда попадает то, что ты синтезируешь сам.</Empty></Block></div>;
  return (
    <div className="g-play">
      {(lists.length > 1 || overview) && (
        <div className="g-jump">
          {lists.length > 1 && lists.map((l, i) => <button key={l.folder} type="button" onClick={() => jump(i)}>{l.name}<span>{l.pages.length}</span></button>)}
          {overview && <Link to={pageUrl(overview)}>обзор базы →</Link>}
        </div>
      )}
      {lists.map((l, i) => (
        <section key={l.folder} id={`g-wl-${i}`} className="g-block">
          <h2>{l.name}<span>{l.pages.length} {plural(l.pages.length, "страница", "страницы", "страниц")}{l.overview && <Link className="g-more" to={pageUrl(l.overview)}>обзор →</Link>}</span></h2>
          <div className="g-wlinks">{l.pages.map((p) => <Link key={p.rel} to={pageUrl(p)} title={p.title}>{p.title}</Link>)}</div>
        </section>
      ))}
    </div>
  );
}

/** A step or a line as the card prints it: plain words (a card is one link, so no links inside it). */
const plainLine = (md: string) => plainStep(md).replace(/\*\*/g, "");

function ProjectCards({ cards }: { cards: ProjectCard[] }) {
  return (
    <div className="g-projs">
      {cards.map((c) => {
        const a = c.activity;
        const to = a ? `/quest/${encodeURIComponent(a.quest.rel)}` : c.overview ? pageUrl(c.overview) : `/search?q=${encodeURIComponent(c.name)}`;
        return (
          <Link key={c.name} to={to} className={`g-proj ${a?.tone ?? "smoke"}`}>
            <header><b>{c.name}</b>{a && <Mark tone={a.tone}>{a.word}</Mark>}</header>
            <p className="ttl">{a ? a.quest.title : "деятельности нет"}</p>
            {a?.now && <p className="kv"><span>Сейчас</span>{plainLine(a.now)}</p>}
            {c.stand && <p className="kv clamp"><span>Где стою</span>{plainLine(c.stand)}</p>}
            <small>{c.pages} {plural(c.pages, "страница", "страницы", "страниц")}{c.updated ? ` · обновлён ${shortDate(c.updated)}` : ""}</small>
          </Link>
        );
      })}
    </div>
  );
}

/** One card per project folder: its activity and stage, the «Сейчас» step, «Где стою», the page count. */
export function ProjectsScreen({ title, cards, page }: { title: string; cards: ProjectCard[]; page?: Page }) {
  return (
    <div className="g-play">
      <Block title={title} right={page ? <Link className="g-more" to={pageUrl(page)}>страница сводки →</Link> : "проект — это папка в Projects/"}>
        {cards.length ? <ProjectCards cards={cards} /> : <Empty>Проектов нет: проект — это папка в Projects/.</Empty>}
      </Block>
    </div>
  );
}

/** «Сводка проектов»: each table of the summary file as cards — the name, the stage, the other cells as small lines. */
export function SummaryScreen({ page, projects }: { page: Page | undefined; projects: ProjectCard[] }) {
  const groups = useMemo(() => (page ? summaryGroups(page.body) : []), [page]);
  // a summary without tables still answers with the projects by folder
  if (!groups.length) return <ProjectsScreen title="Сводка проектов" cards={projects} page={page} />;
  return (
    <div className="g-play">
      {groups.map((g, i) => (
        <Block key={i} title={<Inline md={g.title} />} right={<>{g.cards.length}{i === 0 && page && <Link className="g-more" to={pageUrl(page)}>страница сводки →</Link>}</>}>
          <div className="g-fcards wide">
            {g.cards.map((c, j) => (
              <div key={j} className="g-fcard">
                <header><b>{c.title}</b>{c.pill && <Mark tone="sun">{c.pill}</Mark>}</header>
                {c.note && <small><Inline md={c.note} /></small>}
                {c.lines.length > 0 && <dl>{c.lines.map((l, k) => <div key={k}><dt>{l.label}</dt><dd><Inline md={l.md} /></dd></div>)}</dl>}
              </div>
            ))}
          </div>
        </Block>
      ))}
    </div>
  );
}

/** The theme's events by year, newest first, each with its first photo; «записать событие» opens the form above them. */
export function EventsScreen({ theme, events, root }: { theme: string; events: LifeEvent[]; root: string }) {
  const [adding, setAdding] = useState(false);
  const nav = useNavigate();
  const years = useMemo(() => {
    const m = new Map<string, LifeEvent[]>();
    for (const e of [...events].sort((a, b) => b.date.localeCompare(a.date))) m.set(e.date.slice(0, 4), [...(m.get(e.date.slice(0, 4)) ?? []), e]);
    return [...m];
  }, [events]);
  return (
    <>
      {adding && <div className="card g-formcard"><EventForm theme={theme} onDone={(r) => { setAdding(false); nav(`/event/${encodeURIComponent(r)}`); }} /></div>}
      <div className="g-play">
        {!adding && <div className="g-jump"><button type="button" className="cta" onClick={() => setAdding(true)}>+ записать событие</button></div>}
        {years.map(([year, es]) => (
          <Block key={year} title={year} right={`${es.length} ${plural(es.length, "событие", "события", "событий")}`}>
            <div className="g-evs big">
              {es.map((e) => (
                <Link key={e.rel} to={eventUrl(e)}>
                  {e.photos[0] ? <img src={mediaUrl(root, e.photos[0])} alt="" loading="lazy" /> : <span className="ph">нет фото</span>}
                  <b>{e.title}</b>
                  <small>{shortDate(e.date)}{e.place ? ` · ${e.place}` : ""}{e.photos.length > 1 ? ` · ${e.photos.length} фото` : ""}</small>
                  {e.people.length > 0 && <small className="who">{e.people.map(personName).join(", ")}</small>}
                </Link>
              ))}
            </div>
          </Block>
        ))}
        {!events.length && !adding && <Block title="События"><Empty>Событий пока нет. Запиши первое: дата, название, кто был, фотографии.</Empty></Block>}
      </div>
    </>
  );
}

const DAY_FROM = 5, DAY_HOURS = 24 - DAY_FROM;
const hourOf = (time: string) => (/^\d{2}:\d{2}$/.test(time) ? Number(time.slice(0, 2)) + Number(time.slice(3)) / 60 : undefined);
const at = (h: number) => `${Math.max(0, Math.min(100, ((h - DAY_FROM) / DAY_HOURS) * 100))}%`;

/** How the last 14 days of food stand: every record, the late ones, and the days in a row without a late meal. */
export function nutritionCount(life: Life | null, today: string) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const rows = days.map((date) => ({ date, meals: life?.days.get(date)?.meals ?? [] })).reverse();
  let clean = 0;
  for (const r of rows) {
    if (r.meals.some(isLateMeal)) break;
    if (r.meals.length) clean++;
    else if (r.date !== today) break;
  }
  return { rows, total: rows.reduce((n, r) => n + r.meals.length, 0), late: rows.reduce((n, r) => n + r.meals.filter(isLateMeal).length, 0), clean, days: rows.filter((r) => r.meals.length).length };
}

/** Food: fourteen days as lines of the day from 5:00 to midnight — a dot a meal, the late hours shaded — then the plan. */
export function NutritionScreen({ life, today, plan }: { life: Life | null; today: string; plan?: Nutrition }) {
  const c = useMemo(() => nutritionCount(life, today), [life, today]);
  return (
    <>
      <div className="g-play">
        <Block title="Что ел · 14 дней" right={`точка — приём пищи · после ${LATE_MEAL_HOUR}:00 — поздно`}>
          <div className="g-minis">
            <div className={c.late ? "bad" : ""}><b>{c.days ? c.late : "—"}</b><span>раз после {LATE_MEAL_HOUR}:00</span></div>
            <div className={c.clean ? "good" : ""}><b>{c.days ? c.clean : "—"}</b><span>дней подряд без поздней еды</span></div>
            <div><b>{c.days || "—"}</b><span>дней с записями из 14</span></div>
          </div>
          {c.days ? (
            <div className="g-meals">
              <div className="ax"><span /><i>{[6, 9, 12, 15, 18, LATE_MEAL_HOUR, 24].map((h) => <em key={h} style={{ left: at(h) }}>{h}</em>)}</i><span /></div>
              {c.rows.map((r) => (
                <div key={r.date} className={r.meals.length ? "" : "none"}>
                  <span>{r.date === today ? "сегодня" : shortDate(r.date)}</span>
                  <i>
                    <u style={{ left: at(LATE_MEAL_HOUR) }} />
                    {r.meals.map((m, k) => { const h = hourOf(m.time); return h === undefined ? null : <b key={k} className={isLateMeal(m) ? "late" : ""} style={{ left: at(h) }} title={`${m.time} — ${m.what}${m.note ? ` · ${m.note}` : ""}`} />; })}
                  </i>
                  <p>{r.meals.length ? r.meals.map((m, k) => <span key={k} className={isLateMeal(m) ? "late" : ""} title={m.note}>{m.time && <em>{m.time}</em>}{m.what}</span>) : "—"}</p>
                </div>
              ))}
            </div>
          ) : <Empty>Записей о еде пока нет: их пишет вечерний опрос бота и «Сегодня».</Empty>}
        </Block>
      </div>
      {plan && <section className="g-block g-below"><h2>План питания</h2><NutritionPlan n={plan} /></section>}
    </>
  );
}

const groupBySub = (list: Page[], depth: number) => {
  const m = new Map<string, Page[]>();
  for (const p of list) { const k = p.segments[depth] ?? ""; m.set(k, [...(m.get(k) ?? []), p]); }
  return [...m.entries()].sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : a[0].localeCompare(b[0])));
};

/** The reading list by folder: how much of a folder is read as a bar, each source a row with its mark. A long folder that is read through folds away. */
export function ReadingScreen({ resources, relDate }: { resources: Page[]; relDate: (d: string | undefined) => string }) {
  const folders = useMemo(() => groupBySub(resources, 2), [resources]);
  if (!resources.length) return <div className="g-play"><Block title="Список чтения"><Empty>Источников пока нет.</Empty></Block></div>;
  return (
    <div className="g-play">
      {folders.map(([sub, ps]) => {
        const read = ps.filter((p) => p.fm.read).length;
        return (
          <details key={sub} className="g-block g-fold" open={!sub || read < ps.length || ps.length <= 8}>
            <summary>
              <b>{sub || "Без папки"}</b>
              <i><u style={{ width: `${(read / ps.length) * 100}%` }} /></i>
              <span>{read} из {ps.length} прочитано</span>
            </summary>
            <div className="g-prows">
              {ps.map((p) => {
                const n = extractPractices(p.body).length;
                return (
                  <Link key={p.rel} to={pageUrl(p)} className={p.fm.read ? "y" : "n"}>
                    <i>{p.fm.read ? "✓" : ""}</i>
                    <b>{p.title}</b>
                    <small>{n > 0 ? `${n} ${plural(n, "практика", "практики", "практик")} · ` : ""}{p.words} слов · {relDate(p.updated)}</small>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** The theme's people as the cards of «Люди»: the ring is how warm the tie is against its rhythm. */
export function PeopleScreen({ people, events, today }: { people: Page[]; events: LifeEvent[]; today: string }) {
  const circle = useMemo(() => buildCircle(people, events, today).sort((a, b) => a.name.localeCompare(b.name)), [people, events, today]);
  return (
    <div className="g-play">
      <Block title="Люди темы" right={<Link className="g-more" to="/people">все люди →</Link>}>
        {circle.length ? <div className="g-pcards">{circle.map((i) => <PersonCard key={i.page.rel} i={i} />)}</div> : <Empty>Людей в этой теме нет.</Empty>}
        {circle.length > 0 && <p className="g-cap">Кольцо — тепло связи против её ритма: полное в день общения, пустое, когда срок вышел.</p>}
      </Block>
    </div>
  );
}

/** Pages as rows: the title and one pale line. */
export function PagesScreen({ title, pages, relDate, empty }: { title: string; pages: Page[]; relDate: (d: string | undefined) => string; empty: string }) {
  return (
    <div className="g-play">
      <Block title={title} right={pages.length ? `${pages.length}` : undefined}>
        {pages.length ? (
          <div className="g-prows">
            {pages.map((p) => <Link key={p.rel} to={pageUrl(p)}><b>{p.title}</b><small>{p.words} слов · {relDate(p.updated)}</small></Link>)}
          </div>
        ) : <Empty>{empty}</Empty>}
      </Block>
    </div>
  );
}
