/**
 * Telegram bot: habit digests by the prayers, marks written straight into
 * `life/days/<date>.md`. The app watches the vault and picks them up.
 *
 * Eldar counts a day from maghrib to maghrib, so after sunset the marks go to
 * the next calendar date. Each habit has a part of the day (`time:` вечер ·
 * утро · обед, or none for the whole day), and each part comes at its own
 * moment (Eldar, 2026-10-03): evening habits at maghrib, morning ones after
 * fajr, lunch ones after zuhr. An hour before maghrib comes the one full
 * digest — every habit of the day, grouped by theme, each theme opened and
 * closed by a tap — and then mood, stress and work, while the day is still
 * open. ✓ / ✗ / пропуск per habit and «позже» for the whole digest.
 *
 * Food: the «🍽 Еда» button under the chat asks what was eaten; the next
 * message becomes a row of `## Еда` in the day file, «ЧЧ:ММ» in front for a
 * different time, « — » before a note. Same rows the Day screen writes.
 *
 * Money: «💸 Деньги» asks for the amount and a note («+» for income), then a
 * category, then an account; the row goes into `## Деньги`. «долг» and
 * «подписки» are not offered: a repayment must also move `debts.md`, and the
 * app posts subscriptions itself.
 *
 * Config and delivery state live outside the vault, in
 * ~/Library/Application Support/irtiqa-bot/: the token is a secret and the
 * state is a throwaway cache. Everything that matters is in the day files.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DAY_DIR, HABIT_DIR, dayRel, emptyDay, habitDue, isLateMeal, markOf, normalizeTime, parseDay, parseHabit,
  ACCOUNTS_REL, liveBalance, parseAccounts, parseAmount, serializeDay, withMark,
  QUEST_DIR, parseQuest, serializeQuest, withQuestEntry, categoryName,
  byHabitTime, type Day, type DayMark, type Habit, type HabitTime, type Meal, type Quest, type Tx,
} from "../src/lib/life";
import { buildCircle } from "../src/lib/circle";
import { contactEdits } from "../src/lib/contact";
import type { Page } from "../src/lib/types";
import { addDays, formatDayTitle, toDateStr } from "../src/lib/dates";
import { buildLife } from "../src/lib/life";
import { buildPage } from "../src/lib/vault";
import { attention } from "../src/lib/attention";
import { MAGHRIB_DAYS_FROM, SHYMKENT, fajrOn, maghribOn, zuhrOn } from "../src/lib/maghrib";
import { groupByTheme, themeRu } from "../src/lib/themes";

// ---------- config & state ----------

const HOME = process.env.IRTIQA_BOT_HOME ?? join(homedir(), "Library/Application Support/irtiqa-bot");
const CONFIG = join(HOME, "config.json");
const STATE = join(HOME, "state.json");

interface Config {
  token: string;
  vault: string;
  chatId?: number;
  lat: number;
  lon: number;
  maghribOffsetMin: number;
  /** Fajr angle below the horizon, degrees. */
  fajrAngle: number;
  /** Minutes after fajr / zuhr the morning and lunch digests come. */
  afterFajrMin: number;
  afterZuhrMin: number;
  /** Minutes before maghrib the full digest comes. */
  finalBeforeMin: number;
  snoozeMin: number;
}

interface State {
  offset: number;
  sent: string[]; // slot ids already delivered
  snoozes: { at: number; date: string; part?: Part }[];
}

const DEFAULTS: Omit<Config, "token" | "vault"> = {
  ...SHYMKENT,
  maghribOffsetMin: 0,
  fajrAngle: 15,
  afterFajrMin: 30,
  afterZuhrMin: 30,
  finalBeforeMin: 60,
  snoozeMin: 30,
};

function loadConfig(): Config {
  if (!existsSync(CONFIG)) {
    mkdirSync(HOME, { recursive: true });
    writeFileSync(CONFIG, JSON.stringify({ token: "", vault: "", ...DEFAULTS }, null, 2) + "\n");
    throw new Error(`Нет токена. Заполни ${CONFIG}: token от @BotFather и vault — путь к personal-obsidian.`);
  }
  const c = { ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG, "utf8")) } as Config;
  if (!c.token || !c.vault) throw new Error(`В ${CONFIG} пусто поле token или vault.`);
  return c;
}

function saveConfig(c: Config) {
  writeFileSync(CONFIG, JSON.stringify(c, null, 2) + "\n");
}

function loadState(): State {
  try {
    return { offset: 0, sent: [], snoozes: [], ...JSON.parse(readFileSync(STATE, "utf8")) };
  } catch {
    return { offset: 0, sent: [], snoozes: [] };
  }
}

function saveState(s: State) {
  writeFileSync(STATE, JSON.stringify(s) + "\n");
}

const cfg = loadConfig();
const state = loadState();
let fresh = !existsSync(STATE); // first run: past slots are marked sent, not sent

// ---------- time: the day runs maghrib to maghrib ----------

function maghrib(date: string): Date {
  return new Date(maghribOn(date, cfg.lat, cfg.lon).getTime() + cfg.maghribOffsetMin * 60000);
}

/** Which day file a moment belongs to: after maghrib it is already tomorrow. Same rule as `dayOf` in the app, with the configured offset. */
function logicalDate(t: Date): string {
  const cal = toDateStr(t);
  const next = addDays(cal, 1);
  return next >= MAGHRIB_DAYS_FROM && t >= maghrib(cal) ? next : cal;
}

