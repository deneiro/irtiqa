/**
 * The `life/` zone: the app's own state, kept as markdown in the vault.
 * Format contract: vault `CLAUDE.md`, `## life/`, and the v1 spec.
 *
 * Everything here is pure. Reading comes from the vault scan, writing goes
 * through store helpers. Numbers such as streaks, XP and spending are
 * computed from day files and never stored.
 */
import type { MdFile } from "./types";
import { parseFrontmatter } from "./vault";
import { WEEKDAYS_EN, WEEKDAYS_RU, addDays, weekdayIndex } from "./dates";

// ---------- types ----------

export type HabitKind = "good" | "bad";
export type HabitStatus = "proposed" | "active" | "paused" | "archived";

export interface Habit {
  rel: string;
  title: string;
  theme: string | undefined;
  kind: HabitKind;
  /** "daily" | "weekly" | list of weekday names (ru or en) */
  freq: string | string[];
  status: HabitStatus;
  created: string | undefined;
  source: string | undefined;
  body: string;
}

export type QuestStatus = "proposed" | "active" | "done" | "dropped";

export interface Quest {
  rel: string;
  title: string;
  theme: string | undefined;
  status: QuestStatus;
  created: string | undefined;
  due: string | undefined;
  project: string | undefined;
  source: string | undefined;
  body: string;
}

export interface Tx {
  amount: number; // negative = spent, positive = earned
  category: string;
  account: string;
  note: string;
}

export interface Session {
  quest: string;
  minutes: number;
}

export interface Day {
  date: string;
  habitsDone: string[];
  habitsFailed: string[];
  habitsSkipped: string[];
  questsClosed: string[];
  sessions: Session[];
  mood: number | undefined;
  stress: number | undefined;
  closed: boolean;
  done: string[]; // ## Сделано bullets
  txs: Tx[]; // ## Деньги rows
  journal: string; // ## Журнал text
}

export type DayMark = "done" | "failed" | "skipped";

export interface AccountRow {
  name: string;
  kind: string;
  balance: number;
  asOf: string;
}

export interface Subscription {
  name: string;
  amount: number; // positive; charged as a negative transaction
  account: string;
  day: number; // day of month, clamped to the month's length
  category: string;
}

export const DEBT_THEY_OWE = "мне должны";
export const DEBT_I_OWE = "я должен";

export interface Debt {
  who: string; // "[[Person]]" or plain text
  direction: string; // DEBT_THEY_OWE | DEBT_I_OWE
  amount: number;
  currency: string;
  since: string;
  note: string;
  closed: string | undefined; // date when settled
}

export interface Life {
  habits: Habit[];
  quests: Quest[];
  days: Map<string, Day>;
  accounts: AccountRow[] | null; // null = no accounts.md yet
  subscriptions: Subscription[];
  debts: Debt[];
}

export const DAY_DIR = "life/days";
export const HABIT_DIR = "life/habits";
export const QUEST_DIR = "life/quests";
export const ACCOUNTS_REL = "life/finance/accounts.md";
export const SUBS_REL = "life/finance/subscriptions.md";
export const DEBTS_REL = "life/finance/debts.md";

