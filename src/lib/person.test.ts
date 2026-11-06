import assert from "node:assert/strict";
import { test } from "node:test";
import { fmt, type Cell } from "./dashboard";
import { buildLife } from "./life";
import { RADICALS, countWords, influenceCount, meetingsFoot, personNumbers, personView, radicalSeat, radicalsDiff, radicalsOf, type PersonTile } from "./person";
import { peopleOf } from "./themeNumbers";
import type { MdFile } from "./types";
import { buildVault } from "./vault";

// Today is 2030-02-01: the 90 days of the meetings are 2029-11-03 … 2030-01-31.
const TODAY = "2030-02-01";
const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });
const person = (file: string, fm: Record<string, string> = {}, body = "") =>
  md(`wiki/People/${file}.md`, { title: file, type: "person", theme: "Social & friends", connection: "друг", ...fm }, body);
const habit = (file: string, kind: string) =>
  md(`life/habits/${file}.md`, { title: file, type: "habit", kind, theme: "Personal growth", freq: "daily", status: "active", created: "2030-01-15" });
const day = (date: string, fm: Record<string, string> = {}) => md(`life/days/${date}.md`, { date, type: "day", ...fm });
const event = (date: string, title: string, people: string[], tags = "") =>
  md(`life/events/${date} ${title}/event.md`, { title, type: "event", date, people: `[${people.map((p) => JSON.stringify(`[[${p}]]`)).join(", ")}]`, ...(tags ? { tags } : {}) });
const DEBTS: MdFile = {
  rel: "life/finance/debts.md", mtime: 0, content: [
    "# Долги", "", "## Открытые", "",
    "| Кто | Направление | Сумма | Валюта | С даты | Внесено | Заметка |", "|---|---|---|---|---|---|---|",
    "| [[Человек А]] | я должен | 10000 | ₸ | 2030-01-05 | 0 | |",
    "| [[Человек А]] | я должен | 5000 | ₸ | 2030-01-10 | 1000 | |",
    "| [[Человек В]] | я должен | 4000 | ₸ | 2030-01-12 | 0 | |",
    "| [[Человек В]] | мне должны | 1500 | ₸ | 2030-01-14 | 0 | |",
    "", "## Закрытые", "",
    "| Кто | Направление | Сумма | Валюта | С даты | Внесено | Заметка | Закрыт |", "|---|---|---|---|---|---|---|---|",
    "| [[Человек А]] | я должен | 2000 | ₸ | 2029-12-01 | 2000 | | 2029-12-20 |",
    "| [[Человек Г]] | я должен | 700 | ₸ | 2029-12-02 | 700 | | 2029-12-21 |",
  ].join("\n"),
};
const TALKS: MdFile = { rel: "life/talks.md", mtime: 0, content: "| Дата | С кем | О чём |\n|---|---|---|\n| 2030-01-30 | [[Человек В]] | о делах |\n" };

const BODY = `# Человек А

## Было
- Первая фраза *2029*
- Вторая фраза

страница · «Об отношениях»

---

## Сейчас
- Живёт рядом *с 30 окт*

## Влияние
> «Точно не вверх»

опросник, 15 сен

### Тянет вверх
- веселье
- поддержка

рядом с ним ты настоящий

### Тянет вниз
- [[Привычка А|первая]]
- [[Привычка Б]]
- [[Нет такой привычки]]
- что-то без ссылки

усиливается одно, слабеет другое

## Характер
весёлый · любит признание, тревожный

- Отличается — сильно уважает людей
- В ссоре — молчит, [[Человек Б|как Б]] — тоже
- просто строка
- Очень длинное начало фразы, которое не подпись — а продолжение

## Плюсы и минусы
### Плюсы
- ответственный
### Минусы
- бросает на полпути *часто*

## Круг
- Лучшие друзья — ты, [[Человек Б]], [[Человек В|В, младший]], без страницы.
- строка без подписи

## Об отношениях
Длинный текст, который на экран не выходит.

## Радикалы (разбор по опроснику)
**Формула: 2, 1, 5** (эпилептоид → паранойял → шизоид).

## Changes
- 2030-01-01 — создана.
`;

