import assert from "node:assert/strict";
import { test } from "node:test";
import { addInfluence, habitLink, influenceGroups, influenceItemCount } from "./influence";
import { buildLife } from "./life";
import { personView } from "./person";
import type { MdFile } from "./types";
import { buildVault, parseFrontmatter } from "./vault";

const TODAY = "2030-02-01";
const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });
const person = (file: string, fm: Record<string, string> = {}, body = "") =>
  md(`wiki/People/${file}.md`, { title: file, type: "person", theme: "Social & friends", ...fm }, body);
const habit = (file: string, title: string, kind = "bad") =>
  md(`life/habits/${file}.md`, { title, type: "habit", kind, freq: "daily", status: "active" });

const FM = "---\ntitle: Человек А\ntype: person\nupdated: 2030-01-01\ncloseness: \"7\"\nlast_contact: 2030-01-20\n---\n";
const CHANGE = (what: string, dir: string) => `- ${TODAY} — влияние «${what}» (тянет ${dir}) добавлено в приложении`;

const WITH = `${FM}
# Человек А

## Сейчас
- фраза

## Влияние
> «ответ»

### Тянет вверх
- пункт А

### Тянет вниз
- [[Привычка Б|подпись]]
  деталь строкой ниже

бледная строка — с тире

## Характер
черта А

## Changes
- 2030-01-01 — страница создана
`;

test("addInfluence: a bullet after the last one of its half, before the pale line; updated and Changes; nothing else moves", () => {
  const out = addInfluence(WITH, { dir: "down", md: "пункт В", note: "заметка А" }, TODAY);
  assert.equal(out, WITH
    .replace("updated: 2030-01-01", `updated: ${TODAY}`)
    .replace("  деталь строкой ниже\n", "  деталь строкой ниже\n- пункт В *заметка А*\n")
    .replace("- 2030-01-01 — страница создана\n", `- 2030-01-01 — страница создана\n${CHANGE("пункт В", "вниз")}\n`));
});

test("addInfluence: the note is the pill's pale italic, so a habit link stays whole for the person page", () => {
  const out = addInfluence(WITH, { dir: "up", md: "[[Привычка В|подпись В]]", note: "заметка *Б*" }, TODAY);
  assert.ok(out.includes("- пункт А\n- [[Привычка В|подпись В]] *заметка Б*\n"));
  const pill = personView(parseFrontmatter(out).body).influence?.up?.pills.find((p) => p.target);
  assert.deepEqual([pill?.target, pill?.label, pill?.note], ["Привычка В", "подпись В", "заметка Б"]);
});

test("addInfluence: the same influence in that half is not written twice — a link by its target, a phrase in any case", () => {
  assert.equal(addInfluence(WITH, { dir: "down", md: "[[Привычка Б]]" }, TODAY), WITH);
  assert.equal(addInfluence(WITH, { dir: "up", md: "Пункт А", note: "другая заметка" }, TODAY), WITH);
  // the other half is another influence
  assert.notEqual(addInfluence(WITH, { dir: "up", md: "[[Привычка Б|подпись]]" }, TODAY), WITH);
});

test("addInfluence: a missing half is made, «вверх» before «вниз»; a half with only a pale line gets the bullet first", () => {
  const only = `${FM}\n## Влияние\n### Тянет вниз\nбледная строка\n\n## Changes\n- 2030-01-01 — страница создана\n`;
  assert.equal(addInfluence(only, { dir: "up", md: "пункт Б" }, TODAY),
    `${FM.replace("2030-01-01", TODAY)}\n## Влияние\n\n### Тянет вверх\n- пункт Б\n\n### Тянет вниз\nбледная строка\n\n## Changes\n- 2030-01-01 — страница создана\n${CHANGE("пункт Б", "вверх")}\n`);
  assert.equal(addInfluence(only, { dir: "down", md: "[[Привычка Б|подпись]]" }, TODAY),
    `${FM.replace("2030-01-01", TODAY)}\n## Влияние\n### Тянет вниз\n- [[Привычка Б|подпись]]\n\nбледная строка\n\n## Changes\n- 2030-01-01 — страница создана\n${CHANGE("подпись", "вниз")}\n`);
});

