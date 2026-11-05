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

/**
 * `prayer` (schema 3.7, Eldar 2026-10-11): the five prayers, Witr and Jumu'ah.
 * Not a habit — shown as a row of cells with three states (on time · late ·
 * missed), never as a streak. `bad` is what he wants to stop; `good` is what he
 * is building.
 */
export type HabitKind = "good" | "bad" | "prayer";
export type HabitStatus = "proposed" | "active" | "paused" | "archived";
/**
 * When in the day a habit is done (Eldar, 2026-10-03). The day opens at
 * maghrib, so the order is evening, morning, lunch. No `time:` means the whole
 * day: a bad habit, or one with no fixed moment. The bot sends each part at its
 * prayer and everything once an hour before maghrib.
 */
export type HabitTime = "вечер" | "утро" | "обед";
export const HABIT_TIMES: HabitTime[] = ["вечер", "утро", "обед"];

export interface Habit {
  rel: string;
  title: string;
  theme: string | undefined;
  kind: HabitKind;
  /** "daily" | "weekly" | list of weekday names (ru or en) */
  freq: string | string[];
  /** Part of the day; undefined is the whole day. */
  time?: HabitTime;
  status: HabitStatus;
  created: string | undefined;
  source: string | undefined;
  /** Bad habits: `clean_since:` — the day he stopped, in his words. Read only; kept through a rewrite by `extraFm`. */
  cleanSince?: string;
  body: string;
  /** Frontmatter keys the app does not model, carried through a rewrite untouched. */
  extraFm?: string[];
}

/**
 * Schema 4.1 (2026-11-02): «квест» became «деятельность» — one file per
 * ongoing thing in `life/activities/`, statuses `active | paused | done`.
 * The type keeps the old name in code; the old values `proposed`, `passive`,
 * `dropped` are still parsed so the files in `life/archive/quests/` read.
 */
export type QuestStatus = "active" | "paused" | "done" | "proposed" | "passive" | "dropped";

export interface Quest {
  rel: string;
  title: string;
  theme: string | undefined;
  status: QuestStatus;
  created: string | undefined;
  due: string | undefined;
  project: string | undefined;
  source: string | undefined;
  /** 4.1: the goal this activity moves, e.g. `"[[2026]] · 2 000 000 ₸/мес"`. */
  goal?: string | undefined;
  /** 4.1: `каждый день`, `пн–пт`, `раз в неделю`. */
  cadence?: string | undefined;
  body: string;
  /** Frontmatter keys the app does not model, carried through a rewrite untouched. */
  extraFm?: string[];
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
  /** A prayer read, but not on time (schema 3.7). Written only when non-empty. */
  habitsLate: string[];
  questsClosed: string[];
  sessions: Session[];
  mood: number | undefined;
  stress: number | undefined;
  /** Body measurements, written on the days they are taken — not every day. */
  weight: number | undefined;
  pushups: number | undefined;
  pullups: number | undefined;
  closed: boolean;
  /** 4.1: `## Задачи` — the day's checklist, first in the body. Claude and the bot's morning question write it from Eldar's words; the bot's evening survey ticks it. */
  tasks: DayTask[];
  done: string[]; // ## Сделано bullets
  txs: Tx[]; // ## Деньги rows
  meals: Meal[]; // ## Еда rows
  journal: string; // ## Журнал text
  /** What the file holds that the app does not model; written back untouched. */
  extra?: DayExtra;
}

/**
 * The parts of a day file the app does not understand. A day file is written
 * by the app, the bot, Claude and by hand in Obsidian, so a rewrite must never
 * drop a line just because no field holds it.
 */
export interface DayExtra {
  /** Frontmatter keys the app does not own, verbatim with their continuation lines. */
  fm: string[];
  /** Text between the frontmatter and the first `##` heading. */
  lead: string[];
  /** Lines inside the known sections that did not parse, kept in their section. */
  tasks: string[];
  done: string[];
  money: string[];
  food: string[];
  /** Sections the app does not know, verbatim with their headings. */
  tail: string[];
}

export interface DayTask { done: boolean; text: string }

export type DayMark = "done" | "failed" | "skipped" | "late";

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
  /**
   * Paid by a linked credit instalment (`взнос: <подписка>` in the note):
   * computed from the day files on every scan, never written to «Внесено»,
   * so a rewrite of debts.md cannot count it twice.
   */
  auto?: number;
}

export function debtLeft(d: Debt): number {
  return Math.max(0, d.amount - d.paid - (d.auto ?? 0));
}

