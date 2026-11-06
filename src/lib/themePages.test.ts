import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLife } from "./life";
import { halalCard, halalGroups, projectCards, stagePill, summaryGroups, themePages, wikiLists, WIKI_COMMON } from "./themePages";
import type { MdFile } from "./types";
import { buildVault } from "./vault";

const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });
const vaultOf = (pages: MdFile[]) => buildVault({ root: "", pages, life: [], raw: [], log: "", claude_md: "", media: [] });
const TODAY = "2030-02-01";

// ---- wiki lists ----

const SP = "wiki/Spirituality & Religion/Wiki/Обёртка";
const wiki = (rel: string, title: string) => md(rel, { title, type: "wiki", theme: "Spirituality & Religion" });
const ov = (rel: string) => md(rel, { title: "Обзор", type: "overview", theme: "Spirituality & Religion" });
const BASE = [
  ov(`${SP}/_Overview.md`),
  ov(`${SP}/Папка Б/_Overview.md`),
  wiki(`${SP}/Папка Б/10 — Десятая.md`, "Сура 10 — Десятая"),
  wiki(`${SP}/Папка Б/2 — Вторая.md`, "Сура 2 — Вторая"),
  wiki(`${SP}/Папка Б/1 — Первая.md`, "Сура 1 — Первая"),
  wiki(`${SP}/Папка А/Глубже/Страница В.md`, "Страница В"),
  ov(`${SP}/Папка А/Глубже/_Overview.md`),
  wiki(`${SP}/Папка А/Страница Г.md`, "Страница Г"),
  wiki(`${SP}/Своя.md`, "Своя"),
  md("wiki/Business & career/Projects/Проект В/Wiki/Чужая.md", { title: "Чужая", type: "wiki", theme: "Spirituality & Religion" }),
];

test("wikiLists: under one wrapper folder the lists are its folders; deeper folders stay in their top list; numbers sort as numbers", () => {
  const p = themePages(vaultOf(BASE), null, "Spirituality & Religion", TODAY);
  assert.equal(p.wikiPages.length, 6); // overviews and project pages are not items
  const { lists, overview } = wikiLists(p.wikiAll);
  assert.deepEqual(lists.map((l) => [l.name, l.pages.map((x) => x.title), l.overview?.rel]), [
    [WIKI_COMMON, ["Своя"], undefined],
    ["Папка А", ["Страница В", "Страница Г"], undefined],
    ["Папка Б", ["Сура 1 — Первая", "Сура 2 — Вторая", "Сура 10 — Десятая"], `${SP}/Папка Б/_Overview.md`],
  ]);
  assert.equal(overview?.rel, `${SP}/_Overview.md`);
});

test("wikiLists: a flat Wiki/ is «Общее» with its folders beside it; no pages, no lists", () => {
  const flat = [
    md("wiki/Personal growth/Wiki/_Overview.md", { title: "Обзор", type: "overview", theme: "Personal growth" }),
    md("wiki/Personal growth/Wiki/Б.md", { title: "Б", type: "wiki", theme: "Personal growth" }),
    md("wiki/Personal growth/Wiki/А.md", { title: "А", type: "wiki", theme: "Personal growth" }),
    md("wiki/Personal growth/Wiki/Папка/В.md", { title: "В", type: "wiki", theme: "Personal growth" }),
  ];
  const { lists, overview } = wikiLists(themePages(vaultOf(flat), null, "Personal growth", TODAY).wikiAll);
  assert.deepEqual(lists.map((l) => [l.name, l.pages.map((x) => x.title)]), [[WIKI_COMMON, ["А", "Б"]], ["Папка", ["В"]]]);
  assert.equal(overview?.rel, "wiki/Personal growth/Wiki/_Overview.md");
  assert.deepEqual(wikiLists([]), { lists: [], overview: undefined });
});

// ---- projects ----

const BC = "wiki/Business & career";
const PROJECTS = [
  md(`${BC}/Projects/Проект А/_Overview.md`, { title: "Проект А", type: "overview", theme: "Business & career", updated: "2030-01-10" }, "# Проект А\n\n## Где стою (2030-01-10)\n- **Первое** дело идёт *10 янв*\n  - вложенный пункт не приклеивается\n- второе\n"),
  md(`${BC}/Projects/Проект А/Wiki/Страница.md`, { title: "Страница", type: "wiki", theme: "Business & career", project: "Старое имя" }),
  md(`${BC}/Projects/Проект Б/_Overview.md`, { title: "Проект Б", type: "overview", theme: "Business & career", updated: "2030-01-20" }, "# Проект Б\n\n## Что есть\n- текст\n"),
  // a stale `project:` outside Projects/ is not a project
  md(`${BC}/Resource/Заметка.md`, { title: "Заметка", type: "resource", theme: "Business & career", project: "Проект Призрак" }),
];
const act = (file: string, fm: Record<string, string>, body: string) =>
  md(`life/activities/${file}.md`, { title: file, type: "activity", theme: "Business & career", cadence: "каждый день", ...fm }, body);
