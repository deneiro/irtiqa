/**
 * An undone task does not vanish: it moves on until it is done (Eldar,
 * 2026-11-08). A day's open task moves to the next day, a week's open task to
 * the next week. The old line stays in its file as `- [>] …` — Obsidian's
 * «перенесено» box, which no parser counts as a task — and the new line carries
 * where it began: `… · с 2026-11-08` (a day) or `… · с 2026-W45` (a week).
 * The bot runs it; every function here is pure.
 */
import type { Day, DayExtra } from "./life";

/** Tasks older than this are history: the rule began here. */
export const CARRY_SINCE = "2026-11-08";

const FROM = /\s·\sс\s(\d{4}-(?:\d{2}-\d{2}|W\d{2}))\s*$/;

/** Where a carried task began: a date or a week key. */
export function carriedFrom(text: string): string | undefined {
  return text.match(FROM)?.[1];
}

export function stripCarry(text: string): string {
  return text.replace(FROM, "").trim();
}

const key = (text: string) => stripCarry(text).toLowerCase();
const emptyExtra = (): DayExtra => ({ fm: [], lead: [], tasks: [], done: [], money: [], food: [], tail: [] });

/**
 * The open tasks of `earlier` days (from CARRY_SINCE, not closed) move into
 * `today`. Returns the days that changed — the earlier ones and today — or an
 * empty list when nothing moves.
 */
export function carryDays(earlier: Day[], today: Day): Day[] {
  const have = new Set(today.tasks.map((t) => key(t.text)));
  const add: string[] = [];
  const changed: Day[] = [];
  for (const d of [...earlier].sort((a, b) => a.date.localeCompare(b.date))) {
    if (d.date < CARRY_SINCE || d.date >= today.date || d.closed) continue;
    const open = d.tasks.filter((t) => !t.done);
    if (!open.length) continue;
    for (const t of open) {
      const k = key(t.text);
      if (have.has(k)) continue;
      have.add(k);
      add.push(carriedFrom(t.text) ? t.text : `${t.text} · с ${d.date}`);
    }
    const extra = d.extra ?? emptyExtra();
    changed.push({ ...d, tasks: d.tasks.filter((t) => t.done), extra: { ...extra, tasks: [...open.map((t) => `- [>] ${t.text}`), ...extra.tasks] } });
  }
  if (!changed.length) return [];
  return [...changed, { ...today, tasks: [...today.tasks, ...add.map((text) => ({ done: false, text }))] }];
}

const OPEN = /^(\s*-\s+)\[ \](\s+.*)$/;

/** The body of `## Задачи`: [start, end) line indexes, or undefined. */
function tasksRange(lines: string[]): [number, number] | undefined {
  const at = lines.findIndex((l) => /^## Задачи\s*$/.test(l));
  if (at < 0) return undefined;
  let end = lines.findIndex((l, i) => i > at && /^## /.test(l));
  if (end < 0) end = lines.length;
  return [at + 1, end];
}

/** The open checklist lines of a goals file's `## Задачи`. */
export function openWeekTasks(content: string): string[] {
  const lines = content.split("\n");
  const r = tasksRange(lines);
  if (!r) return [];
  return lines.slice(r[0], r[1]).map((l) => l.match(OPEN)?.[2].trim()).filter((t): t is string => !!t);
}

/** Every open line of `## Задачи` becomes `- [>]`. */
export function markMoved(content: string): string {
  const lines = content.split("\n");
  const r = tasksRange(lines);
  if (!r) return content;
  for (let i = r[0]; i < r[1]; i++) lines[i] = lines[i].replace(OPEN, "$1[>]$2");
  return lines.join("\n");
}

const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** A week file the bot creates when Claude has not: frontmatter, the title and the two headings. */
export function newWeekFile(weekKey: string, from: string, to: string): string {
  const d = (s: string) => Number(s.slice(8));
  const span = from.slice(5, 7) === to.slice(5, 7)
    ? `${d(from)}–${d(to)} ${MONTHS_GEN[Number(to.slice(5, 7)) - 1]}`
    : `${d(from)} ${MONTHS_GEN[Number(from.slice(5, 7)) - 1]} – ${d(to)} ${MONTHS_GEN[Number(to.slice(5, 7)) - 1]}`;
  return `---\ntype: goals\nperiod: week\nfrom: ${from}\nto: ${to}\n---\n# Неделя ${Number(weekKey.slice(-2))} — ${span}\n\n## Цели\n\n- *(цели недели — словами Эльдара)*\n\n## Задачи\n`;
}

/** `tasks` go to the end of `## Задачи` (made before `## Фокус` or at the end when missing), skipping ones already there. */
export function appendTasks(content: string, tasks: string[]): string {
  const lines = content.replace(/\n+$/, "").split("\n");
  let r = tasksRange(lines);
  if (!r) {
    const focus = lines.findIndex((l) => /^## Фокус\s*$/.test(l));
    const at = focus < 0 ? lines.length : focus;
    lines.splice(at, 0, ...(at > 0 && lines[at - 1].trim() ? [""] : []), "## Задачи", ...(focus < 0 ? [] : [""]));
    r = tasksRange(lines)!;
  }
  const have = new Set(lines.slice(r[0], r[1]).map((l) => l.match(/^\s*-\s+\[.\]\s+(.*)$/)?.[1]).filter((t): t is string => !!t).map(key));
  const add = tasks.filter((t) => !have.has(key(t))).map((t) => `- [ ] ${t}`);
  let end = r[1];
  while (end > r[0] && !lines[end - 1].trim()) end--; // after the last line of the section, not after its blank tail
  lines.splice(end, 0, ...add);
  return lines.join("\n") + "\n";
}

/**
 * The open tasks of earlier week files move into the current one. `weeks` is
 * every week file by key (`2026-W45`); only weeks that end on or after
 * CARRY_SINCE give tasks. Returns the files to write, by key.
 */
export function carryWeeks(weeks: Map<string, string>, curKey: string, from: string, to: string): Map<string, string> {
  const out = new Map<string, string>();
  const add: string[] = [];
  for (const [k, c] of [...weeks].sort(([a], [b]) => a.localeCompare(b))) {
    if (k >= curKey) continue;
    const end = c.match(/^to:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (!end || end < CARRY_SINCE) continue;
    const open = openWeekTasks(c);
    if (!open.length) continue;
    add.push(...open.map((t) => (carriedFrom(t) ? t : `${t} · с ${k}`)));
    out.set(k, markMoved(c));
  }
  if (!add.length) return out;
  out.set(curKey, appendTasks(weeks.get(curKey) ?? newWeekFile(curKey, from, to), add));
  return out;
}
