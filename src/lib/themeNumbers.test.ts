import assert from "node:assert/strict";
import { test } from "node:test";
import { fmt, type Cell } from "./dashboard";
import { buildLife } from "./life";
import { parseNumberLine } from "./overview";
import { dateWords, numberTile, prayerCell, type Tile, type TileCtx } from "./themeNumbers";
import type { MdFile } from "./types";
import { buildVault } from "./vault";

// Today is 2030-02-01: the window is 2030-01-02 … 2030-01-31.
const TODAY = "2030-02-01";
const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });
const habit = (file: string, kind: string, extra: Record<string, string> = {}) =>
  md(`life/habits/${file}.md`, { title: file, type: "habit", kind, theme: "Personal growth", freq: "daily", status: "active", created: "2029-12-01", ...extra });
const day = (date: string, fm: Record<string, string>, body = "") => md(`life/days/${date}.md`, { date, type: "day", ...fm }, body);
const vaultOf = (pages: MdFile[] = []) => buildVault({ root: "", pages, life: [], raw: [], log: "", claude_md: "", media: [] });
const ctxOf = (files: MdFile[], pages: MdFile[] = [], theme = "Personal growth", today = TODAY): TileCtx => ({ life: buildLife(files), vault: vaultOf(pages), theme, today });
const tile = (line: string, ctx: TileCtx) => numberTile(parseNumberLine(line)!, ctx);
const L: Record<Cell, string> = { done: "h", late: "h", held: "h", failed: "f", fall: "f", unmarked: "u", pending: "u", nofile: "n", skip: "s", future: "t" };
const beads = (t: Tile) => (t.beads ?? []).map((c) => L[c]).join("");
const brief = (t: Tile) => ({ value: t.value, unit: t.unit, note: t.note });

const HABITS = [
  habit("Привычка А", "bad", { clean_since: "2029-12-10" }),
  habit("Привычка Б", "bad", { clean_since: "2029-12-15" }),
  habit("Привычка В", "bad"),
  habit("Привычка Г", "bad"),
  habit("Привычка Д", "bad"),
  habit("Хорошая Е", "good", { created: "2030-01-25" }),
  habit("Хорошая Ж", "good", { created: "2030-02-01" }),
  habit("Хорошая З", "good", { status: "archived" }),
  habit("Файл И", "good", { title: "Другое название" }),
  habit("Фаджр", "prayer", { theme: "Spirituality & Religion" }),
  habit("Иша", "prayer", { theme: "Spirituality & Religion" }),
];
const DAYS = [
  day("2030-01-05", { habits_done: "[Фаджр]", habits_failed: "[Иша]" }),
  day("2030-01-06", { habits_done: "[Фаджр]", habits_late: "[Иша]" }),
  day("2030-01-07", { habits_done: "[Привычка А]" }),
  day("2030-01-20", { habits_failed: "[Привычка А]" }),
  day("2030-01-21", { habits_done: "[Привычка А]" }),
  day("2030-01-25", { habits_done: "[Хорошая Е]" }),
  day("2030-01-26", { habits_done: "[Хорошая Е]" }),
  day("2030-01-27", { habits_late: "[Хорошая Е]" }),
  day("2030-01-28", { habits_failed: "[Хорошая Е]" }),
  day("2030-01-29", { habits_skipped: "[Хорошая Е]", habits_failed: "[Привычка Г]" }),
  day("2030-01-31", { habits_done: "[Фаджр, Привычка Г]", habits_failed: "[Привычка Д]" }),
];
const LIFE = ctxOf([...HABITS, ...DAYS]);

test("dateWords: day and month, with the year only when it is not this year's", () => {
  assert.equal(dateWords("2030-01-20", TODAY), "20 января");
  assert.equal(dateWords("2029-12-15", TODAY), "15 декабря 2029");
});

