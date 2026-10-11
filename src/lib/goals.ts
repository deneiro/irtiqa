/**
 * `life/goals/<период>.md` — goals for five years, a year, a month, an ISO
 * week (vault CLAUDE.md «Цели по периодам»). Written by Claude from Eldar's
 * words; the app only reads them. The week file's `## Задачи` is a checklist
 * Claude ticks when he says a task is done, so the «Утро» screen can show
 * «задач 2 из 4» without anyone pressing anything in the app.
 */

export interface GoalTask { done: boolean; text: string }
export interface GoalsFile {
  key: string;
  period: string | undefined;
  from: string | undefined;
  to: string | undefined;
  /** Bullets under `## Цели`, the trailing `→ [[...]]` pointer stripped. */
  goals: string[];
  /** Checklist under `## Задачи` (week only). A plain bullet counts as an open task. */
  tasks: GoalTask[];
}

function section(body: string, head: string): string {
  const at = body.indexOf(`\n## ${head}`);
  if (at < 0) return "";
  const from = at + head.length + 4;
  const next = body.slice(from).search(/\n## /);
  return body.slice(from, next < 0 ? undefined : from + next);
}

const fm = (content: string, key: string) => content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();

export function parseGoals(key: string, content: string): GoalsFile {
  const body = "\n" + content.replace(/^---[\s\S]*?\n---\n?/, "");
  const strip = (l: string) =>
    l.replace(/^\s*-\s*(\[[ xX]\]\s*)?/, "")
      .replace(/\s*→\s*\[\[[^\]]*\]\][^.]*\.?$/, "") // the pointer to the period above
      .replace(/\s*—\s*шаг\s+(в\s+\[\[[^\]]*\]\]|там же)\s*$/, "") // the pointer to the quest
      .trim();
  const goals = section(body, "Цели").split("\n").filter((l) => /^\s*-\s+/.test(l)).map(strip).filter(Boolean);
  const tasks: GoalTask[] = [];
  for (const l of section(body, "Задачи").split("\n")) {
    const m = l.match(/^\s*-\s*(?:\[([ xX])\]\s*)?(.+)$/);
    if (!m) continue;
    // A note line («Времени в календаре нет…») is not a task: it has no checkbox and no link to a quest.
    if (!m[1] && !/\[\[/.test(m[2])) continue;
    tasks.push({ done: /[xX]/.test(m[1] ?? ""), text: strip(m[2]) });
  }
  return { key, period: fm(content, "period"), from: fm(content, "from"), to: fm(content, "to"), goals, tasks };
}

/** ISO week key of a date: `2026-W42` (Monday to Sunday). */
export function isoWeekKey(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/**
 * The week and month files that cover `date`, when they exist. On a Sunday
 * evening the coming week's file is already written while the current one
 * never was, so the next week stands in when this one is missing.
 */
export function goalsFor(goals: Map<string, string>, date: string): { week: GoalsFile | undefined; month: GoalsFile | undefined } {
  const mk = monthKey(date);
  const m = goals.get(mk);
  const [y, mo, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
  const wk = [isoWeekKey(date), isoWeekKey(next)].find((k) => goals.has(k));
  return { week: wk ? parseGoals(wk, goals.get(wk)!) : undefined, month: m ? parseGoals(mk, m) : undefined };
}

/**
 * The file text with task `index` (in `## Задачи` order, notes skipped)
 * ticked or unticked. Only the checkbox changes; a plain bullet with a link
 * gains one. Eldar taps this on «Утро»; Claude ticks the same line from his
 * words — both end in the same file.
 */
export function withTaskDone(content: string, index: number, done: boolean): string {
  const lines = content.split("\n");
  const head = lines.findIndex((l) => /^## Задачи\s*$/.test(l));
  if (head < 0) return content;
  let n = -1;
  for (let i = head + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    const m = lines[i].match(/^(\s*-\s*)(?:\[([ xX])\]\s*)?(.+)$/);
    if (!m) continue;
    if (!m[2] && !/\[\[/.test(m[3])) continue; // a note, not a task
    n++;
    if (n !== index) continue;
    lines[i] = `${m[1]}[${done ? "x" : " "}] ${m[3]}`;
    break;
  }
  return lines.join("\n");
}
