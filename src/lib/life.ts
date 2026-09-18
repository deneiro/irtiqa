/**
 * The `life/` zone: the app's own state, kept as markdown in the vault.
 * Format contract: vault `CLAUDE.md`, `## life/`, and the v1 spec.
 *
 * Everything here is pure. Reading comes from the vault scan, writing goes
 * through store helpers. Numbers such as streaks, XP and spending are
 * computed from day files and never stored.
 */
import type { MdFile } from "./types";
import { EVENT_DIR, parseEvent, type LifeEvent } from "./events";
import { AUDIT_DIR, parseAudit, type Audit } from "./audit";
import { SKILL_DIR, parseSkill, type Skill } from "./skills";
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

/**
 * One meal. Eldar's pancreatitis makes *when* he ate as medical as *what*:
 * nothing after 21:00 is a hard boundary from his own health overview.
 */
export interface Meal {
  time: string; // HH:MM, may be empty
  what: string;
  note: string;
}

export const LATE_MEAL_HOUR = 21;

/** "8:30", "830", "8.30", "8" → "08:30" / "08:00". Empty when it makes no sense. */
export function normalizeTime(raw: string): string {
  const t = raw.trim().replace(/[.,\s]/g, ":");
  const m = t.match(/^(\d{1,2}):?(\d{2})$/) ?? t.match(/^(\d{1,2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function isLateMeal(m: Meal): boolean {
  const h = Number(m.time.slice(0, 2));
  return Number.isFinite(h) && /^\d{2}:\d{2}$/.test(m.time) && h >= LATE_MEAL_HOUR;
}

export interface Session {
  quest: string;
  minutes: number;
  /** HH:MM the timer started; absent on old rows and hand-entered minutes. */
  at?: string;
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
  /** Body measurements, written on the days they are taken — not every day. */
  weight: number | undefined;
  pushups: number | undefined;
  pullups: number | undefined;
  closed: boolean;
  done: string[]; // ## Сделано bullets
  txs: Tx[]; // ## Деньги rows
  meals: Meal[]; // ## Еда rows
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
  amount: number; // what was borrowed
  paid: number; // how much of it has come back
  currency: string;
  since: string;
  note: string;
  closed: string | undefined; // date when settled
}

export function debtLeft(d: Debt): number {
  return Math.max(0, d.amount - d.paid);
}

/** The name a debt row points at, without the wikilink brackets. */
export function debtWho(d: Debt): string {
  const m = d.who.match(/^\[\[([^\]|#]+)/);
  return (m ? m[1] : d.who).trim();
}

export interface PersonDebt {
  who: string;
  direction: string;
  left: number;
  count: number;
  oldest: string;
}

/** One line per person, which is how a debt is actually carried in the head. */
export function debtsByPerson(debts: Debt[]): PersonDebt[] {
  const m = new Map<string, PersonDebt>();
  for (const d of debts) {
    if (d.closed || debtLeft(d) === 0) continue;
    const key = `${debtWho(d)}|${d.direction}`;
    const cur = m.get(key) ?? { who: debtWho(d), direction: d.direction, left: 0, count: 0, oldest: d.since };
    cur.left += debtLeft(d);
    cur.count++;
    if (d.since && (!cur.oldest || d.since < cur.oldest)) cur.oldest = d.since;
    m.set(key, cur);
  }
  return [...m.values()].sort((a, b) => b.left - a.left);
}

/**
 * Pay part of what is owed to one person. Money goes against the oldest debts
 * first, the way a real settlement works, and anything fully covered closes.
 */
export function payPersonDebts(debts: Debt[], who: string, direction: string, amount: number, today: string): { rows: Debt[]; applied: number } {
  let rest = Math.max(0, Math.round(amount));
  const applied = rest;
  const rows = debts
    .map((d) => ({ d, key: debtWho(d) === who && d.direction === direction && !d.closed && debtLeft(d) > 0 }))
    .sort((a, b) => (a.key === b.key ? (a.d.since || "").localeCompare(b.d.since || "") : a.key ? -1 : 1))
    .map(({ d, key }) => {
      if (!key || rest <= 0) return d;
      const take = Math.min(rest, debtLeft(d));
      rest -= take;
      const paid = d.paid + take;
      return { ...d, paid, closed: paid >= d.amount ? today : d.closed };
    });
  // keep the original order of rows, not the sorted one
  const byRef = new Map(rows.map((r, i) => [i, r]));
  void byRef;
  return { rows, applied: applied - rest };
}

export interface Life {
  events: LifeEvent[];
  skills: Skill[];
  habits: Habit[];
  quests: Quest[];
  days: Map<string, Day>;
  accounts: AccountRow[] | null; // null = no accounts.md yet
  subscriptions: Subscription[];
  debts: Debt[];
  /** Raw text of `life/health.md`; parsed by lib/health.ts. */
  health: string | null;
  /** Raw text of `life/talks.md`; parsed by lib/talks.ts. */
  talks: string | null;
  /** Raw text of `life/jobs.md`; parsed by lib/jobs.ts. */
  jobs: string | null;
  /** Raw text of `life/wishes.md`; parsed by lib/wishes.ts. */
  wishes: string | null;
  /** Raw text of `life/calendar.md`; parsed by lib/calendar.ts. */
  calendar: string | null;
  audits: Audit[];
}

export const DAY_DIR = "life/days";
export const HABIT_DIR = "life/habits";
export const QUEST_DIR = "life/quests";
export const ACCOUNTS_REL = "life/finance/accounts.md";
export const SUBS_REL = "life/finance/subscriptions.md";
export const DEBTS_REL = "life/finance/debts.md";
export const HEALTH_REL = "life/health.md";
export const TALKS_REL = "life/talks.md";
export const JOBS_REL = "life/jobs.md";
export const WISHES_REL = "life/wishes.md";
export const CALENDAR_FILE = "life/calendar.md";

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
/** One line of a quest's own journal: what was done, and how long it took. */
export interface QuestEntry {
  date: string;
  minutes: number;
  note: string;
}

const QUEST_LOG_HEAD = "## Журнал";

/** The journal lives in the quest file, under `## Журнал`, newest last. */
export function questJournal(body: string): QuestEntry[] {
  const at = body.indexOf(QUEST_LOG_HEAD);
  if (at < 0) return [];
  const out: QuestEntry[] = [];
  for (const line of body.slice(at + QUEST_LOG_HEAD.length).split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*(\d{4}-\d{2}-\d{2})\s*·\s*(\d+)\s*мин\s*—\s*(.*)$/);
    if (m) out.push({ date: m[1], minutes: Number(m[2]), note: m[3].trim() });
  }
  return out;
}

/** Everything above the journal: the quest's own description. */
export function questDescription(body: string): string {
  const at = body.indexOf(QUEST_LOG_HEAD);
  return (at < 0 ? body : body.slice(0, at)).trim();
}

export function withQuestEntry(body: string, e: QuestEntry): string {
  const line = `- ${e.date} · ${e.minutes} мин — ${e.note.replace(/\s+/g, " ").trim()}`;
  const at = body.indexOf(QUEST_LOG_HEAD);
  if (at < 0) return `${body.trim()}\n\n${QUEST_LOG_HEAD}\n${line}\n`;
  return `${body.replace(/\s+$/, "")}\n${line}\n`;
}

export function withQuestDescription(body: string, description: string): string {
  const at = body.indexOf(QUEST_LOG_HEAD);
  const tail = at < 0 ? "" : "\n\n" + body.slice(at).trim() + "\n";
  return description.trim() + tail;
}

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
const H_FOOD = /^##\s*(Еда|Food)\s*$/i;

function sections(body: string): { done: string[]; txs: Tx[]; meals: Meal[]; journal: string } {
  const lines = body.split(/\r?\n/);
  let cur: "done" | "money" | "food" | "journal" | null = null;
  const done: string[] = [];
  const txs: Tx[] = [];
  const meals: Meal[] = [];
  const journal: string[] = [];
  for (const line of lines) {
    if (H_DONE.test(line)) { cur = "done"; continue; }
    if (H_MONEY.test(line)) { cur = "money"; continue; }
    if (H_FOOD.test(line)) { cur = "food"; continue; }
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
    } else if (cur === "food") {
      const t = line.trim();
      if (!t.startsWith("|")) continue;
      const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
      if (cells.length < 2) continue;
      if (/^:?-+:?$/.test(cells[0]) || cells[0] === "Время") continue;
      if (!cells[1]) continue;
      meals.push({ time: cells[0], what: cells[1], note: cells[2] ?? "" });
    } else if (cur === "journal") {
      journal.push(line);
    }
  }
  return { done, txs, meals, journal: journal.join("\n").trim() };
}

export function parseDay(f: MdFile): Day {
  const { fm, body } = parseFrontmatter(f.content);
  const file = f.rel.split("/").pop()!.replace(/\.md$/i, "");
  const s = sections(body);
  const sessions: Session[] = list(fm.sessions).map((x) => {
    const m = x.match(/^(.*?):\s*(\d+)(?:\s*@\s*(\d{1,2}:\d{2}))?\s*$/);
    if (!m) return { quest: x, minutes: 0 };
    const at = m[3] ? normalizeTime(m[3]) : "";
    return at ? { quest: m[1].trim(), minutes: Number(m[2]), at } : { quest: m[1].trim(), minutes: Number(m[2]) };
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
    weight: num(fm.weight),
    pushups: num(fm.pushups),
    pullups: num(fm.pullups),
    closed: fm.closed === true || String(fm.closed).toLowerCase() === "true",
    done: s.done,
    txs: s.txs,
    meals: s.meals,
    journal: s.journal,
  };
}

export function emptyDay(date: string): Day {
  return {
    date, habitsDone: [], habitsFailed: [], habitsSkipped: [], questsClosed: [], sessions: [],
    mood: undefined, stress: undefined, weight: undefined, pushups: undefined, pullups: undefined,
    closed: false, done: [], txs: [], meals: [], journal: "",
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
    `sessions: ${yamlList(d.sessions.map((s) => `${s.quest}: ${s.minutes}${s.at ? ` @${s.at}` : ""}`))}`,
    `work_minutes: ${workMinutesOf(d)}`,
    `spent: ${fmtAmount(spentOf(d))}`,
    `earned: ${fmtAmount(earnedOf(d))}`,
  ];
  if (d.mood !== undefined) fm.push(`mood: ${d.mood}`);
  if (d.stress !== undefined) fm.push(`stress: ${d.stress}`);
  if (d.weight !== undefined) fm.push(`weight: ${d.weight}`);
  if (d.pushups !== undefined) fm.push(`pushups: ${d.pushups}`);
  if (d.pullups !== undefined) fm.push(`pullups: ${d.pullups}`);
  fm.push(`closed: ${d.closed}`, "---");

  const body: string[] = ["## Сделано"];
  for (const x of d.done) body.push(`- ${x}`);
  body.push("", "## Деньги");
  if (d.txs.length) {
    body.push("| Сумма | Категория | Счёт | Заметка |", "|---|---|---|---|");
    for (const t of d.txs) body.push(`| ${fmtAmount(t.amount)} | ${t.category} | ${t.account} | ${t.note} |`);
  }
  body.push("", "## Еда");
  if (d.meals.length) {
    body.push("| Время | Что | Заметка |", "|---|---|---|");
    for (const m of d.meals) body.push(`| ${m.time} | ${m.what} | ${m.note} |`);
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
/**
 * The stored balance is an anchor — what the account held at the START of
 * `asOf`. The live balance adds every transaction from that day onward, so a
 * expense shows up the moment it is written instead of waiting for the day to
 * close. Nothing is ever applied twice, because nothing is applied at all.
 */
export function liveBalance(a: AccountRow, days: Map<string, Day>): number {
  let sum = a.balance;
  for (const [date, d] of days) {
    if (a.asOf && date < a.asOf) continue;
    for (const t of d.txs) if (t.account.trim() === a.name) sum += t.amount;
  }
  return sum;
}

/** @deprecated balances are computed by liveBalance; kept for older day files. */
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
    // Column 6 used to be the note; it is the paid-so-far figure now. Old files
    // have text there, so a number decides which layout this row is in.
    const sixth = num(cells[5]);
    const hasPaid = sixth !== undefined && (cells[5] ?? "").trim() !== "";
    const paid = hasPaid ? sixth : 0;
    const note = hasPaid ? cells[6] ?? "" : cells[5] ?? "";
    const closedCell = hasPaid ? cells[7] : cells[6];
    debts.push({
      who: cells[0], direction: cells[1] ?? "", amount, paid, currency: cells[3] ?? "", since: cells[4] ?? "", note,
      closed: closedSection ? (closedCell || "—") : undefined,
    });
  }
  return debts;
}

export function serializeDebts(debts: Debt[], date: string): string {
  const open = debts.filter((d) => !d.closed);
  const closed = debts.filter((d) => d.closed);
  const out = [...ledgerHead("Долги", date), "## Открытые", "", "| Кто | Направление | Сумма | Валюта | С даты | Внесено | Заметка |", "|---|---|---|---|---|---|---|"];
  for (const d of open) out.push(`| ${d.who} | ${d.direction} | ${fmtAmount(d.amount)} | ${d.currency} | ${d.since} | ${fmtAmount(d.paid)} | ${d.note} |`);
  out.push("", "## Закрытые", "", "| Кто | Направление | Сумма | Валюта | С даты | Внесено | Заметка | Закрыт |", "|---|---|---|---|---|---|---|---|");
  for (const d of closed) out.push(`| ${d.who} | ${d.direction} | ${fmtAmount(d.amount)} | ${d.currency} | ${d.since} | ${fmtAmount(d.paid)} | ${d.note} | ${d.closed} |`);
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
  /** Resource pages marked `read: <date>` — one entry per page. */
  reads?: { date: string; theme: string | undefined }[];
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
  for (const r of ctx.reads ?? []) if (r.date === d.date) add(r.theme, XP.resourceRead);
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

export function buildLife(files: MdFile[], media: string[] = []): Life {
  const events: LifeEvent[] = [];
  const skills: Skill[] = [];
  const habits: Habit[] = [];
  const quests: Quest[] = [];
  const days = new Map<string, Day>();
  let accounts: AccountRow[] | null = null;
  let subscriptions: Subscription[] = [];
  let debts: Debt[] = [];
  let health: string | null = null;
  let talks: string | null = null;
  let jobs: string | null = null;
  let wishes: string | null = null;
  let calendar: string | null = null;
  const audits: Audit[] = [];
  for (const f of files) {
    if (f.rel.startsWith(HABIT_DIR + "/")) habits.push(parseHabit(f));
    else if (f.rel.startsWith(QUEST_DIR + "/")) quests.push(parseQuest(f));
    else if (f.rel.startsWith(DAY_DIR + "/")) { const d = parseDay(f); days.set(d.date, d); }
    else if (f.rel.startsWith(EVENT_DIR + "/")) events.push(parseEvent(f, media));
    else if (f.rel.startsWith(SKILL_DIR + "/")) skills.push(parseSkill(f));
    else if (f.rel === ACCOUNTS_REL) accounts = parseAccounts(f.content);
    else if (f.rel === SUBS_REL) subscriptions = parseSubscriptions(f.content);
    else if (f.rel === DEBTS_REL) debts = parseDebts(f.content);
    else if (f.rel === HEALTH_REL) health = f.content;
    else if (f.rel === TALKS_REL) talks = f.content;
    else if (f.rel === JOBS_REL) jobs = f.content;
    else if (f.rel === WISHES_REL) wishes = f.content;
    else if (f.rel === CALENDAR_FILE) calendar = f.content;
    else if (f.rel.startsWith(AUDIT_DIR + "/")) audits.push(parseAudit(f));
  }
  habits.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  quests.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title, "ru"));
  events.sort((a, b) => b.date.localeCompare(a.date));
  skills.sort((a, b) => b.level - a.level || a.title.localeCompare(b.title));
  audits.sort((a, b) => b.date.localeCompare(a.date));
  return { events, skills, habits, quests, days, accounts, subscriptions, debts, health, talks, jobs, wishes, calendar, audits };
}