test("[[Привычка]], bad: days without a fall by the app's run; the last fall or «чисто с»; falls of the 30 days; beads", () => {
  const a = tile("- Без А — [[Привычка А]]", LIFE);
  assert.deepEqual(brief(a), { value: "11", unit: "дней", note: "последний срыв — 20 января · за 30 дней 1" });
  assert.equal(beads(a), "h".repeat(18) + "f" + "h".repeat(11)); // nothing written after clean_since counts as held, a fall stays
  assert.deepEqual(brief(tile("- Без Б — [[Привычка Б]]", LIFE)), { value: "48", unit: "дней", note: "чисто с 15 декабря 2029" });
  assert.deepEqual(brief(tile("- Без Г — [[Привычка Г]]", LIFE)), { value: "1", unit: "день", note: "последний срыв — 29 января · за 30 дней 1" });
  const d = tile("- Без Д — [[Привычка Д]]", LIFE);
  assert.deepEqual([d.value, d.warn], ["0", true]); // the run broke yesterday
  // no clean_since and not one mark: nothing is known
  assert.deepEqual(brief(tile("- Без В — [[Привычка В]]", LIFE)), { value: "—", unit: undefined, note: "отметок нет" });
});

test("[[Привычка]], bad: a day with nothing written before clean_since is not counted as held", () => {
  const t = tile("- Новая — [[Новая]]", ctxOf([habit("Новая", "bad", { clean_since: "2030-01-20" })]));
  assert.equal(beads(t), "n".repeat(18) + "h".repeat(12));
});

test("[[Привычка]], good: done of the due days since its creation; nothing due yet is «—»", () => {
  const e = tile("- Е — [[Хорошая Е]]", LIFE);
  assert.deepEqual(brief(e), { value: "3", unit: "из 6", note: "с 25 января" }); // a skip is not due; a day without a file is
  assert.equal(beads(e), "s".repeat(23) + "hhhfsnu");
  assert.deepEqual(brief(tile("- Ж — [[Хорошая Ж]]", LIFE)), { value: "—", unit: undefined, note: "с 1 февраля · положенных дней ещё не было" });
  assert.deepEqual(brief(tile("- З — [[Хорошая З]]", LIFE)), { value: "—", unit: undefined, note: "привычка не активна" });
  // a wikilink names the file; the habit is still known by its title
  assert.equal(tile("- И — [[Файл И]]", LIFE).note, "за 30 дней");
});

test("намаз: days since the last day with a missed prayer; days marked of the run; one bead per day", () => {
  const p = tile("- Не оставлять намаз — намаз", LIFE);
  assert.deepEqual(brief(p), { value: "26", unit: "дней", note: "последний пропуск — 5 января · отмечено 2 дня из 26" });
  assert.equal(beads(p), "hhhfhh" + "h".repeat(24)); // a day without prayer marks holds, a missed prayer stays
  const life = buildLife([...HABITS, ...DAYS]);
  assert.equal(prayerCell(life, "2030-02-01", TODAY), "pending"); // today has no file yet
  assert.equal(prayerCell(life, "2030-02-02", TODAY), "future");
  assert.deepEqual(brief(tile("- Намаз — намаз", ctxOf([habit("Фаджр", "prayer")]))), { value: "—", unit: undefined, note: "отметок намаза нет" });
  assert.equal(tile("- Намаз — намаз", ctxOf([])).note, "намазов среди привычек нет");
});

const sura = (n: number, name: string, fm: Record<string, string>) =>
  md(`wiki/Spirituality & Religion/Wiki/Islamic knowledge/Суры/${n} — ${name}.md`, { title: `Сура ${n} — ${name}`, type: "wiki", sura: String(n), ...fm });
const SURAS = [
  sura(1, "Первая (Тест)", { memorized: "2030-02-01" }),
  sura(2, "Вторая (Тест)", { memorized: "2030-01-15" }),
  sura(3, "Третья (Тест)", { memorized: "2030-01-20" }),
  sura(4, "Четвёртая (Тест)", { learning: "2030-01-25" }),
];