const PAGES = [
  person("Человек А", { closeness: "10", last_contact: "2030-01-31", birthday: "1999-01-20", radicals: "[эпилептоид, паранойял, гипертим]" }, BODY),
  person("Человек Б", { closeness: "9", last_contact: "2030-01-01", birthday: "03-10" }),
  person("Человек В", { birthday: "2000-01-05" }),
  person("Человек Г"),
];
const LIFE_FILES = [
  habit("Привычка А", "bad"), habit("Привычка Б", "good"), DEBTS, TALKS,
  event("2029-12-01", "Поход", ["Человек А", "Человек Б", "Человек В"]),
  event("2030-01-20", "День рождения А", ["Человек А"]),
  event("2030-01-25", "Встреча", ["Человек А"], "[встреча]"),
  event("2030-01-28", "Кино", ["Человек А", "Человек В"]),
  event("2030-02-01", "Сегодня", ["Человек А"]),
  day("2030-01-10", { habits_failed: "[Привычка А, Привычка Б]" }),
  day("2030-01-11", { habits_done: "[Привычка Б]" }),
  day("2030-01-12"),
  day("2030-01-20", { habits_failed: "[Привычка А]" }),
  day("2030-01-25", { habits_done: "[Привычка Б]" }),
];
const vault = buildVault({ root: "", pages: PAGES, life: [], raw: [], log: "", claude_md: "", media: [] });
const life = buildLife(LIFE_FILES);
const people = peopleOf(vault);
const pageOf = (file: string) => vault.pages.find((p) => p.file === file)!;
const brief = (t: PersonTile) => Object.fromEntries(Object.entries(t).filter(([k, v]) => k !== "label" && v !== undefined));

test("personView: three columns of phrases — a trailing *note*, a paragraph as the caption, a rule is not text, a missing section is empty", () => {
  const v = personView(BODY);
  assert.deepEqual(v.past, { suffix: "", items: [{ md: "Первая фраза", note: "2029" }, { md: "Вторая фраза" }], caption: "страница · «Об отношениях»" });
  assert.deepEqual(v.now, { suffix: "", items: [{ md: "Живёт рядом", note: "с 30 окт" }] });
  assert.deepEqual(v.next, { suffix: "", items: [] });
});

test("personView: «Влияние» — the quote, the paragraph on top, the halves; a pill that is a whole link names its target", () => {
  const inf = personView(BODY).influence!;
  assert.equal(inf.verdict, "«Точно не вверх»");
  assert.equal(inf.note, "опросник, 15 сен");
  assert.deepEqual(inf.up, { pills: [{ md: "веселье", label: "веселье" }, { md: "поддержка", label: "поддержка" }], note: "рядом с ним ты настоящий" });
  assert.deepEqual(inf.down!.pills.map((p) => [p.label, p.target]), [["первая", "Привычка А"], ["Привычка Б", "Привычка Б"], ["Нет такой привычки", "Нет такой привычки"], ["что-то без ссылки", undefined]]);
  assert.equal(inf.down!.note, "усиливается одно, слабеет другое");
});

test("personView: «Характер», «Плюсы и минусы», «Круг» and the questionnaire's formula", () => {
  const v = personView(BODY);
  assert.deepEqual(v.character, {
    five: ["весёлый", "любит признание", "тревожный"],
    traits: [
      { label: "Отличается", text: "сильно уважает людей" }, { label: "В ссоре", text: "молчит, [[Человек Б|как Б]] — тоже" }, { text: "просто строка" },
      { text: "Очень длинное начало фразы, которое не подпись — а продолжение" },
    ],
  });
  assert.deepEqual(v.pros, { plus: [{ md: "ответственный" }], minus: [{ md: "бросает на полпути", note: "часто" }] });
  // a line without « — » names nobody; a comma inside a link stays in it
  assert.deepEqual(v.circle, [{ label: "Лучшие друзья", people: ["ты", "[[Человек Б]]", "[[Человек В|В, младший]]", "без страницы"] }]);
  assert.deepEqual(v.formula, [2, 1, 5]);
});

