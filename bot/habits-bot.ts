/**
 * Telegram bot: four habit digests a day, marks written straight into
 * `life/days/<date>.md`. The app watches the vault and picks them up.
 *
 * Eldar counts a day from maghrib to maghrib, so after sunset the marks go to
 * the next calendar date. Digests: maghrib (a new day begins), night, morning,
 * lunch. Each shows the due habits not marked yet, with ✓ / ✗ / пропуск per
 * habit and «позже» for the whole digest.
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
  DAY_DIR, HABIT_DIR, dayRel, emptyDay, habitDue, markOf, parseDay, parseHabit, serializeDay, withMark,
  type Day, type DayMark, type Habit,
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

/** Text + keyboard for one logical date. Only unmarked habits get buttons. */
function digest(date: string, title: string): { text: string; keyboard: Button[][] } {
  const habits = readHabits().filter((h) => habitDue(h, date));
  const day = readDay(date);
  const open = habits.filter((h) => !markOf(day, h.title));
  const marked = habits.filter((h) => markOf(day, h.title));
  const compact = date.replaceAll("-", "");

  const lines = [title, `${formatDayTitle(date)} · отмечено ${marked.length} из ${habits.length}`];
  if (marked.length) lines.push("", marked.map((h) => `${MARK_LABEL[markOf(day, h.title)!]} ${h.title}`).join("\n"));
  if (open.length) {
    if (open.some((h) => h.kind === "bad")) lines.push("", "У плохих привычек ✓ значит «удержался».");
  } else {
    lines.push("", "Всё отмечено.");
  }

  const keyboard: Button[][] = open.map((h) => [
    { text: `✓ ${h.title}`, callback_data: `m:${compact}:d:${key(h.title)}` },
    { text: "✗", callback_data: `m:${compact}:f:${key(h.title)}` },
    { text: "пропуск", callback_data: `m:${compact}:s:${key(h.title)}` },
  ]);
  if (open.length) keyboard.push([{ text: `⏰ Позже, через ${cfg.snoozeMin} мин`, callback_data: `z:${compact}` }]);
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
  const { text, keyboard } = digest(date, title);
  await tg("editMessageText", {
    chat_id: q.message.chat.id, message_id: q.message.message_id, text, reply_markup: { inline_keyboard: keyboard },
  }).catch(() => {}); // "message is not modified" when tapped twice
}

interface Message { chat: { id: number }; from?: { id: number }; text?: string }

async function onMessage(m: Message) {
  const text = (m.text ?? "").trim();
  if (!cfg.chatId && text.startsWith("/start")) {
    cfg.chatId = m.chat.id; // the first /start owns the bot
    saveConfig(cfg);
  }
  if (m.chat.id !== cfg.chatId) return;
  if (text.startsWith("/start") || text.startsWith("/help")) {
    const s = slotsOf(toDateStr(new Date()));
    await tg("sendMessage", {
      chat_id: cfg.chatId,
      text: [
        "Сводки привычек, 4 раза в день:",
        ...s.map((x) => `${hm(x.at)} — ${x.title}`),
        "",
        "День считается от магриба до магриба: после магриба отметки идут в завтрашний файл.",
        "/today — сводка прямо сейчас",
      ].join("\n"),
    });
    return;
  }
  if (text.startsWith("/today")) await sendDigest(logicalDate(new Date()), "📋 Сейчас");
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