test("суры: learnt of 114; this month's new ones, else last month's; what is being learnt", () => {
  assert.deepEqual(brief(tile("- Суры — суры", ctxOf([], SURAS))), { value: "3", unit: "/ 114", note: "в феврале +1 · учу: 4 Четвёртая" });
  assert.deepEqual(brief(tile("- Суры — суры", ctxOf([], SURAS.slice(1)))), { value: "2", unit: "/ 114", note: "в январе +2 · учу: 4 Четвёртая" });
  assert.equal(tile("- Суры — суры", ctxOf([])).value, "—");
});

test("вес: the latest weight through today and the way to the nearest weight goal", () => {
  const files = [day("2030-01-10", { weight: "80" }), day("2030-01-20", { weight: "79" }), day("2030-02-01", { weight: "78.4" })];
  const goal = { rel: "life/goals/2030.md", mtime: 0, content: "---\ntype: goals\nperiod: year\n---\n## Цели\n- **75 кг к 1 мая** · мера: вес · срок: 2030-05-01 · → [[2031]]\n" };
  assert.deepEqual(brief(tile("- Вес — вес", ctxOf([...files, goal]))), { value: "78.4", unit: "кг", note: "1 фев · до 75 к 1 мая — ещё 3.4" });
  // the first weight ever stands on the target: the direction is read from the last 21 days, as weightPace reads it
  assert.equal(tile("- Вес — вес", ctxOf([day("2029-12-01", { weight: "75" }), ...files.slice(1), goal])).note, "1 фев · до 75 к 1 мая — ещё 3.4");
  assert.deepEqual(brief(tile("- Вес — вес", ctxOf(files))), { value: "78.4", unit: "кг", note: "1 фев" });
  assert.deepEqual(brief(tile("- Вес — вес", ctxOf([]))), { value: "—", unit: "кг", note: "замеров нет" });
});

test("отжимания и подтягивания: the latest measure through today and «· цель N»", () => {
  const files = [day("2030-01-20", { pushups: "15" }), day("2030-02-01", { pushups: "18" })];
  assert.deepEqual(brief(tile("- Отжимания — отжимания · цель 25", ctxOf(files))), { value: "18", unit: undefined, note: "1 фев · цель 25" });
  assert.deepEqual(brief(tile("- Подтягивания — подтягивания · цель 5", ctxOf(files))), { value: "—", unit: undefined, note: "замеров нет · цель 5" });
});

test("настроение: the mean of the window's answers; today does not count yet", () => {
  const files = [day("2030-01-10", { mood: "6" }), day("2030-01-20", { mood: "8" }), day("2030-02-01", { mood: "2" })];
  assert.deepEqual(brief(tile("- Настроение — настроение", ctxOf(files))), { value: "7", unit: "из 10", note: "ответов 2 из 30" });
  assert.deepEqual(brief(tile("- Настроение — настроение", ctxOf([]))), { value: "—", unit: undefined, note: "ответов 0 из 30" });
});

const ATTENTION = [
  habit("Чтение", "good"),
  habit("Фаджр", "prayer", { theme: "Spirituality & Religion" }),
  day("2029-12-20", { habits_done: "[Чтение]" }),
  day("2030-01-10", { habits_done: "[Чтение, Фаджр]" }),
  day("2030-01-12", { habits_done: "[Чтение]" }),
  day("2030-01-15", { habits_done: "[Чтение]", habits_late: "[Фаджр]" }),
  md("life/activities/Дело.md", { title: "Дело", type: "activity", theme: "Business & career", status: "active" }, "## Журнал\n- 2030-01-11 · запись\n"),
  md("life/events/2030-01-14 Игра/event.md", { title: "Игра", type: "event", date: "2030-01-14", theme: "Health & sport" }),
];

test("внимание: the share of the first three themes; a tie keeps the THEMES order", () => {
  // Рост 3, Духовность 2, Здоровье 1, Бизнес 1 — seven days: 43 + 29 + 14
  assert.deepEqual(brief(tile("- Внимание — внимание", ctxOf(ATTENTION))), { value: "86", unit: "%", note: "рост, духовность, здоровье · остальные — 14 %" });
  assert.deepEqual(brief(tile("- Внимание — внимание", ctxOf([]))), { value: "—", unit: undefined, note: "дней с вниманием нет" });
});