/**
 * Spellings of one money category, merged for counting (Eldar, 2026-09-21):
 * fuel is transport. Keys are lower case with ё as е. Day files keep what was
 * typed; only the totals and the bot's suggestions use the merged name.
 */
export const CATEGORY_ALIASES: Record<string, string> = { "бенза": "транспорт", "бензин": "транспорт" };

/** The category a transaction counts under: its alias, else its own name. */
export function categoryName(label: string): string {
  const k = label.trim().toLowerCase().replace(/ё/g, "е");
  return CATEGORY_ALIASES[k] ?? label.trim();
}

/** A person's debt links to their page; a bank's or an MFO's is plain text. */
export function isInstitution(d: Debt): boolean {
  return !/^\[\[/.test(d.who.trim());
}

/** The subscription whose charges pay this row down, from «взнос: Кредит 25к (7-го)» in its note. */
export function instalmentOf(d: Debt): string | undefined {
  return d.note.match(/взнос:\s*([^;]+)/)?.[1].trim() || undefined;
}

/**
 * Credit instalments reduce the row they are linked to, from the row's date on.
 * The charge itself is the transaction the subscription posts: category «долг»,
 * note «подписка: <name>».
 */
export function applyInstalments(debts: Debt[], days: Map<string, Day>): Debt[] {
  return debts.map((d) => {
    const sub = instalmentOf(d);
    if (!sub) return d;
    let auto = 0;
    for (const [date, day] of days) {
      if (d.since && date < d.since) continue;
      for (const t of day.txs) {
        if (t.amount < 0 && t.category.trim().toLowerCase() === "долг" && t.note.trim() === `подписка: ${sub}`) auto -= t.amount;
      }
    }
    return auto ? { ...d, auto } : d;
  });
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
      return { ...d, paid, closed: debtLeft({ ...d, paid }) === 0 ? today : d.closed };
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
  /** Raw text of `life/library.md`; parsed by lib/library.ts. */
  library: string | null;
  /** Raw text of `life/calendar.md`; parsed by lib/calendar.ts. */
  calendar: string | null;
  /** Raw text of `life/now.md`; «Главный» reads the waiting list from it (spec v3). */
  now: string | null;
  audits: Audit[];
  /** `life/goals/<период>.md` by period key (`2026-W42`, `2026-10`); parsed by lib/goals.ts. */
  goals: Map<string, string>;
}

export const DAY_DIR = "life/days";
export const HABIT_DIR = "life/habits";
export const QUEST_DIR = "life/activities";
export const ACCOUNTS_REL = "life/finance/accounts.md";
export const SUBS_REL = "life/finance/subscriptions.md";
export const DEBTS_REL = "life/finance/debts.md";
export const HEALTH_REL = "life/health.md";
export const NOW_REL = "life/now.md";
export const TALKS_REL = "life/talks.md";
export const JOBS_REL = "life/jobs.md";
export const WISHES_REL = "life/wishes.md";
export const LIBRARY_REL = "life/library.md";
export const CALENDAR_FILE = "life/calendar.md";
export const GOALS_DIR = "life/goals";

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

/**
 * A money amount as people actually type it: `-12 400`, `−500` (typographic
 * minus), `2000 ₸`, `12,400` (comma thousands) or `12,5` (comma decimal).
 * Undefined when it is not a number, so a caller can keep the text instead of
 * inventing a zero.
 */
export function parseAmount(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  let s = String(v).replace(/[\s\u00a0\u202f]/g, "").replace(/[−–—]/g, "-").replace(/₸|тг\.?|kzt/gi, "");
  if (!s) return undefined;
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^[+-]?\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return undefined;
  const n = Number(s);
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
  const rawKind = str(fm.kind);
  const kind: HabitKind = rawKind === "bad" ? "bad" : rawKind === "prayer" ? "prayer" : "good";
  const status = (str(fm.status) as HabitStatus | undefined) ?? "active";
  const rawFreq = fm.freq;
  const freq = Array.isArray(rawFreq) ? list(rawFreq) : freqFromText(str(rawFreq));
  return {
    rel: f.rel,
    title: str(fm.title) ?? file,
    theme: str(fm.theme),
    kind,
    freq,
    time: HABIT_TIMES.find((t) => t === str(fm.time)?.toLowerCase()),
    status: ["proposed", "active", "paused", "archived"].includes(status) ? status : "active",
    created: str(fm.created),
    source: str(fm.source),
    cleanSince: str(fm.clean_since)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0],
    body: body.trim(),
    extraFm: foreignFrontmatter(f.content, HABIT_KEYS),
  };
}

const HABIT_KEYS = new Set(["title", "type", "theme", "kind", "freq", "time", "status", "created", "source"]);
const QUEST_KEYS = new Set(["title", "type", "theme", "status", "created", "due", "project", "source", "goal", "cadence"]);

/**
 * A frequency written as words — the schema's own «каждый день», «раз в
 * неделю», «пн, ср, пт», «пн–пт» — as the app models it. Used to fall back
 * to daily for anything but the two English keywords, so a Mon/Wed/Fri habit
 * was expected every day.
 */
export function freqFromText(raw: string | undefined): string | string[] {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s || /^(daily|каждый день|ежедневно)$/.test(s)) return "daily";
  if (/^(weekly|раз в неделю|еженедельно)$/.test(s)) return "weekly";
  const out: string[] = [];
  for (const part of s.split(/[,;/\s]+/).filter(Boolean)) {
    const r = part.split(/[–—-]/);
    const at = (w: string) => WEEKDAYS_RU.indexOf(w as (typeof WEEKDAYS_RU)[number]);
    if (r.length === 2 && at(r[0]) >= 0 && at(r[1]) >= 0) {
      // Monday-first range; WEEKDAYS_RU starts on Sunday.
      const order = [1, 2, 3, 4, 5, 6, 0];
      const a = order.indexOf(at(r[0])), b = order.indexOf(at(r[1]));
      if (b < a) return "daily";
      for (let i = a; i <= b; i++) out.push(WEEKDAYS_RU[order[i]]);
    } else if (at(part) >= 0) out.push(part);
    else return "daily"; // unreadable: the old behaviour, rather than a habit that is never due
  }
  return out.length ? out : "daily";
}