// ---------- small helpers ----------

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(/\s/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** YAML flow scalar: bare when safe, double-quoted otherwise. */
function yamlScalar(s: string): string {
  if (s === "" || /[,:\[\]{}#"'\n]|^\s|\s$|^[-?&*!|>%@`]/.test(s) || /^(true|false|null|~|\d+(\.\d+)?)$/i.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

function yamlList(items: string[]): string {
  return `[${items.map(yamlScalar).join(", ")}]`;
}

/** Strip what breaks filesystems or wikilinks; the rest of the title stays. */
export function safeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|#\[\]^]/g, "").trim();
}

// ---------- habits ----------

export function parseHabit(f: MdFile): Habit {
  const { fm, body } = parseFrontmatter(f.content);
  const file = f.rel.split("/").pop()!.replace(/\.md$/i, "");
  const kind = str(fm.kind) === "bad" ? "bad" : "good";
  const status = (str(fm.status) as HabitStatus | undefined) ?? "active";
  const rawFreq = fm.freq;
  const freq = Array.isArray(rawFreq) ? list(rawFreq) : (str(rawFreq) ?? "daily");
  return {
    rel: f.rel,
    title: str(fm.title) ?? file,
    theme: str(fm.theme),
    kind,
    freq,
    status: ["proposed", "active", "paused", "archived"].includes(status) ? status : "active",
    created: str(fm.created),
    source: str(fm.source),
    body: body.trim(),
  };
}

export function serializeHabit(h: Omit<Habit, "rel" | "body"> & { body?: string }): string {
  const lines = ["---", `title: ${yamlScalar(h.title)}`, "type: habit"];
  if (h.theme) lines.push(`theme: ${h.theme}`);
  lines.push(`kind: ${h.kind}`);
  lines.push(`freq: ${Array.isArray(h.freq) ? yamlList(h.freq) : h.freq}`);
  lines.push(`status: ${h.status}`);
  if (h.created) lines.push(`created: ${h.created}`);
  if (h.source) lines.push(`source: ${JSON.stringify(h.source)}`);
  lines.push("---");
  const body = (h.body ?? "").trim();
  return lines.join("\n") + "\n" + (body ? body + "\n" : "");
}

/** Is this habit expected on that date? */
export function habitDue(h: Habit, date: string): boolean {
  if (h.status !== "active") return false;
  if (h.created && date < h.created) return false; // not due before it existed
  const wd = weekdayIndex(date);
  if (Array.isArray(h.freq)) {
    const names = h.freq.map((x) => x.toLowerCase());
    return names.includes(WEEKDAYS_RU[wd]) || names.includes(WEEKDAYS_EN[wd]);
  }
  if (h.freq === "weekly") return wd === 0; // last chance of the week is Sunday
  return true; // daily
}

// ---------- quests ----------

const QUEST_STATUSES: QuestStatus[] = ["proposed", "active", "done", "dropped"];

export function parseQuest(f: MdFile): Quest {
  const { fm, body } = parseFrontmatter(f.content);
  const file = f.rel.split("/").pop()!.replace(/\.md$/i, "");
  const st = str(fm.status) as QuestStatus | undefined;
  return {
    rel: f.rel,
    title: str(fm.title) ?? file,
    theme: str(fm.theme),
    status: st && QUEST_STATUSES.includes(st) ? st : "active",
    created: str(fm.created),
    due: str(fm.due),
    project: str(fm.project),
    source: str(fm.source),
    body: body.trim(),
  };
}

export function serializeQuest(q: Omit<Quest, "rel">): string {
  const lines = ["---", `title: ${yamlScalar(q.title)}`, "type: quest"];
  if (q.theme) lines.push(`theme: ${q.theme}`);
  lines.push(`status: ${q.status}`);
  if (q.created) lines.push(`created: ${q.created}`);
  if (q.due) lines.push(`due: ${q.due}`);
  if (q.project) lines.push(`project: ${yamlScalar(q.project)}`);
  if (q.source) lines.push(`source: ${JSON.stringify(q.source)}`);
  lines.push("---");
  const body = q.body.trim();
  return lines.join("\n") + "\n" + (body ? body + "\n" : "");
}

/** Minutes logged for a quest across all days. Sessions under the minimum do not count. */
export function questMinutes(title: string, days: Iterable<Day>): number {
  let n = 0;
  for (const d of days) for (const s of d.sessions) if (s.quest === title && s.minutes >= XP.questMinMinutes) n += s.minutes;
  return n;
}

export function questXp(minutes: number): number {
  return XP.questDone + Math.round((XP.questPerHour * minutes) / 60);
}

// ---------- days ----------

const H_DONE = /^## Сделано\s*$/;
const H_MONEY = /^## Деньги\s*$/;
const H_JOURNAL = /^## Журнал\s*$/;

function sections(body: string): { done: string[]; txs: Tx[]; journal: string } {
  const lines = body.split(/\r?\n/);
  let cur: "done" | "money" | "journal" | null = null;
  const done: string[] = [];
  const txs: Tx[] = [];
  const journal: string[] = [];
  for (const line of lines) {
    if (H_DONE.test(line)) { cur = "done"; continue; }
    if (H_MONEY.test(line)) { cur = "money"; continue; }
    if (H_JOURNAL.test(line)) { cur = "journal"; continue; }
    if (/^## /.test(line)) { cur = null; continue; }
    if (cur === "done") {
      const m = line.match(/^\s*[-*]\s+(.*)$/);
      if (m && m[1].trim()) done.push(m[1].trim());
    } else if (cur === "money") {
      const t = line.trim();
      if (!t.startsWith("|")) continue;
      const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
      if (cells.length < 2) continue;
      if (/^-+$/.test(cells[0]) || cells[0] === "Сумма") continue; // separator / header
      const amount = num(cells[0]);
      if (amount === undefined) continue;
      txs.push({ amount, category: cells[1] ?? "", account: cells[2] ?? "", note: cells[3] ?? "" });
    } else if (cur === "journal") {
      journal.push(line);
    }
  }
  return { done, txs, journal: journal.join("\n").trim() };
}

export function parseDay(f: MdFile): Day {
  const { fm, body } = parseFrontmatter(f.content);
  const file = f.rel.split("/").pop()!.replace(/\.md$/i, "");
  const s = sections(body);
  const sessions: Session[] = list(fm.sessions).map((x) => {
    const m = x.match(/^(.*):\s*(\d+)\s*$/);
    return m ? { quest: m[1].trim(), minutes: Number(m[2]) } : { quest: x, minutes: 0 };
  });
  return {
    date: str(fm.date) ?? file,
    habitsDone: list(fm.habits_done),
    habitsFailed: list(fm.habits_failed),
    habitsSkipped: list(fm.habits_skipped),
    questsClosed: list(fm.quests_closed),
    sessions,
    mood: num(fm.mood),
    stress: num(fm.stress),
    closed: fm.closed === true || String(fm.closed).toLowerCase() === "true",
    done: s.done,
    txs: s.txs,
    journal: s.journal,
  };
}

export function emptyDay(date: string): Day {
  return {
    date, habitsDone: [], habitsFailed: [], habitsSkipped: [], questsClosed: [], sessions: [],
    mood: undefined, stress: undefined, closed: false, done: [], txs: [], journal: "",
  };
}

export function spentOf(d: Day): number {
  return d.txs.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
}
export function earnedOf(d: Day): number {
  return d.txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
}
export function workMinutesOf(d: Day): number {
  return d.sessions.reduce((s, x) => s + x.minutes, 0);
}

function fmtAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function serializeDay(d: Day): string {
  const fm = [
    "---",
    `date: ${d.date}`,
    "type: day",
    `habits_done: ${yamlList(d.habitsDone)}`,
    `habits_failed: ${yamlList(d.habitsFailed)}`,
    `habits_skipped: ${yamlList(d.habitsSkipped)}`,
    `quests_closed: ${yamlList(d.questsClosed)}`,
    `sessions: ${yamlList(d.sessions.map((s) => `${s.quest}: ${s.minutes}`))}`,
    `work_minutes: ${workMinutesOf(d)}`,
    `spent: ${fmtAmount(spentOf(d))}`,
    `earned: ${fmtAmount(earnedOf(d))}`,
  ];
  if (d.mood !== undefined) fm.push(`mood: ${d.mood}`);
  if (d.stress !== undefined) fm.push(`stress: ${d.stress}`);
  fm.push(`closed: ${d.closed}`, "---");

  const body: string[] = ["## Сделано"];
  for (const x of d.done) body.push(`- ${x}`);
  body.push("", "## Деньги");
  if (d.txs.length) {
    body.push("| Сумма | Категория | Счёт | Заметка |", "|---|---|---|---|");
    for (const t of d.txs) body.push(`| ${fmtAmount(t.amount)} | ${t.category} | ${t.account} | ${t.note} |`);
  }
  body.push("", "## Журнал");
  if (d.journal.trim()) body.push(d.journal.trim());
  return fm.join("\n") + "\n" + body.join("\n") + "\n";
}

export function dayRel(date: string): string {
  return `${DAY_DIR}/${date}.md`;
}

export function markOf(d: Day, habit: string): DayMark | undefined {
  if (d.habitsDone.includes(habit)) return "done";
  if (d.habitsFailed.includes(habit)) return "failed";
  if (d.habitsSkipped.includes(habit)) return "skipped";
  return undefined;
}

export function withMark(d: Day, habit: string, mark: DayMark | undefined): Day {
  const rm = (a: string[]) => a.filter((x) => x !== habit);
  const next: Day = { ...d, habitsDone: rm(d.habitsDone), habitsFailed: rm(d.habitsFailed), habitsSkipped: rm(d.habitsSkipped) };
  if (mark === "done") next.habitsDone = [...next.habitsDone, habit];
  if (mark === "failed") next.habitsFailed = [...next.habitsFailed, habit];
  if (mark === "skipped") next.habitsSkipped = [...next.habitsSkipped, habit];
  return next;
}

/** Closing: every due habit without a mark becomes `failed`. The app records misses; the player does not confess them. */
export function closeDay(d: Day, habits: Habit[]): Day {
  let next: Day = { ...d, closed: true };
  for (const h of habits) {
    if (habitDue(h, d.date) && !markOf(next, h.title)) next = withMark(next, h.title, "failed");
  }
  return next;
}

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ");
}

/** The one-line `day` entry appended to wiki/log.md. */
export function dayLogLine(d: Day, habits: Habit[]): string {
  const due = habits.filter((h) => habitDue(h, d.date)).length;
  const parts = [`привычки ${d.habitsDone.length}/${due}`];
  if (d.questsClosed.length) parts.push(`квесты ${d.questsClosed.length}`);
  const wm = workMinutesOf(d);
  if (wm) parts.push(`работа ${wm} мин`);
  parts.push(`потрачено ${fmtMoney(spentOf(d))}`);
  if (earnedOf(d)) parts.push(`получено ${fmtMoney(earnedOf(d))}`);
  if (d.mood !== undefined) parts.push(`настроение ${d.mood}`);
  return `## [${d.date}] day | ${parts.join(", ")}`;
}

// ---------- accounts ----------

const ACCOUNTS_HEADER = ["---", "type: ledger", "updated: {date}", "---", "# Счета", "", "| Счёт | Тип | Баланс | На дату |", "|---|---|---|---|"];

export function parseAccounts(content: string): AccountRow[] {
  const rows: AccountRow[] = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.length < 3 || cells[0] === "Счёт" || /^-+$/.test(cells[0])) continue;
    rows.push({ name: cells[0], kind: cells[1] ?? "", balance: num(cells[2]) ?? 0, asOf: cells[3] ?? "" });
  }
  return rows;
}

export function serializeAccounts(rows: AccountRow[], date: string): string {
  const out = ACCOUNTS_HEADER.map((l) => l.replace("{date}", date));
  for (const r of rows) out.push(`| ${r.name} | ${r.kind} | ${fmtAmount(r.balance)} | ${r.asOf} |`);
  return out.join("\n") + "\n";
}

/** Apply a day's transactions to account balances. Unknown accounts get a row. */
export function applyDayToAccounts(rows: AccountRow[], d: Day): { rows: AccountRow[]; changed: boolean } {
  const next = rows.map((r) => ({ ...r }));
  let changed = false;
  for (const t of d.txs) {
    const name = t.account.trim();
    if (!name) continue;
    let row = next.find((r) => r.name === name);
    if (!row) { row = { name, kind: "", balance: 0, asOf: "" }; next.push(row); }
    row.balance += t.amount;
    row.asOf = d.date;
    changed = true;
  }
  return { rows: next, changed };
}

// ---------- subscriptions & debts ----------

/** Every markdown table row in the file, with the H2 it sits under. Header and separator rows are dropped. */
function tableRows(content: string): { section: string; cells: string[] }[] {
  const out: { section: string; cells: string[] }[] = [];
  let section = "";
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    const h = t.match(/^## (.*)$/);
    if (h) { section = h[1].trim(); continue; }
    if (!t.startsWith("|")) continue;
    const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c) || c === "")) continue;
    out.push({ section, cells });
  }
  return out;
}