test("тема: the theme's days of the 30 and the last of them", () => {
  assert.deepEqual(brief(tile("- Рост — тема", ctxOf(ATTENTION))), { value: "3", unit: "дня из 30", note: "последнее — 15 января" });
  assert.deepEqual(brief(tile("- Финансы — тема", ctxOf(ATTENTION, [], "Finance & money"))), { value: "0", unit: "дней из 30", note: "внимания ещё не было" });
  assert.deepEqual(brief(tile("- Рост — тема", ctxOf([]))), { value: "—", unit: undefined, note: "внимания ещё не было" });
});

test("a source the code does not know is «—» with «не понял: …»", () => {
  const t = tile("- Что-то — непонятное", LIFE);
  assert.deepEqual([t.value, t.note, t.unknown], ["—", "не понял: непонятное", true]);
  assert.equal(tile("- Нет — [[Нет такой]]", LIFE).note, "не понял: [[Нет такой]]");
  assert.equal(tile("- Без источника", LIFE).note, "не понял: источник не указан");
});

// ---- task 5: money, goals, moves, people, debt, events ----

const money = (rows: string) => `## Деньги\n| Сумма | Категория | Счёт | Заметка |\n|---|---|---|---|\n${rows}\n`;

test("доход: received this calendar month through today, the target in the note; no income row is «—»", () => {
  const files = [day("2030-02-01", {}, money("| 5000 | доход | Нал |  |\n| -300 | еда | Нал |  |")), day("2030-01-31", {}, money("| 9000 | доход | Нал |  |"))];
  assert.deepEqual(brief(tile("- Доход за месяц — доход · цель 1 000 ₸", ctxOf(files))), { value: fmt(5000), unit: "₸", note: "цель 1 000 ₸" });
  assert.deepEqual(brief(tile("- Доход за месяц — доход", ctxOf(files))), { value: fmt(5000), unit: "₸", note: "записи за 1 день" });
  assert.deepEqual(brief(tile("- Доход за месяц — доход · цель 1 000 ₸", ctxOf(files.slice(1)))), { value: "—", unit: undefined, note: "доход в днях не записан · цель 1 000 ₸" });
  // money spent this month, none received: income is not known, not zero
  assert.equal(tile("- Доход за месяц — доход", ctxOf([day("2030-02-01", {}, money("| -300 | еда | Нал |  |"))])).value, "—");
});

const goals = (key: string, period: string, lines: string[]): MdFile =>
  ({ rel: `life/goals/${key}.md`, mtime: 0, content: `---\ntype: goals\nperiod: ${period}\n---\n## Цели\n${lines.map((l) => `- ${l}`).join("\n")}\n` });
const GOALS = [
  goals("2030-W05", "week", ["**Первые шаги недели** · мера: раз · сейчас: 1 · → [[2030-02]]"]),
  goals("2030-02", "month", ["**Первые шаги месяца** · мера: шаги · сейчас: 2 · срок: 2030-02-03 · → [[2030]]", "**Вторая цель: 10 до 3 февраля** · мера: дела · сейчас: 0 · срок: 2030-02-03 · → [[2030]]"]),
  goals("2030", "year", ["**1 000 дел до 1 мая** · мера: дела · сейчас: — · срок: 2030-05-01 · → [[2031]]"]),
];

test("цель «начало»: «сейчас» of the goal its bold text starts with, week before month before year; «горит» near the date", () => {
  assert.deepEqual(brief(tile("- Шаги — цель «первые шаги»", ctxOf(GOALS))), { value: "1", unit: undefined, note: "раз" }); // the week file comes first
  const hot = tile("- Вторая — цель «Вторая цель»", ctxOf(GOALS));
  assert.deepEqual([hot.value, hot.note, hot.chip, hot.warn], ["0", "дела · срок 3 фев", "hot", true]);
  const far = tile("- Дела — цель «1 000 дел»", ctxOf(GOALS)); // a non-breaking space in the file matches a plain one
  assert.deepEqual([far.value, far.note, far.chip], ["—", "дела · срок 1 мая", undefined]);
  assert.deepEqual(brief(tile("- Нет — цель «Нет такой»", ctxOf(GOALS))), { value: "—", unit: undefined, note: "цели «Нет такой» нет в файлах недели, месяца и года" });
});

