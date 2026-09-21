/**
 * Telegram bot: four habit digests a day, marks written straight into
 * `life/days/<date>.md`. The app watches the vault and picks them up.
 *
 * Eldar counts a day from maghrib to maghrib, so after sunset the marks go to
 * the next calendar date. Digests: maghrib (a new day begins), night, morning,
 * lunch. Each shows the due habits not marked yet, with ✓ / ✗ / пропуск per
 * habit and «позже» for the whole digest.
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
  ACCOUNTS_REL, liveBalance, parseAccounts, serializeDay, withMark,
  type Day, type DayMark, type Habit, type Meal, type Tx,
} from "../src/lib/life";
import { addDays, formatDayTitle, toDateStr } from "../src/lib/dates";
import { MAGHRIB_DAYS_FROM, SHYMKENT, maghribOn } from "../src/lib/maghrib";

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
  morning: string;
  lunch: string;
  night: string;
  snoozeMin: number;
}

interface State {
  offset: number;
  sent: string[]; // slot ids already delivered
  snoozes: { at: number; date: string }[];
}

const DEFAULTS: Omit<Config, "token" | "vault"> = {
  ...SHYMKENT,
  maghribOffsetMin: 0,
  morning: "08:00", lunch: "13:00", night: "22:00",
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

function at(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00`);
}

function hm(t: Date): string {
  return t.toTimeString().slice(0, 5);
}

interface Slot { id: string; at: Date; title: string }

function slotsOf(cal: string): Slot[] {
  const m = maghrib(cal);
  return [
    { id: `${cal}:morning`, at: at(cal, cfg.morning), title: "☀️ Утро" },
    { id: `${cal}:lunch`, at: at(cal, cfg.lunch), title: "🍽 Обед" },
    { id: `${cal}:maghrib`, at: m, title: "🌇 Магриб — новый день" },
    { id: `${cal}:night`, at: at(cal, cfg.night), title: "🌙 Перед сном" },
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

function writeDay(d: Day) {
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

// ---------- food ----------

const FOOD_BUTTON = "🍽 Еда";
const HABITS_BUTTON = "📋 Привычки";
const MONEY_BUTTON = "💸 Деньги";
const WAIT_MS = 15 * 60000;

/** What the next plain message answers. Kept in memory: a restart just forgets the question. */
let awaiting: { kind: "food" | "money" | "category"; at: number } | null = null;

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

interface PendingTx { amount: number; note: string; cats: string[]; category?: string; accounts: string[] }
let pendingTx: PendingTx | null = null;

