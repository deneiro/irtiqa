import assert from "node:assert/strict";
import { test } from "node:test";
import { windowStats } from "./dashboard";
import { buildLife, serializeAccounts } from "./life";
import { financeGlance, nutritionGlance, painMap, recentTalks, sportGames, themeEvents, wishesGlance } from "./themeOrgans";
import type { MdFile } from "./types";
import { buildVault } from "./vault";

const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });

const HEALTH = [
  "---", "type: health", "---",
  "## Визиты", "", "| Дата | Врач | Повод | Итог |", "|---|---|---|---|", "| 2029-11-01 | Врач А | повод | итог А |", "| 2029-12-01 | Врач Б | повод | итог Б |", "",
  "## Планы", "", "| Врач | К дате | Зачем |", "|---|---|---|", "| Без даты |  | когда-нибудь |", "| Врач В | 2030-03-01 | проверка |", "",
  "## Симптомы", "", "| Дата | Что | Где | Заметка |", "|---|---|---|---|",
  "| 2030-01-20 | Симптом А | колено | после бега |",
  "| 2029-10-01 | Симптом Б | Колено | давно |",
  "| 2029-12-01 | Симптом В | спина | старое |",
  "| 2030-01-25 | Симптом Г |  | без места |",
  "| 2030-01-26 | Симптом Д | лопатка | не из списка |", "",
].join("\n");

test("painMap: a dot per part of the list, the newest row's; bright while 30 days old; the nearest plan and the last visit", () => {
  const m = painMap(HEALTH, "2030-02-01");
  assert.deepEqual(m.rows.map((r) => [r.date, r.part ?? null, r.fresh]), [
    ["2030-01-26", null, true], ["2030-01-25", null, true], ["2030-01-20", "колено", true], ["2029-12-01", "спина", false], ["2029-10-01", "колено", false],
  ]);
  assert.deepEqual(m.dots, [
    { part: "колено", date: "2030-01-20", what: "Симптом А", fresh: true, count: 2 },
    { part: "спина", date: "2029-12-01", what: "Симптом В", fresh: false, count: 1 },
  ]);
  assert.deepEqual([m.plan?.doctor, m.visit?.doctor], ["Врач В", "Врач Б"]);
  assert.deepEqual(painMap(null, "2030-02-01"), { rows: [], dots: [], plan: undefined, visit: undefined });
});

test("painMap: a word the caller cannot draw is a row without a dot, like an unknown «Где»", () => {
  const m = painMap(HEALTH, "2030-02-01", ["спина"]); // the outline has an anchor for «спина» only
  assert.deepEqual(m.rows.map((r) => [r.date, r.part ?? null]), [
    ["2030-01-26", null], ["2030-01-25", null], ["2030-01-20", null], ["2029-12-01", "спина"], ["2029-10-01", null],
  ]);
  assert.deepEqual(m.dots, [{ part: "спина", date: "2029-12-01", what: "Симптом В", fresh: false, count: 1 }]);
  assert.equal(m.rows.find((r) => r.date === "2030-01-20")?.where, "колено"); // the word itself stays in the list
  assert.deepEqual(painMap(HEALTH, "2030-02-01").dots.map((d) => d.part), ["колено", "спина"]); // by default every word of BODY_PARTS can be drawn
});

const event = (date: string, title: string, fm: Record<string, string>) => md(`life/events/${date} ${title}/event.md`, { title, type: "event", date, ...fm });

test("sportGames: the theme's «спорт» events of 60 days, newest first, one flag a day", () => {
  const life = buildLife([
    event("2030-01-30", "Игра", { theme: "Health & sport", tags: "[спорт]", from: '"18:00"', to: '"19:00"', people: '["[[Человек Б]]"]' }),
    event("2029-12-05", "Игра", { theme: "Health & sport", tags: "[спорт]" }),
    event("2029-11-01", "Давняя", { theme: "Health & sport", tags: "[спорт]" }),
    event("2030-01-31", "Врач", { theme: "Health & sport" }),
  ]);
  const g = sportGames(life, "Health & sport", "2030-02-01");
  assert.equal(g.from, "2029-12-04");
  assert.equal(g.days.length, 60);
  assert.deepEqual(g.days.filter((d) => d.on).map((d) => d.date), ["2029-12-05", "2030-01-30"]);
  assert.deepEqual(g.games[0], { date: "2030-01-30", title: "Игра", from: "18:00", to: "19:00", people: ["Человек Б"] });
  assert.equal(g.games.length, 2);
});

