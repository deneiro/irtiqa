import { useMemo, useState } from "react";
import { buildFamily } from "../lib/family";
import { closenessOf, isListed } from "../lib/people";
import AddPersonSheet from "./person/AddPersonSheet";
import { Link, useParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEME_BY_NAME } from "../lib/themes";
import { pageUrl } from "../lib/vault";
import { useT } from "../lib/i18n";
import { useDayToday } from "../lib/useDayToday";
import { addDays } from "../lib/dates";
import { isSectionKey, themeSections, themeView, type SectionKey } from "../lib/overview";
import { numberTile, shortDate } from "../lib/themeNumbers";
import { boardCards } from "../lib/themeBoard";
import { SECTION_LABELS, halalGroups, themePages, type ThemePages } from "../lib/themePages";
import { staleMentions } from "../lib/stale";
import { influenceGroups, ownInfluencePage } from "../lib/influence";
import { measures } from "../lib/health";
import { parseJobs } from "../lib/jobs";
import { parseLibrary } from "../lib/library";
import { parseNames, suras } from "../lib/quran";
import { rawPageText } from "../lib/rawpage";
import type { Life } from "../lib/life";
import type { Vault } from "../lib/types";
import { Inline, NumberGroups, PagesRow, Radar, StaleLine, glowOf, partUrl, type PageButton } from "./theme/parts";
import { HEADING, ORGANS } from "./theme/organs";
import Board from "./theme/Board";
import { dayTaskLines } from "./main/Levels";
import { themeColumns } from "../lib/picks";
import { loadBank } from "../lib/bank";
import { THEME_ART } from "../assets/play";
import { WeekBars } from "../components/GameBits";
import { HabitTile, useDayEdit } from "./main/Play";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { habitRows } from "../lib/dashboard";
import { habitDue, markOf, streak, withMark, type DayMark } from "../lib/life";
import type { ColumnPart } from "../lib/overview";
import { useGame } from "../lib/useGame";
import "./theme/Theme.css";

/** A key without an organ as a button: its name, one number, and where it leads. */
function pageButton(key: SectionKey, theme: string, p: ThemePages, life: Life, vault: Vault, today: string): PageButton {
  const label = SECTION_LABELS[key];
  const b: PageButton = { key, label, to: partUrl(theme, key) };
  switch (key) {
    case "quran": { const s = suras(vault); return { ...b, value: String(s.filter((x) => x.state === "done").length), of: "/ 114" }; }
    case "names": {
      const raw = p.names ? rawPageText(vault, p.names.rel) : null;
      const names = raw ? parseNames(raw) : [];
      return names.length ? { ...b, value: String(names.filter((n) => n.state === "done").length), of: `/ ${names.length}` } : b;
    }
    case "halal": {
      const gs = p.halal ? halalGroups(p.halal.body) : [];
      const n = gs.reduce((a, g) => a + g.cards.length, 0);
      return n ? { ...b, value: String(n), sub: gs.map((g) => `${g.heading.toLowerCase()} ${g.cards.length}`).join(" · ") } : b;
    }
    case "resource": {
      const unread = p.resources.filter((r) => !r.fm.read).length;
      return { ...b, value: String(p.resources.length), sub: unread && unread < p.resources.length ? `не прочитано ${unread}` : undefined };
    }
    case "wiki": return { ...b, value: String(p.wikiPages.length) };
    case "people": return { ...b, value: String(p.people.length) };
    case "projects": return { ...b, value: String(p.projects.length) };
    case "tools": return { ...b, value: String(p.tools.length) };
    case "profile": return { ...b, sub: p.profile?.updated ? `обновлён ${shortDate(p.profile.updated)}` : undefined, to: "/profile" };
    case "summary": return { ...b, sub: p.summary?.updated ? `обновлена ${shortDate(p.summary.updated)}` : undefined };
    case "template": return { ...b, sub: "шаблон страницы человека", to: p.template ? pageUrl(p.template) : b.to };
    case "body": return { ...b, value: String(measures(life.days).length), sub: "замеров" };
    case "self": {
      const n = Array.from({ length: 60 }, (_, i) => life.days.get(addDays(today, -i))).filter((d) => d?.mood !== undefined).length;
      return { ...b, value: String(n), sub: "оценок за 60 дней" };
    }
    case "influence": {
      const people = vault.pages.filter((x) => x.zone === "person" && x.type !== "template" && !x.file.startsWith("_"));
      const g = influenceGroups(people, life.habits, undefined, theme === "Personal growth" ? ownInfluencePage(vault.pages) : undefined);
      return { ...b, value: String(g.up.length + g.down.length), sub: `↑ ${g.up.length} · ↓ ${g.down.length}` };
    }
    case "career": return { ...b, value: String(parseJobs(life.jobs ?? "", today).length), sub: "работ" };
    case "library": return { ...b, value: String(parseLibrary(life.library ?? "").length) };
    case "finance": return { ...b, to: "/finance" };
    case "rings": {
      const ps = vault.pages.filter(isListed);
      const rated = ps.filter((x) => closenessOf(x) !== undefined).length;
      return { ...b, value: String(rated), of: `/ ${ps.length}`, sub: "на кругах" };
    }
    case "relatives": { const f = buildFamily(vault.pages); return { ...b, value: String(f.rows.reduce((n, r) => n + r.length, 0) - 1), sub: f.loose.length ? `без места ${f.loose.length}` : "в дереве" }; }
    default: return b;
  }
}