const LIFE = buildLife([
  act("Дело А", { project: "Проект А", status: "active", stage: "ждёт" }, "## Сейчас\n- Следующий шаг\n\n## Журнал\n- 2030-01-30 · запись\n"),
  act("Дело А старое", { project: "Проект А", status: "done" }, "## Сейчас\n- старое\n"),
  act("Дело Б идея", { project: "Проект Б", status: "proposed" }, "## Сейчас\n- не начато\n"),
]);

test("projectCards: one card per folder under Projects/, its activity, «Где стою», the page count; a stale project: is no project", () => {
  const cards = projectCards(vaultOf(PROJECTS), LIFE, "Business & career", TODAY);
  assert.deepEqual(cards.map((c) => ({ name: c.name, pages: c.pages, stand: c.stand, act: c.activity && [c.activity.quest.title, c.activity.word, c.activity.tone, c.activity.now], ov: c.overview?.file })), [
    { name: "Проект А", pages: 2, stand: "**Первое** дело идёт", act: ["Дело А", "ждёт", "honey", "Следующий шаг"], ov: "_Overview" },
    { name: "Проект Б", pages: 1, stand: undefined, act: undefined, ov: "_Overview" },
  ]);
  // the reading list keeps the page with a stale project: — it is not in a project folder
  assert.deepEqual(themePages(vaultOf(PROJECTS), LIFE, "Business & career", TODAY).resources.map((p) => p.title), ["Заметка"]);
});

// ---- halal ----

test("halalCard: the title before the first «: », the description up to the last « — », the source dropped", () => {
  assert.deepEqual(halalCard("Тема А: суть пункта — Источник, т. 1, с. 2"), { title: "Тема А", text: "Суть пункта" });
  assert.deepEqual(halalCard("Тема Б: «цитата: с двоеточием — и тире» — Источник 2:275"), { title: "Тема Б", text: "«цитата: с двоеточием — и тире»" });
  assert.deepEqual(halalCard("«Цитата: целиком» — Источник"), { title: "«Цитата: целиком»" });
  assert.deepEqual(halalCard("Без двоеточия, но с тире — Источник"), { title: "Без двоеточия, но с тире" });
  assert.deepEqual(halalCard("Тема В: **слово**, ещё — первое — Источник"), { title: "Тема В", text: "**слово**, ещё — первое" });
  assert.deepEqual(halalCard("Только текст"), { title: "Только текст" });
  assert.deepEqual(halalCard("Тема без описания: — Источник"), { title: "Тема без описания" });
});

test("halalGroups: the three sections in the page's order; the intro and other sections are not shown", () => {
  const body = "# Страница\n\nВведение — со ссылкой.\n\n## Халяль\n\n- А: да — И1\n- Б: да — И2\n\n## Харам\n\n- В: нет — И3\n\n## Макрух\n\n- Г: спорно — И4\n\n## Changes\n\n- 2030-01-01 — правка\n";
  assert.deepEqual(halalGroups(body), [
    { kind: "halal", heading: "Халяль", cards: [{ title: "А", text: "Да" }, { title: "Б", text: "Да" }] },
    { kind: "haram", heading: "Харам", cards: [{ title: "В", text: "Нет" }] },
    { kind: "makruh", heading: "Макрух", cards: [{ title: "Г", text: "Спорно" }] },
  ]);
});

test("summaryGroups: every table under its heading, a row a card — the name and its note, the stage as a pill, the other cells as lines", () => {
  const body = [
    "# Сводка", "", "Вступление.", "",
    "## Как читать", "", "Пояснение.", "",
    "### Живые", "",
    "| Папка | Для чего | Stage | Git |", "|---|---|---|---|",
    "| `папка-а` *(раньше — `старое`)* | Дело А | Live (с 2030-01-05) | 🟢 чисто |",
    "| папка-б | Дело Б | Готов | |",
    "", "### Архив", "",
    "| Папка | Где в vault |", "|---|---|",
    "| папка-в | [[Страница\\|алиас]] |",
    "", "## Заметки", "", "- без таблицы",
  ].join("\n");
  assert.deepEqual(summaryGroups(body), [
    { title: "Живые", cards: [
      { title: "папка-а", note: "(раньше — `старое`)", pill: "Live", lines: [{ label: "Для чего", md: "Дело А" }, { label: "Stage", md: "с 2030-01-05" }, { label: "Git", md: "🟢 чисто" }] },
      { title: "папка-б", pill: "Готов", lines: [{ label: "Для чего", md: "Дело Б" }] },
    ] },
    { title: "Архив", cards: [{ title: "папка-в", lines: [{ label: "Где в vault", md: "[[Страница|алиас]]" }] }] },
  ]);
  assert.deepEqual(stagePill("Схема 1, установлен; **не используется**"), { pill: "Схема 1", rest: "установлен; не используется" });
  assert.deepEqual(summaryGroups("# Пусто\n\n## Раздел\n\nтекст"), []);
});
