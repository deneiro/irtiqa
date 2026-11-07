import { useMemo } from "react";
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
import { influenceGroups } from "../lib/influence";
import { measures } from "../lib/health";
import { parseJobs } from "../lib/jobs";
import { parseLibrary } from "../lib/library";
import { parseNames, suras } from "../lib/quran";
import { rawPageText } from "../lib/rawpage";
import type { Life } from "../lib/life";
import type { Vault } from "../lib/types";
import { Columns, NumberGroups, PagesRow, Radar, StaleLine, glowOf, partUrl, type PageButton } from "./theme/parts";
import { HEADING, ORGANS } from "./theme/organs";
import Board from "./theme/Board";
import { dayTaskLines } from "./main/Levels";
import { themeColumns } from "../lib/picks";
import { loadBank } from "../lib/bank";
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
      const g = influenceGroups(people, life.habits);
      return { ...b, value: String(g.up.length + g.down.length), sub: `↑ ${g.up.length} · ↓ ${g.down.length}` };
    }
    case "career": return { ...b, value: String(parseJobs(life.jobs ?? "", today).length), sub: "работ" };
    case "library": return { ...b, value: String(parseLibrary(life.library ?? "").length) };
    case "finance": return { ...b, to: "/finance" };
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
  const buttons = sections.filter((s): s is SectionKey => isSectionKey(s) && !ORGANS[s]).map((k) => pageButton(k, theme, pages, life, vault, today));
  return (
    <div className="t-page" style={style}>
      <header className="t-head">
        <div>
          <div className="t-kick">Тема</div>
          <h1 className="t-h1"><i />{themeLabel(theme)}</h1>
        </div>
        {overview && <Link className="t-whole" to={pageUrl(overview)}>обзор целиком{overview.updated ? ` · ${shortDate(overview.updated)}` : ""}</Link>}
      </header>
      <NumberGroups groups={view.numbers} tiles={tiles} today={today} />
      <Columns past={cols.past} stand={cols.stand} next={cols.next} />
      <Board cards={cards} />
      <div className="t-organs">
        {sections.map((s) => {
          const Organ = isSectionKey(s) ? ORGANS[s] : HEADING;
          return Organ ? <Organ key={s} name={s} {...props} /> : null;
        })}
      </div>
      <Radar cards={view.radar} />
      <PagesRow buttons={buttons} />
      <StaleLine stale={stale} />
    </div>
  );
}
