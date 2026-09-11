export interface ThemeMeta {
  name: string;
  short: string;
  color: string;
  blurb: string;
}

export const THEMES: ThemeMeta[] = [
  { name: "Spirituality & Religion", short: "Spirituality", color: "#4FB286", blurb: "Faith practice, Islamic knowledge" },
  { name: "Social & friends", short: "Social", color: "#E8785F", blurb: "Friends, social circles, prospecting" },
  { name: "Personal growth", short: "Growth", color: "#E0A93F", blurb: "Self-knowledge, psychology, tools, identity" },
  { name: "Health & sport", short: "Health", color: "#45B6C6", blurb: "Body, nutrition, fitness, medical, sleep" },
  { name: "Finance & money", short: "Finance", color: "#A9BF4F", blurb: "Personal finances, debts, money frameworks" },
  { name: "Family & relationship", short: "Family", color: "#D3709B", blurb: "Family and romantic relationship" },
  { name: "Business & career", short: "Business", color: "#7C8CF0", blurb: "Shared business material and all projects" },
  { name: "Memories & Fun", short: "Memories", color: "#AE7FE0", blurb: "Storytelling, writing craft, Reverend Insanity" },
];

export const THEME_BY_NAME = new Map(THEMES.map((t) => [t.name, t]));
export const OTHER_COLOR = "#8B9099";

export function themeColor(name: string | undefined): string {
  return (name && THEME_BY_NAME.get(name)?.color) || OTHER_COLOR;
}