test("addInfluence: a missing «## Влияние» goes after «Дальше», else before «Характер», else before «Changes», else at the end", () => {
  const fm = FM.replace("2030-01-01", TODAY);
  const after = `${FM}\n## Сейчас\n- фраза\n\n## Дальше\n- потом\n\n## Характер\nчерта А\n\n## Changes\n- 2030-01-01 — страница создана\n`;
  assert.equal(addInfluence(after, { dir: "down", md: "[[Привычка Б|подпись]]" }, TODAY),
    `${fm}\n## Сейчас\n- фраза\n\n## Дальше\n- потом\n\n## Влияние\n### Тянет вниз\n- [[Привычка Б|подпись]]\n\n## Характер\nчерта А\n\n## Changes\n- 2030-01-01 — страница создана\n${CHANGE("подпись", "вниз")}\n`);
  const before = `${FM}\n## Об отношениях\nтекст\n## Характер\nчерта А\n`;
  assert.equal(addInfluence(before, { dir: "up", md: "пункт Б" }, TODAY),
    `${fm}\n## Об отношениях\nтекст\n\n## Влияние\n### Тянет вверх\n- пункт Б\n\n## Характер\nчерта А\n\n## Changes\n${CHANGE("пункт Б", "вверх")}\n`);
  const changes = `${FM}\n## Об отношениях\nтекст\n\n## Changes\n- 2030-01-01 — страница создана\n`;
  assert.equal(addInfluence(changes, { dir: "up", md: "пункт Б" }, TODAY),
    `${fm}\n## Об отношениях\nтекст\n\n## Влияние\n### Тянет вверх\n- пункт Б\n\n## Changes\n- 2030-01-01 — страница создана\n${CHANGE("пункт Б", "вверх")}\n`);
  const bare = `${FM}\n# Человек А\n\n## Об отношениях\nтекст\n`;
  assert.equal(addInfluence(bare, { dir: "down", md: "пункт Г" }, TODAY),
    `${fm}\n# Человек А\n\n## Об отношениях\nтекст\n\n## Влияние\n### Тянет вниз\n- пункт Г\n\n## Changes\n${CHANGE("пункт Г", "вниз")}\n`);
});

test("addInfluence: « — » in a free name becomes « – » (a link keeps its own), so the name reads back whole and is not written twice", () => {
  const out = addInfluence(WITH, { dir: "up", md: "пункт Д — с тире" }, TODAY);
  assert.ok(out.includes("- пункт А\n- пункт Д – с тире\n"));
  assert.equal(addInfluence(out, { dir: "up", md: "пункт Д — с тире" }, TODAY), out);
  assert.deepEqual(personView(parseFrontmatter(out).body).influence?.up?.pills.map((p) => p.md), ["пункт А", "пункт Д – с тире"]);
  assert.ok(addInfluence(WITH, { dir: "up", md: "[[Привычка В|а — б]]" }, TODAY).includes("- [[Привычка В|а — б]]\n"));
});

test("addInfluence: a numbered list counts as bullets", () => {
  const numbered = `${FM}\n## Влияние\n### Тянет вверх\n1. пункт Е\n2. пункт Ж\n`;
  assert.equal(addInfluence(numbered, { dir: "up", md: "Пункт Ж" }, TODAY), numbered);
  assert.equal(addInfluence(numbered, { dir: "up", md: "пункт З" }, TODAY),
    `${FM.replace("2030-01-01", TODAY)}\n## Влияние\n### Тянет вверх\n1. пункт Е\n2. пункт Ж\n- пункт З\n\n## Changes\n${CHANGE("пункт З", "вверх")}\n`);
});

test("addInfluence: CRLF stays CRLF; no trailing newline stays so; «Changes» before another section; a page without frontmatter", () => {
  const add = { dir: "down" as const, md: "пункт В" };
  const lf = addInfluence(WITH, add, TODAY);
  const crlf = addInfluence(WITH.replace(/\n/g, "\r\n"), add, TODAY);
  assert.equal(crlf, lf.replace(/\n/g, "\r\n"));
  assert.ok(!/[^\r]\n/.test(crlf));
  assert.equal(addInfluence(WITH.replace(/\n$/, ""), add, TODAY), lf.replace(/\n$/, ""));
  const fm = FM.replace("2030-01-01", TODAY);
  assert.equal(addInfluence(`${FM}\n## Об отношениях\nтекст`, { dir: "down", md: "пункт Г" }, TODAY),
    `${fm}\n## Об отношениях\nтекст\n\n## Влияние\n### Тянет вниз\n- пункт Г\n\n## Changes\n${CHANGE("пункт Г", "вниз")}\n`);
  const later = `${FM}\n## Влияние\n### Тянет вниз\n- пункт Г\n\n## Changes\n- 2030-01-01 — страница создана\n\n## Заметки\nтекст\n`;
  assert.equal(addInfluence(later, add, TODAY),
    `${fm}\n## Влияние\n### Тянет вниз\n- пункт Г\n- пункт В\n\n## Changes\n- 2030-01-01 — страница создана\n${CHANGE("пункт В", "вниз")}\n\n## Заметки\nтекст\n`);
  assert.equal(addInfluence(later.replace("создана\n\n## Заметки", "создана\n## Заметки"), add, TODAY),
    `${fm}\n## Влияние\n### Тянет вниз\n- пункт Г\n- пункт В\n\n## Changes\n- 2030-01-01 — страница создана\n${CHANGE("пункт В", "вниз")}\n\n## Заметки\nтекст\n`);
  assert.equal(addInfluence("# Человек А\n\n## Об отношениях\nтекст\n", { dir: "down", md: "пункт Г" }, TODAY),
    `---\nupdated: ${TODAY}\n---\n# Человек А\n\n## Об отношениях\nтекст\n\n## Влияние\n### Тянет вниз\n- пункт Г\n\n## Changes\n${CHANGE("пункт Г", "вниз")}\n`);
});