export function serializeHabit(h: Omit<Habit, "rel" | "body"> & { body?: string }): string {
  const lines = ["---", `title: ${yamlScalar(h.title)}`, "type: habit"];
  if (h.theme) lines.push(`theme: ${h.theme}`);
  lines.push(`kind: ${h.kind}`);
  lines.push(`freq: ${Array.isArray(h.freq) ? yamlList(h.freq) : h.freq}`);
  if (h.time) lines.push(`time: ${h.time}`);
  lines.push(`status: ${h.status}`);
  if (h.created) lines.push(`created: ${h.created}`);
  if (h.source) lines.push(`source: ${JSON.stringify(h.source)}`);
  lines.push(...(h.extraFm ?? []), "---");
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

const QUEST_STATUSES: QuestStatus[] = ["active", "paused", "done", "proposed", "passive", "dropped"];

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
    goal: str(fm.goal),
    cadence: str(fm.cadence),
    body: body.trim(),
    extraFm: foreignFrontmatter(f.content, QUEST_KEYS),
  };
}

export function serializeQuest(q: Omit<Quest, "rel">): string {
  const lines = ["---", `title: ${yamlScalar(q.title)}`, "type: activity"];
  if (q.theme) lines.push(`theme: ${q.theme}`);
  if (q.goal) lines.push(`goal: ${JSON.stringify(q.goal)}`);
  if (q.cadence) lines.push(`cadence: ${q.cadence}`);
  lines.push(`status: ${q.status}`);
  if (q.created) lines.push(`created: ${q.created}`);
  if (q.due) lines.push(`due: ${q.due}`);
  if (q.project) lines.push(`project: ${yamlScalar(q.project)}`);
  if (q.source) lines.push(`source: ${JSON.stringify(q.source)}`);
  lines.push(...(q.extraFm ?? []), "---");
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

const QUEST_STEPS_HEAD = "## Шаги";
const NOW_HEAD = /^## Сейчас\s*$/;

/**
 * 4.1: the one next step, under `## Сейчас` — the first bullet there. Claude
 * rewrites it freely; the app shows it before the `## Шаги` checklist.
 */
export function nowStep(body: string): string | undefined {
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex((l) => NOW_HEAD.test(l));
  if (at < 0) return undefined;
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) break;
    const m = l.match(/^\s*[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/);
    if (m) return m[1].trim();
    if (l.trim()) return l.trim();
  }
  return undefined;
}

/** Where the description ends: at the steps, or at the journal, whichever comes first. */
function descriptionEnd(body: string): number {
  const heads = [body.indexOf(QUEST_STEPS_HEAD), body.indexOf(QUEST_OUTCOME_HEAD), body.indexOf(QUEST_LOG_HEAD)].filter((i) => i >= 0);
  return heads.length ? Math.min(...heads) : -1;
}

