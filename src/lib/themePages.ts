/**
 * The pages of a theme that sit behind its buttons (spec v4 «Страницы»): the
 * reading list, its own knowledge base, the people, the projects, the tools,
 * the profile, the template, the summary. Moved from the v3 theme page with
 * the same rules, so the full screens list exactly what the buttons count.
 */
import type { Life } from "./life";
import type { SectionKey } from "./overview";
import { isAuthor } from "./people";
import { NAMES_PAGE, suras } from "./quran";
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

export interface ThemeProject { name: string; pages: Page[]; overview: Page | undefined; updated: string | undefined; quests: number }

export interface ThemePages {
  overview: Page | undefined;
  /** Not in a project; unread first, then the newest. */
  resources: Page[];
  /** Not in a project, not the overview, not a page a section already shows (suras, the 99 names, halal). */
  wikiPages: Page[];
  /** The circle: person pages of the theme without authors and templates. */
  people: Page[];
  projects: ThemeProject[];
  tools: Page[];
  profile: Page | undefined;
  template: Page | undefined;
  summary: Page | undefined;
  halal: Page | undefined;
  names: Page | undefined;
}

export function themePages(vault: Vault, life: Life | null, theme: string, sections: string[]): ThemePages {
  const pages = vault.pages.filter((p) => p.theme === theme);
  const readOf = (p: Page) => (p.fm.read ? 1 : 0);
  const resources = pages.filter((p) => p.zone === "resource" && !p.project)
    .sort((a, b) => readOf(a) - readOf(b) || (b.updated ?? "").localeCompare(a.updated ?? ""));
  const promoted = new Set<string>();
  if (sections.includes("quran")) for (const s of suras(vault)) promoted.add(s.page.rel);
  for (const p of pages) {
    if (sections.includes("names") && p.file === NAMES_PAGE) promoted.add(p.rel);
    if (sections.includes("halal") && p.file === HALAL_PAGE) promoted.add(p.rel);
  }
  const byProject = new Map<string, Page[]>();
  for (const p of pages) if (p.project) byProject.set(p.project, [...(byProject.get(p.project) ?? []), p]);
  const projects = [...byProject].map(([name, ps]) => ({
    name, pages: ps,
    overview: ps.find((p) => p.file === "_Overview" && p.segments.length === 3),
    updated: ps.map((p) => p.updated ?? "").sort().slice(-1)[0] || undefined,
    quests: (life?.quests ?? []).filter((q) => q.project === name && q.status === "active").length,
  })).sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  return {
    overview: pages.find((p) => p.file === "_Overview" && p.segments.length === 1),
    resources,
    wikiPages: pages.filter((p) => p.zone === "wiki" && !p.project && p.file !== "_Overview" && !promoted.has(p.rel)),
    people: pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    projects,
    tools: pages.filter((p) => p.segments[1] === "tools" && p.file !== "_Overview"),
    profile: pages.find((p) => p.type === "profile"),
    template: pages.find((p) => p.type === "template" && p.segments.length === 1),
    summary: pages.find((p) => p.file === "_Project Status Summary"),
    halal: pages.find((p) => p.file === HALAL_PAGE),
    names: pages.find((p) => p.file === NAMES_PAGE),
  };
}