test("habitLink: the file, and the title after a bar only when they differ", () => {
  const life = buildLife([habit("Привычка Б", "Привычка Б"), habit("Привычка-В", "Привычка В", "good")]);
  assert.deepEqual(life.habits.map(habitLink).sort(), ["[[Привычка Б]]", "[[Привычка-В|Привычка В]]"]);
});

const life = buildLife([
  habit("Привычка Б", "Привычка Б"),
  md("life/events/2030-01-10 Кино/event.md", { title: "Кино", type: "event", date: "2030-01-10", people: '["[[Человек А]]"]' }),
  md("life/events/2030-01-12 Поход/event.md", { title: "Поход", type: "event", date: "2030-01-12", people: '["[[Человек Б]]"]' }),
  md("life/days/2030-01-10.md", { date: "2030-01-10", type: "day", habits_failed: "[Привычка Б]" }),
  md("life/days/2030-01-12.md", { date: "2030-01-12", type: "day" }),
  md("life/days/2030-01-14.md", { date: "2030-01-14", type: "day", habits_failed: "[Привычка Б]" }),
]);
const vault = buildVault({
  root: "", life: [], raw: [], log: "", claude_md: "", media: [],
  pages: [
    person("Человек А", { closeness: '"9"' }, "## Влияние\n### Тянет вверх\n- Пункт А\n\n### Тянет вниз\n- [[Привычка Б|подпись]] — заметка В\n"),
    person("Человек Б", {}, "## Влияние\n### Тянет вверх\n- пункт А *с 2029*\n- опора\n\n### Тянет вниз\n- [[Привычка Б]]\n"),
    person("Человек В", { tags: "[t-x, опора]" }),
    person("Человек Г", { tags: "[t-y]" }),
  ],
});
const X = [
  { key: "x", label: "икс", habit: "Привычка Б", tags: /^t-x$/ },
  { key: "y", label: "игрек", habit: "", tags: /^t-y$/ },
];

test("influenceGroups: one influence on two pages is one item; trigger tags are «вниз», «опора» is «вверх»", () => {
  const g = influenceGroups(vault.pages, life.habits, X);
  const show = (items: typeof g.up) => items.map((i) => [i.label, i.md, i.people.map((p) => p.page.title + (p.note ? ` (${p.note})` : ""))]);
  assert.deepEqual(show(g.up), [
    ["опора", "опора", ["Человек Б", "Человек В"]],
    ["Пункт А", "Пункт А", ["Человек А", "Человек Б (с 2029)"]],
  ]);
  assert.deepEqual(show(g.down), [
    ["подпись", "[[Привычка Б|подпись]]", ["Человек А (заметка В)", "Человек Б", "Человек В"]],
    ["игрек", "игрек", ["Человек Г"]],
  ]);
  assert.equal(g.down[0].habit?.title, "Привычка Б");
  assert.equal(g.down[1].habit, undefined);
  // a trigger without a habit finds one named by its own word
  const named = buildLife([habit("Игрек", "Игрек")]).habits;
  assert.deepEqual(influenceGroups(vault.pages, named, X).down.find((i) => i.label === "игрек")?.md, "[[Игрек|игрек]]");
});

test("influenceItemCount: the habit on the days any of its people were met, against the other days", () => {
  const g = influenceGroups(vault.pages, life.habits, X);
  const c = influenceItemCount(g.down[0], vault.pages, life, TODAY)!;
  assert.deepEqual({ beads: c.beads.map((b) => [b.date, b.cell]), counted: c.counted, hits: c.hits, apart: c.apart, apartHits: c.apartHits },
    { beads: [["2030-01-10", "fall"], ["2030-01-12", "unmarked"]], counted: 2, hits: 1, apart: 1, apartHits: 1 });
  assert.equal(influenceItemCount(g.down[1], vault.pages, life, TODAY), undefined);
});
