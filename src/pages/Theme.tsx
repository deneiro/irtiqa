import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEME_BY_NAME } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { PageList } from "../components/Bits";
import QuestRows from "../components/QuestRows";
import { useT } from "../lib/i18n";
import Markdown from "../components/Markdown";
import type { Page } from "../lib/types";
import { addDays, plural, monthOfToday } from "../lib/dates";
import { LATE_MEAL_HOUR, debtLeft, habitDue, isLateMeal, liveBalance, markOf, streak, withMark, type DayMark } from "../lib/life";
import { extractPractices } from "../lib/practices";
import { contactsOf, daysSinceContact, isAuthor } from "../lib/people";
import { sectionSuffix, themeSections, themeState, type SectionKey } from "../lib/overview";
import EventForm from "../components/EventForm";
import SportSection from "../components/SportSection";
import SkillsSection from "../components/SkillsSection";
import { HalalSection, NamesSection, QuranSection } from "../components/QuranSections";
import { BodySection, MedicalSection } from "../components/BodySections";
import { CircleSection, InfluenceSection } from "../components/CircleSections";
import SelfSection from "../components/SelfSection";
import HorizonSection from "../components/HorizonSection";
import TalksSection from "../components/TalksSection";
import CareerSection from "../components/CareerSection";
import WishesSection from "../components/WishesSection";
import LibrarySection from "../components/LibrarySection";
import { NAMES_PAGE, suras } from "../lib/quran";
import { eventUrl, personName } from "../lib/events";
import { mediaUrl } from "../lib/native";
import { themeXps } from "../lib/levels";
import { useDayToday } from "../lib/useDayToday";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const NEXT_MARK: Record<string, DayMark | undefined> = { none: "done", done: "failed", failed: "skipped", skipped: undefined };
const MARK_WORD: Record<string, string> = { done: "сделано", failed: "сорвано", skipped: "пропуск", due: "сегодня", off: "не сегодня" };

