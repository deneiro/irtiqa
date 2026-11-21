import { useMemo, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { THEME_ART } from "../assets/play";
import { BodySection, MedicalSection } from "../components/BodySections";
import CareerSection from "../components/CareerSection";
import { CircleSection, InfluenceSection } from "../components/CircleSections";
import HorizonSection from "../components/HorizonSection";
import LibrarySection from "../components/LibrarySection";
import { HalalSection, NamesSection, QuranSection } from "../components/QuranSections";
import SelfSection from "../components/SelfSection";
import SkillsSection from "../components/SkillsSection";
import SportSection from "../components/SportSection";
import TalksSection from "../components/TalksSection";
import WishesSection from "../components/WishesSection";
import { plural } from "../lib/dates";
import { useT } from "../lib/i18n";
import { LATE_MEAL_HOUR } from "../lib/life";
import { findSection, isSectionKey, splitSections, themeSections } from "../lib/overview";
import { SECTION_LABELS, themePages } from "../lib/themePages";
import { eventTheme } from "../lib/themeDays";
import { THEME_BY_NAME } from "../lib/themes";
import { useTraining } from "../lib/trainingMap";
import { useDayToday } from "../lib/useDayToday";
import { themeUrl } from "../lib/vault";
import { useStore, useVault } from "../store";
import { Block, PageHead } from "./main/Scene";
import { FamilyTree } from "./theme/Family";
import { RingsBoard } from "./theme/Rings";
import { EventsScreen, HeadingScreen, NutritionScreen, PagesScreen, PeopleScreen, ProjectsScreen, ReadingScreen, SummaryScreen, WikiScreen, headingCount, nutritionCount } from "./theme/screens";
import { TrainingAtlas } from "./Training";
import "./theme/Theme.css";

type HeadNumber = { value: ReactNode; unit?: string; label: string; sub?: ReactNode };

/**
 * A theme's full screen, `/theme/:name/:key` (spec v4): one section of the theme, whole and with its own input.
 * Since 2026-11-21 every full screen opens with the theme's painting — the way back, the section's name and one
 * number — and the screens drawn in `theme/screens.tsx` are blocks in the look of «Сегодня». The sections that are
 * components of their own (`components/*Section.tsx`, the rings, the family tree) still draw themselves the old way,
 * in the palette of `.g-page`. The habit strip did not move here: habit marks come from the bot and «Сегодня».
 */
export default function ThemePartPage() {
  const { name = "", key = "" } = useParams();
  const theme = decodeURIComponent(name);
  const part = decodeURIComponent(key);
  const meta = THEME_BY_NAME.get(theme);
  const v = useVault();
  const { root, life } = useStore();
  const { t, themeLabel, relDate } = useT();
  const today = useDayToday();
  const overview = useMemo(() => v.pages.find((p) => p.theme === theme && p.file === "_Overview" && p.segments.length === 1), [v, theme]);
  const sections = useMemo(() => themeSections(overview), [overview]);
  const pages = useMemo(() => themePages(v, life, theme, today), [v, life, theme, today]);
  const nutritionPlan = useTraining(root).data?.NUTRITION;
  const events = useMemo(() => (life?.events ?? []).filter((e) => eventTheme(e) === theme), [life, theme]);
  // a `sections:` string that is not a key names one of the overview's `##` sections: its full screen is cards
  const heading = useMemo(() => {
    if (isSectionKey(part) || !overview || !sections.some((x) => x.toLowerCase() === part.toLowerCase())) return undefined;
    return findSection(splitSections(overview.body).sections, part);
  }, [overview, sections, part]);

  if (!meta) return <div className="empty">{t("unknown_theme", { t: theme })}</div>;
  if (part === "finance") return <Navigate to="/finance" replace />;

  const one = (title: string, children: ReactNode) => <div className="g-play"><Block title={title}>{children}</Block></div>;

  /** The screen and the number its header carries. */
  const screen = (): [ReactNode, HeadNumber?] => {
    switch (part) {
      case "events": return [<EventsScreen theme={theme} events={events} root={root} />, { value: events.length, label: plural(events.length, "событие", "события", "событий"), sub: events.length ? `последнее — ${[...events].sort((a, b) => b.date.localeCompare(a.date))[0].date}` : undefined }];
      case "nutrition": {
        const c = nutritionCount(life, today);
        return [<NutritionScreen life={life} today={today} plan={nutritionPlan} />, { value: c.days ? c.late : "—", label: `раз после ${LATE_MEAL_HOUR}:00`, sub: `за 14 дней · записей ${c.total}` }];
      }
      case "resource": {
        const unread = pages.resources.filter((p) => !p.fm.read).length;
        return [<ReadingScreen resources={pages.resources} relDate={relDate} />, { value: unread, label: "не прочитано", sub: `из ${pages.resources.length}` }];
      }
      case "wiki": return [<WikiScreen pages={pages.wikiAll} />, { value: pages.wikiPages.length, label: plural(pages.wikiPages.length, "страница", "страницы", "страниц"), sub: "то, что ты собрал сам" }];
      case "people": return [<PeopleScreen people={pages.people} events={life?.events ?? []} today={today} />, { value: pages.people.length, label: plural(pages.people.length, "человек", "человека", "человек") }];
      case "projects": return [<ProjectsScreen title="Проекты" cards={pages.projects} />, { value: pages.projects.length, label: plural(pages.projects.length, "проект", "проекта", "проектов") }];
      case "summary": return [<SummaryScreen page={pages.summary} projects={pages.projects} />, pages.summary?.updated ? { value: pages.projects.length, label: plural(pages.projects.length, "проект", "проекта", "проектов"), sub: `сводка обновлена ${pages.summary.updated}` } : undefined];
      case "tools": return [<PagesScreen title="Инструменты" pages={[...pages.tools].sort((a, b) => a.title.localeCompare(b.title))} relDate={relDate} empty="Страниц об инструментах нет." />, { value: pages.tools.length, label: plural(pages.tools.length, "страница", "страницы", "страниц") }];
      case "profile": return [pages.profile
        ? <div className="g-play"><Block title="Профиль" right={<Link className="g-more" to="/profile">хаб профиля →</Link>}><div className="g-prows"><Link to="/profile"><b>{pages.profile.title}</b><small>{pages.profile.words} слов · обновлён {relDate(pages.profile.updated)}</small></Link></div></Block></div>
        : one("Профиль", <p className="g-faint">Страницы профиля нет.</p>)];
      case "template": return [<PagesScreen title="Опросник" pages={pages.template ? [pages.template] : []} relDate={relDate} empty="Шаблона опросника нет." />];
      case "training": return [<TrainingAtlas root={root} />];
      case "focus": return [one("Колесо фокуса", <p className="g-faint">У колеса фокуса нет полного экрана — оно целиком на странице темы.</p>)];
      // the sections below are components of their own and still draw themselves
      case "skills": return [<SkillsSection />];
      case "quran": return [<QuranSection />];
      case "names": return [<NamesSection />];
      case "halal": return [<HalalSection />];
      case "body": return [<BodySection />];
      case "medical": return [<MedicalSection />];
      case "circle": return [<CircleSection theme={theme} />];
      case "influence": return [<InfluenceSection theme={theme} />];
      case "self": return [<SelfSection />];
      case "horizon": return [<HorizonSection />];
      case "talks": return [<TalksSection theme={theme} />];
      case "career": return [<CareerSection />];
      case "wishes": return [<WishesSection />];
      case "library": return [<LibrarySection />];
      case "sport": return [<SportSection />];
      case "rings": return [<RingsBoard />];
      case "relatives": return [<FamilyTree />];
      default: {
        if (!heading) return [one(part, <p className="g-faint">В теме нет раздела «{part}».</p>)];
        const n = headingCount(heading.md);
        return [<HeadingScreen title={heading.heading} md={heading.md} />, n ? { value: n, label: plural(n, "пункт", "пункта", "пунктов"), sub: "из обзора темы" } : undefined];
      }
    }
  };

  const [body, number] = screen();
  const title = isSectionKey(part) ? SECTION_LABELS[part] : heading?.heading ?? part;
  return (
    <div className="g-page g-full" style={{ ["--c" as string]: meta.color, ["--th" as string]: meta.color }}>
      <PageHead art={THEME_ART[theme]} kicker={<Link to={themeUrl(theme)}>← {themeLabel(theme)}</Link>} title={title} number={number} />
      {body}
    </div>
  );
}