const food = (date: string, rows: string) => md(`life/days/${date}.md`, { date, type: "day" }, `## Еда\n| Время | Что | Заметка |\n|---|---|---|\n${rows}\n`);

test("nutritionGlance: late meals of 14 days, days in a row without one, the last record", () => {
  const life = buildLife([
    food("2030-01-25", "| 22:30 | ужин |  |"),
    food("2030-01-29", "| 08:00 | завтрак |  |"),
    food("2030-01-30", "| 13:00 | обед |  |"),
    food("2030-01-31", "| 09:00 | каша |  |\n| 19:00 | суп |  |"),
  ]);
  assert.deepEqual(nutritionGlance(life, "2030-02-01"), { late: 1, days: 4, clean: 3, last: { date: "2030-01-31", meals: [{ time: "09:00", what: "каша", note: "" }, { time: "19:00", what: "суп", note: "" }] } });
  assert.deepEqual(nutritionGlance(buildLife([]), "2030-02-01"), { late: 0, days: 0, clean: 0, last: undefined });
});

// ---- the organs of people, money and memories ----

test("financeGlance: accounts live, this month's money through today, subscriptions, open debts", () => {
  const files: MdFile[] = [
    { rel: "life/finance/accounts.md", mtime: 0, content: "---\ntype: ledger\n---\n| Счёт | Тип | Баланс | На дату |\n|---|---|---|---|\n| Нал | наличные | 10000 | 2030-01-31 |\n" },
    { rel: "life/finance/subscriptions.md", mtime: 0, content: "---\ntype: ledger\n---\n| Название | Сумма | Счёт | День | Категория |\n|---|---|---|---|---|\n| Сервис А | 2000 | Нал | 5 | связь |\n" },
    { rel: "life/finance/debts.md", mtime: 0, content: "---\ntype: ledger\n---\n## Открытые\n\n| Кто | Направление | Сумма | Валюта | С даты | Внесено | Заметка |\n|---|---|---|---|---|---|---|\n| [[Человек Б]] | я должен | 5000 | ₸ | 2029-12-01 | 0 |  |\n| [[Человек В]] | я должен | 3000 | ₸ | 2029-12-01 | 3000 |  |\n" },
    md("life/days/2030-02-01.md", { date: "2030-02-01", type: "day" }, "## Деньги\n| Сумма | Категория | Счёт | Заметка |\n|---|---|---|---|\n| -500 | еда | Нал |  |\n| 7000 | доход | Нал |  |\n"),
    md("life/days/2030-01-31.md", { date: "2030-01-31", type: "day" }, "## Деньги\n| Сумма | Категория | Счёт | Заметка |\n|---|---|---|---|\n| -900 | еда | Нал |  |\n"),
  ];
  const life = buildLife(files);
  const g = financeGlance(life, "2030-02-01");
  assert.deepEqual([g.spent, g.earned, g.moneyDays, g.subs, g.openDebts], [500, 7000, 1, 2000, 1]);
  const { money } = windowStats(life, "2030-02-01", "2030-02-01"); // the month the `доход` tile reads: the organ must not drift from it
  assert.deepEqual([g.spent, g.earned, g.moneyDays], [money.spent, money.earned, money.days]);
  assert.equal(g.accounts, 10000 - 900 - 500 + 7000); // liveBalance: the balance with the money of its own date and after
  assert.equal(financeGlance(buildLife([]), "2030-02-01").accounts, undefined);
});

