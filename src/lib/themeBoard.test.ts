import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLife } from "./life";
import { boardCards, firstSentence, nowLines, owner } from "./themeBoard";
import type { MdFile } from "./types";

const act = (file: string, fm: Record<string, string>, body: string): MdFile =>
  ({ rel: `life/activities/${file}.md`, mtime: 0, content: `---\n${Object.entries({ title: file, type: "activity", theme: "Business & career", status: "active", cadence: "каждый день", ...fm }).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });

const FULL = [
  "Первая фраза описания. Вторая фраза.",
  "",
  "## Сейчас",
  "- 2030-01-09 Первое дело [[Страница|страницы]]",
  "  продолжение строкой ниже",
  "- Второе дело — ты",
  "",
  "## Шаги",
  "- [x] Давний шаг — ты",
  "  ✓ 2030-01-02",
  "- [x] Шаг без даты — Claude",
  "- [x] Свежий шаг ✓ 2030-01-09 — ты + Claude",
  "- [x] Средний шаг — ты",
  "  ✓ 2030-01-05",
  "- [-] Снятый шаг — делает другой",
  "- [ ] Открытый первый — Claude; утвердить — ты",
  "- [ ] Открытый второй — [[Бриф]] — ты и Gemini",
  "- [ ] Открытый без исполнителя",
  "- [ ] Открытый четвёртый — ты",
  "",
  "## Журнал",
  "- 2030-01-09 · запись",
].join("\n");

const FILES = [
  act("Дело А", { stage: "ждёт", stage_note: '"ждёт ответа (2030-01-08)"', project: "Проект А" }, FULL),
  act("Дело Б", {}, "## Журнал\n- 2030-01-09 · запись\n"), // moves, no stage: идёт
  act("Дело В", { status: "paused" }, "## Журнал\n- 2029-12-01 · давно\n"), // idle, no stage: стоит
  act("Дело Г", { status: "done", stage: "идёт" }, ""), // closed: not on the board
  act("Дело Д", { theme: "Health & sport" }, ""), // another theme
];

test("boardCards: active and paused activities of the theme, by stage — `stage:` first, else moving → идёт, else стоит", () => {
  const cards = boardCards(buildLife(FILES), "Business & career", "2030-01-10");
  assert.deepEqual(cards.map((c) => [c.view.quest.title, c.stage]), [["Дело Б", "идёт"], ["Дело А", "ждёт"], ["Дело В", "стоит"]]);
  assert.equal(cards[1].note, "ждёт ответа (2030-01-08)");
  assert.equal(cards[0].note, undefined);
});

test("a card: the first sentence, «## Сейчас» lines, «[-]» steps, the last three ticked by date, the first three open with who does them", () => {
  const c = boardCards(buildLife(FILES), "Business & career", "2030-01-10").find((x) => x.view.quest.title === "Дело А")!;
  assert.equal(c.what, "Первая фраза описания.");
  assert.deepEqual(c.doing, ["Первое дело страницы продолжение строкой ниже", "Второе дело"]);
  assert.deepEqual(c.notDoing, ["Снятый шаг — делает другой"]);
  assert.deepEqual(c.done, [{ text: "Свежий шаг", on: "2030-01-09" }, { text: "Средний шаг", on: "2030-01-05" }, { text: "Давний шаг", on: "2030-01-02" }]);
  assert.deepEqual(c.open, [{ text: "Открытый первый", who: "Claude; утвердить — ты" }, { text: "Открытый второй — Бриф", who: "ты и Gemini" }, { text: "Открытый без исполнителя" }]);
  assert.deepEqual(c.steps, { done: 4, total: 8 }); // the «[-]» step counts in neither
});

test("an empty card has empty lists, not made-up ones; an undated tick comes after the dated ones", () => {
  const b = boardCards(buildLife(FILES), "Business & career", "2030-01-10").find((x) => x.view.quest.title === "Дело Б")!;
  assert.deepEqual([b.what, b.doing, b.notDoing, b.done, b.open, b.steps], ["", [], [], [], [], { done: 0, total: 0 }]);
  const four = boardCards(buildLife([act("Дело", {}, "## Шаги\n- [x] Без даты\n- [x] С датой ✓ 2030-01-01\n")]), "Business & career", "2030-01-10")[0];
  assert.deepEqual(four.done, [{ text: "С датой", on: "2030-01-01" }, { text: "Без даты" }]);
});

test("a description without a full stop ends at its first heading: «## Сейчас» is not in its first sentence", () => {
  const body = "Описание без точки\n\n## Сейчас\n- шаг без точки\n\n## Шаги\n- [ ] первый — ты\n";
  const c = boardCards(buildLife([act("Дело", {}, body)]), "Business & career", "2030-01-10")[0];
  assert.equal(c.what, "Описание без точки");
});

test("a body that starts with a heading has no description, so «what» is empty", () => {
  const cardOf = (body: string) => boardCards(buildLife([act("Дело", {}, body)]), "Business & career", "2030-01-10")[0];
  assert.equal(cardOf("## Сейчас\n- шаг без точки\n\n## Журнал\n- 2030-01-09 · запись\n").what, "");
  assert.equal(cardOf("## Сейчас\n- Сделать раз. Потом два\n").what, "");
});

test("nowLines, firstSentence and owner on their own", () => {
  assert.deepEqual(nowLines("## Сейчас\nстрока без маркера\n- [ ] пункт\n\n## Шаги\n- [ ] не это"), ["строка без маркера", "пункт"]);
  assert.equal(firstSentence("**Жирное** начало и [[Ссылка|ссылка]]! Дальше."), "Жирное начало и ссылка!");
  assert.equal(firstSentence("Без точки в конце"), "Без точки в конце");
  assert.deepEqual(owner("Шаг — Claude"), { text: "Шаг", who: "Claude" });
  assert.deepEqual(owner("Шаг — **дилер** (с 2030-01-03)"), { text: "Шаг", who: "дилер (с 2030-01-03)" });
  assert.deepEqual(owner("Тема — подробности без исполнителя"), { text: "Тема — подробности без исполнителя" });
});