const act = (file: string, fm: Record<string, string>, body: string) =>
  md(`life/activities/${file}.md`, { title: file, type: "activity", theme: "Business & career", status: "active", cadence: "каждый день", ...fm }, body);

test("движения: moves of the theme's activities in the 7 days through today, summed by project", () => {
  const files = [
    act("Дело А", { project: "Проект А" }, "## Шаги\n- [x] шаг — ты\n  ✓ 2030-01-29\n\n## Журнал\n- 2030-01-30 · запись\n- 2030-02-01 · запись\n"),
    act("Дело Б", { project: "Проект А" }, "## Журнал\n- 2030-01-31 · запись\n"),
    act("Дело В", {}, "## Журнал\n- 2030-01-10 · давно\n"),
  ];
  const ctx = ctxOf(files, [], "Business & career");
  assert.deepEqual(brief(tile("- Записей за 7 дней — движения", ctx)), { value: "4", unit: undefined, note: "Проект А 4" });
  assert.deepEqual(brief(tile("- Записей — движения", ctxOf(files.slice(2), [], "Business & career"))), { value: "0", unit: undefined, note: "за 7 дней записей нет" });
  assert.deepEqual(brief(tile("- Записей — движения", ctxOf([], [], "Business & career"))), { value: "—", unit: undefined, note: "деятельностей нет" });
});

const person = (name: string, fm: Record<string, string>) =>
  md(`wiki/People/${name}.md`, { title: name, type: "person", theme: "Social & friends", connection: "друг", ...fm });
const talks = (rows: string) => ({ rel: "life/talks.md", mtime: 0, content: `---\ntype: ledger\n---\n| Дата | С кем | О чём |\n|---|---|---|\n${rows}\n` });
const meet = (date: string, people: string, theme = "Social & friends") =>
  md(`life/events/${date} Встреча/event.md`, { title: "Встреча", type: "event", date, theme, people });

test("[[Человек]]: days since the latest of last_contact, a talk and an event with him", () => {
  const pages = [person("Человек Б", { theme: "Family & relationship", last_contact: "2030-01-20" })];
  const both = [talks("| 2030-01-25 | [[Человек Б]] | о деле |"), meet("2030-01-28", '["[[Человек Б]]"]', "Family & relationship")];
  assert.deepEqual(brief(tile("- Человек Б — [[Человек Б]]", ctxOf(both, pages))), { value: "4", unit: "дня", note: "28 января · встреча" });
  assert.deepEqual(brief(tile("- Человек Б — [[Человек Б]]", ctxOf([both[0]], pages))), { value: "7", unit: "дней", note: "25 января · разговор" });
  assert.deepEqual(brief(tile("- Человек Б — [[Человек Б]]", ctxOf([], pages))), { value: "12", unit: "дней", note: "20 января · контакт" });
  assert.deepEqual(brief(tile("- Человек Г — [[Человек Г]]", ctxOf([], [person("Человек Г", {})]))), { value: "—", unit: undefined, note: "контакт не отмечен" });
});

test("близкие: close people (7+) silent past their rhythm; the longest silence first, never touched before all", () => {
  const pages = [
    person("Человек В", { closeness: "9", last_contact: "2030-01-01" }), // rhythm 14, 31 days: late
    person("Человек Г", { closeness: "8", last_contact: "2030-01-25" }), // rhythm 21, 7 days: in time
    person("Человек Д", { closeness: "7" }), // never touched: late
    person("Человек Е", { closeness: "5", last_contact: "2029-01-01" }), // not close
  ];
  assert.deepEqual(brief(tile("- Давно без связи — близкие", ctxOf([], pages, "Social & friends"))), { value: "2", unit: "из 3", note: "Человек Д · контакт не отмечен" });
  assert.deepEqual(brief(tile("- Давно без связи — близкие", ctxOf([], pages.slice(0, 2), "Social & friends"))), { value: "1", unit: "из 2", note: "Человек В · 31 дн" });
  assert.equal(tile("- Давно без связи — близкие", ctxOf([], [], "Social & friends")).value, "—");
});

