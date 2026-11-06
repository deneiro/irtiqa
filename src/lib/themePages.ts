/**
 * The pages of a theme that sit behind its buttons (spec v4 «Страницы»): the
 * reading list, its own knowledge base, the people, the projects, the tools,
 * the profile, the template, the summary. Moved from the v3 theme page with
 * the same rules, so the full screens list exactly what the buttons count.
 */
import { activityView } from "./dashboard";
import type { Life, Quest } from "./life";
import { bullets, maskQuotes, phraseOf, sectionTable, splitSections, type SectionKey } from "./overview";
import { isAuthor } from "./people";
import { NAMES_PAGE } from "./quran";
import type { Page, Vault } from "./types";

export const HALAL_PAGE = "Халяль и харам";

/** What each key is called on its button, its organ and its full screen. */
export const SECTION_LABELS: Record<SectionKey, string> = {
  focus: "Колесо фокуса", resource: "Список чтения", wiki: "Своя база знаний", people: "Люди", projects: "Проекты",
  profile: "Профиль", tools: "Инструменты", template: "Опросник", summary: "Сводка проектов", finance: "Деньги",
  events: "События", skills: "Навыки", nutrition: "Питание", quran: "Коран", names: "99 имён", halal: "Халяль · Харам · Макрух",
  body: "Тело", medical: "Где болит", circle: "Круг", influence: "Влияние", self: "Состояние", horizon: "Горизонт",
  talks: "Разговоры", career: "Карьера", wishes: "Хочу прожить", library: "Посмотрел и прочитал", sport: "Спорт",
};

/** The folder of a page under `Projects/`: a project is its folder (location wins, the vault's rule), never a stale `project:`. */
export function projectFolder(p: Page): string | undefined {
  const i = p.segments.indexOf("Projects");
  return i >= 0 ? p.segments[i + 1] : undefined;
}

export interface ProjectCard {
  name: string;
  overview: Page | undefined;
  /** Pages in the folder, the overview too. */
  pages: number;
  updated: string | undefined;
  /** Its activity in `life/activities/` (`project:` = the folder): the active one first, else the latest moved. */
  activity: { quest: Quest; word: string; tone: "sage" | "honey" | "ember" | "smoke"; now: string | undefined } | undefined;
  /** The first line of the overview's «Где стою». */
  stand: string | undefined;
}

const STATUS_RANK: Record<string, number> = { active: 0, paused: 1, done: 2 };
const STAGE_TONE: Record<string, "sage" | "honey" | "ember"> = { "идёт": "sage", "ждёт": "honey", "стоит": "ember" };

/** The first physical line of a «Где стою» section (with or without a date after it): no sub-bullets, no pale note. */
function standLine(overview: Page | undefined): string | undefined {
  const sec = overview && splitSections(overview.body).sections.find((x) => /^(Где стою|Where things stand)(\s|$)/i.test(x.heading));
  const line = sec?.md.split(/\r?\n/).find((l) => l.trim());
  if (!line) return undefined;
  const text = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/)?.[1] ?? line;
  return phraseOf(text.trim()).md || undefined;
}

/**
 * One card per folder under `<theme>/Projects/` (Eldar, 2026-11-06: only real projects): the name, its activity with
 * its stage and `## Сейчас` step, the overview's «Где стою» line, the page count. A project with an active activity
 * comes first, then the one updated last. The stage is read as the board reads it: `stage:`, else «идёт» while it moves.
 */
export function projectCards(vault: Vault, life: Life | null, theme: string, today: string): ProjectCard[] {
  const by = new Map<string, Page[]>();
  for (const p of vault.pages) {
    const name = p.segments[0] === theme ? projectFolder(p) : undefined;
    if (name) by.set(name, [...(by.get(name) ?? []), p]);
  }
  const cards = [...by].map(([name, ps]): ProjectCard => {
    const overview = ps.find((p) => p.file === "_Overview" && p.segments.length === p.segments.indexOf("Projects") + 2);
    const views = (life?.quests ?? []).filter((q) => q.project?.normalize("NFC") === name.normalize("NFC") && q.status in STATUS_RANK).map((q) => activityView(q, life!.days, today))
      .sort((a, b) => (STATUS_RANK[a.quest.status] ?? 3) - (STATUS_RANK[b.quest.status] ?? 3) || (b.last ?? "").localeCompare(a.last ?? ""));
    const v = views[0];
    let activity: ProjectCard["activity"];
    if (v) {
      const q = v.quest;
      const stage = q.stage ?? (v.state === "moving" ? "идёт" : "стоит");
      const [word, tone] = q.status === "done" ? ["закрыта", "smoke" as const] : q.status === "paused" ? ["на паузе", "smoke" as const] : [stage, STAGE_TONE[stage] ?? "smoke"];
      activity = { quest: q, word, tone, now: v.now };
    }
    return { name, overview, pages: ps.length, updated: ps.map((p) => p.updated ?? "").sort().pop() || undefined, activity, stand: standLine(overview) };
  });
  const rank = (c: ProjectCard) => (c.activity ? STATUS_RANK[c.activity.quest.status] ?? 3 : 4);
  return cards.sort((a, b) => rank(a) - rank(b) || (b.updated ?? "").localeCompare(a.updated ?? "") || a.name.localeCompare(b.name, "ru"));
}