test("personView: a page without the skeleton has nothing to show; a bold label in front of the five words is not one of them", () => {
  const v = personView("# Х\n\n**Связь:** друг.\n\n## Об отношениях\n\n- строка\n\n## Changes\n- создана\n");
  assert.deepEqual([v.past.items, v.now.items, v.next.items, v.influence, v.character, v.pros, v.circle, v.formula], [[], [], [], undefined, undefined, undefined, [], []]);
  assert.deepEqual(personView("## Характер\n\n**Пять слов:** один, два.\n").character, { five: ["один", "два"], traits: [] });
});

test("radicals: seven seats in Ponomarenko's order; his reading lights them; the formula of the questionnaire differs by name", () => {
  assert.deepEqual(RADICALS.map((r) => r.name), ["паранойял", "эпилептоид", "истероид", "эмотив", "шизоид", "гипертим", "тревожный"]);
  assert.deepEqual(["Паранойяльный", "эпилептоидный", "истероид", "эмотив", "шизоид", "гипертимный", "тревожный", "другое"].map(radicalSeat), [0, 1, 2, 3, 4, 5, 6, undefined]);
  assert.deepEqual(radicalsOf(pageOf("Человек А"), [2, 1, 5]), {
    his: ["эпилептоид", "паранойял", "гипертим"], lit: [1, 0, 5], reading: [1, 0, 4], extra: ["шизоид"], missing: ["гипертим"],
  });
  assert.deepEqual(radicalsOf(pageOf("Человек Б"), []), { his: [], lit: [], reading: [], extra: [], missing: [] });
  const a = pageOf("Человек А");
  assert.deepEqual(radicalsDiff(radicalsOf(a, [2, 1, 5])), { text: "разбор на странице: шизоид вместо гипертима", same: false });
  assert.deepEqual(radicalsDiff(radicalsOf(a, [2, 1, 6, 7])), { text: "разбор на странице добавляет: тревожный", same: false });
  assert.deepEqual(radicalsDiff(radicalsOf(a, [2])), { text: "в разборе на странице нет паранойяла, гипертима", same: false });
  assert.deepEqual(radicalsDiff(radicalsOf(a, [6, 1, 2])), { text: "так же в разборе на странице", same: true });
  assert.equal(radicalsDiff(radicalsOf(a, [])), undefined);
});

test("personNumbers: «Связь» — the latest touch against the rhythm of the closeness; a meeting and a talk count; no closeness, no rhythm", () => {
  // an event of today is a touch today, later than `last_contact`
  assert.deepEqual(brief(personNumbers(pageOf("Человек А"), people, life, TODAY).contact),
    { hint: "ритм — раз в 7 дней", value: "сегодня", line: "в ритме", tone: "sage", note: "последняя встреча — 1 фев" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Б"), people, life, TODAY).contact),
    { hint: "ритм — раз в 14 дней", value: "31", unit: "день", line: "пора — +17 дн", tone: "honey", note: "последний контакт — 1 янв" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек В"), people, life, TODAY).contact),
    { hint: "ритма нет", value: "2", unit: "дня", line: "последний разговор — 30 янв", note: "ритм считается по близости — её нет" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Г"), people, life, TODAY).contact),
    { hint: "ритма нет", value: "—", line: "не отмечена", note: "ритм считается по близости — её нет" });
});

test("personNumbers: «Вместе» — events with him through today, «Встреча» left out; the first with its year", () => {
  assert.deepEqual(brief(personNumbers(pageOf("Человек А"), people, life, TODAY).together),
    { hint: "воспоминаний", value: "4", line: "последнее — 1 фев, «Сегодня»", note: "первое — 1 дек 2029, «Поход»" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Б"), people, life, TODAY).together), { hint: "воспоминаний", value: "1", line: "последнее — 1 дек 2029, «Поход»" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Г"), people, life, TODAY).together),
    { hint: "воспоминаний", value: "—", line: "общих событий нет", note: "«Виделись» спросит, создать ли" });
});

test("personNumbers: «Долг» — the open remainder, the rows and their dates, paid in; both ways; none is «—»", () => {
  assert.deepEqual(brief(personNumbers(pageOf("Человек А"), people, life, TODAY).debt),
    { hint: "ты должен", value: fmt(14000), unit: "₸", line: "2 записи · 5 янв – 10 янв", note: `выплачено ${fmt(1000)}` });
  assert.deepEqual(brief(personNumbers(pageOf("Человек В"), people, life, TODAY).debt),
    { hint: "ты должен", value: fmt(4000), unit: "₸", line: "2 записи · 12 янв – 14 янв", note: "выплачено 0", second: { value: fmt(1500), unit: "₸", hint: "тебе должны" } });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Б"), people, life, TODAY).debt), { value: "—", line: "в долгах нет" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Г"), people, life, TODAY).debt), { value: "—", line: "в долгах нет", note: "закрыто 1 запись" });
});