test("встречи: events with people this month, the last one; события: the theme's events this month", () => {
  const files = [meet("2030-02-01", '["[[Человек Б]]"]'), meet("2030-01-28", '["Кто-то"]'), md("life/events/2030-02-01 Одна/event.md", { title: "Одна", type: "event", date: "2030-02-01", theme: "Memories & Fun", people: "[]" })];
  assert.deepEqual(brief(tile("- Встречи за месяц — встречи", ctxOf(files))), { value: "1", unit: undefined, note: "последняя — 1 февраля" });
  assert.deepEqual(brief(tile("- Встречи за месяц — встречи", ctxOf(files.slice(2)))), { value: "—", unit: undefined, note: "встреч не записано" });
  assert.deepEqual(brief(tile("- События за месяц — события", ctxOf(files, [], "Memories & Fun"))), { value: "1", unit: undefined, note: "последнее — 0 дн назад" });
  assert.deepEqual(brief(tile("- События за месяц — события", ctxOf(files.slice(0, 2), [], "Memories & Fun"))), { value: "—", unit: undefined, note: "событий нет" });
});

const DEBTS = {
  rel: "life/finance/debts.md", mtime: 0,
  content: "---\ntype: ledger\n---\n# Долги\n\n## Открытые\n\n| Кто | Направление | Сумма | Валюта | С даты | Внесено | Заметка |\n|---|---|---|---|---|---|---|\n| [[Человек Б]] | я должен | 100000 | ₸ | 2029-12-01 | 20000 |  |\n| [[Человек В]] | мне должны | 5000 | ₸ | 2029-12-01 | 0 |  |\n",
};

test("долг: left to pay, paid in, and the month of zero at the pace of the «долг» transactions", () => {
  const files = [DEBTS, day("2030-01-15", {}, money("| -10000 | долг | Нал | Человек Б |"))];
  assert.deepEqual(brief(tile("- Долг — долг", ctxOf(files))), { value: fmt(80000), unit: "₸", note: `выплачено ${fmt(20000)} · до нуля к окт 2030 при этом темпе` });
  assert.deepEqual(brief(tile("- Долг — долг", ctxOf([DEBTS]))), { value: fmt(80000), unit: "₸", note: `выплачено ${fmt(20000)} · темпа погашения нет` });
  assert.deepEqual(brief(tile("- Долг — долг", ctxOf([]))), { value: "—", unit: undefined, note: "долгов в таблице нет" });
});

test("a paused or archived bad habit shows «привычка не активна», with or without a clean_since or marks", () => {
  const ctx = ctxOf([
    habit("Плохая Л", "bad", { status: "archived", clean_since: "2029-12-10" }),
    habit("Плохая М", "bad", { status: "paused", clean_since: "2029-12-10" }),
    habit("Плохая Н", "bad", { status: "archived" }),
    day("2030-01-20", { habits_failed: "[Плохая Н]" }),
    day("2030-01-21", { habits_done: "[Плохая Н]" }),
  ]);
  for (const name of ["Плохая Л", "Плохая М", "Плохая Н"]) {
    assert.deepEqual(brief(tile(`- Без — [[${name}]]`, ctx)), { value: "—", unit: undefined, note: "привычка не активна" });
  }
});

test("a source named constructor is «не понял», not a tile", () => {
  const t = tile("- Что-то — constructor", LIFE);
  assert.deepEqual([t.value, t.note, t.unknown], ["—", "не понял: constructor", true]);
});

test("a source named __proto__ is «не понял», not a crash", () => {
  const t = tile("- Что-то — __proto__", LIFE);
  assert.deepEqual([t.value, t.note, t.unknown], ["—", "не понял: __proto__", true]);
});
