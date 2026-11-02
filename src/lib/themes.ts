export interface ThemeMeta {
  name: string;
  short: string;
  /** Short Russian name, for code that runs outside React (the bot, «Требует тебя»). */
  ru: string;
  color: string;
  blurb: string;
}

export const THEMES: ThemeMeta[] = [
  { name: "Spirituality & Religion", ru: "Духовность", short: "Spirituality", color: "#4FB286", blurb: "Faith practice, Islamic knowledge" },
  { name: "Social & friends", ru: "Общение", short: "Social", color: "#E8785F", blurb: "Friends, social circles, prospecting" },
  { name: "Personal growth", ru: "Рост", short: "Growth", color: "#E0A93F", blurb: "Self-knowledge, psychology, tools, identity" },
  { name: "Health & sport", ru: "Здоровье", short: "Health", color: "#45B6C6", blurb: "Body, nutrition, fitness, medical, sleep" },
  { name: "Finance & money", ru: "Финансы", short: "Finance", color: "#A9BF4F", blurb: "Personal finances, debts, money frameworks" },
  { name: "Family & relationship", ru: "Семья", short: "Family", color: "#D3709B", blurb: "Family and romantic relationship" },
  { name: "Business & career", ru: "Бизнес", short: "Business", color: "#7C8CF0", blurb: "Shared business material and all projects" },
  { name: "Memories & Fun", ru: "Досуг", short: "Memories", color: "#AE7FE0", blurb: "Storytelling, writing craft, Reverend Insanity" },
];

export const THEME_BY_NAME = new Map(THEMES.map((t) => [t.name, t]));
export const OTHER_COLOR = "#8B9099";

export function themeColor(name: string | undefined): string {
  return (name && THEME_BY_NAME.get(name)?.color) || OTHER_COLOR;
}

/**
 * Items grouped by theme in the fixed theme order, items without a theme last
 * under `undefined`. Empty themes are left out; `missing` names them, so a
 * screen can say which part of life has nothing (Eldar, 2026-10-03: no theme
 * may fall behind unseen).
 */
export function groupByTheme<T extends { theme?: string }>(items: T[]): { groups: { theme: string | undefined; items: T[] }[]; missing: string[] } {
  const groups: { theme: string | undefined; items: T[] }[] = [];
  const missing: string[] = [];
  for (const t of THEMES) {
    const of = items.filter((x) => x.theme === t.name);
    if (of.length) groups.push({ theme: t.name, items: of });
    else missing.push(t.name);
  }
  const rest = items.filter((x) => !x.theme || !THEME_BY_NAME.has(x.theme));
  if (rest.length) groups.push({ theme: undefined, items: rest });
  return { groups, missing };
}

export function themeRu(name: string | undefined): string {
  return (name && THEME_BY_NAME.get(name)?.ru) || "без темы";
}