test("personNumbers: «День рождения» — days to the next; this year's event of the day; none written is «—»", () => {
  assert.deepEqual(brief(personNumbers(pageOf("Человек А"), people, life, TODAY).birthday),
    { hint: "20 января", value: "353", unit: "дня", line: "в этот раз — «День рождения А»", note: "общее событие в тот же день" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Б"), people, life, TODAY).birthday), { hint: "10 марта", value: "37", unit: "дней" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек В"), people, life, TODAY).birthday),
    { hint: "5 января", value: "338", unit: "дней", line: "в этот раз — событий нет", note: "5 января 2031" });
  assert.deepEqual(brief(personNumbers(pageOf("Человек Г"), people, life, TODAY).birthday), { value: "—", line: "не записан" });
});

const L: Record<Cell, string> = { done: "h", late: "h", held: "h", failed: "f", fall: "f", unmarked: "u", pending: "u", nofile: "n", skip: "s", future: "t" };

test("influenceCount: a bead a meeting; only a meeting with a day file is counted; today and a link that is no habit are left out", () => {
  const c = influenceCount(personView(BODY).influence!, pageOf("Человек А"), people, life, TODAY);
  assert.deepEqual(c.meetings, ["2029-12-01", "2030-01-20", "2030-01-25", "2030-01-28"]);
  assert.deepEqual(c.withFile, ["2030-01-20", "2030-01-25"]);
  assert.deepEqual(c.up, []);
  assert.deepEqual(c.down.map((r) => [r.habit.title, r.beads.map((b) => L[b.cell]).join(""), r.counted, r.marked, r.hits, r.apart, r.apartHits]), [
    ["Привычка А", "nfun", 2, 1, 1, 3, 1],
    ["Привычка Б", "nuhn", 2, 1, 1, 3, 1],
  ]);
  assert.deepEqual(c.down.map(countWords), [
    { together: "вместе — срыв 1 из 2", apart: "порознь — 1 из 3" },
    { together: "вместе — сделал 1 из 2", apart: "порознь — 1 из 3" },
  ]);
});

test("countWords and meetingsFoot: no mark at all is «без отметки»; fewer than three days written is «судить рано»", () => {
  const c = influenceCount({ down: { pills: [{ md: "", label: "Б", target: "Привычка А" }] } }, pageOf("Человек В"), people, life, TODAY);
  assert.deepEqual(c.meetings, ["2029-12-01", "2030-01-28"]);
  assert.deepEqual(countWords(c.down[0]), { together: "вместе — дни не записаны", apart: "порознь — 2 из 5" });
  assert.equal(meetingsFoot(c.meetings, c.withFile, TODAY), "встреча — общее событие: 1 дек 2029, 28 янв · ни один из этих дней не записан — судить рано");
  assert.equal(meetingsFoot(["2030-01-20", "2030-01-25"], ["2030-01-25"], TODAY), "встреча — общее событие: 20 янв, 25 янв · день записан только 25 янв — судить рано");
  assert.equal(meetingsFoot(["2030-01-10", "2030-01-11", "2030-01-12"], ["2030-01-10", "2030-01-11", "2030-01-12"], TODAY), "встреча — общее событие: 10 янв, 11 янв, 12 янв · дни записаны у 3 из 3");
  assert.equal(meetingsFoot([], [], TODAY), "встреч за 90 дней нет");
  const unmarked = { habit: life.habits[0], beads: [{ date: "2030-01-12", cell: "unmarked" as Cell }], counted: 1, marked: 0, hits: 0, apart: 0, apartHits: 0 };
  assert.deepEqual(countWords(unmarked), { together: "вместе — без отметки", apart: "порознь — дней нет" });
});
