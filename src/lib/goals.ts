/**
 * `life/goals/<период>.md` — goals for five years, a year, a month, an ISO
 * week and a day (vault CLAUDE.md «Цели по периодам»). Written by Claude from
 * Eldar's words. `## Задачи` is a checklist in the day, week and month files
 * (day added 2026-10-13: «на утро я хотел бы видеть прям все задания»);
 * Claude ticks it from his words, «Утро» lets him tick it himself.
 */

export interface GoalTask { done: boolean; text: string }
export interface GoalsFile {
  key: string;
  period: string | undefined;
  from: string | undefined;
  to: string | undefined;
  /** Bullets under `## Цели`, the trailing `→ [[...]]` pointer stripped. */
  goals: string[];
  /** Checklist under `## Задачи` (day, week, month). A plain bullet with a `[[link]]` counts as an open task. */
  tasks: GoalTask[];
  /** `## Фокус` (spec v3): Claude's numbered lines for the period, and the date he signed them. */
  focus: string[];
  focusOn: string | undefined;
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
  const focusText = section(body, "Фокус");
  const focus = focusText.split("\n").map((l) => l.match(/^\s*\d+[.)]\s+(.+)$/)?.[1].trim()).filter((l): l is string => !!l);
  const focusOn = focusText.match(/_Claude,\s*(\d{4}-\d{2}-\d{2})_/)?.[1];
  return { key, period: fm(content, "period"), from: fm(content, "from"), to: fm(content, "to"), goals, tasks, focus, focusOn };
}

/** One goal, read by its parts: `**цель** · мера: … · сейчас: … · срок: YYYY-MM-DD · → [[выше]]`; a reached goal ends with `✓ YYYY-MM-DD`. */
export interface GoalLine {
  title: string;
  measure: string | undefined;
  now: string | undefined;
  due: string | undefined;
  doneOn: string | undefined;
}

export function parseGoalLine(text: string): GoalLine {
  const doneOn = text.match(/✓\s*(\d{4}-\d{2}-\d{2})/)?.[1];
  const parts = text.split(/\s→\s/)[0].split(/\s+·\s+/).map((p) => p.trim());
  const part = (k: string) => parts.find((p) => p.startsWith(`${k}:`))?.slice(k.length + 1).trim() || undefined;
  return {
    title: parts[0].replace(/\*+/g, "").replace(/\s*✓.*$/, "").trim(),
    measure: part("мера"),
    now: part("сейчас"),
    due: part("срок")?.match(/^\d{4}-\d{2}-\d{2}/)?.[0],
    doneOn,
  };
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
 * The day, week and month files that cover `date`, when they exist. On a
 * Sunday evening the coming week's file is already written while the current
 * one never was, so the next week stands in when this one is missing.
 */
export function goalsFor(goals: Map<string, string>, date: string): { day: GoalsFile | undefined; week: GoalsFile | undefined; month: GoalsFile | undefined } {
  const mk = monthKey(date);
  const m = goals.get(mk);
  const dd = goals.get(date);
  const [y, mo, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
  const wk = [isoWeekKey(date), isoWeekKey(next)].find((k) => goals.has(k));
  return {
    day: dd ? parseGoals(date, dd) : undefined,
    week: wk ? parseGoals(wk, goals.get(wk)!) : undefined,
    month: m ? parseGoals(mk, m) : undefined,
  };
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