function ledgerHead(title: string, date: string): string[] {
  return ["---", "type: ledger", `updated: ${date}`, "---", `# ${title}`, ""];
}

export function parseSubscriptions(content: string): Subscription[] {
  const subs: Subscription[] = [];
  for (const { cells } of tableRows(content)) {
    if (cells[0] === "Название") continue;
    const amount = num(cells[1]);
    const day = num(cells[3]);
    if (!cells[0] || amount === undefined || day === undefined) continue;
    subs.push({ name: cells[0], amount: Math.abs(amount), account: cells[2] ?? "", day: Math.max(1, Math.min(31, Math.round(day))), category: cells[4] ?? "" });
  }
  return subs;
}

export function serializeSubscriptions(subs: Subscription[], date: string): string {
  const out = [...ledgerHead("Подписки", date), "| Название | Сумма | Счёт | День списания | Категория |", "|---|---|---|---|---|"];
  for (const x of subs) out.push(`| ${x.name} | ${fmtAmount(x.amount)} | ${x.account} | ${x.day} | ${x.category} |`);
  return out.join("\n") + "\n";
}

export function subscriptionNote(s: Subscription): string {
  return `подписка: ${s.name}`;
}

/** Subscriptions charged on `date`. A day past the month's end charges on its last day. */
export function subscriptionsDue(subs: Subscription[], date: string): Subscription[] {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return subs.filter((s) => Math.min(s.day, last) === d);
}

