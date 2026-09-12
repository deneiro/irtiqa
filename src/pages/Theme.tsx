import { useMemo, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEME_BY_NAME } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { PageList } from "../components/Bits";
import QuestRows from "../components/QuestRows";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";
import type { Page } from "../lib/types";
import { todayStr, monthOfToday } from "../lib/dates";
import { habitDue, markOf, streak } from "../lib/life";
import { extractPractices } from "../lib/practices";
import { contactsOf, daysSinceContact, isAuthor } from "../lib/people";
import { sectionSuffix, themeSections, themeState, type SectionKey } from "../lib/overview";
import { themeXps } from "../lib/levels";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

export default function ThemePage() {
  const { name = "" } = useParams();
  const theme = decodeURIComponent(name);
  const meta = THEME_BY_NAME.get(theme);
  const v = useVault();
  const { life } = useStore();
  const { t, themeLabel, themeBlurb, relDate } = useT();
  const today = todayStr();

  const pages = useMemo(() => v.pages.filter((p) => p.theme === theme), [v, theme]);
  const overview = pages.find((p) => p.file === "_Overview" && p.segments.length === 1);
  const sections = themeSections(overview);
  const state = useMemo(() => themeState(overview), [overview]);

  const habits = useMemo(() => (life?.habits ?? []).filter((h) => h.theme === theme && h.status === "active"), [life, theme]);
  const quests = useMemo(() => (life?.quests ?? []).filter((q) => q.theme === theme && q.status === "active"), [life, theme]);
  const todayDay = life?.days.get(today);

  const txp = useMemo(() => (life ? themeXps(life, v.pages, today).find((x) => x.theme === theme) : undefined), [life, v, theme, today]);

  // ----- page groups -----
  const resources = useMemo(() => {
    const list = pages.filter((p) => p.zone === "resource" && !p.project);
    const readOf = (p: Page) => (p.fm.read ? 1 : 0);
    return list.sort((a, b) => readOf(a) - readOf(b) || (b.updated ?? "").localeCompare(a.updated ?? ""));
  }, [pages]);
  const groupBySub = (list: Page[], depth: number) => {
    const m = new Map<string, Page[]>();
    for (const p of list) { const k = p.segments[depth] ?? ""; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()].sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : a[0].localeCompare(b[0])));
  };
  const wikiPages = useMemo(() => pages.filter((p) => p.zone === "wiki" && !p.project && p.file !== "_Overview"), [pages]);
  const persons = useMemo(() => pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_")), [pages]);
  const circle = persons.filter((p) => !isAuthor(p));
  const authors = persons.filter(isAuthor);
  const projects = useMemo(() => {
    const m = new Map<string, Page[]>();
    for (const p of pages) if (p.project) m.set(p.project, [...(m.get(p.project) ?? []), p]);
    return [...m.entries()].map(([name, ps]) => ({
      name, pages: ps,
      overview: ps.find((p) => p.file === "_Overview" && p.segments.length === 3),
      updated: ps.map((p) => p.updated ?? "").sort().slice(-1)[0] || undefined,
      quests: (life?.quests ?? []).filter((q) => q.project === name && q.status === "active").length,
    })).sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  }, [pages, life]);
  const tools = pages.filter((p) => p.segments[1] === "tools" && p.file !== "_Overview");
  const profile = pages.find((p) => p.type === "profile");
  const template = pages.find((p) => p.type === "template" && p.segments.length === 1);
  const summary = pages.find((p) => p.file === "_Project Status Summary");
  const reverend = pages.filter((p) => p.segments[1] === "Reverend Insanity");
  const reverendIndex = reverend.find((p) => /Index$/.test(p.file)) ?? reverend.find((p) => p.file === "_Overview");

  if (!meta) return <div className="empty">{t("unknown_theme", { t: theme })}</div>;

  const block = (key: SectionKey) => {
    switch (key) {
      case "state":
        return (
          <section key={key} className="tblock">
            <div className="state-grid">
              <StateCard title="Где стою" items={state.stand} />
              <StateCard title="В движении" items={state.motion}>
                {(quests.length > 0 || habits.length > 0) && (
                  <div className="life-in-motion">
                    {quests.length > 0 && <QuestRows quests={quests} compact />}
                    {habits.length > 0 && (
                      <div className="mini-habits">
                        {habits.map((h) => {
                          const mark = todayDay ? markOf(todayDay, h.title) : undefined;
                          const due = habitDue(h, today);
                          return (
                            <Link key={h.rel} to="/habits" className={`mini-habit ${mark ?? (due ? "due" : "off")}`} title={mark ? `сегодня: ${mark}` : due ? "сегодня ещё не отмечена" : "сегодня не по расписанию"}>
                              <i /> {h.title} <span className="mono faint">{streak(h.title, life!.days, today)}🔥</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </StateCard>
              <StateCard title="На радаре" items={state.radar} />
            </div>
            {state.extra.length > 0 && (
              <div className="extra-grid">
                {state.extra.map((s) => (
                  <details key={s.heading} className="card extra">
                    <summary>{s.heading}</summary>
                    <Markdown source={s.md} compact />
                  </details>
                ))}
              </div>
            )}
            {state.notes && <div className="small muted notes"><Markdown source={state.notes} compact /></div>}
          </section>
        );
      case "habits":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Привычки темы <span className="n">{habits.length}</span> <Link to="/habits" className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>все привычки</Link></h2>
            {habits.length === 0 ? <div className="empty">В этой теме пока нет активных привычек. Их можно создать из практик на любой Resource-странице.</div> : (
              <div className="card">
                <table className="tbl">
                  <thead><tr><th>привычка</th><th>вид</th><th>сегодня</th><th style={{ textAlign: "right" }}>стрик</th></tr></thead>
                  <tbody>
                    {habits.map((h) => {
                      const mark = todayDay ? markOf(todayDay, h.title) : undefined;
                      return (
                        <tr key={h.rel}>
                          <td><Link to="/habits">{h.title}</Link></td>
                          <td className="muted">{h.kind === "bad" ? "плохая" : "хорошая"}</td>
                          <td>{mark === "done" ? "✓" : mark === "failed" ? "✗" : mark === "skipped" ? "—" : habitDue(h, today) ? <span className="faint">не отмечена</span> : <span className="faint">не сегодня</span>}</td>
                          <td className="mono" style={{ textAlign: "right" }}>{streak(h.title, life!.days, today)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      case "finance": {
        const accounts = life?.accounts ?? [];
        const total = accounts.reduce((s, a) => s + a.balance, 0);
        const subs = (life?.subscriptions ?? []).reduce((s, x) => s + x.amount, 0);
        const open = (life?.debts ?? []).filter((d) => !d.closed);
        const ym = monthOfToday(today);
        let spent = 0, earned = 0;
        for (const [date, d] of life?.days ?? []) if (date.startsWith(ym)) for (const tx of d.txs) { if (tx.amount < 0) spent -= tx.amount; else earned += tx.amount; }
        return (
          <section key={key} className="tblock">
            <h2 className="section">Деньги <Link to="/finance" className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>открыть финансы</Link></h2>
            <div className="grid cols-4">
              <Link to="/finance" className="card stat-card"><div className="stat"><b>{fmt(total)}</b><span>на счетах</span></div></Link>
              <Link to="/finance" className="card stat-card"><div className="stat"><b>{fmt(spent)}</b><span>потрачено в этом месяце</span></div></Link>
              <Link to="/finance" className="card stat-card"><div className="stat"><b>{fmt(earned)}</b><span>получено в этом месяце</span></div></Link>
              <Link to="/finance" className="card stat-card"><div className="stat"><b>{fmt(subs)}</b><span>подписки в месяц · долгов {open.length}</span></div></Link>
            </div>
          </section>
        );
      }
      case "resource":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Список чтения <span className="n">{resources.filter((p) => !p.fm.read).length} непрочитанных из {resources.length}</span></h2>
            {groupBySub(resources, 2).map(([sub, ps]) => (
              <div key={sub} className="folder">
                {sub && <h3>{sub} <span className="n">{ps.length}</span></h3>}
                <div className="plist">
                  {ps.map((p) => {
                    const n = extractPractices(p.body).length;
                    return (
                      <Link key={p.rel} to={pageUrl(p)} className={`pitem read-${p.fm.read ? "y" : "n"}`}>
                        <span className="rmark">{p.fm.read ? "✓" : "○"}</span>
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="ptitle">{p.title}</span>
                          <span className="pmeta">{n > 0 ? `${n} практик · ` : ""}{p.words} слов · {relDate(p.updated)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {resources.length === 0 && <div className="empty">Ресурсов пока нет.</div>}
          </section>
        );
      case "wiki":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Своя база знаний <span className="n">{wikiPages.length}</span></h2>
            {groupBySub(wikiPages, 2).map(([sub, ps]) => (
              <div key={sub} className="folder">
                {sub && <h3>{sub} <span className="n">{ps.length}</span></h3>}
                <PageList pages={ps.sort((a, b) => a.title.localeCompare(b.title))} />
              </div>
            ))}
            {wikiPages.length === 0 && <div className="empty">Wiki пока пуст: сюда попадёт то, что ты синтезируешь сам.</div>}
          </section>
        );
      case "people":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Люди <span className="n">{circle.length}</span> <Link to="/people" className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>контактная книга</Link></h2>
            <div className="people-grid">
              {circle.sort((a, b) => a.title.localeCompare(b.title)).map((p) => {
                const c = contactsOf(p);
                const since = daysSinceContact(c.last_contact, today);
                return (
                  <Link key={p.rel} to={pageUrl(p)} className="card person-card">
                    <b>{p.title}</b>
                    <span className="small muted">{typeof p.fm.connection === "string" ? p.fm.connection : ""}</span>
                    <span className="small faint">{since === undefined ? "общение не отмечалось" : since === 0 ? "общались сегодня" : `общались ${since} дн. назад`}</span>
                  </Link>
                );
              })}
            </div>
            {circle.length === 0 && <div className="empty">Людей в этой теме нет.</div>}
          </section>
        );
      case "authors":
        return authors.length ? (
          <section key={key} className="tblock">
            <h2 className="section">Голоса <span className="n">{authors.length}</span></h2>
            <div className="row wrap" style={{ gap: 6 }}>
              {authors.sort((a, b) => a.title.localeCompare(b.title)).map((p) => (
                <Link key={p.rel} to={pageUrl(p)} className="chip" title={typeof p.fm.connection === "string" ? p.fm.connection : ""}>{p.title}</Link>
              ))}
            </div>
          </section>
        ) : null;
      case "projects":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Проекты <span className="n">{projects.length}</span></h2>
            <div className="people-grid">
              {projects.map((pr) => (
                <Link key={pr.name} to={pr.overview ? pageUrl(pr.overview) : `/search?q=${encodeURIComponent(pr.name)}`} className="card person-card">
                  <b>{pr.name}</b>
                  <span className="small muted">{pr.pages.length} страниц{pr.quests ? ` · ${pr.quests} активных квестов` : ""}</span>
                  <span className="small faint">обновлён {relDate(pr.updated)}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      case "profile":
        return profile ? (
          <section key={key} className="tblock">
            <Link to="/profile" className="card profile-card">
              <b>Профиль: {profile.title}</b>
              <span className="small muted">{profile.words} слов · обновлён {relDate(profile.updated)} · открыть хаб профиля →</span>
            </Link>
          </section>
        ) : null;
      case "tools":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Инструменты <span className="n">{tools.length}</span></h2>
            <PageList pages={tools.sort((a, b) => a.title.localeCompare(b.title))} />
          </section>
        );
      case "template":
        return template ? (
          <section key={key} className="tblock small">
            <Link to={pageUrl(template)} className="muted">📋 {template.title}</Link>
          </section>
        ) : null;
      case "summary":
        return summary ? (
          <section key={key} className="tblock">
            <Link to={pageUrl(summary)} className="card profile-card">
              <b>{summary.title}</b>
              <span className="small muted">сводка по всем проектам · обновлена {relDate(summary.updated)}</span>
            </Link>
          </section>
        ) : null;
      case "reverend":
        return reverend.length ? (
          <section key={key} className="tblock">
            <Link to={reverendIndex ? pageUrl(reverendIndex) : "/search?q=Reverend"} className="card profile-card">
              <b>Reverend Insanity</b>
              <span className="small muted">{reverend.length} страниц · своя навигация внутри</span>
            </Link>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ ["--c" as string]: meta.color }}>
      <div className="theme-head">
        <div>
          <div className="eyebrow" style={{ color: meta.color }}>{t("theme")}</div>
          <h1 className="title">{themeLabel(theme)}</h1>
          <div className="lede">{state.intro ? <Markdown source={state.intro} compact /> : themeBlurb(theme, meta.blurb)}</div>
        </div>
        <div className="theme-kpis">
          <Link to="/wheel" className="kpi" title={txp ? `${txp.level.into} / ${txp.level.need} XP до следующего уровня` : ""}><b>ур. {txp?.level.level ?? 1}</b><span>{txp?.last30 ?? 0} XP за 30 дней</span></Link>
          <div className="kpi"><b>{habits.length}</b><span>привычек</span></div>
          <div className="kpi"><b>{quests.length}</b><span>квестов</span></div>
          {overview && <Link to={pageUrl(overview)} className="small muted">обзор как страница · {relDate(overview.updated)}</Link>}
        </div>
      </div>
      {sections.map(block)}
    </div>
  );
}

function StateCard({ title, items, children }: { title: string; items: { heading: string; md: string }[]; children?: ReactNode }) {
  return (
    <div className="card state-card">
      <h3>{title}</h3>
      {items.length === 0 && !children && <div className="small faint">Пусто.</div>}
      {items.map((s) => (
        <div key={s.heading} className="state-part">
          {sectionSuffix(s.heading) && <div className="eyebrow">{sectionSuffix(s.heading)}</div>}
          <Markdown source={s.md} compact />
        </div>
      ))}
      {children}
    </div>
  );
}
