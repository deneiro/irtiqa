import assert from "node:assert/strict";
import { test } from "node:test";
import { isSectionKey, parseNumberLine, phraseOf, radarCard, sectionCards, sectionTable, themeSections, themeView } from "./overview";
import { buildPage } from "./vault";

const overview = (fm: string, body: string) => buildPage("wiki/Personal growth/_Overview.md", `---\ntitle: Тема\ntype: overview\ntheme: Personal growth\n${fm}\n---\n# Тема\n\n${body}`, 0);

test("parseNumberLine: the last « — » splits the label from the source; «· цель N» is the target", () => {
  assert.deepEqual(parseNumberLine("- Отжимания за подход — отжимания · цель 25"), { label: "Отжимания за подход", source: "отжимания", target: "25" });
  assert.deepEqual(parseNumberLine("- Раз — два — [[Привычка А]]"), { label: "Раз — два", source: "[[Привычка А]]" });
  assert.deepEqual(parseNumberLine("- Доход за месяц — доход · цель 1 000 ₸"), { label: "Доход за месяц", source: "доход", target: "1 000 ₸" });
  // `цель «…»` is a source, not a target; backticks around a source are dropped
  assert.deepEqual(parseNumberLine("- Цель А — цель «Первые шаги»"), { label: "Цель А", source: "цель «Первые шаги»" });
  assert.deepEqual(parseNumberLine("- Вес — `вес`"), { label: "Вес", source: "вес" });
  // a bullet without a separator has no source; a non-bullet is not a line
  assert.deepEqual(parseNumberLine("- Просто строка"), { label: "Просто строка", source: "" });
  assert.equal(parseNumberLine("Просто абзац — нет"), undefined);
});

test("parseNumberLine: a [[link]] is one unit — its « — » and « · » are not separators", () => {
  assert.deepEqual(parseNumberLine("- Лиды — [[Имя — хвост]]"), { label: "Лиды", source: "[[Имя — хвост]]" });
  assert.deepEqual(parseNumberLine("- Раз — [[Имя · хвост]] · цель 5"), { label: "Раз", source: "[[Имя · хвост]]", target: "5" });
  assert.deepEqual(parseNumberLine("- Раз — [[Имя — хвост|алиас]]"), { label: "Раз", source: "[[Имя — хвост|алиас]]" });
  // an unclosed `[[` is not a link: it cannot swallow the closed one after it
  assert.deepEqual(parseNumberLine("- [[A — [[X]]"), { label: "[[A", source: "[[X]]" });
});

test("themeView: number groups by ###, the first paragraph is the caption, an empty group is dropped", () => {
  const v = themeView(overview("sections: [focus]", [
    "## Цифры",
    "- Без группы — намаз",
    "",
    "### Обеты",
    "«Цитата его словами» (2030-01-05).",
    "",
    "- Первое — [[Привычка А]]",
    "- Второе — намаз",
    "Хвост после пунктов не подпись.",
    "",
    "### Пустая",
    "Только абзац.",
    "",
    "### Ещё",
    "- Третье — суры",
  ].join("\n")));
  assert.deepEqual(v.numbers, [
    { lines: [{ label: "Без группы", source: "намаз" }] },
    { title: "Обеты", caption: "«Цитата его словами» (2030-01-05).", lines: [{ label: "Первое", source: "[[Привычка А]]" }, { label: "Второе", source: "намаз" }] },
    { title: "Ещё", lines: [{ label: "Третье", source: "суры" }] },
  ]);
});

test("themeView: three columns of phrases — a trailing *курсив* is a note, a paragraph is the caption, a continuation folds in", () => {
  const v = themeView(overview("", [
    "## Где был",
    "- Первая фраза *март 2030*",
    "- Фраза со **словом** в середине",
    "- Ссылка [[Страница|страницей]] *5 янв*",
    "- Длинная фраза,",
    "  продолжение строкой ниже",
    "",
    "История и Changes обзора.",
    "",
    "## Где стою",
    "",
    "## Куда иду",
    "- **Цель жирным**",
    "1. Нумерованный пункт",
  ].join("\n")));
  assert.deepEqual(v.past, [{
    suffix: "",
    items: [
      { md: "Первая фраза", note: "март 2030" },
      { md: "Фраза со **словом** в середине" },
      { md: "Ссылка [[Страница|страницей]]", note: "5 янв" },
      { md: "Длинная фраза, продолжение строкой ниже" },
    ],
    caption: "История и Changes обзора.",
  }]);
  assert.deepEqual(v.stand, [{ suffix: "", items: [] }]); // an empty section: the column shows «—»
  assert.deepEqual(v.next, [{ suffix: "", items: [{ md: "**Цель жирным**" }, { md: "Нумерованный пункт" }] }]);
});