export function parseDebts(content: string): Debt[] {
  const debts: Debt[] = [];
  for (const { section, cells } of tableRows(content)) {
    if (cells[0] === "Кто") continue;
    const amount = num(cells[2]);
    if (!cells[0] || amount === undefined) continue;
    const closedSection = /закрыт/i.test(section);
    debts.push({
      who: cells[0], direction: cells[1] ?? "", amount, currency: cells[3] ?? "", since: cells[4] ?? "", note: cells[5] ?? "",
      closed: closedSection ? (cells[6] || "—") : undefined,
    });
  }
  return debts;
}

export function serializeDebts(debts: Debt[], date: string): string {
  const open = debts.filter((d) => !d.closed);
  const closed = debts.filter((d) => d.closed);
  const out = [...ledgerHead("Долги", date), "## Открытые", "", "| Кто | Направление | Сумма | Валюта | С даты | Заметка |", "|---|---|---|---|---|---|"];
  for (const d of open) out.push(`| ${d.who} | ${d.direction} | ${fmtAmount(d.amount)} | ${d.currency} | ${d.since} | ${d.note} |`);
  out.push("", "## Закрытые", "", "| Кто | Направление | Сумма | Валюта | С даты | Заметка | Закрыт |", "|---|---|---|---|---|---|---|");
  for (const d of closed) out.push(`| ${d.who} | ${d.direction} | ${fmtAmount(d.amount)} | ${d.currency} | ${d.since} | ${d.note} | ${d.closed} |`);
  return out.join("\n") + "\n";
}