/** Everything above the steps and the journal: the quest's own description. */
export function questDescription(body: string): string {
  const at = descriptionEnd(body);
  return (at < 0 ? body : body.slice(0, at)).trim();
}

/**
 * A step inside a quest: one project, small quests inside it. Stored as a markdown checklist under
 * `## Шаги`, so it reads the same in Obsidian: `- [ ] text`, indented lines under it are its detail.
 * The quest keeps one status, one timer and one journal; steps only track what is left.
 */
export interface QuestStep {
  done: boolean;
  text: string;
  detail: string;
}

function stepsBounds(body: string): { from: number; to: number } | null {
  const at = body.indexOf(QUEST_STEPS_HEAD);
  if (at < 0) return null;
  const from = at + QUEST_STEPS_HEAD.length;
  const next = body.slice(from).search(/\n## /);
  return { from, to: next < 0 ? body.length : from + next };
}

export function questSteps(body: string): QuestStep[] {
  const b = stepsBounds(body);
  if (!b) return [];
  const out: QuestStep[] = [];
  for (const line of body.slice(b.from, b.to).split(/\r?\n/)) {
    const m = line.match(/^-\s*\[( |x|X)\]\s*(.*)$/);
    if (m) { out.push({ done: m[1] !== " ", text: m[2].trim(), detail: "" }); continue; }
    const last = out[out.length - 1];
    if (last && /^\s{2,}\S/.test(line)) last.detail = (last.detail ? last.detail + "\n" : "") + line.trim();
  }
  return out;
}

function renderSteps(steps: QuestStep[]): string {
  return steps.map((s) => {
    const head = `- [${s.done ? "x" : " "}] ${s.text.replace(/\s+/g, " ").trim()}`;
    const detail = s.detail.trim() ? "\n" + s.detail.trim().split(/\r?\n/).map((l) => "  " + l.trim()).join("\n") : "";
    return head + detail;
  }).join("\n");
}

/** Rewrite the steps section in place; create it above the journal when the quest had none. */
export function withQuestSteps(body: string, steps: QuestStep[]): string {
  const section = steps.length ? `${QUEST_STEPS_HEAD}\n${renderSteps(steps)}\n` : "";
  const b = stepsBounds(body);
  if (b) {
    const start = body.indexOf(QUEST_STEPS_HEAD);
    const before = body.slice(0, start).replace(/\s+$/, "");
    const after = body.slice(b.to).replace(/^\s+/, "");
    return [before, section.trim(), after].filter(Boolean).join("\n\n") + "\n";
  }
  if (!section) return body;
  const log = body.indexOf(QUEST_LOG_HEAD);
  if (log < 0) return `${body.trim()}\n\n${section}`;
  return `${body.slice(0, log).trim()}\n\n${section}\n${body.slice(log).trim()}\n`;
}

/**
 * How a quest ended, in one line, under `## Итог` (above the journal): what
 * actually came of it. Written when a quest is closed or dropped, so «done»
 * carries a result and the overviews that mention the quest can be checked
 * against it. Two frogs were closed on 2026-09-18 with nothing settled.
 */
export const QUEST_OUTCOME_HEAD = "## Итог";
export interface QuestOutcome { date: string; kind: "done" | "dropped"; text: string }

export function questOutcome(body: string): QuestOutcome | undefined {
  const at = body.indexOf(QUEST_OUTCOME_HEAD);
  if (at < 0) return undefined;
  for (const line of body.slice(at + QUEST_OUTCOME_HEAD.length).split(/\r?\n/)) {
    if (/^## /.test(line)) break;
    const m = line.match(/^\s*-\s*(\d{4}-\d{2}-\d{2})\s*·\s*(сделан|брошен)\s*—\s*(.+)$/);
    if (m) return { date: m[1], kind: m[2] === "брошен" ? "dropped" : "done", text: m[3].trim() };
  }
  return undefined;
}

export function withQuestOutcome(body: string, o: QuestOutcome): string {
  const line = `- ${o.date} · ${o.kind === "dropped" ? "брошен" : "сделан"} — ${o.text.replace(/\s+/g, " ").trim()}`;
  const section = `${QUEST_OUTCOME_HEAD}\n${line}\n`;
  // Drop an earlier outcome (a quest reopened and closed again keeps only the last).
  let rest = body;
  const at = rest.indexOf(QUEST_OUTCOME_HEAD);
  if (at >= 0) {
    const next = rest.slice(at + QUEST_OUTCOME_HEAD.length).search(/\n## /);
    rest = rest.slice(0, at).replace(/\s+$/, "") + (next < 0 ? "" : "\n\n" + rest.slice(at + QUEST_OUTCOME_HEAD.length + next).replace(/^\s+/, ""));
  }
  const log = rest.indexOf(QUEST_LOG_HEAD);
  if (log < 0) return `${rest.trim()}\n\n${section}`;
  return `${rest.slice(0, log).trim()}\n\n${section}\n${rest.slice(log).trim()}\n`;
}

/** The first step not yet done — what the quest is waiting on. */
export function nextStep(steps: QuestStep[]): QuestStep | undefined {
  return steps.find((s) => !s.done);
}

export function withQuestEntry(body: string, e: QuestEntry): string {
  const line = `- ${e.date} · ${e.minutes} мин — ${e.note.replace(/\s+/g, " ").trim()}`;
  const at = body.indexOf(QUEST_LOG_HEAD);
  if (at < 0) return `${body.trim()}\n\n${QUEST_LOG_HEAD}\n${line}\n`;
  return `${body.replace(/\s+$/, "")}\n${line}\n`;
}

export function withQuestDescription(body: string, description: string): string {
  const at = descriptionEnd(body);
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

const H_TASKS = /^## Задачи\s*$/;
const H_DONE = /^## Сделано\s*$/;
const H_MONEY = /^## Деньги\s*$/;
const H_JOURNAL = /^## Журнал\s*$/;
const H_FOOD = /^##\s*(Еда|Food)\s*$/i;

const cellsOf = (t: string) => t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
const isSeparator = (cells: string[]) => cells.every((c) => /^:?-+:?$/.test(c) || c === "");

function sections(body: string): { tasks: DayTask[]; done: string[]; txs: Tx[]; meals: Meal[]; journal: string; extra: Omit<DayExtra, "fm"> } {
  const lines = body.split(/\r?\n/);
  let cur: "lead" | "tasks" | "done" | "money" | "food" | "journal" | "tail" = "lead";
  const tasks: DayTask[] = [];
  const done: string[] = [];
  const txs: Tx[] = [];
  const meals: Meal[] = [];
  const journal: string[] = [];
  const extra: Omit<DayExtra, "fm"> = { lead: [], tasks: [], done: [], money: [], food: [], tail: [] };
  for (const line of lines) {
    if (H_TASKS.test(line)) { cur = "tasks"; continue; }
    if (H_DONE.test(line)) { cur = "done"; continue; }
    if (H_MONEY.test(line)) { cur = "money"; continue; }
    if (H_FOOD.test(line)) { cur = "food"; continue; }
    if (H_JOURNAL.test(line)) { cur = "journal"; continue; }
    if (/^## /.test(line)) { cur = "tail"; extra.tail.push(line); continue; }
    const t = line.trim();
    if (cur === "lead") {
      extra.lead.push(line);
    } else if (cur === "tail") {
      extra.tail.push(line);
    } else if (cur === "journal") {
      journal.push(line);
    } else if (cur === "tasks") {
      const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/);
      if (m && m[2].trim()) tasks.push({ done: m[1] !== " ", text: m[2].trim() });
      else if (t) extra.tasks.push(line); // a note line («Времени в календаре нет…») is kept, not a task
    } else if (cur === "done") {
      const m = line.match(/^\s*[-*]\s+(.*)$/);
      if (m && m[1].trim()) done.push(m[1].trim());
      else if (t) extra.done.push(line);
    } else if (cur === "money") {
      if (!t) continue;
      if (!t.startsWith("|")) { extra.money.push(line); continue; }
      const cells = cellsOf(t);
      if (isSeparator(cells) || cells[0] === "Сумма") continue; // separator / header
      const amount = parseAmount(cells[0]);
      // A row the app cannot read stays in the file as it was, never dropped.
      if (amount === undefined || cells.length > 4) { extra.money.push(t); continue; }
      txs.push({ amount, category: cells[1] ?? "", account: cells[2] ?? "", note: cells[3] ?? "" });
    } else if (cur === "food") {
      if (!t) continue;
      if (!t.startsWith("|")) { extra.food.push(line); continue; }
      const cells = cellsOf(t);
      if (isSeparator(cells) || cells[0] === "Время") continue;
      if (!cells[1] || cells.length > 3) { extra.food.push(t); continue; }
      meals.push({ time: cells[0], what: cells[1], note: cells[2] ?? "" });
    }
  }
  const trimEnds = (a: string[]) => { while (a.length && !a[0].trim()) a.shift(); while (a.length && !a[a.length - 1].trim()) a.pop(); return a; };
  trimEnds(extra.lead);
  trimEnds(extra.tail);
  return { tasks, done, txs, meals, journal: journal.join("\n").trim(), extra };
}

/** Frontmatter keys the app writes itself; anything else in a day file is carried through. */
const DAY_KEYS = new Set(["date", "type", "habits_done", "habits_failed", "habits_skipped", "habits_late", "quests_closed", "sessions", "work_minutes", "spent", "earned", "mood", "stress", "weight", "pushups", "pullups", "closed"]);

function foreignFrontmatter(content: string, known: Set<string> = DAY_KEYS): string[] {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!m) return [];
  const out: string[] = [];
  let keep = false;
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([A-Za-z_][\w-]*):/);
    if (k) keep = !known.has(k[1]);
    else if (!/^\s|^-/.test(line) && line.trim()) keep = true; // a stray line: keep it rather than lose it
    if (keep) out.push(line);
  }
  return out;
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
    habitsLate: list(fm.habits_late),
    questsClosed: list(fm.quests_closed),
    sessions,
    mood: num(fm.mood),
    stress: num(fm.stress),
    weight: num(fm.weight),
    pushups: num(fm.pushups),
    pullups: num(fm.pullups),
    closed: fm.closed === true || String(fm.closed).toLowerCase() === "true",
    tasks: s.tasks,
    done: s.done,
    txs: s.txs,
    meals: s.meals,
    journal: s.journal,
    extra: { fm: foreignFrontmatter(f.content), ...s.extra },
  };
}