test("financeGlance: no accounts — no file, or a file with only the header — is no data, not 0", () => {
  const headerOnly: MdFile = { rel: "life/finance/accounts.md", mtime: 0, content: serializeAccounts([], "2030-02-01") }; // what /finance writes after the last account is removed
  assert.deepEqual(buildLife([headerOnly]).accounts, []);
  assert.equal(financeGlance(buildLife([headerOnly]), "2030-02-01").accounts, undefined);
});

const cash = (date: string, rows: string) => md(`life/days/${date}.md`, { date, type: "day" }, `## Деньги\n| Сумма | Категория | Счёт | Заметка |\n|---|---|---|---|\n${rows}\n`);

test("financeGlance: spending or income the month does not have is undefined, never 0", () => {
  const month = (files: MdFile[]) => financeGlance(buildLife(files), "2030-02-03");
  const spendingOnly = month([cash("2030-02-01", "| -500 | еда | Нал |  |")]);
  assert.deepEqual([spendingOnly.spent, spendingOnly.earned, spendingOnly.moneyDays], [500, undefined, 1]);
  const incomeOnly = month([cash("2030-02-02", "| 7000 | доход | Нал |  |")]);
  assert.deepEqual([incomeOnly.spent, incomeOnly.earned, incomeOnly.moneyDays], [undefined, 7000, 1]);
  const none = month([cash("2030-01-31", "| -900 | еда | Нал |  |"), cash("2030-02-04", "| -100 | еда | Нал |  |")]); // last month and the day after today are not this month's
  assert.deepEqual([none.spent, none.earned, none.moneyDays], [undefined, undefined, 0]);
});

test("wishesGlance, recentTalks, themeEvents", () => {
  const wishes = { rel: "life/wishes.md", mtime: 0, content: "| Что | Состояние | С даты | Заметка |\n|---|---|---|---|\n| Желание А | делаю | 2030-01-01 |  |\n| Желание Б | хочу |  |  |\n| Желание В | сделал | 2030-01-05 |  |\n| Желание Г | делаю |  |  |\n" };
  assert.deepEqual(wishesGlance(buildLife([wishes])), { want: 1, doing: 2, done: 1, doingTitles: ["Желание А", "Желание Г"] });
  const vault = buildVault({ root: "", pages: [
    md("wiki/People/Человек Б.md", { title: "Человек Б", type: "person", theme: "Family & relationship" }),
    md("wiki/People/Человек В.md", { title: "Человек В", type: "person", theme: "Social & friends" }),
  ], life: [], raw: [], log: "", claude_md: "", media: [] });
  const talks = { rel: "life/talks.md", mtime: 0, content: "| Дата | С кем | О чём |\n|---|---|---|\n| 2030-01-20 | [[Человек Б]] | о деле |\n| 2030-01-25 | [[Человек В]] | о другом |\n| 2030-01-28 | [[Человек Б]] | ещё |\n" };
  assert.deepEqual(recentTalks(buildLife([talks]), vault, "Family & relationship").map((t) => [t.date, t.who, t.about]), [["2030-01-28", "Человек Б", "ещё"], ["2030-01-20", "Человек Б", "о деле"]]);
  const life = buildLife([event("2030-01-30", "Одно", {}), event("2030-01-20", "Другое", { theme: "Memories & Fun" }), event("2030-02-05", "Потом", {}), event("2030-01-10", "Чужое", { theme: "Health & sport" })]);
  assert.deepEqual(themeEvents(life, "Memories & Fun", "2030-02-01").map((e) => e.title), ["Одно", "Другое"]);
});

test("themeEvents: an event with no date is skipped, not drawn as «0 undefined»", () => {
  const life = buildLife([event("2030-01-30", "Одно", {}), md("life/events/Без даты/event.md", { title: "Без даты", type: "event" })]);
  assert.deepEqual(life.events.map((e) => e.date).sort(), ["", "2030-01-30"]); // the parser keeps it, with date ""
  assert.deepEqual(themeEvents(life, "Memories & Fun", "2030-02-01").map((e) => e.title), ["Одно"]);
});