// ---------- month views ----------

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function txsInMonth(days: Map<string, Day>, ym: string): { date: string; tx: Tx }[] {
  const out: { date: string; tx: Tx }[] = [];
  for (const [date, d] of days) if (date.startsWith(ym)) for (const tx of d.txs) out.push({ date, tx });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- derived numbers ----------

/** Consecutive days with the habit done, counting back from `upTo` (inclusive). Skipped days don't break a streak. */
export function streak(habit: string, days: Map<string, Day>, upTo: string): number {
  let n = 0;
  let cur = upTo;
  for (let i = 0; i < 3650; i++) {
    const d = days.get(cur);
    if (!d) break;
    const m = markOf(d, habit);
    if (m === "done") n++;
    else if (m === "skipped") { /* neutral */ }
    else break;
    const prev = new Date(cur + "T12:00:00");
    prev.setDate(prev.getDate() - 1);
    cur = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
  }
  return n;
}

/** Provisional XP numbers from the v1 spec. Edited in one place. */
export const XP = { habitDone: 10, journal: 8, questDone: 20, questPerHour: 55, questMinMinutes: 15, resourceRead: 10 };

export interface XpContext {
  habits: Habit[];
  quests: Quest[];
  days: Map<string, Day>;
}

export function xpForDay(d: Day, ctx: XpContext): Map<string, number> {
  const xp = new Map<string, number>();
  const add = (theme: string | undefined, n: number) => { const k = theme ?? "—"; xp.set(k, (xp.get(k) ?? 0) + n); };
  for (const name of d.habitsDone) add(ctx.habits.find((h) => h.title === name)?.theme, XP.habitDone);
  for (const name of d.questsClosed) {
    const q = ctx.quests.find((x) => x.title === name);
    add(q?.theme, questXp(questMinutes(name, ctx.days.values())));
  }
  if (d.journal.trim()) { add("Personal growth", XP.journal); add("Spirituality & Religion", XP.journal); }
  return xp;
}

/** Completion rate over the last `n` days the habit was due. */
export function habitRate(h: Habit, days: Map<string, Day>, upTo: string, n = 30): { done: number; due: number } {
  let done = 0, due = 0;
  let cur = upTo;
  for (let i = 0; i < n; i++) {
    if (habitDue(h, cur)) {
      const d = days.get(cur);
      const m = d ? markOf(d, h.title) : undefined;
      if (m !== "skipped") { due++; if (m === "done") done++; }
    }
    const prev = new Date(cur + "T12:00:00");
    prev.setDate(prev.getDate() - 1);
    cur = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
  }
  return { done, due };
}

export function bestStreak(habit: string, days: Map<string, Day>): number {
  const dates: string[] = [...days.keys()].sort();
  let best = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const date of dates) {
    const m = markOf(days.get(date)!, habit);
    if (prevDate !== null && addDays(prevDate, 1) !== date) run = 0; // a gap in the files breaks the run
    if (m === "done") { run++; best = Math.max(best, run); }
    else if (m !== "skipped") run = 0;
    prevDate = date;
  }
  return best;
}

// ---------- assembling ----------

export function buildLife(files: MdFile[]): Life {
  const habits: Habit[] = [];
  const quests: Quest[] = [];
  const days = new Map<string, Day>();
  let accounts: AccountRow[] | null = null;
  let subscriptions: Subscription[] = [];
  let debts: Debt[] = [];
  for (const f of files) {
    if (f.rel.startsWith(HABIT_DIR + "/")) habits.push(parseHabit(f));
    else if (f.rel.startsWith(QUEST_DIR + "/")) quests.push(parseQuest(f));
    else if (f.rel.startsWith(DAY_DIR + "/")) { const d = parseDay(f); days.set(d.date, d); }
    else if (f.rel === ACCOUNTS_REL) accounts = parseAccounts(f.content);
    else if (f.rel === SUBS_REL) subscriptions = parseSubscriptions(f.content);
    else if (f.rel === DEBTS_REL) debts = parseDebts(f.content);
  }
  habits.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  quests.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title, "ru"));
  return { habits, quests, days, accounts, subscriptions, debts };
}
