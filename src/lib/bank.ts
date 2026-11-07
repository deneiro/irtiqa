/**
 * The task bank: `life/goals/Банк/*.md`, one file per theme. A pyramid of four
 * levels with IDs — I `D01` (`## `), II `D01.1` (`### `), III `D01.1.1`
 * (`#### `), IV `D01.1.1.1` (a checklist line `- [ ] **ID** текст`). A short
 * II may hold its tasks directly. Every item may carry a card: `нужно:` and
 * `деньги:` lines — right under a heading, or indented under a task.
 *
 * Progress is counted on the direct children: a task counts when it is ticked
 * (in the bank, or by its ID in any week or day file), a heading when it is
 * closed (`✓ YYYY-MM-DD` at the end of its line). A heading can be closed only
 * when every child counts — 100 %.
 */

export type BankLevel = 1 | 2 | 3 | 4;

export interface BankItem {
  id: string;
  /** I…IV: a heading by its depth, a task one below its heading. */
  level: BankLevel;
  title: string;
  task: boolean;
  /** A task: ticked. A heading: closed. */
  done: boolean;
  /** The date of the ✓ on a closed heading or a ticked task, when written. */
  doneOn: string | undefined;
  after: string | undefined;
  need: string | undefined;
  money: string | undefined;
  /** `*курсив*` lines and other paragraphs under a heading. */
  notes: string[];
  children: BankItem[];
  /** The bank file (vault-relative) and the theme name from its frontmatter. */
  rel: string;
  theme: string | undefined;
}

export interface BankFile { rel: string; title: string; theme: string | undefined; goals: BankItem[] }

const ID = /^([A-Z]\d{2}(?:\.\d+)*)\.?\s+(.*)$/;
const DONE_MARK = /\s*✓\s*(\d{4}-\d{2}-\d{2})\s*$/;
const TASK = /^-\s+\[([ xX])\]\s+\*\*([A-Z]\d{2}(?:\.\d+)*)\*\*\s*(.*)$/;
const FIELD = /^(нужно|деньги):\s*(.*)$/;

const fmValue = (content: string, key: string) => content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();

/** «Освоить чтение · после: D01.1» → title and predecessors. */
function splitAfter(s: string): { title: string; after: string | undefined } {
  const m = s.match(/^(.*?)\s+·\s+после:\s*(.*)$/);
  return m ? { title: m[1].trim(), after: m[2].trim() || undefined } : { title: s.trim(), after: undefined };
}

export function parseBank(rel: string, content: string): BankFile {
  const theme = fmValue(content, "theme");
  const body = content.replace(/^---[\s\S]*?\n---\n?/, "");
  const goals: BankItem[] = [];
  const stack: BankItem[] = []; // headings, by level
  let last: BankItem | undefined; // the item the next field line belongs to
  let lastIsTask = false;
  const node = (id: string, level: BankLevel, raw: string, task: boolean, done: boolean): BankItem => {
    const dm = raw.match(DONE_MARK);
    const { title, after } = splitAfter(raw.replace(DONE_MARK, ""));
    return { id, level, title, task, done: task ? done : !!dm, doneOn: dm?.[1], after, need: undefined, money: undefined, notes: [], children: [], rel, theme };
  };
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const depth = (h[1].length - 1) as BankLevel; // ## → I, ### → II, #### → III
      const m = h[2].match(ID);
      if (!m) { last = undefined; continue; }
      const it = node(m[1], depth, m[2], false, false);
      stack.length = depth - 1;
      const parent = stack[depth - 2];
      if (depth === 1) goals.push(it);
      else if (parent) parent.children.push(it);
      else continue; // a heading with no parent above it: not part of the pyramid
      stack[depth - 1] = it;
      last = it;
      lastIsTask = false;
      continue;
    }
    const t = line.match(TASK);
    if (t) {
      const parent = stack[stack.length - 1];
      if (!parent) continue;
      const it = node(t[2], Math.min(4, parent.level + 1) as BankLevel, t[3], true, t[1] !== " ");
      parent.children.push(it);
      last = it;
      lastIsTask = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    const f = trimmed.match(FIELD);
    // A task's card lines are indented; a heading's stand flush under it.
    if (f && last && (lastIsTask ? /^\s+/.test(line) : true)) {
      if (f[1] === "нужно") last.need = f[2].trim() || undefined;
      else last.money = f[2].trim() || undefined;
      continue;
    }
    if (lastIsTask) { last = undefined; continue; } // loose text after a task belongs to no card
    if (last && !last.task && !/^-\s/.test(trimmed)) last.notes.push(trimmed);
  }
  return { rel, title: fmValue(content, "title") ?? rel, theme, goals };
}

/**
 * IDs ticked outside the bank: a week or day `## Задачи` line `- [x] **ID** …`.
 * The week picks tasks from the bank by ID, so a tick there counts here.
 */