export default function ThemePage() {
  const { name = "" } = useParams();
  const theme = decodeURIComponent(name);
  const meta = THEME_BY_NAME.get(theme);
  const v = useVault();
  const { root, life, updateToday, reload } = useStore();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const { t, themeLabel, themeBlurb, relDate } = useT();
  const today = useDayToday();

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
  // Pages a dedicated section already shows (suras, the 99 names, halal) are not repeated in the Wiki list.
  const promoted = useMemo(() => {
    const rels = new Set<string>();
    if (sections.includes("quran")) for (const s of suras(v)) rels.add(s.page.rel);
    for (const p of pages) {
      if (sections.includes("names") && p.file === NAMES_PAGE) rels.add(p.rel);
      if (sections.includes("halal") && p.file === "Халяль и харам") rels.add(p.rel);
    }
    return rels;
  }, [sections, v, pages]);
  const wikiPages = useMemo(
    () => pages.filter((p) => p.zone === "wiki" && !p.project && p.file !== "_Overview" && !promoted.has(p.rel)),
    [pages, promoted],
  );
  const persons = useMemo(() => pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_")), [pages]);
  const circle = persons.filter((p) => !isAuthor(p));
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

  const locked = !!todayDay?.closed;
  /** Mark a habit for today without leaving the theme. Same cycle as the Day screen. */
  const cycle = async (title: string, cur: DayMark | undefined) => {
    if (locked || marking) return;
    setMarking(title);
    try {
      await updateToday((d) => (d.closed ? d : withMark(d, title, NEXT_MARK[cur ?? "none"])));
      await reload();
    } finally { setMarking(null); }
  };

  if (!meta) return <div className="empty">{t("unknown_theme", { t: theme })}</div>;

  const block = (key: SectionKey) => {
    switch (key) {
      case "state":
        return (
          <section key={key} className="tblock">
            {(quests.length > 0 || habits.length > 0) && (
              <div className="now">
                <div className="nowhead">Сейчас <Link to="/habits" className="small muted">привычки</Link> <Link to="/quests" className="small muted">квесты</Link></div>
                {quests.length > 0 && <QuestRows quests={quests} />}
                {habits.length > 0 && (
                  <>
                    <div className="habit-strip">
                      {habits.map((h) => {
                        const mark = todayDay ? markOf(todayDay, h.title) : undefined;
                        const due = habitDue(h, today);
                        const st = mark ?? (due ? "due" : "off");
                        return (
                          <button
                            key={h.rel}
                            className={`hchip ${st}`}
                            disabled={locked || marking === h.title}
                            title={locked ? "день закрыт — открой его на экране дня" : "сделано → сорвано → пропуск → снять"}
                            onClick={() => void cycle(h.title, mark)}
                          >
                            <i />
                            <span className="hname">{h.title}</span>
                            <span className="hsub">{MARK_WORD[mark ?? (due ? "due" : "off")]}</span>
                            <span className="mono faint">{streak(h, life!.days, today)}🔥</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="small faint" style={{ marginTop: 6 }}>
                      {locked
                        ? "День закрыт — отметки правятся на экране дня."
                        : "Нажми на привычку, чтобы отметить: сделано → сорвано → пропуск → снять."}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="state-stack">
              <StateBlock title="Где стою" items={state.stand} open />
              <StateBlock title="В движении" items={state.motion} open />
              <StateBlock title="На радаре" items={state.radar} />
              {state.extra.map((x) => <StateBlock key={x.heading} title={x.heading} items={[{ heading: x.heading, md: x.md }]} />)}
            </div>
            {state.notes && <div className="small muted notes"><Markdown source={state.notes} compact /></div>}
          </section>
        );
      case "events": {
        const events = (life?.events ?? []).filter((e) => (e.theme ?? "Memories & Fun") === theme);
        return (
          <section key={key} className="tblock">
            <h2 className="section">События <span className="n">{events.length}</span></h2>
            {adding ? <EventForm theme={theme} onDone={(r) => { setAdding(false); nav(`/event/${encodeURIComponent(r)}`); }} />
              : <button className="btn primary" onClick={() => setAdding(true)}>+ записать событие</button>}
            <div className="evgrid">
              {events.map((e) => (
                <Link key={e.rel} to={eventUrl(e)} className="card evcard">
                  {e.photos[0] ? <img className="evcover" src={mediaUrl(root, e.photos[0])} alt="" loading="lazy" /> : <div className="evcover none">нет фото</div>}
                  <div className="evbody">
                    <b>{e.title}</b>
                    <span className="small muted">{e.date}{e.place ? ` · ${e.place}` : ""}</span>
                    {e.people.length > 0 && <span className="small faint">{e.people.map(personName).join(", ")}</span>}
                    {e.photos.length > 1 && <span className="small faint">{e.photos.length} фото</span>}
                  </div>
                </Link>
              ))}
            </div>
            {events.length === 0 && !adding && <div className="empty">Событий пока нет. Запиши первое: дата, название, кто был, фотографии.</div>}
          </section>
        );
      }
      case "year": {
        // The catch-all theme keeps the whole record, not just its own events:
        // a meeting logged in the circle is part of the year too.
        const all = [...(life?.events ?? [])].sort((a, b) => b.date.localeCompare(a.date));
        const byMonth = new Map<string, typeof all>();
        for (const e of all) {
          const m = e.date.slice(0, 7);
          byMonth.set(m, [...(byMonth.get(m) ?? []), e]);
        }
        const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
        const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1] ?? m} ${m.slice(0, 4)}`;
        return (
          <section key={key} className="tblock">
            <h2 className="section">Год в событиях <span className="n">{all.length}</span></h2>
            {adding ? <EventForm theme={theme} onDone={(r) => { setAdding(false); nav(`/event/${encodeURIComponent(r)}`); }} />
              : <button className="btn primary" onClick={() => setAdding(true)}>+ записать событие</button>}
            {[...byMonth.entries()].map(([m, list]) => (
              <div key={m} className="ymonth">
                <div className="mrow-head">{monthName(m)} <span className="faint">· {list.length}</span></div>
                <div className="evgrid">
                  {list.map((e) => (
                    <Link key={e.rel} to={eventUrl(e)} className="card evcard">
                      {e.photos[0] ? <img className="evcover" src={mediaUrl(root, e.photos[0])} alt="" loading="lazy" /> : <div className="evcover none">нет фото</div>}
                      <div className="evbody">
                        <b>{e.title}</b>
                        <span className="small muted">{e.date}{e.place ? ` · ${e.place}` : ""}</span>
                        {e.people.length > 0 && <span className="small faint">{e.people.map(personName).join(", ")}</span>}
                        {e.photos.length > 1 && <span className="small faint">{e.photos.length} фото</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {all.length === 0 && !adding && <div className="empty">Событий пока нет. Запиши первое: дата, название, кто был, фотографии.</div>}
          </section>
        );
      }
      case "skills":
        return <SkillsSection key={key} />;
      case "quran":
        return <QuranSection key={key} />;
      case "names":
        return <NamesSection key={key} />;
      case "halal":
        return <HalalSection key={key} />;
      case "body":
        return <BodySection key={key} />;
      case "medical":
        return <MedicalSection key={key} />;
      case "circle":
        return <CircleSection key={key} theme={theme} />;
      case "influence":
        return <InfluenceSection key={key} theme={theme} />;
      case "self":
        return <SelfSection key={key} />;
      case "horizon":
        return <HorizonSection key={key} />;
      case "talks":
        return <TalksSection key={key} theme={theme} />;
      case "career":
        return <CareerSection key={key} />;
      case "wishes":
        return <WishesSection key={key} />;
      case "library":
        return <LibrarySection key={key} />;
      case "sport":
        return <SportSection key={key} />;
      case "nutrition": {
        const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
        const rows = days.map((date) => ({ date, meals: life?.days.get(date)?.meals ?? [] })).reverse();
        const total = rows.reduce((n, r) => n + r.meals.length, 0);
        const late = rows.reduce((n, r) => n + r.meals.filter(isLateMeal).length, 0);
        let clean = 0;
        for (const d of [...days].reverse()) {
          const meals = life?.days.get(d)?.meals ?? [];
          if (meals.some(isLateMeal)) break;
          if (meals.length) clean++;
          else if (d !== today) break;
        }
        return (
          <section key={key} className="tblock">
            <h2 className="section">Питание <span className="n">{total} {plural(total, "запись", "записи", "записей")} за 14 дней</span> <Link to="/" className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>записать сегодняшнюю еду</Link></h2>
            <p className="small muted" style={{ marginTop: -4 }}>
              {late > 0 ? <span className="hl">{late} раз ел после {LATE_MEAL_HOUR}:00.</span> : `Поздней еды за две недели нет.`}
              {clean > 0 && ` Дней подряд без поздней еды: ${clean}.`}
              {" "}Правило из обзора темы: после {LATE_MEAL_HOUR}:00 не есть, это медицинская граница по поджелудочной.
            </p>
            <div className="card" style={{ marginTop: 12 }}>
              {rows.every((r) => r.meals.length === 0) ? (
                <div className="empty">Записей о еде пока нет. Добавляй их на экране «День», карточка «Еда».</div>
              ) : (
                rows.filter((r) => r.meals.length > 0).map((r) => (
                  <div className="foodday" key={r.date}>
                    <div className="fdate">{r.date === today ? "сегодня" : r.date.slice(5)}</div>
                    <div className="fmeals">
                      {r.meals.map((m, i) => (
                        <span key={i} className={`fmeal ${isLateMeal(m) ? "late" : ""}`} title={m.note}>
                          <span className="mono">{m.time}</span> {m.what}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      }
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
                          <td className="mono" style={{ textAlign: "right" }}>{streak(h, life!.days, today)}</td>
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
        const total = accounts.reduce((s, a) => s + liveBalance(a, life?.days ?? new Map()), 0);
        const subs = (life?.subscriptions ?? []).reduce((s, x) => s + x.amount, 0);
        const open = (life?.debts ?? []).filter((d) => !d.closed && debtLeft(d) > 0);
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
              <Folder key={sub} name={sub} count={ps.length} unread={ps.filter((p) => !p.fm.read).length}>
                <div className="plist">
                  {ps.map((p) => {
                    const n = extractPractices(p.body).length;
                    return (
                      <Link key={p.rel} to={pageUrl(p)} className={`pitem read-${p.fm.read ? "y" : "n"}`}>
                        <span className="rmark">{p.fm.read ? "✓" : "○"}</span>
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="ptitle">{p.title}</span>
                          <span className="pmeta">{n > 0 ? `${n} ${plural(n, "практика", "практики", "практик")} · ` : ""}{p.words} слов · {relDate(p.updated)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Folder>
            ))}
            {resources.length === 0 && <div className="empty">Ресурсов пока нет.</div>}
          </section>
        );
      case "wiki":
        return (
          <section key={key} className="tblock">
            <h2 className="section">Своя база знаний <span className="n">{wikiPages.length}</span></h2>
            {groupBySub(wikiPages, 2).map(([sub, ps]) => (
              <Folder key={sub} name={sub} count={ps.length}>
                <PageList pages={ps.sort((a, b) => a.title.localeCompare(b.title))} />
              </Folder>
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

/** A named subfolder folds away; the theme's own root pages stay in view. */
function Folder({ name, count, unread, children }: { name: string; count: number; unread?: number; children: ReactNode }) {
  if (!name) return <div className="folder">{children}</div>;
  return (
    <details className="folder foldable">
      <summary>
        <span className="fname">{name}</span>
        <span className="n">{count}</span>
        {unread !== undefined && unread > 0 && unread < count && <span className="n unread">{unread} непрочитано</span>}
      </summary>
      {children}
    </details>
  );
}

/**
 * One part of the overview, full width and foldable. Three narrow columns of
 * long Russian bullets were unreadable; a stack the width of the page is not.
 */
function StateBlock({ title, items, open }: { title: string; items: { heading: string; md: string }[]; open?: boolean }) {
  if (items.length === 0) return null;
  const n = items.reduce((a, s) => a + (s.md.match(/^\s*[-*] /gm)?.length ?? 0), 0);
  return (
    <details className="card state-block" open={open}>
      <summary>
        <span className="stitle">{title}</span>
        {n > 0 && <span className="n">{n}</span>}
      </summary>
      {items.map((s) => (
        <div key={s.heading} className="state-part">
          {sectionSuffix(s.heading) && <div className="eyebrow">{sectionSuffix(s.heading)}</div>}
          <Markdown source={s.md} compact />
        </div>
      ))}
    </details>
  );
}
