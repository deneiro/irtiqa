import { useMemo } from "react";
import { Link } from "react-router-dom";
import { plainStep } from "../../lib/dashboard";
import { plural } from "../../lib/dates";
import { sectionGroups, type SectionCard } from "../../lib/overview";
import { shortDate } from "../../lib/themeNumbers";
import { summaryGroups, wikiLists, type ProjectCard } from "../../lib/themePages";
import type { Page } from "../../lib/types";
import { pageUrl } from "../../lib/vault";
import { Inline } from "./parts";

/*
 * The full screens `/theme/:name/:key` that answer the audit of 2026-11-06: an overview section as cards, the base
 * by folders, the projects by folder. They keep the app's look (outside `.t-page`); their classes start with `t-fs-`.
 */

function CardView({ card }: { card: SectionCard }) {
  return (
    <div className={`card t-fs-card${card.struck ? " t-fs-struck" : ""}`}>
      <b className="t-fs-t"><Inline md={card.title} /></b>
      {card.text && <p className="t-fs-d"><Inline md={card.text} /></p>}
      {card.fields && card.fields.length > 0 && (
        <dl className="t-fs-dl">
          {card.fields.map((f, i) => (
            <div key={i}><dt>{f.label}</dt><dd><Inline md={f.md} />{f.note && <span className="t-fs-n"> · {f.note}</span>}</dd></div>
          ))}
        </dl>
      )}
      {card.note && <span className="t-fs-n">{card.note}</span>}
    </div>
  );
}

/** An overview `##` section named in `sections:` (Eldar: «визуально user-friendly»): a card a bullet or a table row, `###` as groups. */
export function HeadingScreen({ title, md }: { title: string; md: string }) {
  const groups = useMemo(() => sectionGroups(md), [md]);
  const n = groups.reduce((a, g) => a + g.cards.length, 0);
  return (
    <section className="tblock">
      <h2 className="section">{title} {n > 0 && <span className="n">{n} {plural(n, "пункт", "пункта", "пунктов")}</span>}</h2>
      {groups.map((g, i) => (
        <div key={i} className="skgroup t-fs-group">
          {g.title && <h3>{g.title} {g.cards.length > 0 && <span className="n">{g.cards.length}</span>}</h3>}
          {g.notes.map((x, j) => <p key={j} className="small faint t-fs-note"><Inline md={x} /></p>)}
          {g.cards.length > 0 && <div className="t-fs-grid">{g.cards.map((c, j) => <CardView key={j} card={c} />)}</div>}
        </div>
      ))}
      {n === 0 && groups.every((g) => !g.notes.length) && <div className="empty">Раздел пуст.</div>}
    </section>
  );
}

/** The theme's own base (Eldar: «отдельные листы»): a chip row to jump, then one block per folder with its pages by title. */
export function WikiScreen({ pages }: { pages: Page[] }) {
  const { lists, overview } = useMemo(() => wikiLists(pages), [pages]);
  const total = lists.reduce((a, l) => a + l.pages.length, 0);
  const jump = (i: number) => document.getElementById(`t-fs-wl-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <section className="tblock">
      <h2 className="section">Своя база знаний <span className="n">{total}</span>{overview && <Link to={pageUrl(overview)}>обзор базы</Link>}</h2>
      {lists.length > 1 && (
        <div className="t-fs-chips">
          {lists.map((l, i) => <button key={l.folder} type="button" className="chip" onClick={() => jump(i)}>{l.name} <span className="t-fs-cn">{l.pages.length}</span></button>)}
        </div>
      )}
      {lists.map((l, i) => (
        <section key={l.folder} id={`t-fs-wl-${i}`} className="t-fs-list">
          <h3>{l.name} <span className="n">{l.pages.length}</span>{l.overview && <Link to={pageUrl(l.overview)}>обзор</Link>}</h3>
          <div className="t-fs-items">
            {l.pages.map((p) => <Link key={p.rel} to={pageUrl(p)} className="t-fs-item" title={p.title}>{p.title}</Link>)}
          </div>
        </section>
      ))}
      {total === 0 && <div className="empty">Wiki пока пуст: сюда попадёт то, что ты синтезируешь сам.</div>}
    </section>
  );
}

/** A step or a line as the card prints it: plain words (a card is one link, so no links inside it). */
const plainLine = (md: string) => plainStep(md).replace(/\*\*/g, "");

/** One card per project folder: its activity and stage, the «Сейчас» step, «Где стою», the page count. */
export function ProjectsScreen({ title, cards, page }: { title: string; cards: ProjectCard[]; page?: Page }) {
  return (
    <section className="tblock">
      <h2 className="section">{title} <span className="n">{cards.length}</span>{page && <Link to={pageUrl(page)}>страница сводки</Link>}</h2>
      <div className="t-fs-grid t-fs-wide">
        {cards.map((c) => {
          const a = c.activity;
          const to = a ? `/quest/${encodeURIComponent(a.quest.rel)}` : c.overview ? pageUrl(c.overview) : `/search?q=${encodeURIComponent(c.name)}`;
          return (
            <Link key={c.name} to={to} className="card t-fs-card t-fs-proj">
              <div className="t-fs-head"><b className="t-fs-t">{c.name}</b>{a && <span className={`t-fs-pill t-fs-${a.tone}`}>{a.word}</span>}</div>
              {a ? <span className="t-fs-sub">{a.quest.title}</span> : <span className="t-fs-sub">деятельности нет</span>}
              {a?.now && <p className="t-fs-d t-fs-now"><span className="t-fs-k">Сейчас</span>{plainLine(a.now)}</p>}
              {c.stand && <p className="t-fs-d t-fs-clamp"><span className="t-fs-k">Где стою</span>{plainLine(c.stand)}</p>}
              <span className="t-fs-n">{c.pages} {plural(c.pages, "страница", "страницы", "страниц")}{c.updated ? ` · обновлён ${shortDate(c.updated)}` : ""}</span>
            </Link>
          );
        })}
      </div>
      {cards.length === 0 && <div className="empty">Проектов нет: проект — это папка в Projects/.</div>}
    </section>
  );
}

/** «Сводка проектов»: each table of the summary file as cards — the name, the stage pill, the other cells as small lines. */
export function SummaryScreen({ page, projects }: { page: Page | undefined; projects: ProjectCard[] }) {
  const groups = useMemo(() => (page ? summaryGroups(page.body) : []), [page]);
  // a summary without tables still answers with the projects by folder
  if (!groups.length) return <ProjectsScreen title="Сводка проектов" cards={projects} page={page} />;
  return (
    <section className="tblock">
      <h2 className="section">Сводка проектов {page?.updated && <span className="n">обновлена {shortDate(page.updated)}</span>}{page && <Link to={pageUrl(page)}>страница сводки</Link>}</h2>
      {groups.map((g, i) => (
        <div key={i} className="skgroup t-fs-group">
          <h3><Inline md={g.title} /> <span className="n">{g.cards.length}</span></h3>
          <div className="t-fs-grid t-fs-wide">
            {g.cards.map((c, j) => (
              <div key={j} className="card t-fs-card">
                <div className="t-fs-head"><b className="t-fs-t">{c.title}</b>{c.pill && <span className="t-fs-pill t-fs-stage">{c.pill}</span>}</div>
                {c.note && <span className="t-fs-n"><Inline md={c.note} /></span>}
                {c.lines.length > 0 && (
                  <dl className="t-fs-dl t-fs-lines">
                    {c.lines.map((l, k) => <div key={k}><dt>{l.label}</dt><dd><Inline md={l.md} /></dd></div>)}
                  </dl>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
