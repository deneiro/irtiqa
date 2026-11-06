/**
 * The body side of Health & sport. Two sources:
 *   - `life/health.md` — doctors, visits, symptoms, and the goal. App-owned.
 *   - `life/days/*.md` — the measurements themselves (`weight`, `pushups`,
 *     `pullups`), written only on the days they are taken.
 *
 * Kept apart on purpose: what the body is doing is a series over days; what
 * medicine says about it is a card that changes a few times a year.
 */
import { parseFrontmatter } from "./vault";
import type { Day } from "./life";

export { HEALTH_REL } from "./life";
export const PANCREAS_PAGE = "Панкреатит — что можно и что нельзя";

export interface Visit { date: string; doctor: string; why: string; result: string }
export interface Plan { doctor: string; by: string; why: string }
/** `where` (spec v4): one word of BODY_PARTS, his; "" for a row without it — such a row has no dot on the body. */
export interface Symptom { date: string; what: string; where: string; note: string }

/** The words of the «Где» column, one anchor each on the body outline of the theme page. */
export const BODY_PARTS: readonly string[] = ["голова", "шея", "грудь", "живот", "спина", "поясница", "плечо", "рука", "колено", "нога"];

export interface HealthCard {
  height: number | undefined;
  weightStart: number | undefined;
  weightGoal: number | undefined;
  goalBy: string | undefined;
  chronic: string[];
  visits: Visit[];
  plans: Plan[];
  symptoms: Symptom[];
}

const num = (v: unknown): number | undefined => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : undefined;
};
const str = (v: unknown): string | undefined => {
  const s = typeof v === "string" || v instanceof Date ? String(v).trim() : "";
  return s || undefined;
};

/** One `## Заголовок` table: its header row and the rows under it, the separator dropped. */
function table(content: string, heading: string): { head: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return { head: [], rows: [] };
  const out: string[][] = [];
  for (const line of lines.slice(start + 1)) {
    const t = line.trim();
    if (t.startsWith("## ")) break;
    if (!t.startsWith("|")) continue;
    const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.every((c) => /^-*$/.test(c))) continue;
    out.push(cells);
  }
  return { head: out[0] ?? [], rows: out.slice(1) };
}

const tableRows = (content: string, heading: string) => table(content, heading).rows;

/** Symptoms by the names of their columns: a table written before «Где» existed reads as before, without it. */
function symptoms(content: string): Symptom[] {
  const { head, rows } = table(content, "Симптомы");
  const col = (name: string) => head.findIndex((h) => h.toLowerCase() === name);
  const at = (c: string[], i: number) => (i >= 0 ? c[i] ?? "" : "");
  const date = col("дата"), what = col("что"), where = col("где"), note = col("заметка");
  return rows.map((c) => ({
    date: at(c, date >= 0 ? date : 0),
    what: at(c, what >= 0 ? what : 1),
    where: at(c, where),
    note: at(c, note >= 0 ? note : where >= 0 ? 3 : 2),
  }));
}

export function parseHealth(content: string): HealthCard {
  const { fm } = parseFrontmatter(content);
  const chronic = Array.isArray(fm.chronic) ? fm.chronic.map(String) : str(fm.chronic) ? [String(fm.chronic)] : [];
  return {
    height: num(fm.height),
    weightStart: num(fm.weight_start),
    weightGoal: num(fm.weight_goal),
    goalBy: str(fm.goal_by)?.slice(0, 10),
    chronic,
    visits: tableRows(content, "Визиты").map((c) => ({ date: c[0] ?? "", doctor: c[1] ?? "", why: c[2] ?? "", result: c[3] ?? "" })),
    plans: tableRows(content, "Планы").map((c) => ({ doctor: c[0] ?? "", by: c[1] ?? "", why: c[2] ?? "" })),
    symptoms: symptoms(content),
  };
}

const HEAD = {
  Визиты: ["| Дата | Врач | Повод | Итог |", "|---|---|---|---|"],
  Планы: ["| Врач | К дате | Зачем |", "|---|---|---|"],
  Симптомы: ["| Дата | Что | Где | Заметка |", "|---|---|---|---|"],
};

/** Rewrite the three tables, leaving the frontmatter and the prose alone. */
export function withHealth(content: string, card: HealthCard, today: string): string {
  const rows: Record<keyof typeof HEAD, string[]> = {
    Визиты: [...card.visits].sort((a, b) => b.date.localeCompare(a.date)).map((v) => `| ${v.date} | ${v.doctor} | ${v.why} | ${v.result} |`),
    Планы: [...card.plans].sort((a, b) => a.by.localeCompare(b.by)).map((p) => `| ${p.doctor} | ${p.by} | ${p.why} |`),
    Симптомы: [...card.symptoms].sort((a, b) => b.date.localeCompare(a.date)).map((s) => `| ${s.date} | ${s.what} | ${s.where} | ${s.note} |`),
  };
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let skip: keyof typeof HEAD | null = null;
  for (const line of lines) {
    const t = line.trim();
    const head = t.startsWith("## ") ? (t.slice(3) as keyof typeof HEAD) : null;
    if (head && head in HEAD) {
      out.push(line, "", ...HEAD[head], ...rows[head]);
      skip = head;
      continue;
    }
    if (skip) {
      if (t.startsWith("|")) continue;
      if (t === "") { out.push(line); continue; }
      skip = null;
    }
    out.push(line.replace(/^updated:\s*\d{4}-\d{2}-\d{2}\s*$/, `updated: ${today}`));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

export interface Measure { date: string; weight?: number; pushups?: number; pullups?: number }

/** Measurements in date order, only the days that actually carry one. */
export function measures(days: Map<string, Day>): Measure[] {
  const out: Measure[] = [];
  for (const d of days.values()) {
    if (d.weight === undefined && d.pushups === undefined && d.pullups === undefined) continue;
    out.push({ date: d.date, weight: d.weight, pushups: d.pushups, pullups: d.pullups });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function lastOf(ms: Measure[], key: "weight" | "pushups" | "pullups"): Measure | undefined {
  for (let i = ms.length - 1; i >= 0; i--) if (ms[i][key] !== undefined) return ms[i];
  return undefined;
}

/** Days until (negative = overdue). Undefined for an unparseable date. */
export function daysUntil(date: string, today: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const ms = Date.parse(`${date}T00:00:00`) - Date.parse(`${today}T00:00:00`);
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : undefined;
}
