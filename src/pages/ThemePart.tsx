import { useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEME_BY_NAME } from "../lib/themes";
import { pageUrl, themeUrl } from "../lib/vault";
import { PageList } from "../components/Bits";
import { useT } from "../lib/i18n";
import type { Page } from "../lib/types";
import { addDays, plural } from "../lib/dates";
import { LATE_MEAL_HOUR, isLateMeal } from "../lib/life";
import { extractPractices } from "../lib/practices";
import { contactsOf, daysSinceContact } from "../lib/people";
import { isSectionKey, themeSections } from "../lib/overview";
import { SECTION_LABELS, themePages } from "../lib/themePages";
import { eventTheme } from "../lib/themeDays";
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
import { eventUrl, personName } from "../lib/events";
import { mediaUrl } from "../lib/native";
import { useDayToday } from "../lib/useDayToday";
import "./theme/Theme.css";

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

const groupBySub = (list: Page[], depth: number) => {
  const m = new Map<string, Page[]>();
  for (const p of list) { const k = p.segments[depth] ?? ""; m.set(k, [...(m.get(k) ?? []), p]); }
  return [...m.entries()].sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : a[0].localeCompare(b[0])));
};

/**
 * A theme's full screen, `/theme/:name/:key` (spec v4): what the v3 theme page showed under that key, whole and
 * with its own input — the reading list, the base, the people, the suras, the events, the food of 14 days…
 * The habit strip did not move here: habit marks come from the bot only.
 */