export function tickedIds(files: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const c of files) for (const m of c.matchAll(/^\s*-\s+\[[xX]\]\s+\*\*([A-Z]\d{2}(?:\.\d+)*)\*\*/gm)) out.add(m[1]);
  return out;
}

/** Mark the tasks ticked elsewhere as done; returns the same tree. */
export function applyTicks(files: BankFile[], ticked: Set<string>): BankFile[] {
  const walk = (it: BankItem) => { if (it.task && ticked.has(it.id)) it.done = true; it.children.forEach(walk); };
  files.forEach((f) => f.goals.forEach(walk));
  return files;
}

export interface Progress { done: number; total: number; pct: number; canClose: boolean; tasksDone: number; tasksTotal: number }

/** Direct children: a ticked task or a closed heading counts. 100 % and not yet closed → may be closed. */
export function progress(it: BankItem): Progress {
  const total = it.children.length;
  const done = it.children.filter((c) => c.done).length;
  let tasksDone = 0, tasksTotal = 0;
  const walk = (x: BankItem) => { if (x.task) { tasksTotal++; if (x.done) tasksDone++; } x.children.forEach(walk); };
  it.children.forEach(walk);
  return { done, total, pct: total ? Math.round((done / total) * 100) : it.done ? 100 : 0, canClose: !it.task && !it.done && total > 0 && done === total, tasksDone, tasksTotal };
}

/** «120 000 ₸», «~50 000 ₸» → 120000, 50000; anything without a number → undefined. */
export function moneyValue(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/ /g, " ").match(/(\d[\d\s]*)(?:[.,](\d+))?\s*(млн|тыс)?/);
  if (!m) return undefined;
  let n = Number(m[1].replace(/\s/g, "") + (m[2] ? "." + m[2] : ""));
  if (m[3] === "млн") n *= 1_000_000;
  if (m[3] === "тыс") n *= 1_000;
  return Number.isFinite(n) ? n : undefined;
}

/** The money of the open tasks beneath an item: what is still to be paid. `estimated` when any of them is a «~» guess. */
export function moneyLeft(it: BankItem): { sum: number; count: number; estimated: boolean } {
  let sum = 0, count = 0, estimated = false;
  const walk = (x: BankItem) => {
    if (x.task && !x.done) {
      const v = moneyValue(x.money);
      if (v) { sum += v; count++; if (x.money!.includes("~")) estimated = true; }
    }
    x.children.forEach(walk);
  };
  it.children.forEach(walk);
  return { sum, count, estimated };
}

export const ROMAN = ["", "I", "II", "III", "IV"] as const;

export function findItem(files: BankFile[], id: string): BankItem | undefined {
  const walk = (xs: BankItem[]): BankItem | undefined => {
    for (const x of xs) { if (x.id === id) return x; const y = walk(x.children); if (y) return y; }
    return undefined;
  };
  for (const f of files) { const x = walk(f.goals); if (x) return x; }
  return undefined;
}

/** The heading line of `id` gets ` ✓ date`. Only a heading at 100 % is closed; the caller checks `progress().canClose`. */
export function closeHeading(content: string, id: string, date: string): string {
  const esc = id.replace(/\./g, "\\.");
  const re = new RegExp(`^(#{2,4}\\s+${esc}\\.?\\s[^\\n]*?)\\s*$`, "m");
  if (!re.test(content)) throw new Error(`no heading ${id}`);
  return content.replace(re, (_m, line: string) => (DONE_MARK.test(line) ? line : `${line} ✓ ${date}`));
}

export const BANK_PREFIX = "Банк/"; // the key of a bank file in `life.goals`: `Банк/<file name>`

/**
 * Every bank file from `life.goals`, with the tasks ticked by ID in any week,
 * month or day file counted as done. `dayLines` are the day files' task lines
 * (`- [x] **ID** …`), rebuilt by the caller from the parsed days.
 */
export function loadBank(goals: Map<string, string>, dayLines: string[] = []): BankFile[] {
  const files: BankFile[] = [];
  const outside: string[] = [...dayLines];
  for (const [k, c] of goals) {
    if (k.startsWith(BANK_PREFIX)) files.push(parseBank(`life/goals/${k}.md`, c));
    else outside.push(c);
  }
  files.sort((a, b) => (a.goals[0]?.id ?? a.rel).localeCompare(b.goals[0]?.id ?? b.rel));
  return applyTicks(files, tickedIds(outside));
}

/** `**F01.1.1.1** Узнать сумму — [[Банк]]` → the bank ID and the rest. */
export function taskId(text: string): { id: string | undefined; rest: string } {
  const m = text.match(/^\*\*([A-Z]\d{2}(?:\.\d+)*)\*\*\s*(.*)$/);
  return m ? { id: m[1], rest: m[2] } : { id: undefined, rest: text };
}

/** The order of the themes in the pyramid, by the letter of their IDs. */
export const BANK_THEME_ORDER = ["D", "O", "L", "Z", "F", "S", "B", "V"];
