/**
 * Skills: what Eldar can actually do, what is growing, what is rusting, and
 * what is still a gap. One file per skill under `life/skills/`, app-owned like
 * habits and quests, so the app can edit a level and Claude can propose one.
 */
import type { MdFile } from "./types";
import { parseFrontmatter } from "./vault";
import { asList } from "./vault";
import { safeFilename } from "./life";

export const SKILL_DIR = "life/skills";

export type SkillStatus = "growing" | "keeping" | "rusty" | "wanted" | "gap";

export const SKILL_STATUS: { key: SkillStatus; label: string; hint: string }[] = [
  { key: "growing", label: "растёт", hint: "работаю над этим сейчас" },
  { key: "keeping", label: "поддерживаю", hint: "есть и держится" },
  { key: "rusty", label: "ржавеет", hint: "было, но давно не трогал" },
  { key: "wanted", label: "хочу освоить", hint: "в очереди на изучение" },
  { key: "gap", label: "пробел", hint: "осознанная слабость" },
];

/** 0 means "none yet" — a wanted skill or a gap. */
export const LEVELS = ["нет", "новичок", "базовый", "уверенный", "сильный", "экспертный"];

export interface Skill {
  rel: string;
  title: string;
  theme: string | undefined;
  level: number; // 0..5
  status: SkillStatus;
  lastPracticed: string | undefined;
  source: string | undefined;
  tags: string[];
  body: string;
}

const str = (v: unknown): string => {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

export function parseSkill(f: MdFile): Skill {
  const { fm, body } = parseFrontmatter(f.content);
  const level = Number(fm.level);
  const status = str(fm.status) as SkillStatus;
  return {
    rel: f.rel,
    title: str(fm.title) || f.rel.split("/").pop()!.replace(/\.md$/, ""),
    theme: str(fm.theme) || undefined,
    level: Number.isFinite(level) ? Math.max(0, Math.min(5, Math.round(level))) : 0,
    status: SKILL_STATUS.some((s) => s.key === status) ? status : "keeping",
    lastPracticed: str(fm.last_practiced) || undefined,
    source: str(fm.source) || undefined,
    tags: asList(fm.tags),
    body: body.replace(/^\s*# [^\n]*\n/, "").trim(),
  };
}

export function serializeSkill(s: Omit<Skill, "rel">): string {
  const yaml = (v: string) => (/[:#"'\[\]{}]|^\s|\s$/.test(v) ? JSON.stringify(v) : v);
  const lines = ["---", `title: ${yaml(s.title)}`, "type: skill"];
  if (s.theme) lines.push(`theme: ${s.theme}`);
  lines.push(`level: ${s.level}`, `status: ${s.status}`);
  if (s.lastPracticed) lines.push(`last_practiced: ${s.lastPracticed}`);
  if (s.source) lines.push(`source: ${yaml(s.source)}`);
  if (s.tags.length) lines.push(`tags: [${s.tags.map(yaml).join(", ")}]`);
  lines.push("---", "", s.body.trim(), "");
  return lines.join("\n");
}

export function skillRel(title: string): string {
  return `${SKILL_DIR}/${safeFilename(title)}.md`;
}

/** Days since the skill was last practised, when that is known. */
export function daysSincePractice(s: Skill, today: string): number | undefined {
  if (!s.lastPracticed || !/^\d{4}-\d{2}-\d{2}$/.test(s.lastPracticed)) return undefined;
  return Math.round((new Date(today + "T12:00:00").getTime() - new Date(s.lastPracticed + "T12:00:00").getTime()) / 86400000);
}

/** A skill you claim to keep but have not touched in two months is drifting. */
export function isDrifting(s: Skill, today: string): boolean {
  if (s.status !== "keeping" && s.status !== "growing") return false;
  const d = daysSincePractice(s, today);
  return d !== undefined && d > 60;
}
