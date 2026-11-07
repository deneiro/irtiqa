/**
 * What he picked from the task bank (Eldar, 2026-11-08): up to five level-IV
 * tasks for the week (the week file's `## Задачи`), and the level-III results
 * for the month (the month file's `## Задачи`, `- [ ] **D01.1.1** …`).
 *
 * The three columns of a theme page come only from these (the same day):
 * «Где был» — the theme's IV tasks done; «Где стою» — its IV tasks of this
 * week still open; «Куда иду» — its III results picked for this month. Nothing
 * picked → the column is empty, not filled with something else.
 */
import { findItem, progress, taskId, type BankFile, type BankItem } from "./bank";
export { appendTasks } from "./carry";
import { stripCarry } from "./carry";
import { isoWeekKey, monthKey, parseGoals } from "./goals";
import type { Life } from "./life";
import type { ColumnPart } from "./overview";

export interface Pick { text: string; id: string | undefined; item: BankItem | undefined; done: boolean }

function picksOf(life: Life, bank: BankFile[], key: string): Pick[] {
  const file = life.goals.get(key);
  if (!file) return [];
  return parseGoals(key, file).tasks.map((t) => {
    const id = taskId(stripCarry(t.text)).id;
    const item = id ? findItem(bank, id) : undefined;
    return { text: t.text, id, item, done: t.done || !!item?.done };
  });
}

/** The week's tasks of the ISO week of `date`. */
export const weekPicks = (life: Life, bank: BankFile[], date: string) => picksOf(life, bank, isoWeekKey(date));

/** The month's picked results, only the lines that name a bank item. */
export const monthPicks = (life: Life, bank: BankFile[], date: string) => picksOf(life, bank, monthKey(date)).filter((p) => p.item);

/** The day a bank task was done: the ✓ in the bank, else the first day file that ticked it. */
function doneOn(life: Life, it: BankItem): string | undefined {
  if (it.doneOn) return it.doneOn;
  const tag = `**${it.id}**`;
  return [...life.days.values()].filter((d) => d.tasks.some((t) => t.done && t.text.includes(tag))).map((d) => d.date).sort()[0];
}

const walkTasks = (xs: BankItem[], out: BankItem[] = []): BankItem[] => { for (const x of xs) { if (x.task) out.push(x); walkTasks(x.children, out); } return out; };
const short = (d: string) => `${Number(d.slice(8))}.${d.slice(5, 7)}`;

export function themeColumns(life: Life, bank: BankFile[], theme: string, date: string): { past: ColumnPart[]; stand: ColumnPart[]; next: ColumnPart[] } {
  const mine = bank.filter((f) => f.theme === theme);
  const done = walkTasks(mine.flatMap((f) => f.goals)).filter((t) => t.done).map((t) => ({ t, on: doneOn(life, t) }))
    .sort((a, b) => (b.on ?? "").localeCompare(a.on ?? "")).slice(0, 7);
  const ofTheme = (p: Pick) => p.item?.theme === theme;
  const week = weekPicks(life, bank, date).filter((p) => ofTheme(p) && !p.done);
  const month = monthPicks(life, bank, date).filter((p) => ofTheme(p) && !p.item!.done);
  const part = (items: ColumnPart["items"]): ColumnPart[] => (items.length ? [{ suffix: "", items }] : []);
  return {
    past: part(done.map(({ t, on }) => ({ md: t.title, note: [t.id, on && short(on)].filter(Boolean).join(" · ") }))),
    stand: part(week.map((p) => ({ md: p.item!.title, note: p.item!.id }))),
    next: part(month.map((p) => ({ md: p.item!.title, note: `${p.item!.id} · ${progress(p.item!).pct} %` }))),
  };
}

// ---------- picking (Eldar, 2026-11-08) ----------
// «Месяц»: up to three level-III results at a time; one done → pick the next. «Неделя»: up to five level-IV tasks,
// and only from the results picked for the month — nothing picked for the month, nothing to pick for the week.

export const MONTH_MAX = 3;
export const WEEK_MAX = 5;

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

/** A results heading: one whose children are tasks (a III, or a short II that holds its tasks directly). */
export const isResult = (it: BankItem) => !it.task && it.children.some((c) => c.task);

/** Every result of the bank, file by file, in the order of the files. */
export function bankResults(bank: BankFile[]): { file: BankFile; items: BankItem[] }[] {
  const walk = (xs: BankItem[], out: BankItem[] = []): BankItem[] => { for (const x of xs) { if (isResult(x)) out.push(x); walk(x.children.filter((c) => !c.task), out); } return out; };
  return bank.map((file) => ({ file, items: walk(file.goals) })).filter((g) => g.items.length);
}

/** The line written for a pick: `**ID** title — [[Банк заданий — Тема]]`. */
export function pickLine(it: BankItem): string {
  const base = it.rel.split("/").pop()!.replace(/\.md$/, "");
  return `**${it.id}** ${it.title} — [[${base}]]`;
}

export function newMonthFile(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `---\ntype: goals\nperiod: month\nfrom: ${key}-01\nto: ${key}-${String(last).padStart(2, "0")}\n---\n# ${MONTHS[m - 1]} ${y}\n\n## Цели\n\n## Задачи\n`;
}

/** Monday and Sunday of the ISO week of `date`. */
export function weekSpan(date: string): [string, string] {
  const d = new Date(`${date}T12:00:00`);
  const wd = d.getDay() || 7;
  const at = (n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  return [at(1 - wd), at(7 - wd)];
}

/** An open pick's line leaves `## Задачи`; a done one stays — it is history. */
export function removePick(content: string, id: string): string {
  const esc = id.replace(/\./g, "\\.");
  return content.replace(new RegExp(`^\\s*-\\s+\\[ \\]\\s+\\*\\*${esc}\\*\\*.*\\n?`, "m"), "");
}

/** The tasks the week may take: the open IV tasks of the month's open picks, not yet in the week. */
export function weekCandidates(month: Pick[], week: Pick[]): { result: BankItem; tasks: BankItem[] }[] {
  const have = new Set(week.map((p) => p.id));
  return month.filter((p) => p.item && !p.done).map((p) => ({ result: p.item!, tasks: p.item!.children.filter((c) => c.task && !c.done && !have.has(c.id)) }));
}