/** «2500 такси», «+50000 зарплата», «1 200,50 кофе» → signed amount and note. */
function parseMoney(text: string): { amount: number; note: string } | null {
  const m = text.replace(/\|/g, "/").trim().match(/^([+-]?)\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return null;
  const n = Number(m[2].replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
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
      const c = t.category.trim();
      if (!c || (t.amount > 0) !== income || APP_ONLY_CATEGORIES.includes(c.toLowerCase())) continue;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 8);
}

/** A typed category in the spelling already used: «Прочее» → «прочее». The most frequent spelling wins. */
function canonicalCategory(typed: string, days: Map<string, Day>): string {
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

/**
 * Text + keyboard for one logical date. One full-width button per unmarked
 * habit, so long titles fit: in mode «d» a tap is ✓, the switches at the
 * bottom turn the same buttons into ✗ or пропуск.
 */
function digest(date: string, title: string, mode: Mode = "d"): { text: string; keyboard: Button[][] } {
  const habits = readHabits().filter((h) => habitDue(h, date));
  const day = readDay(date);
  const open = habits.filter((h) => !markOf(day, h.title));
  const marked = habits.filter((h) => markOf(day, h.title));
  const compact = date.replaceAll("-", "");

  const lines = [title, `${formatDayTitle(date)} · отмечено ${marked.length} из ${habits.length}`];
  if (marked.length) lines.push("", marked.map((h) => `${MARK_LABEL[markOf(day, h.title)!]} ${h.title}`).join("\n"));
  if (open.length) {
    lines.push("", mode === "d" ? "Нажми привычку — будет ✓." : mode === "f" ? "Режим ✗: нажми, что не сделал." : "Режим пропуска: нажми, что пропускаешь по плану.");
    if (mode === "d" && open.some((h) => h.kind === "bad")) lines.push("У плохих привычек ✓ значит «удержался».");
  } else {
    lines.push("", "Всё отмечено.");
  }

  const keyboard: Button[][] = open.map((h) => [
    { text: `${MODE_GLYPH[mode]} ${h.title}`, callback_data: `m:${compact}:${mode}:${key(h.title)}` },
  ]);
  if (open.length) {
    keyboard.push(
      mode === "d"
        ? [{ text: "✗ не сделал…", callback_data: `v:${compact}:f` }, { text: "– пропуск…", callback_data: `v:${compact}:s` }]
        : [{ text: "← назад к ✓", callback_data: `v:${compact}:d` }],
    );
    keyboard.push([{ text: `⏰ Позже, через ${cfg.snoozeMin} мин`, callback_data: `z:${compact}` }]);
  }
  return { text: lines.join("\n"), keyboard };
}

async function sendDigest(date: string, title: string, onlyIfOpen = false) {
  if (!cfg.chatId) return;
  const { text, keyboard } = digest(date, title);
  if (onlyIfOpen && !keyboard.length) return;
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
  const [kind, compact, code, hkey] = q.data.split(":");
  const date = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const title = (q.message.text ?? "").split("\n")[0];

  const edit = async (mode: Mode) => {
    const { text, keyboard } = digest(date, title, mode);
    await tg("editMessageText", {
      chat_id: q.message!.chat.id, message_id: q.message!.message_id, text, reply_markup: { inline_keyboard: keyboard },
    }).catch(() => {}); // "message is not modified" when tapped twice
  };

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

  if (kind === "z") {
    state.snoozes.push({ at: Date.now() + cfg.snoozeMin * 60000, date });
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

interface Message { chat: { id: number }; from?: { id: number }; text?: string }

const REPLY_KEYBOARD = {
  keyboard: [[{ text: FOOD_BUTTON }, { text: MONEY_BUTTON }], [{ text: HABITS_BUTTON }]],
  resize_keyboard: true,
  is_persistent: true,
};

async function say(text: string, extra: Record<string, unknown> = {}) {
  await tg("sendMessage", { chat_id: cfg.chatId, text, ...extra });
}

function ask(kind: "food" | "money" | "category") {
  awaiting = { kind, at: Date.now() };
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
        "Сводки привычек, 4 раза в день:",
        ...s.map((x) => `${hm(x.at)} — ${x.title}`),
        "",
        "День считается от магриба до магриба: после магриба всё идёт в завтрашний файл.",
        `${FOOD_BUTTON} — что съел. ${MONEY_BUTTON} — расход или доход. ${HABITS_BUTTON} или /today — сводка сейчас.`,
      ].join("\n"),
      { reply_markup: REPLY_KEYBOARD },
    );
    return;
  }
  if (text.startsWith("/today") || text === HABITS_BUTTON) {
    awaiting = null;
    await sendDigest(logicalDate(new Date()), "📋 Сейчас");
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
  if (!awaiting || Date.now() - awaiting.at > WAIT_MS) {
    awaiting = null;
    await say(`Нажми кнопку внизу: «${FOOD_BUTTON}» или «${MONEY_BUTTON}».`, { reply_markup: REPLY_KEYBOARD });
    return;
  }
  const kind = awaiting.kind;
  awaiting = null;
  if (kind === "food") await onFood(text);
  else if (kind === "money") await onMoney(text);
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

async function onFood(text: string) {
  const now = new Date();
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

async function onMoney(text: string) {
  const parsed = parseMoney(text);
  if (!parsed) {
    ask("money");
    await say("Не понял сумму. Напиши так: «2500 такси» или «+50000 зарплата».");
    return;
  }
  const days = readAllDays();
  const cats = categoriesFor(parsed.amount > 0, days);
  pendingTx = { ...parsed, cats, accounts: accountsByUse(days) };
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
  const date = logicalDate(new Date());
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

async function tick() {
  const now = new Date();
  const today = toDateStr(now);
  for (const cal of [addDays(today, -1), today]) {
    for (const s of slotsOf(cal)) {
      if (s.at > now || state.sent.includes(s.id)) continue;
      state.sent.push(s.id);
      saveState(state);
      if (fresh || now.getTime() - s.at.getTime() > GRACE_MS) continue;
      if (s.id.endsWith(":maghrib")) {
        // the day that just ended: whatever is still open
        await sendDigest(cal, `🌇 Итог дня ${cal}: не отмечено`, true);
      }
      await sendDigest(logicalDate(new Date(s.at.getTime() + 1000)), s.title);
    }
  }
  const due = state.snoozes.filter((z) => z.at <= now.getTime());
  if (due.length) {
    state.snoozes = state.snoozes.filter((z) => z.at > now.getTime());
    saveState(state);
    for (const z of due) await sendDigest(z.date, "⏰ Напоминаю", true);
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