function hm(t: Date): string {
  return t.toTimeString().slice(0, 5);
}

/** Which habits a digest shows: one part of the day, or all of them. */
type Part = "e" | "m" | "l" | "a";
const PART_TIME: Record<Exclude<Part, "a">, HabitTime> = { e: "вечер", m: "утро", l: "обед" };

interface Slot { id: string; at: Date; title: string; part: Part }

function slotsOf(cal: string): Slot[] {
  const m = maghrib(cal);
  const plus = (t: Date, min: number) => new Date(t.getTime() + min * 60000);
  return [
    { id: `${cal}:morning`, at: plus(fajrOn(cal, cfg.lat, cfg.lon, cfg.fajrAngle), cfg.afterFajrMin), title: "☀️ Утро — после фаджра", part: "m" },
    { id: `${cal}:lunch`, at: plus(zuhrOn(cal, cfg.lat, cfg.lon), cfg.afterZuhrMin), title: "🍽 Обед — после зухра", part: "l" },
    { id: `${cal}:final`, at: plus(m, -cfg.finalBeforeMin), title: `⏳ Час до магриба — весь день`, part: "a" },
    { id: `${cal}:maghrib`, at: m, title: "🌇 Магриб — вечер нового дня", part: "e" },
  ];
}

// ---------- vault ----------

function readHabits(): Habit[] {
  const dir = join(cfg.vault, HABIT_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseHabit({ rel: `${HABIT_DIR}/${f}`, content: readFileSync(join(dir, f), "utf8"), mtime: 0 }))
    .sort((a, b) => (a.kind === b.kind ? a.title.localeCompare(b.title, "ru") : a.kind === "good" ? -1 : 1));
}

function readDay(date: string): Day {
  const p = join(cfg.vault, dayRel(date));
  if (!existsSync(p)) return emptyDay(date);
  return parseDay({ rel: dayRel(date), content: readFileSync(p, "utf8"), mtime: Math.floor(statSync(p).mtimeMs / 1000) });
}

/** A closed day is sealed: its `day` line in the log is already written. The bot does not change it behind the app's back. */
class ClosedDay extends Error {
  constructor(public date: string) { super(`closed ${date}`); }
}

function writeDay(d: Day) {
  if (readDay(d.date).closed) throw new ClosedDay(d.date);
  const p = join(cfg.vault, dayRel(d.date));
  mkdirSync(join(cfg.vault, DAY_DIR), { recursive: true });
  const tmp = p + ".bot-tmp";
  writeFileSync(tmp, serializeDay(d));
  renameSync(tmp, p);
}

/** Callback data is capped at 64 bytes; Cyrillic titles are not. */
function key(title: string): string {
  return createHash("sha1").update(title).digest("hex").slice(0, 8);
}

// ---------- «требует тебя» ----------

