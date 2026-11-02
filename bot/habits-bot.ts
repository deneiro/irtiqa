/**
 * Telegram bot, v2 (spec «Jarvis и голограмма», 2026-10-11).
 *
 * One message a day, after fajr: what yesterday looks like (marked or not),
 * the streaks of what he holds out against, the four numbers, today's first
 * step in every active quest, the week's tasks, and «Требует тебя». No
 * buttons: the marks are made in the app's «Главный» screen, by Eldar, for the
 * previous calendar day. In the evening (Eldar, 2026-11-02) a short survey,
 * one question per message — weight, food, money, mood, stress, what got done —
 * answered by one line or skipped; each answer lands in the day file at once.
 * Two messages a day is still the ceiling: the survey is one thread.
 *
 * What stays from v1, on demand only: `/today` and `/yesterday` show the
 * habit keyboard (three groups: намаз · удержался · привычки; a prayer has
 * ✓ · ⏰ поздно · ✗), «🍽 Еда» and «💸 Деньги» write a row into the day file,
 * «🤝 Контакт» logs a contact, `/checkin` asks mood, stress and work,
 * `/weight` a weight (also asked on Sunday mornings).
 *
 * The day is a calendar day since 2026-10-12 (`dayOf` in lib/maghrib.ts keeps
 * the maghrib rule for the files of 2026-09-22 … 2026-10-11 only).
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
  QUEST_DIR, parseQuest, serializeQuest, withQuestEntry, categoryName, questSteps, nextStep,
  type Day, type DayMark, type Habit, type HabitKind, type Meal, type Quest, type Tx,
} from "../src/lib/life";
import { buildCircle } from "../src/lib/circle";
import { contactEdits } from "../src/lib/contact";
import type { Page } from "../src/lib/types";
import { addDays, formatDayTitle, toDateStr } from "../src/lib/dates";
import { buildLife } from "../src/lib/life";
import { buildPage } from "../src/lib/vault";
import { attention } from "../src/lib/attention";
import { SHYMKENT, dayOf, fajrOn } from "../src/lib/maghrib";
import { goalsFor } from "../src/lib/goals";
import { heldOut, winNumbers } from "../src/lib/wins";
import { parseHealth } from "../src/lib/health";

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
  /** Fajr angle below the horizon, degrees. */
  fajrAngle: number;
  /** Minutes after fajr the morning message comes. */
  afterFajrMin: number;
  /** The evening survey, «ЧЧ:ММ»; empty string switches it off. */
  eveningAskAt: string;
  snoozeMin: number;
}

interface State {
  offset: number;
  sent: string[]; // slot ids already delivered
  snoozes: { at: number; date: string }[];
}