/**
 * A theme page (spec v4, 2026-11-06): the numbers on top, three columns «Где был · Где стою · Куда иду», the
 * activities, the organs in the order of `sections:`, «На радаре», and the pages behind buttons. Read only:
 * nothing is entered here — the bot, Claude and the full screens (`/theme/:name/:key`) are the input.
 */
export default function ThemePage() {
  const { name = "" } = useParams();
  const theme = decodeURIComponent(name);
  const meta = THEME_BY_NAME.get(theme);
  const vault = useVault();
  const { root, life } = useStore();
  const { t, themeLabel } = useT();
  const today = useDayToday();
  const game = useGame();
  const [adding, setAdding] = useState(false);

  const overview = useMemo(() => vault.pages.find((p) => p.theme === theme && p.file === "_Overview" && p.segments.length === 1), [vault, theme]);
  const view = useMemo(() => themeView(overview), [overview]);
  const sections = useMemo(() => themeSections(overview), [overview]);
  const pages = useMemo(() => themePages(vault, life, theme, today), [vault, life, theme, today]);
  const tiles = useMemo(() => (life ? view.numbers.map((g) => g.lines.map((l) => numberTile(l, { life, vault, theme, today }))) : []), [life, vault, theme, today, view]);
  const cards = useMemo(() => (life ? boardCards(life, theme, today) : []), [life, theme, today]);
  // The three columns come from the task bank only (2026-11-08): IV done · IV of this week · III of this month.
  const bank = useMemo(() => (life ? loadBank(life.goals, dayTaskLines(life)) : []), [life]);
  const cols = useMemo(() => (life ? themeColumns(life, bank, theme, today) : { past: [], stand: [], next: [] }), [life, bank, theme, today]);
  // Lines of the overview (not its «Changes») that still talk about activities already closed.
  const stale = useMemo(() => {
    if (!life) return [];
    const md = view.sections.filter((s) => !/^Changes$/i.test(s.heading)).map((s) => s.md).join("\n");
    return staleMentions(md, life.quests, life.days.values());
  }, [life, view]);

  if (!meta) return <div className="empty">{t("unknown_theme", { t: theme })}</div>;
  const style = { ["--th" as string]: meta.color, ["--glow" as string]: glowOf(meta.color) };
  if (!life) return <div className="t-page" style={style}><p className="t-faint">Загружаю vault…</p></div>;

  const props = { theme, life, vault, today, root, overview, view };
  const xp = game?.themes.find((x) => x.theme === theme);
  const buttons = sections.filter((s): s is SectionKey => isSectionKey(s) && !ORGANS[s]).map((k) => pageButton(k, theme, pages, life, vault, today));
  return (
    <div className="t-page" style={style}>
      <div className="g-play g-theme">
        <div className="g-top">
          <SceneFrame art={THEME_ART[theme]}>
            <SceneTitle kicker="тема" title={themeLabel(theme)} />
            {theme === "Social & friends" && <button type="button" className="g-btn sun g-scene-add" onClick={() => setAdding(true)}>+ Добавить человека</button>}
            {xp && (
              <div className="g-xp8">
                <WeekBars weeks={xp.weeks} />
                <span>XP за 8 недель · за 30 дней <b>{xp.last30}</b>{xp.prev30 > 0 && ` · до того ${xp.prev30}`}</span>
                {overview && <Link to={pageUrl(overview)}>обзор целиком{overview.updated ? ` · ${shortDate(overview.updated)}` : ""} →</Link>}
              </div>
            )}
            {xp && <SceneNumber value={xp.level.level} label="уровень темы" sub={<>{xp.level.into} / {xp.level.need} XP до следующего · всего {xp.total}</>} />}
          </SceneFrame>
          <TodayInTheme theme={theme} life={life} today={today} radar={view.radar} />
        </div>
        <Journey past={cols.past} stand={cols.stand} next={cols.next} />
        <StaleLine stale={stale} />
        <NumberGroups groups={view.numbers} tiles={tiles} today={today} />
        <Board cards={cards} />
        <div className="g-organs">
          {sections.map((s) => {
            const Organ = isSectionKey(s) ? ORGANS[s] : HEADING;
            return Organ ? <Organ key={s} name={s} {...props} /> : null;
          })}
        </div>
        <Radar cards={view.radar} />
        <PagesRow buttons={buttons} />
      </div>
      {theme === "Social & friends" && <AddPersonSheet open={adding} onClose={() => setAdding(false)} />}
    </div>
  );
}