// ---- the theme's own base, strictly by folder (Eldar, 2026-11-06: «отдельные листы») ----

export const WIKI_COMMON = "Общее";
export interface WikiList { folder: string; name: string; pages: Page[]; overview: Page | undefined }

/** The folders of a page below its `Wiki/`. */
const belowWiki = (p: Page) => { const i = p.segments.findIndex((x) => x.toLowerCase() === "wiki"); return i < 0 ? [] : p.segments.slice(i + 1); };
const byName = (a: string, b: string) => a.localeCompare(b, "ru", { numeric: true });

/**
 * The base as lists, one per folder: a page sits in the list of its top folder below `Wiki/` (deeper folders stay in
 * it), or below the one wrapper folder when every page is inside it (`Wiki/<обёртка>/`). Pages directly in
 * `Wiki/` or in the wrapper are «Общее», first; the other lists follow by name. An `_Overview` is not an item: a
 * folder's own is its list's `overview`, the root one (wrapper or `Wiki/`) is the base's. Pages by title, numbers
 * as numbers («2 — …» before «10 — …»).
 */
export function wikiLists(pages: Page[]): { lists: WikiList[]; overview: Page | undefined } {
  const items = pages.filter((p) => p.file !== "_Overview");
  const paths = items.map(belowWiki);
  const top = paths[0]?.[0];
  const wrap = top !== undefined && paths.every((x) => x.length > 0 && x[0] === top) ? 1 : 0;
  const by = new Map<string, Page[]>();
  items.forEach((p, i) => { const k = paths[i][wrap] ?? ""; by.set(k, [...(by.get(k) ?? []), p]); });
  const overviews = pages.filter((p) => p.file === "_Overview");
  const overviewOf = (folder: string) => overviews.find((o) => {
    const x = belowWiki(o);
    return folder ? x.length === wrap + 1 && x[wrap] === folder : x.length === wrap && (!wrap || x[0] === top);
  });
  const lists = [...by].map(([folder, ps]) => ({ folder, name: folder || WIKI_COMMON, pages: [...ps].sort((a, b) => byName(a.title, b.title)), overview: folder ? overviewOf(folder) : undefined }))
    .sort((a, b) => (a.folder === "" ? -1 : b.folder === "" ? 1 : byName(a.name, b.name)));
  return { lists, overview: overviewOf("") };
}

// ---- Халяль · Харам · Макрух (Eldar, 2026-11-06: «название, заголовок, и потом описание… источники не нужны») ----

export type HalalKind = "halal" | "haram" | "makruh";
export interface HalalCard { title: string; text?: string }
export interface HalalGroup { kind: HalalKind; heading: string; cards: HalalCard[] }

/** The page's own `##` headings (spec v4 «Халяль · Харам · Макрух»). */
const HALAL_HEADS: [HalalKind, RegExp][] = [["halal", /^Халяль$/i], ["haram", /^Харам$/i], ["makruh", /^Макрух/i]];

/**
 * «тема: суть — источник» as a card: the title is the text before the first «: », the description the rest up to
 * the last « — »; the source after it is dropped. A link or a «quote» is one unit: its «: » or « — » does not cut.
 * Without «: » the whole text before « — » is the title.
 */
export function halalCard(text: string): HalalCard {
  const at = maskQuotes(text).lastIndexOf(" — ");
  const body = (at > 0 ? text.slice(0, at) : text).trim();
  const colon = maskQuotes(body).search(/:\s/);
  const bare = (t: string) => ({ title: t.replace(/\s*:$/, "") });
  if (colon <= 0) return bare(body);
  const title = body.slice(0, colon).trim(), rest = body.slice(colon + 1).trim();
  return rest ? { title, text: rest.charAt(0).toLocaleUpperCase("ru") + rest.slice(1) } : bare(title);
}

/** The three groups of the halal page in its order; any other section (the intro, «Changes») is not shown. */
export function halalGroups(body: string): HalalGroup[] {
  const out: HalalGroup[] = [];
  for (const sec of splitSections(body).sections) {
    const kind = HALAL_HEADS.find(([, re]) => re.test(sec.heading.trim()))?.[0];
    if (kind) out.push({ kind, heading: sec.heading.trim(), cards: bullets(sec.md).items.map(halalCard) });
  }
  return out;
}

// ---- «Сводка проектов»: its tables as cards (one card a row) ----