function walkMd(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** The same list the Day screen shows at the top, read fresh from the vault. */
function needsYouText(date: string, limit = 8): string | null {
  const rel = (p: string) => p.slice(cfg.vault.length + 1);
  const life = buildLife(walkMd(join(cfg.vault, "life")).map((p) => ({ rel: rel(p), content: readFileSync(p, "utf8"), mtime: 0 })));
  const people = walkMd(join(cfg.vault, "wiki"))
    .filter((p) => /\/People\/[^_/][^/]*\.md$/.test(p))
    .map((p) => buildPage(rel(p), readFileSync(p, "utf8"), 0))
    .filter((p) => p.zone === "person");
  const overviews = readdirSync(join(cfg.vault, "wiki"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(cfg.vault, "wiki", e.name, "_Overview.md")))
    .map((e) => buildPage(`wiki/${e.name}/_Overview.md`, readFileSync(join(cfg.vault, "wiki", e.name, "_Overview.md"), "utf8"), 0))
    .filter((p) => p.theme)
    .map((p) => ({ theme: p.theme!, body: p.body }));
  const items = attention(life, people, date, overviews);
  if (!items.length) return null;
  const more = items.length > limit ? `\n…и ещё ${items.length - limit} — на экране Дня.` : "";
  return ["📌 Требует тебя", ...items.slice(0, limit).map((a) => `• ${a.text}`)].join("\n") + more;
}

async function sendNeeds(date: string, quietIfEmpty: boolean) {
  if (!cfg.chatId) return;
  const text = needsYouText(date);
  if (text) await say(text);
  else if (!quietIfEmpty) await say("📌 Ничего не горит: просроченного нет.");
}

// ---------- evening check-in: mood, stress, work ----------
//
// At maghrib the day that ended gets three taps and a line: mood, stress, and
// what was worked on for how long — the inputs the Day screen needs and that
// were filled on half the days or never. A session written here is the same
// row the timer writes (`квест: минуты`, without a start time) plus a line in
// the quest's journal.

const fromCompact = (c: string) => `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`;
const scale = (prefix: string, compact: string): Button[][] => [
  [1, 2, 3, 4, 5].map((n) => ({ text: String(n), callback_data: `${prefix}:${compact}:${n}` })),
  [6, 7, 8, 9, 10].map((n) => ({ text: String(n), callback_data: `${prefix}:${compact}:${n}` })),
  [{ text: "пропустить", callback_data: `${prefix}:${compact}:x` }],
];

function activeQuests(): Quest[] {
  return walkMd(join(cfg.vault, QUEST_DIR))
    .map((p) => parseQuest({ rel: p.slice(cfg.vault.length + 1), content: readFileSync(p, "utf8"), mtime: 0 }))
    .filter((q) => q.status === "active")
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

function workKeyboard(compact: string): Button[][] {
  return [
    ...activeQuests().map((q) => [{ text: q.title.length > 40 ? q.title.slice(0, 39) + "…" : q.title, callback_data: `wq:${compact}:${key(q.title)}` }]),
    [{ text: "ни над чем из квестов", callback_data: `wq:${compact}:none` }],
  ];
}

async function sendCheckin(date: string) {
  if (!cfg.chatId || readDay(date).closed) return;
  await say(`🌇 Итог дня — ${formatDayTitle(date).toLowerCase()}.\nНастроение, 1–10?`, { reply_markup: { inline_keyboard: scale("mo", date.replaceAll("-", "")) } });
}

let pendingWork: { date: string; quest: string; minutes: number } | null = null;

async function onCheckinCallback(kind: string, compact: string, code: string, extra: string, chat: number, msg: number) {
  const date = fromCompact(compact);
  const edit = (text: string, keyboard: Button[][] = []) =>
    tg("editMessageText", { chat_id: chat, message_id: msg, text, reply_markup: { inline_keyboard: keyboard } }).catch(() => {});
  if (kind === "mo" || kind === "st") {
    const n = code === "x" ? undefined : Number(code);
    if (n !== undefined) writeDay({ ...readDay(date), [kind === "mo" ? "mood" : "stress"]: n });
    if (kind === "mo") await edit(`🌇 ${formatDayTitle(date)}: настроение ${n ?? "—"}.\nСтресс, 1–10?`, scale("st", compact));
    else await edit(`🌇 ${formatDayTitle(date)}: стресс ${n ?? "—"}.\nНад чем работал за день?`, workKeyboard(compact));
    return;
  }
  if (kind === "wq") {
    if (code === "none") { await edit(`🌇 ${formatDayTitle(date)}: записано.`); return; }
    if (code === "more") { await edit("Над чем ещё работал?", workKeyboard(compact)); return; }
    const quest = activeQuests().find((x) => key(x.title) === code);
    if (!quest) { await edit("Квест не нашёл — может, его уже закрыли."); return; }
    const mins = [15, 30, 45, 60, 90, 120, 180];
    await edit(`«${quest.title}» — сколько минут?`, pairs(mins.map((m) => ({ text: `${m} мин`, callback_data: `wm:${compact}:${code}:${m}` }))));
    return;
  }
  if (kind === "wm") {
    const quest = activeQuests().find((x) => key(x.title) === code);
    const minutes = Number(extra);
    if (!quest || !minutes) return;
    pendingWork = { date, quest: quest.title, minutes };
    ask("work", 12 * 3600_000);
    await edit(`«${quest.title}», ${minutes} мин.`);
    await say("Что сделано? Одной строкой — это ляжет в журнал квеста.", { reply_markup: { force_reply: true, input_field_placeholder: "что сделано" } });
    return;
  }
  if (kind === "pl") { await sendContactList(msg); return; }
  if (kind === "pc" || kind === "pm" || kind === "pt") {
    const person = contactPeople().find((p) => key(p.page.rel) === code);
    if (!person) { await edit("Не нашёл этого человека."); return; }
    if (kind === "pc") {
      await edit(`${person.name}: что было?`, [
        [{ text: "виделись", callback_data: `pm:0:${code}` }, { text: "созвонились, переписка", callback_data: `pt:0:${code}` }],
        [{ text: "← назад", callback_data: "pl:0:0" }],
      ]);
      return;
    }
    const today = logicalDate(new Date());
    const life = buildLife(walkMd(join(cfg.vault, "life")).map((p) => ({ rel: p.slice(cfg.vault.length + 1), content: readFileSync(p, "utf8"), mtime: 0 })));
    const raw = readFileSync(join(cfg.vault, person.page.rel), "utf8");
    for (const e of contactEdits({ rel: person.page.rel, file: person.page.file, raw }, life.events, today, kind === "pm")) writeRel(e.rel, e.content);
    await edit(`✓ ${person.name}: ${kind === "pm" ? "виделись" : "на связи"} — ${formatDayTitle(today).toLowerCase()}.`);
  }
}

async function onWorkNote(text: string) {
  const w = pendingWork;
  pendingWork = null;
  if (!w || !text.trim()) return;
  const day = readDay(w.date);
  writeDay({ ...day, sessions: [...day.sessions, { quest: w.quest, minutes: w.minutes }] });
  const q = activeQuests().find((x) => x.title === w.quest);
  if (q) writeRel(q.rel, serializeQuest({ ...q, body: withQuestEntry(q.body, { date: w.date, minutes: w.minutes, note: text }) }));
  await say(`⏱ Записал: «${w.quest}», ${w.minutes} мин — ${text.trim()}`, {
    reply_markup: { inline_keyboard: [[{ text: "+ ещё квест", callback_data: `wq:${w.date.replaceAll("-", "")}:more` }]] },
  });
}

async function askWeight(date: string) {
  if (!cfg.chatId) return;
  ask("weight", 12 * 3600_000);
  pendingWeightDate = date;
  await say("⚖️ Вес сегодня? Число, например 93.5 — цель в health.md, путь виден на экране Здоровья.", { reply_markup: { force_reply: true, input_field_placeholder: "93.5" } });
}
let pendingWeightDate: string | null = null;

async function onWeight(text: string) {
  const n = parseAmount(text.replace(/кг|kg/gi, ""));
  const date = pendingWeightDate ?? logicalDate(new Date());
  if (n === undefined || n < 30 || n > 300) { ask("weight", 12 * 3600_000); await say("Не понял вес. Напиши число, например 93.5."); return; }
  writeDay({ ...readDay(date), weight: n });
  pendingWeightDate = null;
  await say(`⚖️ Записал: ${n} кг (${formatDayTitle(date).toLowerCase()}).`);
}

// ---------- contacts ----------

function peoplePages(): Page[] {
  return walkMd(join(cfg.vault, "wiki"))
    .filter((p) => /\/People\/[^_/][^/]*\.md$/.test(p))
    .map((p) => buildPage(p.slice(cfg.vault.length + 1), readFileSync(p, "utf8"), 0))
    .filter((p) => p.zone === "person");
}

/** The close circle (7+), most overdue first — the people a contact should be logged for. */
function contactPeople() {
  const life = buildLife(walkMd(join(cfg.vault, "life", "events")).map((p) => ({ rel: p.slice(cfg.vault.length + 1), content: readFileSync(p, "utf8"), mtime: 0 })));
  return buildCircle(peoplePages(), life.events, logicalDate(new Date())).filter((i) => (i.closeness ?? 0) >= 7).slice(0, 14);
}

async function sendContactList(editMsg?: number) {
  const list = contactPeople();
  const keyboard = pairs(list.map((i) => ({ text: `${i.name}${(i.overdue ?? 0) > 0 ? " ⏳" : !i.lastContact && !i.lastMeet ? " ·" : ""}`, callback_data: `pc:0:${key(i.page.rel)}` })));
  const text = "С кем был контакт? ⏳ — давно не на связи, · — контакт ни разу не записан.";
  if (editMsg) await tg("editMessageText", { chat_id: cfg.chatId, message_id: editMsg, text, reply_markup: { inline_keyboard: keyboard } }).catch(() => {});
  else await say(text, { reply_markup: { inline_keyboard: keyboard } });
}

/** Atomic write of one vault file the bot owns: life/, or a person page's contact keys. */
function writeRel(rel: string, content: string) {
  if (!rel.startsWith("life/") && !/^wiki\/[^/]+\/People\/[^_/][^/]*\.md$/.test(rel)) throw new Error(`bot may not write ${rel}`);
  const p = join(cfg.vault, rel);
  mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
  writeFileSync(p + ".bot-tmp", content);
  renameSync(p + ".bot-tmp", p);
}

// ---------- food ----------

const FOOD_BUTTON = "🍽 Еда";
const HABITS_BUTTON = "📋 Привычки";
const CONTACT_BUTTON = "🤝 Контакт";
const MONEY_BUTTON = "💸 Деньги";
const WAIT_MS = 15 * 60000;

/** What the next plain message answers. Kept in memory: a restart just forgets the question. */
type AwaitKind = "food" | "money" | "category" | "work" | "weight";
let awaiting: { kind: AwaitKind; at: number; ttl?: number } | null = null;

/** «13:30 плов — тяжело» → time, what, note. No time means now. */
function parseMeal(text: string, now: Date): Meal | null {
  let rest = text.replace(/\|/g, "/").trim();
  let time = hm(now);
  const t = rest.match(/^(\d{1,2}[:.]\d{2}|\d{1,2}:\d{2})\s+(.+)$/);
  if (t && normalizeTime(t[1])) { time = normalizeTime(t[1]); rest = t[2].trim(); }
  const [what, ...note] = rest.split(/\s+[—–-]\s+/);
  if (!what.trim()) return null;
  return { time, what: what.trim(), note: note.join(" — ").trim() };
}

/** The day file a meal at «ЧЧ:ММ» today belongs to; a time still ahead means last night. */
function mealDate(time: string, now: Date): string {
  let t = new Date(`${toDateStr(now)}T${time}:00`);
  if (t.getTime() > now.getTime() + 5 * 60000) t = new Date(t.getTime() - 86400000);
  return logicalDate(t);
}

// ---------- money ----------

/** Categories only the app may write: they move other ledgers too. */
const APP_ONLY_CATEGORIES = ["долг", "подписки"];

interface PendingTx { amount: number; note: string; cats: string[]; category?: string; accounts: string[]; at: Date }
let pendingTx: PendingTx | null = null;

/** «2500 такси», «+50000 зарплата», «1 200,50 кофе» → signed amount and note. */
function parseMoney(text: string): { amount: number; note: string } | null {
  const m = text.replace(/\|/g, "/").trim().match(/^([+\-−]?)\s*(\d[\d\s]*(?:[.,]\d+)*)\s*(.*)$/);
  if (!m) return null;
  // Same reading as the app: «12,400» is twelve thousand, «12,5» twelve and a half.
  const n = parseAmount(m[2]);
  if (n === undefined || n <= 0) return null;
  return { amount: m[1] === "+" ? n : -n, note: m[3].trim() };
}

function readAllDays(): Map<string, Day> {
  const dir = join(cfg.vault, DAY_DIR);
  const days = new Map<string, Day>();
  for (const f of readdirSync(dir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(f)) continue;
    const date = f.slice(0, 10);
    days.set(date, parseDay({ rel: dayRel(date), content: readFileSync(join(dir, f), "utf8"), mtime: 0 }));
  }
  return days;
}

/** The categories already used for this sign, most frequent first. */
function categoriesFor(income: boolean, days: Map<string, Day>): string[] {
  const n = new Map<string, number>();
  for (const d of days.values()) {
    for (const t of d.txs) {
      const c = categoryName(t.category);
      if (!c || (t.amount > 0) !== income || APP_ONLY_CATEGORIES.includes(c.toLowerCase())) continue;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 8);
}

/** A typed category in the spelling already used: «Прочее» → «прочее». The most frequent spelling wins. */
function canonicalCategory(typed: string, days: Map<string, Day>): string {
  // A merged spelling («бенза») goes in under its category («транспорт»).
  const merged = categoryName(typed);
  if (merged !== typed.trim()) return merged;
  const want = typed.toLowerCase().replace(/ё/g, "е");
  const n = new Map<string, number>();
  for (const d of days.values()) {
    for (const t of d.txs) {
      const c = t.category.trim();
      if (c && c.toLowerCase().replace(/ё/g, "е") === want) n.set(c, (n.get(c) ?? 0) + 1);
    }
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? typed;
}

/** Accounts, the one used last first. */
function accountsByUse(days: Map<string, Day>): string[] {
  const names = parseAccounts(readFileSync(join(cfg.vault, ACCOUNTS_REL), "utf8")).map((a) => a.name);
  const last = [...days.values()].sort((a, b) => b.date.localeCompare(a.date)).flatMap((d) => [...d.txs].reverse()).find((t) => names.includes(t.account.trim()));
  return last ? [last.account.trim(), ...names.filter((x) => x !== last.account.trim())] : names;
}

function fmtSum(n: number): string {
  return Math.abs(n).toLocaleString("ru-RU").replace(/\u00a0/g, " ");
}

function txKey(t: Tx): string {
  return key(`${t.amount}|${t.category}|${t.account}|${t.note}`);
}

function pairs(buttons: Button[]): Button[][] {
  const rows: Button[][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return rows;
}

// ---------- Telegram ----------

type Button = { text: string; callback_data: string };

async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://api.telegram.org/bot${cfg.token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { ok: boolean; result: T; description?: string };
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

const MARK_LABEL: Record<DayMark, string> = { done: "✓", failed: "✗", skipped: "–" };

type Mode = "d" | "f" | "s";
const MODE_GLYPH: Record<Mode, string> = { d: "✓", f: "✗", s: "–" };

/** Themes opened in the full digest, per message. Kept in memory: a restart closes them, nothing is lost. */
const opened = new Map<number, Set<string>>();

function dueFor(date: string, part: Part): Habit[] {
  const due = readHabits().filter((h) => habitDue(h, date));
  return (part === "a" ? due : due.filter((h) => h.time === PART_TIME[part])).sort(byHabitTime);
}

/**
 * Text + keyboard for one logical date. One full-width button per unmarked
 * habit, so long titles fit: in mode «d» a tap is ✓, the switches at the
 * bottom turn the same buttons into ✗ or пропуск. The full digest («a») puts
 * a theme button above its habits; the habits show only while it is open.
 */
function digest(date: string, title: string, part: Part, mode: Mode = "d", msg?: number): { text: string; keyboard: Button[][] } {
  const habits = dueFor(date, part);
  const day = readDay(date);
  const open = habits.filter((h) => !markOf(day, h.title));
  const marked = habits.filter((h) => markOf(day, h.title));
  const compact = date.replaceAll("-", "");
  const habitButton = (h: Habit): Button[] => [{ text: `${MODE_GLYPH[mode]} ${h.title}`, callback_data: `m:${compact}:${mode}:${key(h.title)}:${part}` }];

  const lines = [title, `${formatDayTitle(date)} · отмечено ${marked.length} из ${habits.length}`];
  const keyboard: Button[][] = [];
  if (part === "a") {
    const { groups, missing } = groupByTheme(habits);
    const show = msg !== undefined ? opened.get(msg) ?? new Set<string>() : new Set<string>();
    lines.push("");
    for (const g of groups) {
      const name = themeRu(g.theme);
      const left = g.items.filter((h) => !markOf(day, h.title));
      const done = g.items.filter((h) => markOf(day, h.title) === "done").length;
      lines.push(`${left.length ? "▫️" : "✅"} ${name} — ${done}/${g.items.length}${left.length ? `, осталось: ${left.map((h) => h.title).join(", ")}` : ""}`);
      if (!left.length) continue;
      const isOpen = show.has(name);
      keyboard.push([{ text: `${isOpen ? "▾" : "▸"} ${name} · ${left.length}`, callback_data: `t:${compact}:${mode}:${key(name)}` }]);
      if (isOpen) keyboard.push(...left.map(habitButton));
    }
    if (missing.length) lines.push("", `Без привычек: ${missing.map((t) => themeRu(t)).join(", ")}.`);
  } else if (marked.length) {
    lines.push("", marked.map((h) => `${MARK_LABEL[markOf(day, h.title)!]} ${h.title}`).join("\n"));
  }
  if (open.length) {
    lines.push("", part === "a" ? "Открой тему — под ней её привычки. " + MODE_HINT[mode] : MODE_HINT[mode]);
    if (mode === "d" && open.some((h) => h.kind === "bad")) lines.push("У плохих привычек ✓ значит «удержался».");
    if (part !== "a") keyboard.push(...open.map(habitButton));
    keyboard.push(
      mode === "d"
        ? [{ text: "✗ не сделал…", callback_data: `v:${compact}:f:${part}` }, { text: "– пропуск…", callback_data: `v:${compact}:s:${part}` }]
        : [{ text: "← назад к ✓", callback_data: `v:${compact}:d:${part}` }],
    );
    keyboard.push([{ text: `⏰ Позже, через ${cfg.snoozeMin} мин`, callback_data: `z:${compact}:${part}` }]);
  } else {
    lines.push("", habits.length ? "Всё отмечено." : "На это время привычек нет.");
  }
  return { text: lines.join("\n"), keyboard };
}

const MODE_HINT: Record<Mode, string> = { d: "Нажми привычку — будет ✓.", f: "Режим ✗: нажми, что не сделал.", s: "Режим пропуска: нажми, что пропускаешь по плану." };

async function sendDigest(date: string, title: string, part: Part, onlyIfOpen = false) {
  if (!cfg.chatId) return;
  if (onlyIfOpen && !dueFor(date, part).some((h) => !markOf(readDay(date), h.title))) return;
  const { text, keyboard } = digest(date, title, part);
  await tg("sendMessage", { chat_id: cfg.chatId, text, reply_markup: { inline_keyboard: keyboard } });
}

const CODE: Record<string, DayMark> = { d: "done", f: "failed", s: "skipped" };

interface CallbackQuery {
  id: string;
  data?: string;
  from: { id: number };
  message?: { chat: { id: number }; message_id: number; text?: string };
}

async function onCallback(q: CallbackQuery) {
  if (q.from.id !== cfg.chatId || !q.data || !q.message) {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    return;
  }
  const [kind, compact, code, hkey, partCode] = q.data.split(":");
  const date = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const title = (q.message.text ?? "").split("\n")[0];

  // Old messages carry no part: they were whole-day digests.
  const part: Part = (["e", "m", "l", "a"].includes(kind === "m" ? partCode : hkey) ? (kind === "m" ? partCode : hkey) : "a") as Part;
  const edit = async (mode: Mode) => {
    const { text, keyboard } = digest(date, title, part, mode, q.message!.message_id);
    await tg("editMessageText", {
      chat_id: q.message!.chat.id, message_id: q.message!.message_id, text, reply_markup: { inline_keyboard: keyboard },
    }).catch(() => {}); // "message is not modified" when tapped twice
  };

  if (["mo", "st", "wq", "wm", "pc", "pm", "pt", "pl"].includes(kind)) {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    await onCheckinCallback(kind, compact ?? "", code ?? "", hkey ?? "", q.message.chat.id, q.message.message_id);
    return;
  }

  if (kind === "c" || kind === "a") {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    await tg("editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    if (!pendingTx) {
      await say(`Запись устарела. Нажми «${MONEY_BUTTON}» ещё раз.`);
      return;
    }
    if (kind === "c") {
      if (code === "new") {
        ask("category");
        await say("Как назвать категорию?", { reply_markup: { force_reply: true, input_field_placeholder: "категория" } });
        return;
      }
      pendingTx.category = code === "none" ? "" : pendingTx.cats[Number(code)] ?? "";
      await askAccount();
      return;
    }
    await writeTx(code === "none" ? "" : pendingTx.accounts[Number(code)] ?? "");
    return;
  }

  if (kind === "x") {
    const day = readDay(date);
    const i = day.txs.findIndex((t) => txKey(t) === code);
    if (i >= 0) writeDay({ ...day, txs: day.txs.filter((_, j) => j !== i) });
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: i >= 0 ? "Убрал" : "Уже нет" });
    await tg("editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: `${q.message.text ?? ""}\n↩︎ отменено` }).catch(() => {});
    return;
  }

  if (kind === "u") {
    const day = readDay(date);
    const i = day.meals.findIndex((x) => key(x.time + x.what + x.note) === code);
    if (i >= 0) writeDay({ ...day, meals: day.meals.filter((_, j) => j !== i) });
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: i >= 0 ? "Убрал" : "Уже нет" });
    await tg("editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: `${q.message.text ?? ""}\n↩︎ отменено` }).catch(() => {});
    return;
  }

  if (kind === "v") {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    await edit(code as Mode);
    return;
  }

  if (kind === "t") {
    const msg = q.message.message_id;
    const names = groupByTheme(dueFor(date, "a")).groups.map((g) => themeRu(g.theme));
    const name = names.find((n) => key(n) === hkey);
    const set = opened.get(msg) ?? new Set<string>();
    if (name) { if (set.has(name)) set.delete(name); else set.add(name); }
    opened.set(msg, set);
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    await edit(code as Mode);
    return;
  }

  if (kind === "z") {
    state.snoozes.push({ at: Date.now() + cfg.snoozeMin * 60000, date, part: (["e", "m", "l", "a"].includes(code) ? code : "a") as Part });
    saveState(state);
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: `Напомню в ${hm(new Date(state.snoozes.at(-1)!.at))}` });
    return;
  }

  const habit = readHabits().find((h) => key(h.title) === hkey);
  const mark = CODE[code];
  let toast = "Привычка не найдена";
  if (habit && mark) {
    writeDay(withMark(readDay(date), habit.title, mark));
    toast = `${MARK_LABEL[mark]} ${habit.title} → ${date}`;
  }
  await tg("answerCallbackQuery", { callback_query_id: q.id, text: toast });
  await edit("d");
}

interface Message { chat: { id: number }; from?: { id: number }; text?: string; date?: number }

const REPLY_KEYBOARD = {
  keyboard: [[{ text: FOOD_BUTTON }, { text: MONEY_BUTTON }], [{ text: HABITS_BUTTON }, { text: CONTACT_BUTTON }]],
  resize_keyboard: true,
  is_persistent: true,
};

async function say(text: string, extra: Record<string, unknown> = {}) {
  await tg("sendMessage", { chat_id: cfg.chatId, text, ...extra });
}

function ask(kind: AwaitKind, ttl?: number) {
  awaiting = { kind, at: Date.now(), ttl };
}

async function onMessage(m: Message) {
  const text = (m.text ?? "").trim();
  if (!cfg.chatId && text.startsWith("/start")) {
    cfg.chatId = m.chat.id; // the first /start owns the bot
    saveConfig(cfg);
  }
  if (m.chat.id !== cfg.chatId) return;
  if (text.startsWith("/start") || text.startsWith("/help")) {
    awaiting = null;
    const s = slotsOf(toDateStr(new Date()));
    await say(
      [
        "Сводки привычек сегодня:",
        ...s.map((x) => `${hm(x.at)} — ${x.title}`),
        "",
        "Утром, в обед и на магрибе приходят только привычки этого времени (поле «время дня» у привычки). За час до магриба — все привычки дня по темам: нажми тему, чтобы открыть её привычки. Привычки на весь день приходят только в эту сводку.",
        "День считается от магриба до магриба: после магриба всё идёт в завтрашний файл.",
        `${FOOD_BUTTON} — что съел. ${MONEY_BUTTON} — расход или доход. ${HABITS_BUTTON} или /today — сводка сейчас.`,
        "/need — что требует тебя: врачи, люди, дни рождения, списания, застрявшие квесты. Утром приходит само.",
        "За час до магриба, после сводки — итог дня: настроение, стресс и над чем работал. Вручную: /checkin. По воскресеньям утром — вес (/weight).",
        `${CONTACT_BUTTON} — виделся или созвонился с кем-то из близких: пишет последний контакт и встречу дня.`,
      ].join("\n"),
      { reply_markup: REPLY_KEYBOARD },
    );
    return;
  }
  if (text.startsWith("/checkin")) {
    awaiting = null;
    await sendCheckin(toDateStr(new Date()));
    return;
  }
  if (text.startsWith("/weight")) {
    await askWeight(logicalDate(new Date()));
    return;
  }
  if (text.startsWith("/contact") || text === CONTACT_BUTTON) {
    awaiting = null;
    await sendContactList();
    return;
  }
  if (text.startsWith("/need")) {
    awaiting = null;
    await sendNeeds(toDateStr(new Date()), false);
    return;
  }
  if (text.startsWith("/today") || text === HABITS_BUTTON) {
    awaiting = null;
    await sendDigest(logicalDate(new Date()), "📋 Сейчас — весь день", "a");
    return;
  }
  if (text.startsWith("/food") || text === FOOD_BUTTON) {
    ask("food");
    await say("Что съел? Например: «плов», «13:30 плов» или «плов — тяжело после».", { reply_markup: { force_reply: true, input_field_placeholder: "что съел" } });
    return;
  }
  if (text.startsWith("/money") || text === MONEY_BUTTON) {
    ask("money");
    pendingTx = null;
    await say("Сумма и за что. Расход: «2500 такси». Доход: «+50000 зарплата».", { reply_markup: { force_reply: true, input_field_placeholder: "2500 такси" } });
    return;
  }
  if (text.startsWith("/")) return;
  if (!awaiting || Date.now() - awaiting.at > (awaiting.ttl ?? WAIT_MS)) {
    awaiting = null;
    await say(`Нажми кнопку внизу: «${FOOD_BUTTON}» или «${MONEY_BUTTON}».`, { reply_markup: REPLY_KEYBOARD });
    return;
  }
  const kind = awaiting.kind;
  awaiting = null;
  // When it was sent, not when this Mac woke up and read it: a meal typed at
  // 13:00 and read after maghrib still belongs to 13:00 of its own day.
  const sent = m.date ? new Date(m.date * 1000) : new Date();
  if (kind === "work") { await onWorkNote(text); return; }
  if (kind === "weight") { await onWeight(text); return; }
  if (kind === "food") await onFood(text, sent);
  else if (kind === "money") await onMoney(text, sent);
  else if (kind === "category" && pendingTx) {
    pendingTx.category = canonicalCategory(text.replace(/\|/g, "/").trim(), readAllDays());
    if (APP_ONLY_CATEGORIES.includes(pendingTx.category.toLowerCase())) {
      pendingTx.category = undefined;
      await say("«Долг» и «подписки» записываются только в приложении: там они двигают ещё debts.md и подписки. Напиши другую категорию.");
      ask("category");
      return;
    }
    await askAccount();
  }
}

async function onFood(text: string, now: Date) {
  const meal = parseMeal(text, now);
  if (!meal) return;
  const date = mealDate(meal.time, now);
  const day = readDay(date);
  writeDay({ ...day, meals: [...day.meals, meal].sort((a, b) => a.time.localeCompare(b.time)) });
  const late = isLateMeal(meal) ? "\n⚠️ После 21:00 — это за границей по панкреатиту." : "";
  await say(`🍽 Записал (${formatDayTitle(date).toLowerCase()}): ${meal.time} ${meal.what}${meal.note ? ` — ${meal.note}` : ""}${late}`, {
    reply_markup: { inline_keyboard: [[{ text: "↩︎ Отменить", callback_data: `u:${date.replaceAll("-", "")}:${key(meal.time + meal.what + meal.note)}` }]] },
  });
}

async function onMoney(text: string, sent: Date) {
  const parsed = parseMoney(text);
  if (!parsed) {
    ask("money");
    await say("Не понял сумму. Напиши так: «2500 такси» или «+50000 зарплата».");
    return;
  }
  const days = readAllDays();
  const cats = categoriesFor(parsed.amount > 0, days);
  pendingTx = { ...parsed, cats, accounts: accountsByUse(days), at: sent };
  const buttons = cats.map((c, i) => ({ text: c, callback_data: `c:0:${i}` }));
  await say(`${parsed.amount > 0 ? "➕ Доход" : "➖ Расход"} ${fmtSum(parsed.amount)}${parsed.note ? ` — ${parsed.note}` : ""}\nКатегория?`, {
    reply_markup: { inline_keyboard: [...pairs(buttons), [{ text: "✏️ другая", callback_data: "c:0:new" }, { text: "без категории", callback_data: "c:0:none" }]] },
  });
}

async function askAccount() {
  if (!pendingTx) return;
  const buttons = pendingTx.accounts.map((a, i) => ({ text: a, callback_data: `a:0:${i}` }));
  await say(`Категория: ${pendingTx.category || "—"}. Счёт?`, { reply_markup: { inline_keyboard: [...pairs(buttons), [{ text: "без счёта", callback_data: "a:0:none" }]] } });
}

async function writeTx(account: string) {
  const p = pendingTx!;
  pendingTx = null;
  const date = logicalDate(p.at);
  const tx: Tx = { amount: p.amount, category: p.category ?? "", account, note: p.note };
  const day = readDay(date);
  writeDay({ ...day, txs: [...day.txs, tx] });
  let balance = "";
  const acc = parseAccounts(readFileSync(join(cfg.vault, ACCOUNTS_REL), "utf8")).find((a) => a.name === account);
  if (acc) balance = `\n${account}: ${fmtSum(liveBalance(acc, readAllDays()))}`;
  await say(
    `💸 Записал (${formatDayTitle(date).toLowerCase()}): ${tx.amount > 0 ? "+" : "−"}${fmtSum(tx.amount)} · ${tx.category || "без категории"} · ${account || "без счёта"}${tx.note ? ` · ${tx.note}` : ""}${balance}`,
    { reply_markup: { inline_keyboard: [[{ text: "↩︎ Отменить", callback_data: `x:${date.replaceAll("-", "")}:${txKey(tx)}` }]] } },
  );
}

// ---------- loops ----------

const GRACE_MS = 3 * 3600_000; // a Mac that slept through a slot still sends it within 3 h
const FINAL_GRACE_MS = 14 * 3600_000; // the full digest until the next morning

async function tick() {
  const now = new Date();
  const today = toDateStr(now);
  for (const cal of [addDays(today, -1), today]) {
    for (const s of slotsOf(cal)) {
      if (s.at > now || state.sent.includes(s.id)) continue;
      state.sent.push(s.id);
      saveState(state);
      const late = now.getTime() - s.at.getTime();
      if (fresh) continue;
      if (s.part === "a") {
        // The full digest still matters after maghrib: the day it closes can be
        // marked until the app closes it in the morning. Late, it says so.
        if (late > FINAL_GRACE_MS || readDay(cal).closed) continue;
        const title = late > 15 * 60000 ? `⏳ Опоздал: Mac спал. Весь день ${formatDayTitle(cal).toLowerCase()}` : s.title;
        await sendDigest(cal, title, "a");
        await sendCheckin(cal);
        continue;
      }
      if (late > GRACE_MS) continue;
      await sendDigest(logicalDate(new Date(s.at.getTime() + 1000)), s.title, s.part, true);
      if (s.id.endsWith(":morning")) await sendNeeds(cal, true);
      if (s.id.endsWith(":morning") && new Date(`${cal}T12:00:00`).getDay() === 0) await askWeight(logicalDate(s.at));
    }
  }
  const due = state.snoozes.filter((z) => z.at <= now.getTime());
  if (due.length) {
    state.snoozes = state.snoozes.filter((z) => z.at > now.getTime());
    saveState(state);
    for (const z of due) await sendDigest(z.date, "⏰ Напоминаю", z.part ?? "a", true);
  }
  fresh = false;
  const keep = addDays(today, -3);
  state.sent = state.sent.filter((id) => id.slice(0, 10) >= keep);
}

async function poll() {
  for (;;) {
    try {
      const updates = await tg<{ update_id: number; message?: Message; callback_query?: CallbackQuery }[]>("getUpdates", {
        offset: state.offset, timeout: 50, allowed_updates: ["message", "callback_query"],
      });
      for (const u of updates) {
        state.offset = u.update_id + 1;
        saveState(state);
        try {
          if (u.message) await onMessage(u.message);
          if (u.callback_query) await onCallback(u.callback_query);
        } catch (e) {
          if (e instanceof ClosedDay) {
            await say(`День ${e.date} уже закрыт — в закрытый день бот не пишет. Если нужно поправить, открой его на экране Дня.`).catch(() => {});
            if (u.callback_query) await tg("answerCallbackQuery", { callback_query_id: u.callback_query.id }).catch(() => {});
            continue;
          }
          console.error(new Date().toISOString(), "update", e);
        }
      }
    } catch (e) {
      console.error(new Date().toISOString(), "poll", e);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

console.log(new Date().toISOString(), "irtiqa habits bot up; vault:", cfg.vault, "chat:", cfg.chatId ?? "ждёт /start");
setInterval(() => tick().catch((e) => console.error(new Date().toISOString(), "tick", e)), 20_000);
tick().catch((e) => console.error(new Date().toISOString(), "tick", e));
poll();