export default function ThemePartPage() {
  const { name = "", key = "" } = useParams();
  const theme = decodeURIComponent(name);
  const part = decodeURIComponent(key);
  const meta = THEME_BY_NAME.get(theme);
  const v = useVault();
  const { root, life } = useStore();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const { t, themeLabel, relDate } = useT();
  const today = useDayToday();
  const overview = useMemo(() => v.pages.find((p) => p.theme === theme && p.file === "_Overview" && p.segments.length === 1), [v, theme]);
  const sections = useMemo(() => themeSections(overview), [overview]);
  const pages = useMemo(() => themePages(v, life, theme, sections), [v, life, theme, sections]);

  if (!meta) return <div className="empty">{t("unknown_theme", { t: theme })}</div>;
  if (part === "finance") return <Navigate to="/finance" replace />;

  const body = (): ReactNode => {
    switch (part) {
      case "skills": return <SkillsSection />;
      case "quran": return <QuranSection />;
      case "names": return <NamesSection />;
      case "halal": return <HalalSection />;
      case "body": return <BodySection />;
      case "medical": return <MedicalSection />;
      case "circle": return <CircleSection theme={theme} />;
      case "influence": return <InfluenceSection theme={theme} />;
      case "self": return <SelfSection />;
      case "horizon": return <HorizonSection />;
      case "talks": return <TalksSection theme={theme} />;
      case "career": return <CareerSection />;
      case "wishes": return <WishesSection />;
      case "library": return <LibrarySection />;
      case "sport": return <SportSection />;
      case "events": {
        const events = (life?.events ?? []).filter((e) => eventTheme(e) === theme);
        return (
          <section className="tblock">
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
          <section className="tblock">
            <h2 className="section">Питание <span className="n">{total} {plural(total, "запись", "записи", "записей")} за 14 дней</span></h2>
            <p className="small muted" style={{ marginTop: -4 }}>
              {late > 0 ? <span className="hl">{late} раз ел после {LATE_MEAL_HOUR}:00.</span> : "Поздней еды за две недели нет."}
              {clean > 0 && ` Дней подряд без поздней еды: ${clean}.`}
            </p>
            <div className="card" style={{ marginTop: 12 }}>
              {rows.every((r) => r.meals.length === 0) ? (
                <div className="empty">Записей о еде пока нет: их пишет вечерний опрос бота.</div>
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
      case "resource":
        return (
          <section className="tblock">
            <h2 className="section">Список чтения <span className="n">{pages.resources.filter((p) => !p.fm.read).length} непрочитанных из {pages.resources.length}</span></h2>
            {groupBySub(pages.resources, 2).map(([sub, ps]) => (
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
            {pages.resources.length === 0 && <div className="empty">Ресурсов пока нет.</div>}
          </section>
        );
      case "wiki":
        return (
          <section className="tblock">
            <h2 className="section">Своя база знаний <span className="n">{pages.wikiPages.length}</span></h2>
            {groupBySub(pages.wikiPages, 2).map(([sub, ps]) => (
              <Folder key={sub} name={sub} count={ps.length}>
                <PageList pages={[...ps].sort((a, b) => a.title.localeCompare(b.title))} />
              </Folder>
            ))}
            {pages.wikiPages.length === 0 && <div className="empty">Wiki пока пуст: сюда попадёт то, что ты синтезируешь сам.</div>}
          </section>
        );
      case "people":
        return (
          <section className="tblock">
            <h2 className="section">Люди <span className="n">{pages.people.length}</span> <Link to="/people" className="small muted">контактная книга</Link></h2>
            <div className="people-grid">
              {[...pages.people].sort((a, b) => a.title.localeCompare(b.title)).map((p) => {
                const since = daysSinceContact(contactsOf(p).last_contact, today);
                return (
                  <Link key={p.rel} to={pageUrl(p)} className="card person-card">
                    <b>{p.title}</b>
                    <span className="small muted">{typeof p.fm.connection === "string" ? p.fm.connection : ""}</span>
                    <span className="small faint">{since === undefined ? "общение не отмечалось" : since === 0 ? "общались сегодня" : `общались ${since} дн. назад`}</span>
                  </Link>
                );
              })}
            </div>
            {pages.people.length === 0 && <div className="empty">Людей в этой теме нет.</div>}
          </section>
        );
      case "projects":
        return (
          <section className="tblock">
            <h2 className="section">Проекты <span className="n">{pages.projects.length}</span></h2>
            <div className="people-grid">
              {pages.projects.map((pr) => (
                <Link key={pr.name} to={pr.overview ? pageUrl(pr.overview) : `/search?q=${encodeURIComponent(pr.name)}`} className="card person-card">
                  <b>{pr.name}</b>
                  <span className="small muted">{pr.pages.length} страниц{pr.quests ? ` · ${pr.quests} активных деятельностей` : ""}</span>
                  <span className="small faint">обновлён {relDate(pr.updated)}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      case "profile":
        return pages.profile ? (
          <section className="tblock">
            <Link to="/profile" className="card profile-card">
              <b>Профиль: {pages.profile.title}</b>
              <span className="small muted">{pages.profile.words} слов · обновлён {relDate(pages.profile.updated)} · открыть хаб профиля →</span>
            </Link>
          </section>
        ) : null;
      case "tools":
        return (
          <section className="tblock">
            <h2 className="section">Инструменты <span className="n">{pages.tools.length}</span></h2>
            <PageList pages={[...pages.tools].sort((a, b) => a.title.localeCompare(b.title))} />
          </section>
        );
      case "template":
        return pages.template ? <section className="tblock small"><Link to={pageUrl(pages.template)} className="muted">📋 {pages.template.title}</Link></section> : null;
      case "summary":
        return pages.summary ? (
          <section className="tblock">
            <Link to={pageUrl(pages.summary)} className="card profile-card">
              <b>{pages.summary.title}</b>
              <span className="small muted">сводка по всем проектам · обновлена {relDate(pages.summary.updated)}</span>
            </Link>
          </section>
        ) : null;
      case "focus":
        return <div className="empty">У колеса фокуса нет полного экрана — оно целиком на странице темы.</div>;
      default:
        return <div className="empty">В теме нет раздела «{part}».</div>;
    }
  };

  return (
    <div style={{ ["--c" as string]: meta.color }}>
      <Link className="t-back" to={themeUrl(theme)}>← {themeLabel(theme)}{isSectionKey(part) ? ` · ${SECTION_LABELS[part]}` : ""}</Link>
      {body()}
    </div>
  );
}