/** One row of a summary table: the first cell as the name (its `*курсив*` as a note), the stage as a pill, the other cells as lines. */
export interface SummaryCard { title: string; note?: string; pill?: string; lines: { label: string; md: string }[] }
/** A table of the summary under its heading (`###`, else `##`), and the paragraph above it. */
export interface SummaryGroup { title: string; caption?: string; cards: SummaryCard[] }

/** The column that holds a row's stage: the file's own header word. */
const STAGE_HEAD = /^(stage|status|статус|стадия|этап)$/i;
const plainCell = (s: string) => s.replace(/\*\*|`/g, "").trim();

/** A stage cell as a pill: the words before the first «(», «,» or «;»; the rest of the cell becomes a line. */
export function stagePill(cell: string): { pill: string; rest?: string } {
  const flat = plainCell(cell);
  const at = flat.search(/\s*[(;,]/);
  if (at <= 0) return { pill: flat };
  const rest = flat.slice(at).replace(/^[\s(;,]+/, "").replace(/\)\s*$/, "").trim();
  return rest ? { pill: flat.slice(0, at).trim(), rest } : { pill: flat.slice(0, at).trim() };
}

/**
 * `_Project Status Summary.md` as cards (it is tables by code folder, not a section per project): every table under
 * its heading is a group, every row a card — the first cell the name, a stage column a pill, the other non-empty
 * cells «label: value» lines. Sections without a table are not shown.
 */
export function summaryGroups(body: string): SummaryGroup[] {
  const out: SummaryGroup[] = [];
  for (const sec of splitSections(body).sections) {
    const parts = ("\n" + sec.md).split(/\n###[ \t]+([^\n]*)/);
    const chunks: { title: string; md: string }[] = [{ title: sec.heading, md: parts[0] }];
    for (let i = 1; i < parts.length; i += 2) chunks.push({ title: parts[i].trim(), md: parts[i + 1] ?? "" });
    for (const c of chunks) {
      const table = sectionTable(c.md);
      if (!table) continue;
      const stage = table.head.findIndex((h) => STAGE_HEAD.test(plainCell(h)));
      const cards = table.rows.filter((r) => r[0]).map((row): SummaryCard => {
        const name = phraseOf(row[0]);
        const card: SummaryCard = { title: plainCell(name.md), lines: [] };
        if (name.note) card.note = name.note;
        table.head.forEach((label, j) => {
          const cell = (row[j] ?? "").trim();
          if (!j || !cell) return;
          if (j === stage) {
            const p = stagePill(cell);
            card.pill = p.pill;
            if (p.rest) card.lines.push({ label, md: p.rest });
          } else card.lines.push({ label, md: cell });
        });
        return card;
      });
      const caption = bullets(c.md.split(/\r?\n/).filter((l) => !l.trim().startsWith("|")).join("\n")).paras[0];
      const group: SummaryGroup = { title: c.title, cards };
      if (caption) group.caption = caption;
      if (cards.length) out.push(group);
    }
  }
  return out;
}

export interface ThemePages {
  overview: Page | undefined;
  /** Not in a project; unread first, then the newest. */
  resources: Page[];
  /** The theme's own base: every wiki page not in a project and not an overview — the lists of `wikiLists`. */
  wikiPages: Page[];
  /** Every wiki page of the base, overviews too: what `wikiLists` groups. */
  wikiAll: Page[];
  /** The circle: person pages of the theme without authors and templates. */
  people: Page[];
  projects: ProjectCard[];
  tools: Page[];
  profile: Page | undefined;
  template: Page | undefined;
  summary: Page | undefined;
  halal: Page | undefined;
  names: Page | undefined;
}

export function themePages(vault: Vault, life: Life | null, theme: string, today: string): ThemePages {
  const pages = vault.pages.filter((p) => p.theme === theme);
  const readOf = (p: Page) => (p.fm.read ? 1 : 0);
  const resources = pages.filter((p) => p.zone === "resource" && !projectFolder(p))
    .sort((a, b) => readOf(a) - readOf(b) || (b.updated ?? "").localeCompare(a.updated ?? ""));
  const inWiki = (p: Page) => p.segments.some((x) => x.toLowerCase() === "wiki");
  const wikiAll = pages.filter((p) => (p.zone === "wiki" || (p.zone === "overview" && inWiki(p))) && !projectFolder(p));
  return {
    overview: pages.find((p) => p.file === "_Overview" && p.segments.length === 1),
    resources,
    wikiPages: wikiAll.filter((p) => p.file !== "_Overview"),
    wikiAll,
    people: pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    projects: projectCards(vault, life, theme, today),
    tools: pages.filter((p) => p.segments[1] === "tools" && p.file !== "_Overview"),
    profile: pages.find((p) => p.type === "profile"),
    template: pages.find((p) => p.type === "template" && p.segments.length === 1),
    summary: pages.find((p) => p.file === "_Project Status Summary"),
    halal: pages.find((p) => p.file === HALAL_PAGE),
    names: pages.find((p) => p.file === NAMES_PAGE),
  };
}