test("themeView: « — Семья» and « — Отношения» are two parts of one column, each with its caption", () => {
  const v = themeView(overview("", [
    "## Где стою — Семья",
    "Его слова, 2030-01-05.",
    "- Дом",
    "## Где стою — Отношения",
    "- Один",
    "## На радаре — Семья",
    "- Ожидания",
    "## На радаре — Отношения",
    "- узел: **Круг** — замкнутый",
  ].join("\n")));
  assert.deepEqual(v.stand, [
    { suffix: "Семья", items: [{ md: "Дом" }], caption: "Его слова, 2030-01-05." },
    { suffix: "Отношения", items: [{ md: "Один" }] },
  ]);
  // a card without its own mark takes the part's name; its own `вид:` wins
  assert.deepEqual(v.radar, [{ kind: "семья", text: "Ожидания" }, { kind: "узел", title: "Круг", text: "замкнутый" }]);
});

test("radarCard: «вид: **Заголовок** — строка»; without вид no mark; without bold the whole line is the text", () => {
  assert.deepEqual(radarCard("шаг: **Первый шаг** — одна строка"), { kind: "шаг", title: "Первый шаг", text: "одна строка" });
  assert.deepEqual(radarCard("**Заголовок.** Текст после точки."), { title: "Заголовок", text: "Текст после точки." });
  assert.deepEqual(radarCard("Просто строка: без вида"), { text: "Просто строка: без вида" });
  assert.deepEqual(radarCard("риск: строка без жирного"), { kind: "риск", text: "строка без жирного" });
  assert.deepEqual(radarCard("https://example.com — ссылка"), { text: "https://example.com — ссылка" });
});

test("themeView keeps every ## section for heading references; no overview is an empty view", () => {
  const v = themeView(overview("", "## Как я меняюсь\n| Что | Было |\n|---|---|\n| А | Б |\n\n## Changes\n- 2030-01-05 — строка\n"));
  assert.deepEqual(v.sections.map((s) => s.heading), ["Как я меняюсь", "Changes"]);
  assert.deepEqual(themeView(undefined), { numbers: [], past: [], stand: [], next: [], radar: [], sections: [] });
});

test("themeSections: the list in order, retired keys dropped, unknown strings kept as heading references", () => {
  const p = overview('sections: [focus, "Как я меняюсь", state, year, reverend, habits, skills, focus]', "");
  assert.deepEqual(themeSections(p), ["focus", "Как я меняюсь", "skills"]);
  assert.deepEqual(themeSections(overview("", "")), ["resource", "wiki", "people"]);
  assert.equal(isSectionKey("focus"), true);
  assert.equal(isSectionKey("state"), false);
  assert.equal(isSectionKey("Как я меняюсь"), false);
});

test("sectionTable reads the first table, a \\| inside a wikilink stays in its cell; sectionCards take the bold start as the title", () => {
  assert.deepEqual(sectionTable("Абзац.\n\n| Что | Было | Есть |\n|---|---|---|\n| А | [[Страница\\|стр]] | В *1 янв* |\n\nПосле."), {
    head: ["Что", "Было", "Есть"], rows: [["А", "[[Страница|стр]]", "В *1 янв*"]],
  });
  assert.equal(sectionTable("- только список"), undefined);
  assert.deepEqual(phraseOf("В *1 янв*"), { md: "В", note: "1 янв" }); // a table cell reads its note the same way
  assert.deepEqual(sectionCards("- **Слушание** — «слышу, потом совет»\n- Взгляд без заголовка\nабзац"), [
    { title: "Слушание", text: "«слышу, потом совет»" }, { text: "Взгляд без заголовка" },
  ]);
});