const DEFAULTS: Omit<Config, "token" | "vault"> = {
  ...SHYMKENT,
  fajrAngle: 15,
  afterFajrMin: 30,
  eveningAskAt: "21:00",
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

// ---------- time ----------

/** Which day file a moment belongs to. Same rule as the app. */
function logicalDate(t: Date): string {
  return dayOf(t, cfg.lat, cfg.lon);
}

function hm(t: Date): string {
  return t.toTimeString().slice(0, 5);
}

interface Slot { id: string; at: Date; kind: "morning" | "evening" }

function slotsOf(cal: string): Slot[] {
  const plus = (t: Date, min: number) => new Date(t.getTime() + min * 60000);
  const out: Slot[] = [{ id: `${cal}:morning`, at: plus(fajrOn(cal, cfg.lat, cfg.lon, cfg.fajrAngle), cfg.afterFajrMin), kind: "morning" }];
  if (/^\d{2}:\d{2}$/.test(cfg.eveningAskAt)) out.push({ id: `${cal}:evening`, at: new Date(`${cal}T${cfg.eveningAskAt}:00`), kind: "evening" });
  return out;
}

// ---------- vault ----------

function readHabits(): Habit[] {
  const dir = join(cfg.vault, HABIT_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseHabit({ rel: `${HABIT_DIR}/${f}`, content: readFileSync(join(dir, f), "utf8"), mtime: 0 }))
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
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

const rel = (p: string) => p.slice(cfg.vault.length + 1);

function readLife() {
  return buildLife(walkMd(join(cfg.vault, "life")).map((p) => ({ rel: rel(p), content: readFileSync(p, "utf8"), mtime: 0 })));
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

function peoplePages(): Page[] {
  return walkMd(join(cfg.vault, "wiki"))
    .filter((p) => /\/People\/[^_/][^/]*\.md$/.test(p))
    .map((p) => buildPage(rel(p), readFileSync(p, "utf8"), 0))
    .filter((p) => p.zone === "person");
}

/** The sura pages, for the «сур выучено» number. */
function suraPages(): Page[] {
  return walkMd(join(cfg.vault, "wiki"))
    .filter((p) => /\/Суры\/[^/]+\.md$/.test(p))
    .map((p) => buildPage(rel(p), readFileSync(p, "utf8"), 0));
}

function activeQuests(): Quest[] {
  return walkMd(join(cfg.vault, QUEST_DIR))
    .map((p) => parseQuest({ rel: rel(p), content: readFileSync(p, "utf8"), mtime: 0 }))
    .filter((q) => q.status === "active")
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

// ---------- «требует тебя» ----------

function needsYouText(date: string, limit = 6): string | null {
  const life = readLife();
  const overviews = readdirSync(join(cfg.vault, "wiki"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(cfg.vault, "wiki", e.name, "_Overview.md")))
    .map((e) => buildPage(`wiki/${e.name}/_Overview.md`, readFileSync(join(cfg.vault, "wiki", e.name, "_Overview.md"), "utf8"), 0))
    .filter((p) => p.theme)
    .map((p) => ({ theme: p.theme!, body: p.body }));
  const items = attention(life, peoplePages(), date, overviews);
  if (!items.length) return null;
  const more = items.length > limit ? `\n…и ещё ${items.length - limit} — на главном экране.` : "";
  return ["📌 Требует тебя", ...items.slice(0, limit).map((a) => `• ${a.text}`)].join("\n") + more;
}

async function sendNeeds(date: string, quietIfEmpty: boolean) {
  if (!cfg.chatId) return;
  const text = needsYouText(date);
  if (text) await say(text);
  else if (!quietIfEmpty) await say("📌 Ничего не горит: просроченного нет.");
}

// ---------- the one morning message ----------

const owner = (s: string) => s.replace(/\s*—\s*(ты|Claude|ET1|JH1|ты и Claude|Claude и ты|ты с Claude|ты решаешь, Claude делает)\s*$/i, "");

function morningText(cal: string): string {
  const y = addDays(cal, -1);
  const habits = readHabits();
  const due = habits.filter((h) => habitDue(h, y));
  const day = readDay(y);
  // One-button habits: an untouched bad habit is held out, an untouched good one is not done.
  const got = (k: HabitKind) => {
    const items = due.filter((h) => h.kind === k);
    const n = items.filter((h) => { const m = markOf(day, h.title); return k === "bad" ? m !== "failed" : m === "done" || m === "late"; }).length;
    return items.length ? `${n}/${items.length}` : "—";
  };
  const marked = due.filter((h) => markOf(day, h.title)).length;
  const lines = [`☀️ ${formatDayTitle(cal)}`];
  if (due.length) {
    lines.push(
      marked
        ? `Вчера (${formatDayTitle(y).toLowerCase()}): намаз ${got("prayer")} · удержался ${got("bad")} · привычки ${got("good")}${day.closed ? "" : " — открой приложение, доотметь и нажми «Готово»"}.`
        : `Вчера (${formatDayTitle(y).toLowerCase()}) ещё не отмечено — открой приложение, отметь и нажми «Готово».`,
    );
  }

  const life = readLife();
  const days = life.days;
  const held = habits.filter((h) => h.status === "active" && h.kind === "bad").map((h) => ({ h, n: heldOut(h, days, y) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  if (held.length) lines.push(`🛡 ${held.slice(0, 4).map(({ h, n }) => `${h.title} ${n} дн`).join(" · ")}`);

  const nums = winNumbers(life, suraPages(), y, life.health ? parseHealth(life.health).weightGoal : undefined);
  lines.push(`📊 ${nums.map((n) => `${n.label.replace(", кг", "").replace(", ₸", "")}: ${n.value}`).join(" · ")}`);

  const quests = activeQuests();
  const steps = quests.map((q) => ({ q, next: nextStep(questSteps(q.body)) })).filter((x) => x.next);
  if (steps.length) lines.push("", "▶ Сегодня первое:", ...steps.map(({ q, next }) => `• ${q.title}: ${owner(next!.text)}`));

  const { week, month } = goalsFor(life.goals, cal);
  const todayTasks = readDay(cal).tasks; // 4.1: the day's tasks are in the day file
  if (todayTasks.length) {
    const done = todayTasks.filter((t) => t.done).length;
    lines.push("", `✅ Сегодня: задач ${done} из ${todayTasks.length}`, ...todayTasks.filter((t) => !t.done).map((t) => `○ ${t.text}`));
  }
  if (week?.tasks.length) {
    const done = week.tasks.filter((t) => t.done).length;
    lines.push("", `📅 Неделя: задач ${done} из ${week.tasks.length}`, ...week.tasks.filter((t) => !t.done).slice(0, 4).map((t) => `○ ${t.text}`));
  } else if (!week) lines.push("", "📅 Файла недели нет — цели недели пишутся с Claude в воскресенье.");
  if (month?.tasks.length) {
    const done = month.tasks.filter((t) => t.done).length;
    lines.push("", `🗓 Месяц: задач ${done} из ${month.tasks.length}`, ...month.tasks.filter((t) => !t.done).slice(0, 4).map((t) => `○ ${t.text}`));
  }
  return lines.join("\n");
}

async function sendMorning(cal: string) {
  if (!cfg.chatId) return;
  await say(morningText(cal));
  await sendNeeds(cal, true);
}

/** What the day holds — sessions, money, meals, mood. Sent when the evening survey ends, and on /summary. */
function eveningText(cal: string): string {
  const d = readDay(cal);
  const lines = [`🌇 Итог дня — ${formatDayTitle(cal).toLowerCase()}`];
  if (d.weight !== undefined) lines.push(`⚖️ ${d.weight} кг`);
  if (d.sessions.length) lines.push(`⏱ ${d.sessions.map((s) => `${s.quest}: ${s.minutes} мин`).join(" · ")}`);
  if (d.txs.length) lines.push(`💸 потрачено ${fmtSum(d.txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))}${d.txs.some((t) => t.amount > 0) ? `, получено ${fmtSum(d.txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0))}` : ""}`);
  if (d.meals.length) lines.push(`🍽 ${d.meals.map((m) => `${m.time} ${m.what}`).join(" · ")}${d.meals.some(isLateMeal) ? " — есть поздняя еда" : ""}`);
  if (d.done.length) lines.push(`✓ ${d.done.join("; ")}`);
  if (d.mood !== undefined) lines.push(`настроение ${d.mood}${d.stress !== undefined ? `, стресс ${d.stress}` : ""}`);
  lines.push("", "Привычки за сегодня отметишь завтра утром в приложении.");
  return lines.join("\n");
}

// ---------- evening survey (Eldar, 2026-11-02): short questions, one at a time, answer or skip ----------

type SurveyStep = "weight" | "food" | "money" | "mood" | "stress" | "done";
const SURVEY_STEPS: SurveyStep[] = ["weight", "food", "money", "mood", "stress", "done"];
const SURVEY_Q: Record<SurveyStep, string> = {
  weight: "⚖️ Сколько весишь сегодня?",
  food: "🍽 Что ел сегодня? Через запятую, время по желанию: «9:00 овсянка, 13:30 плов»",
  money: "💸 На что потратил? «2500 такси, 1200 кофе»; доход — с плюсом",
  mood: "🙂 Настроение, 1–10?",
  stress: "😤 Стресс, 1–10?",
  done: "✅ Что сделал сегодня? Одной-двумя строками",
};
/** The open survey. In memory: a restart forgets the question, the morning drops it. */
let survey: { date: string; i: number } | null = null;

const skipRow = (compact: string, i: number): Button[][] => [[{ text: "⏭ пропустить", callback_data: `sv:${compact}:${i}:x` }]];
const surveyScale = (compact: string, i: number): Button[][] => [
  [1, 2, 3, 4, 5].map((n) => ({ text: String(n), callback_data: `sv:${compact}:${i}:${n}` })),
  [6, 7, 8, 9, 10].map((n) => ({ text: String(n), callback_data: `sv:${compact}:${i}:${n}` })),
  ...skipRow(compact, i),
];

async function startSurvey(date: string) {
  if (!cfg.chatId || readDay(date).closed) return;
  survey = { date, i: -1 };
  awaiting = null;
  pendingTx = null;
  await nextSurveyQuestion();
}

/** Ask the next question that still has no answer in the file; the last one closes with the summary. */
async function nextSurveyQuestion() {
  if (!survey) return;
  const d = readDay(survey.date);
  for (survey.i++; survey.i < SURVEY_STEPS.length; survey.i++) {
    const step = SURVEY_STEPS[survey.i];
    if (step === "weight" && d.weight !== undefined) continue;
    if (step === "mood" && d.mood !== undefined) continue;
    if (step === "stress" && d.stress !== undefined) continue;
    break;
  }
  if (survey.i >= SURVEY_STEPS.length) {
    const date = survey.date;
    survey = null;
    awaiting = null;
    await say(eveningText(date), { reply_markup: REPLY_KEYBOARD });
    return;
  }
  const step = SURVEY_STEPS[survey.i];
  const compact = survey.date.replaceAll("-", "");
  if (step === "mood" || step === "stress") {
    awaiting = null;
    await say(SURVEY_Q[step], { reply_markup: { inline_keyboard: surveyScale(compact, survey.i) } });
  } else {
    ask("survey", 12 * 3600_000);
    await say(SURVEY_Q[step], { reply_markup: { inline_keyboard: skipRow(compact, survey.i) } });
  }
}

/** «овсянка, 13:30 плов; чай» → meals; «2500 такси, +50000 зарплата» → txs; done → bullets. */
const splitList = (text: string) => text.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

async function onSurveyAnswer(text: string, sent: Date): Promise<string> {
  if (!survey) return "";
  const step = SURVEY_STEPS[survey.i];
  const day = readDay(survey.date);
  if (step === "weight") {
    const n = parseAmount(text.replace(/кг|kg/gi, ""));
    if (n === undefined || n < 30 || n > 300) { ask("survey", 12 * 3600_000); return "Не понял вес. Число, например 90.5 — или пропусти."; }
    writeDay({ ...day, weight: n });
    return `⚖️ ${n} кг`;
  }
  if (step === "food") {
    const meals = splitList(text).map((x) => parseMeal(x, sent)).filter((m): m is Meal => !!m);
    if (!meals.length) { ask("survey", 12 * 3600_000); return "Не понял. Напиши, что ел, через запятую — или пропусти."; }
    const all = [...day.meals, ...meals].sort((a, b) => a.time.localeCompare(b.time));
    writeDay({ ...day, meals: all });
    return `🍽 ${meals.map((m) => `${m.time} ${m.what}`).join(" · ")}${meals.some(isLateMeal) ? "\n⚠️ После 21:00 — за границей по панкреатиту." : ""}`;
  }
  if (step === "money") {
    const txs = splitList(text).map(parseMoney).filter((t): t is { amount: number; note: string } => !!t).map((t) => ({ amount: t.amount, category: "", account: "", note: t.note }) as Tx);
    if (!txs.length) { ask("survey", 12 * 3600_000); return "Не понял сумму. «2500 такси, 1200 кофе» — или пропусти."; }
    writeDay({ ...day, txs: [...day.txs, ...txs] });
    return `💸 ${txs.map((t) => `${t.amount > 0 ? "+" : "−"}${fmtSum(t.amount)}${t.note ? " " + t.note : ""}`).join(" · ")} — без категории и счёта, Claude разнесёт`;
  }
  if (step === "done") {
    const items = text.split(/\n+|;\s*/).map((x) => x.trim().replace(/^[-•]\s*/, "")).filter(Boolean);
    if (!items.length) { ask("survey", 12 * 3600_000); return "Пусто. Напиши строку — или пропусти."; }
    writeDay({ ...day, done: [...day.done, ...items] });
    return `✅ ${items.length === 1 ? items[0] : items.length + " пункта в «Сделано»"}`;
  }
  return "";
}

async function onSurveyCallback(compact: string, i: number, code: string, chat: number, msg: number) {
  const date = fromCompact(compact);
  const edit = (text: string) => tg("editMessageText", { chat_id: chat, message_id: msg, text }).catch(() => {});
  if (!survey || survey.date !== date || survey.i !== i) { await edit("Этот вопрос уже прошёл."); return; }
  const step = SURVEY_STEPS[i];
  if (code === "x") {
    await edit(`${SURVEY_Q[step]} — пропущено`);
  } else if (step === "mood" || step === "stress") {
    const n = Number(code);
    if (n >= 1 && n <= 10) writeDay({ ...readDay(date), [step]: n });
    await edit(`${step === "mood" ? "🙂 Настроение" : "😤 Стресс"} ${n}`);
  }
  await nextSurveyQuestion();
}

// ---------- check-in: mood, stress, work (on demand) ----------

const fromCompact = (c: string) => `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`;
const scale = (prefix: string, compact: string): Button[][] => [
  [1, 2, 3, 4, 5].map((n) => ({ text: String(n), callback_data: `${prefix}:${compact}:${n}` })),
  [6, 7, 8, 9, 10].map((n) => ({ text: String(n), callback_data: `${prefix}:${compact}:${n}` })),
  [{ text: "пропустить", callback_data: `${prefix}:${compact}:x` }],
];

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
    if (!quest) { await edit("Деятельность не нашёл — может, её уже закрыли."); return; }
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
    const life = readLife();
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
  await say("⚖️ Вес сегодня? Число, например 90.5.", { reply_markup: { force_reply: true, input_field_placeholder: "90.5" } });
}
let pendingWeightDate: string | null = null;

async function onWeight(text: string) {
  const n = parseAmount(text.replace(/кг|kg/gi, ""));
  const date = pendingWeightDate ?? logicalDate(new Date());
  if (n === undefined || n < 30 || n > 300) { ask("weight", 12 * 3600_000); await say("Не понял вес. Напиши число, например 90.5."); return; }
  writeDay({ ...readDay(date), weight: n });
  pendingWeightDate = null;
  await say(`⚖️ Записал: ${n} кг (${formatDayTitle(date).toLowerCase()}).`);
}

// ---------- contacts ----------

/** The close circle (7+), most overdue first — the people a contact should be logged for. */
function contactPeople() {
  const life = buildLife(walkMd(join(cfg.vault, "life", "events")).map((p) => ({ rel: rel(p), content: readFileSync(p, "utf8"), mtime: 0 })));
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
function writeRel(r: string, content: string) {
  if (!r.startsWith("life/") && !/^wiki\/[^/]+\/People\/[^_/][^/]*\.md$/.test(r)) throw new Error(`bot may not write ${r}`);
  const p = join(cfg.vault, r);
  mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
  writeFileSync(p + ".bot-tmp", content);
  renameSync(p + ".bot-tmp", p);
}

// ---------- food ----------

const FOOD_BUTTON = "🍽 Еда";
const HABITS_BUTTON = "📋 Вчера";
const CONTACT_BUTTON = "🤝 Контакт";
const MONEY_BUTTON = "💸 Деньги";
const WAIT_MS = 15 * 60000;

/** What the next plain message answers. Kept in memory: a restart just forgets the question. */
type AwaitKind = "food" | "money" | "category" | "work" | "weight" | "survey";
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
  const n = parseAmount(m[2]);
  if (n === undefined || n <= 0) return null;
  return { amount: m[1] === "+" ? n : -n, note: m[3].trim() };
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
  return Math.abs(n).toLocaleString("ru-RU").replace(/ /g, " ");
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

const MARK_LABEL: Record<DayMark, string> = { done: "✓", failed: "✗", skipped: "–", late: "⏰" };

/** What a tap writes: ✓ (done), ✗ (failed), ⏰ (late — prayers only), – (planned skip). */
type Mode = "d" | "f" | "l" | "s";
const MODE_GLYPH: Record<Mode, string> = { d: "✓", f: "✗", l: "⏰", s: "–" };
const MODE_HINT: Record<Mode, string> = { d: "Нажми, что сделал; в «удержался» — только то, где не удержался.", f: "Режим ✗: нажми, что не сделал.", l: "Режим ⏰: нажми намаз, который прочитал поздно.", s: "Режим пропуска: нажми, что пропускаешь по плану." };
const CODE: Record<string, DayMark> = { d: "done", f: "failed", s: "skipped", l: "late" };

const GROUP: { kind: HabitKind; title: string }[] = [{ kind: "prayer", title: "🕌 Намаз" }, { kind: "bad", title: "🛡 Удержался" }, { kind: "good", title: "🌱 Привычки" }];

/**
 * The on-demand keyboard for one date: three groups, one full-width button per
 * unmarked habit. The default tap is ✓; the switches at the bottom turn the
 * same buttons into ✗, ⏰ or пропуск.
 */
function digest(date: string, title: string, mode: Mode = "d"): { text: string; keyboard: Button[][] } {
  const due = readHabits().filter((h) => habitDue(h, date));
  const day = readDay(date);
  const compact = date.replaceAll("-", "");
  const marked = due.filter((h) => markOf(day, h.title));
  const lines = [title, `${formatDayTitle(date)} · отмечено ${marked.length} из ${due.length}`];
  const keyboard: Button[][] = [];
  let open = 0;
  for (const g of GROUP) {
    const items = due.filter((h) => h.kind === g.kind);
    if (!items.length) continue;
    const got = items.filter((h) => { const m = markOf(day, h.title); return g.kind === "bad" ? m !== "failed" : m === "done" || m === "late"; }).length;
    const left = items.filter((h) => !markOf(day, h.title));
    const shown = items.filter((h) => markOf(day, h.title)).map((h) => `${MARK_LABEL[markOf(day, h.title)!]} ${h.title}`).join(", ");
    lines.push(`${g.title} ${got}/${items.length}${shown ? ` — ${shown}` : ""}`);
    if (!left.length) continue;
    open += left.length;
    keyboard.push([{ text: `— ${g.title} —`, callback_data: "noop:0:0" }]);
    // The default tap on a bad habit means «не удержался»: untouched is already «устоял».
    const tapMode: Mode = mode === "d" && g.kind === "bad" ? "f" : mode;
    keyboard.push(...left.map((h) => [{ text: `${MODE_GLYPH[tapMode]} ${h.title}`, callback_data: `m:${compact}:${tapMode}:${key(h.title)}` }]));
  }
  if (open) {
    lines.push("", MODE_HINT[mode]);
    keyboard.push(
      mode === "d"
        ? [{ text: "✗ не сделал…", callback_data: `v:${compact}:f` }, { text: "⏰ поздно…", callback_data: `v:${compact}:l` }, { text: "– пропуск…", callback_data: `v:${compact}:s` }]
        : [{ text: "← назад к ✓", callback_data: `v:${compact}:d` }],
    );
    keyboard.push([{ text: `⏰ Позже, через ${cfg.snoozeMin} мин`, callback_data: `z:${compact}:0` }]);
  } else lines.push("", due.length ? "Всё отмечено." : "Привычек на этот день нет.");
  return { text: lines.join("\n"), keyboard };
}

async function sendDigest(date: string, title: string) {
  if (!cfg.chatId) return;
  const { text, keyboard } = digest(date, title);
  await tg("sendMessage", { chat_id: cfg.chatId, text, reply_markup: { inline_keyboard: keyboard } });
}

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
  const [kind, compact, code, hkey] = q.data.split(":");
  const date = fromCompact(compact);
  const title = (q.message.text ?? "").split("\n")[0];
  const edit = async (mode: Mode) => {
    const { text, keyboard } = digest(date, title, mode);
    await tg("editMessageText", {
      chat_id: q.message!.chat.id, message_id: q.message!.message_id, text, reply_markup: { inline_keyboard: keyboard },
    }).catch(() => {}); // "message is not modified" when tapped twice
  };

  if (kind === "noop") { await tg("answerCallbackQuery", { callback_query_id: q.id }); return; }

  if (kind === "sv") {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    await onSurveyCallback(compact ?? "", Number(code), hkey ?? "", q.message.chat.id, q.message.message_id);
    return;
  }

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
    await edit((code in MODE_GLYPH ? code : "d") as Mode);
    return;
  }

  if (kind === "z") {
    state.snoozes.push({ at: Date.now() + cfg.snoozeMin * 60000, date });
    saveState(state);
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: `Напомню в ${hm(new Date(state.snoozes.at(-1)!.at))}` });
    return;
  }

  // kind === "m": a mark
  const habit = readHabits().find((h) => key(h.title) === hkey);
  let mark = CODE[code];
  if (mark === "late" && habit?.kind !== "prayer") mark = "done"; // «поздно» only means something for a prayer
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
  const today = toDateStr(new Date());
  if (text.startsWith("/start") || text.startsWith("/help")) {
    awaiting = null;
    const s = slotsOf(today);
    await say(
      [
        `Одно сообщение в день: ${s.map((x) => `${hm(x.at)} (${x.kind === "morning" ? "после фаджра" : "магриб"})`).join(", ")}.`,
        "Утром: как выглядит вчера, серии, четыре цифры, первый шаг каждого квеста, задачи недели и «требует тебя». Отметки делаются в приложении, на главном экране, за вчерашний день.",
        "",
        `${HABITS_BUTTON} или /yesterday — отметить вчера здесь, если приложение не под рукой. /today — сегодня.`,
        `${FOOD_BUTTON} — что съел. ${MONEY_BUTTON} — расход или доход. ${CONTACT_BUTTON} — виделся или созвонился.`,
        `Вечером${/^\d{2}:\d{2}$/.test(cfg.eveningAskAt) ? ` в ${cfg.eveningAskAt}` : ""} — короткие вопросы по одному: вес, еда, деньги, настроение, стресс, что сделал. Отвечаешь строкой или жмёшь «пропустить»; без ответа следующий вопрос не приходит. /evening — начать опрос сейчас, /summary — итог дня.`,
        "/checkin — настроение, стресс, над чем работал. /weight — вес. /need — что требует тебя. /morning — утреннее сообщение сейчас.",
      ].join("\n"),
      { reply_markup: REPLY_KEYBOARD },
    );
    return;
  }
  if (text.startsWith("/checkin")) { awaiting = null; await sendCheckin(today); return; }
  if (text.startsWith("/weight")) { await askWeight(logicalDate(new Date())); return; }
  if (text.startsWith("/contact") || text === CONTACT_BUTTON) { awaiting = null; await sendContactList(); return; }
  if (text.startsWith("/need")) { awaiting = null; await sendNeeds(today, false); return; }
  if (text.startsWith("/morning")) { awaiting = null; await sendMorning(today); return; }
  if (text.startsWith("/evening")) { await startSurvey(logicalDate(new Date())); return; }
  if (text.startsWith("/summary")) { awaiting = null; await say(eveningText(today)); return; }
  if (text.startsWith("/yesterday") || text === HABITS_BUTTON) { awaiting = null; await sendDigest(addDays(today, -1), "📋 Вчера"); return; }
  if (text.startsWith("/today")) { awaiting = null; await sendDigest(today, "📋 Сегодня"); return; }
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
  if ((!awaiting || awaiting.kind === "survey") && survey && !["mood", "stress"].includes(SURVEY_STEPS[survey.i])) {
    awaiting = null;
    const sent = m.date ? new Date(m.date * 1000) : new Date();
    const reply = await onSurveyAnswer(text, sent);
    if (reply) await say(reply);
    if (!awaiting) await nextSurveyQuestion(); // a parse failure re-asks instead
    return;
  }
  if (!awaiting || Date.now() - awaiting.at > (awaiting.ttl ?? WAIT_MS)) {
    awaiting = null;
    await say(`Нажми кнопку внизу: «${FOOD_BUTTON}» или «${MONEY_BUTTON}». Всё остальное — скажи Claude.`, { reply_markup: REPLY_KEYBOARD });
    return;
  }
  const kind = awaiting.kind;
  awaiting = null;
  // When it was sent, not when this Mac woke up and read it.
  const sent = m.date ? new Date(m.date * 1000) : new Date();
  if (kind === "work") { await onWorkNote(text); return; }
  if (kind === "weight") { await onWeight(text); return; }
  if (kind === "food") await onFood(text, sent);
  else if (kind === "money") await onMoney(text, sent);
  else if (kind === "category" && pendingTx) {
    pendingTx.category = canonicalCategory(text.replace(/\|/g, "/").trim(), readAllDays());
    if (APP_ONLY_CATEGORIES.includes(pendingTx.category.toLowerCase())) {
      pendingTx.category = undefined;
      await say("«Долг» и «подписки» записываются только в приложении или через Claude: они двигают ещё debts.md и подписки. Напиши другую категорию.");
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

const GRACE_MS = 6 * 3600_000; // a Mac that slept through the morning still sends it within 6 h
const EVENING_GRACE_MS = 3 * 3600_000; // the evening questions are not asked after midnight

async function tick() {
  const now = new Date();
  const today = toDateStr(now);
  for (const cal of [addDays(today, -1), today]) {
    for (const s of slotsOf(cal)) {
      if (s.at > now || state.sent.includes(s.id)) continue;
      state.sent.push(s.id);
      saveState(state);
      const late = now.getTime() - s.at.getTime();
      if (fresh || late > GRACE_MS) continue;
      if (s.kind === "morning") {
        survey = null; // a survey left unanswered overnight is dropped, not asked again
        await sendMorning(cal);
        if (new Date(`${cal}T12:00:00`).getDay() === 0) await askWeight(cal);
      } else if (late <= EVENING_GRACE_MS) await startSurvey(cal);
    }
  }
  const due = state.snoozes.filter((z) => z.at <= now.getTime());
  if (due.length) {
    state.snoozes = state.snoozes.filter((z) => z.at > now.getTime());
    saveState(state);
    for (const z of due) await sendDigest(z.date, "⏰ Напоминаю");
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
            await say(`День ${e.date} уже закрыт — в закрытый день бот не пишет. Поправить можно на главном экране приложения.`).catch(() => {});
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

// `node bot.mjs --morning [YYYY-MM-DD]` prints the morning message and exits: a dry run against any vault, no Telegram.
if (process.argv.includes("--morning")) {
  const date = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? toDateStr(new Date());
  console.log(morningText(date));
  const needs = needsYouText(date);
  if (needs) console.log("\n" + needs);
  process.exit(0);
}

console.log(new Date().toISOString(), "irtiqa bot v2 up; vault:", cfg.vault, "chat:", cfg.chatId ?? "ждёт /start");
setInterval(() => tick().catch((e) => console.error(new Date().toISOString(), "tick", e)), 20_000);
tick().catch((e) => console.error(new Date().toISOString(), "tick", e));
poll();