export function emptyDay(date: string): Day {
  return {
    date, habitsDone: [], habitsFailed: [], habitsSkipped: [], habitsLate: [], questsClosed: [], sessions: [],
    mood: undefined, stress: undefined, weight: undefined, pushups: undefined, pullups: undefined,
    closed: false, tasks: [], done: [], txs: [], meals: [], journal: "",
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
    ...(d.habitsLate.length ? [`habits_late: ${yamlList(d.habitsLate)}`] : []),
    ...(d.questsClosed.length ? [`quests_closed: ${yamlList(d.questsClosed)}`] : []), // 4.1: not written when empty
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
  fm.push(`closed: ${d.closed}`);
  const x = d.extra;
  if (x) fm.push(...x.fm);
  fm.push("---");

  // Rows the app could not read go back into their table, loose text after it.
  const rows = (a: string[]) => a.filter((l) => l.trim().startsWith("|"));
  const loose = (a: string[]) => a.filter((l) => !l.trim().startsWith("|"));
  const body: string[] = [];
  if (x?.lead.length) body.push(...x.lead, "");
  if (d.tasks.length || x?.tasks.length) {
    body.push("## Задачи");
    for (const t of d.tasks) body.push(`- [${t.done ? "x" : " "}] ${t.text}`);
    if (x?.tasks.length) body.push(...x.tasks);
    body.push("");
  }
  body.push("## Сделано");
  for (const it of d.done) body.push(`- ${it}`);
  if (x?.done.length) body.push(...x.done);
  body.push("", "## Деньги");
  const moneyRows = rows(x?.money ?? []);
  if (d.txs.length || moneyRows.length) {
    body.push("| Сумма | Категория | Счёт | Заметка |", "|---|---|---|---|");
    for (const t of d.txs) body.push(`| ${fmtAmount(t.amount)} | ${t.category} | ${t.account} | ${t.note} |`);
    body.push(...moneyRows);
  }
  if (loose(x?.money ?? []).length) body.push("", ...loose(x!.money));
  body.push("", "## Еда");
  const foodRows = rows(x?.food ?? []);
  if (d.meals.length || foodRows.length) {
    body.push("| Время | Что | Заметка |", "|---|---|---|");
    for (const m of d.meals) body.push(`| ${m.time} | ${m.what} | ${m.note} |`);
    body.push(...foodRows);
  }
  if (loose(x?.food ?? []).length) body.push("", ...loose(x!.food));
  body.push("", "## Журнал");
  if (d.journal.trim()) body.push(d.journal.trim());
  if (x?.tail.length) body.push("", ...x.tail);
  return fm.join("\n") + "\n" + body.join("\n") + "\n";
}

export function dayRel(date: string): string {
  return `${DAY_DIR}/${date}.md`;
}

export function markOf(d: Day, habit: string): DayMark | undefined {
  if (d.habitsDone.includes(habit)) return "done";
  if (d.habitsFailed.includes(habit)) return "failed";
  if (d.habitsSkipped.includes(habit)) return "skipped";
  if (d.habitsLate.includes(habit)) return "late";
  return undefined;
}

export function withMark(d: Day, habit: string, mark: DayMark | undefined): Day {
  const rm = (a: string[]) => a.filter((x) => x !== habit);
  const next: Day = { ...d, habitsDone: rm(d.habitsDone), habitsFailed: rm(d.habitsFailed), habitsSkipped: rm(d.habitsSkipped), habitsLate: rm(d.habitsLate) };
  if (mark === "done") next.habitsDone = [...next.habitsDone, habit];
  if (mark === "failed") next.habitsFailed = [...next.habitsFailed, habit];
  if (mark === "skipped") next.habitsSkipped = [...next.habitsSkipped, habit];
  if (mark === "late") next.habitsLate = [...next.habitsLate, habit];
  return next;
}

/**
 * Three-way merge of a day: `base` is what `ours` started from, `theirs` is the
 * file as it is on disk now (the bot, Obsidian or Claude may have written it
 * meanwhile). A field or row changed here wins; everything else comes from
 * disk, so neither side's work is lost. Lists merge as multisets: rows added
 * here are added, rows removed here are removed, the rest is theirs.
 */
export function mergeDay(base: Day, ours: Day, theirs: Day): Day {
  const pick = <T,>(b: T, o: T, t: T): T => (JSON.stringify(o) !== JSON.stringify(b) ? o : t);
  function rows<T>(b: T[], o: T[], t: T[]): T[] {
    const key = (x: T) => JSON.stringify(x);
    const count = (a: T[]) => { const m = new Map<string, number>(); for (const x of a) m.set(key(x), (m.get(key(x)) ?? 0) + 1); return m; };
    const cb = count(b), co = count(o);
    const out = t.slice();
    for (const [k, n] of cb) {
      for (let i = (co.get(k) ?? 0); i < n; i++) { const at = out.findIndex((x) => key(x) === k); if (at >= 0) out.splice(at, 1); }
    }
    const added = new Map<string, number>();
    for (const x of o) {
      const k = key(x);
      const seen = (added.get(k) ?? 0) + 1;
      added.set(k, seen);
      if (seen > (cb.get(k) ?? 0)) out.push(x);
    }
    return out;
  }
  let next: Day = {
    ...theirs,
    date: theirs.date,
    questsClosed: rows(base.questsClosed, ours.questsClosed, theirs.questsClosed),
    sessions: rows(base.sessions, ours.sessions, theirs.sessions),
    mood: pick(base.mood, ours.mood, theirs.mood),
    stress: pick(base.stress, ours.stress, theirs.stress),
    weight: pick(base.weight, ours.weight, theirs.weight),
    pushups: pick(base.pushups, ours.pushups, theirs.pushups),
    pullups: pick(base.pullups, ours.pullups, theirs.pullups),
    closed: pick(base.closed, ours.closed, theirs.closed),
    tasks: rows(base.tasks, ours.tasks, theirs.tasks),
    done: rows(base.done, ours.done, theirs.done),
    txs: rows(base.txs, ours.txs, theirs.txs),
    meals: rows(base.meals, ours.meals, theirs.meals).sort((a, b) => a.time.localeCompare(b.time)),
    journal: pick(base.journal, ours.journal, theirs.journal),
    extra: theirs.extra,
  };
  // Habit marks: a habit whose mark changed here takes ours, the rest keep the disk's.
  const titles = new Set([...base.habitsDone, ...base.habitsFailed, ...base.habitsSkipped, ...base.habitsLate, ...ours.habitsDone, ...ours.habitsFailed, ...ours.habitsSkipped, ...ours.habitsLate]);
  for (const h of titles) {
    const o = markOf(ours, h);
    if (o !== markOf(base, h)) next = withMark(next, h, o);
  }
  return next;
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
    const balance = cells[2] ? parseAmount(cells[2]) : 0;
    if (balance === undefined) continue; // unreadable: left for the write guard to report, never saved as 0
    rows.push({ name: cells[0], kind: cells[1] ?? "", balance, asOf: cells[3] ?? "" });
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
    const amount = parseAmount(cells[1]);
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
    const amount = parseAmount(cells[2]);
    if (!cells[0] || amount === undefined) continue;
    const closedSection = /закрыт/i.test(section);
    // Column 6 used to be the note; it is the paid-so-far figure now. Old files
    // have text there, so a number decides which layout this row is in.
    const sixth = parseAmount(cells[5]);
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
/**
 * Days in a row the habit was kept, counting back from `upTo`. Days it was not
 * due (a Mon/Wed/Fri habit on Tuesday, a day before it was created) and days
 * marked «пропуск» are neutral; so is `upTo` itself while it is still open and
 * unmarked. A failed mark, an unmarked past day or a day with no file ends it.
 *
 * A bad habit with `clean_since:` (the day the owner stopped, in their words)
 * counts every day from that date as held unless a day says «failed»: the
 * one-button rule — untouched means held — applied back to before the app
 * knew the habit, and to days that have no file.
 */
export function streak(habit: Habit, days: Map<string, Day>, upTo: string): number {
  if (habit.kind === "bad" && habit.cleanSince) {
    let n = 0;
    for (let cur = upTo; cur >= habit.cleanSince; cur = addDays(cur, -1)) {
      const d = days.get(cur);
      if (d && markOf(d, habit.title) === "failed") break;
      n++;
    }
    return n;
  }
  let n = 0;
  for (let i = 0, cur = upTo; i < 3650; i++, cur = addDays(cur, -1)) {
    if (habit.created && cur < habit.created) break;
    if (!habitDue(habit, cur)) continue;
    const d = days.get(cur);
    const m = d ? markOf(d, habit.title) : undefined;
    if (m === "done" || m === "late") n++;
    else if (m === "skipped") continue;
    else if (i === 0 && !m && !d?.closed) continue; // today, not marked yet: still time
    else break;
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

/**
 * Completion over the last `n` days the habit was due and marked. Unmarked days
 * are counted apart: forgetting to tap is not the same as breaking the habit.
 */
export function habitRate(h: Habit, days: Map<string, Day>, upTo: string, n = 30): { done: number; due: number; unmarked: number } {
  let done = 0, due = 0, unmarked = 0;
  let cur = upTo;
  for (let i = 0; i < n; i++) {
    if (habitDue(h, cur)) {
      const d = days.get(cur);
      const m = d ? markOf(d, h.title) : undefined;
      if (!m) { if (d?.closed || cur < upTo) unmarked++; }
      else if (m !== "skipped") { due++; if (m === "done" || m === "late") done++; }
    }
    const prev = new Date(cur + "T12:00:00");
    prev.setDate(prev.getDate() - 1);
    cur = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
  }
  return { done, due, unmarked };
}

export function bestStreak(habit: Habit, days: Map<string, Day>): number {
  const dates: string[] = [...days.keys()].sort();
  if (!dates.length) return 0;
  let best = 0, run = 0;
  // Walk every calendar day, not only the files: a missing day where the habit was due ends the run.
  for (let cur = dates[0]; cur <= dates[dates.length - 1]; cur = addDays(cur, 1)) {
    if (!habitDue(habit, cur)) continue;
    const d = days.get(cur);
    const m = d ? markOf(d, habit.title) : undefined;
    if (m === "done" || m === "late") { run++; best = Math.max(best, run); }
    else if (m !== "skipped") run = 0;
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
  let library: string | null = null;
  let calendar: string | null = null;
  let now: string | null = null;
  const audits: Audit[] = [];
  const goals = new Map<string, string>();
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
    else if (f.rel === LIBRARY_REL) library = f.content;
    else if (f.rel === CALENDAR_FILE) calendar = f.content;
    else if (f.rel === NOW_REL) now = f.content;
    else if (f.rel.startsWith(AUDIT_DIR + "/")) audits.push(parseAudit(f));
    else if (f.rel.startsWith(GOALS_DIR + "/")) goals.set(f.rel.slice(GOALS_DIR.length + 1).replace(/\.md$/i, ""), f.content);
  }
  habits.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  quests.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title, "ru"));
  events.sort((a, b) => b.date.localeCompare(a.date));
  skills.sort((a, b) => b.level - a.level || a.title.localeCompare(b.title));
  audits.sort((a, b) => b.date.localeCompare(a.date));
  debts = applyInstalments(debts, days);
  return { events, skills, habits, quests, days, accounts, subscriptions, debts, health, talks, jobs, wishes, library, calendar, now, audits, goals };
}

/** Order inside a part of the day list: evening, morning, lunch, then the whole day. */
export function byHabitTime(a: Habit, b: Habit): number {
  const at = (h: Habit) => (h.time ? HABIT_TIMES.indexOf(h.time) : HABIT_TIMES.length);
  const rank = (k: HabitKind) => (k === "prayer" ? 0 : k === "good" ? 1 : 2);
  return at(a) - at(b) || rank(a.kind) - rank(b.kind) || a.title.localeCompare(b.title, "ru");
}

export function habitTimeLabel(t: HabitTime | undefined): string {
  return t === "вечер" ? "вечер, после магриба" : t ?? "весь день";
}