/**
 * The card beside the scene: what of this theme is asked today — its prayers, what he holds out against, its habits —
 * each marked by a tap, the same marks «Сегодня» writes. A theme with nothing asked today shows what is on its radar.
 */
function TodayInTheme({ theme, life, today, radar }: { theme: string; life: Life; today: string; radar: { kind?: string; title?: string; text?: string }[] }) {
  const { day, edit } = useDayEdit(life, today);
  const due = useMemo(() => habitRows(life).filter((h) => h.theme === theme && habitDue(h, today)), [life, theme, today]);
  const days = useMemo(() => new Map(life.days).set(today, day), [life.days, today, day]);
  const done = due.filter((h) => markOf(day, h.title) === "done").length;
  const cycle = (title: string, order: (DayMark | undefined)[]) => edit((d) => withMark(d, title, order[(order.indexOf(markOf(d, title)) + 1) % order.length]));
  if (!due.length) {
    return (
      <SideCard kicker="на радаре темы">
        {radar.length ? (
          <div className="g-blips">{radar.slice(0, 4).map((c, i) => <div key={i}>{c.kind && <em>{c.kind}</em>}{c.title && <b><Inline md={c.title} /></b>}{c.text && <p><Inline md={c.text} /></p>}</div>)}</div>
        ) : <p className="g-rule">Сегодня в этой теме ничего не спрашивается, и на радаре пусто.</p>}
      </SideCard>
    );
  }
  return (
    <SideCard kicker={`сегодня в теме · ${done} из ${due.length}`}>
      <div className="g-tiles g-side-tiles">
        {due.map((h) => <HabitTile key={h.title} h={h} bad={h.kind === "bad"} mark={markOf(day, h.title)} run={h.kind === "prayer" ? 0 : streak(h, days, today)} onClick={() => cycle(h.title, h.kind === "prayer" ? [undefined, "done", "late", "failed"] : [undefined, "done", "failed"])} />)}
      </div>
      <Link className="g-link g-side-link" to="/?tab=play">весь день на «Сегодня» →</Link>
    </SideCard>
  );
}

/** «Где был · Где стою · Куда иду» as three stations on one path; all three come from the task bank. */
function Journey({ past, stand, next }: { past: ColumnPart[]; stand: ColumnPart[]; next: ColumnPart[] }) {
  const empty = !past.length && !stand.length && !next.length;
  const stations: [string, string, string, ColumnPart[]][] = [["past", "Где был", "задания сделаны", past], ["now", "Где стою", "задания этой недели", stand], ["next", "Куда иду", "результаты этого месяца", next]];
  return (
    <Block title="Путь темы" right={<>из банка заданий · <Link to="/?tab=levels">уровни →</Link></>}>
      {empty ? <p className="g-faint">Из банка для этой темы ничего не выбрано. Результаты месяца выбираются на <Link to="/?tab=month">«Месяц»</Link>, задания недели — на <Link to="/?tab=week">«Неделя»</Link>.</p> : (
        <div className="g-path">
          {stations.map(([kind, title, sub, parts]) => (
            <div key={kind} className={`st ${kind}`}>
              <i />
              <h3>{title}<small>{sub}</small></h3>
              {parts.length ? parts.map((p, i) => (
                <div key={i}>
                  {p.suffix && <span className="sfx">{p.suffix}</span>}
                  <ul>{p.items.length ? p.items.map((it, j) => <li key={j}><Inline md={it.md} />{it.note && <em>{it.note}</em>}</li>) : <li className="none">—</li>}</ul>
                </div>
              )) : <ul><li className="none">—</li></ul>}
            </div>
          ))}
        </div>
      )}
    </Block>
  );
}
