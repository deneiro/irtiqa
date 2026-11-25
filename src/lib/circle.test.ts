import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCircle, cadenceOf, circleWarmth, coMet, rhythmDays, eventsWith, isMeetingRecord, meetWindow, ownNames, tieWarmth, triggerStats } from "./circle";
import { buildLife } from "./life";
import type { MdFile } from "./types";
import { buildVault } from "./vault";

// Today is 2030-02-01: the 90 days end yesterday, 2030-01-31.
const TODAY = "2030-02-01";
const md = (rel: string, fm: Record<string, string>): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n` });
const person = (file: string, fm: Record<string, string> = {}) => md(`wiki/People/${file}.md`, { title: file, type: "person", theme: "Social & friends", ...fm });
const event = (date: string, title: string, people: string[], tags = "") =>
  md(`life/events/${date} ${title}/event.md`, { title, type: "event", date, people: `[${people.map((p) => JSON.stringify(`[[${p}]]`)).join(", ")}]`, ...(tags ? { tags } : {}) });
const day = (date: string, fm: Record<string, string> = {}) => md(`life/days/${date}.md`, { date, type: "day", ...fm });

const vault = buildVault({
  root: "", life: [], raw: [], log: "", claude_md: "", media: [],
  pages: [person("Человек А", { tags: "[t-x]" }), person("Человек Б", { tags: "[t-x]" }), person("Человек В", { aliases: "[Человек А, В]" }), person("Человек Г")],
});
const people = vault.pages;
const life = buildLife([
  md("life/habits/Привычка А.md", { title: "Привычка А", type: "habit", kind: "bad", freq: "daily", status: "active" }),
  event("2030-01-05", "Поход", ["Человек А", "Человек В", "Человек Г"]),
  event("2030-01-10", "Кино", ["Человек Б", "Человек В", "Человек Г"]),
  event("2030-01-12", "Встреча", ["Человек А", "Человек Г"], "[встреча]"),
  event("2030-01-20", "Футбол", ["Человек А", "Человек Г"]),
  event("2030-02-01", "Сегодня", ["Человек А"]),
  day("2030-01-05", { habits_failed: "[Привычка А]" }),
  day("2030-01-06", { habits_failed: "[Привычка А]" }),
  day("2030-01-07"),
  day("2030-01-12", { habits_done: "[Привычка А]" }),
  day("2030-02-01", { habits_failed: "[Привычка А]" }),
]);
const X = [{ key: "x", label: "икс", habit: "Привычка А", tags: /^t-x$/ }];
const items = buildCircle(people, life.events, TODAY).map((i) => ({ ...i, triggers: i.page.tags.includes("t-x") ? ["x"] : [] }));

test("meetWindow: the days ending yesterday", () => {
  assert.deepEqual(meetWindow(TODAY), { from: "2029-11-03", to: "2030-01-31" });
});

test("triggerStats: a meeting without a day file is counted neither with them nor apart; today is not in the window", () => {
  const [s] = triggerStats(items, life, TODAY, 90, X);
  // met on 01-05, 01-10, 01-12, 01-20 (not 02-01: today); day files on 01-05 and 01-12 only
  assert.deepEqual(
    { met: s.metDays, withFile: s.metWithFile, broke: s.brokeOnMet, apart: s.brokeApart, other: s.otherDays, people: s.people.map((p) => p.name) },
    { met: 4, withFile: 2, broke: 1, apart: 1, other: 2, people: ["Человек А", "Человек Б"] },
  );
  assert.deepEqual(triggerStats(items.map((i) => ({ ...i, triggers: [] })), life, TODAY, 90, X), []);
});

test("ownNames: an alias that is another person's own name is not theirs", () => {
  const v = vault.pages.find((p) => p.file === "Человек В")!;
  assert.deepEqual(ownNames(v, people), ["человек в", "в"]);
  assert.deepEqual(eventsWith(v, people, life.events).map((e) => e.title), ["Кино", "Поход"]);
});

test("isMeetingRecord: the day's «Встреча» of «виделись» has its tag; a memory he named «Встреча» has none", () => {
  const titled = life.events.filter((e) => e.title === "Встреча");
  assert.deepEqual(titled.map(isMeetingRecord), [true]);
  const memory = buildLife([event("2030-01-30", "Встреча", ["Человек А", "Человек Г"])]).events[0];
  assert.equal(isMeetingRecord(memory), false);
  const a = vault.pages.find((p) => p.file === "Человек А")!;
  assert.deepEqual(coMet(a, people, [...life.events, memory]).map((c) => [c.name, c.n]), [["Человек Г", 3]]);
});

test("coMet: who was at the same events most often, twice and more; «Встреча» is not being together", () => {
  const a = vault.pages.find((p) => p.file === "Человек А")!;
  assert.deepEqual(coMet(a, people, life.events).map((c) => [c.name, c.n, c.page?.file]), [["Человек Г", 2, "Человек Г"]]);
  assert.deepEqual(coMet(a, people, life.events, 1).map((c) => [c.name, c.n]), [["Человек Г", 2], ["Человек В", 1]]);
});

test("a tie cools from its last touch to the end of its rhythm, and the circle counts the ties still warm", () => {
  assert.equal(tieWarmth({ cadence: undefined, overdue: undefined }), undefined);
  assert.deepEqual(tieWarmth({ cadence: 30, overdue: undefined }), { pct: 0, state: "нет записей", since: undefined, cadence: 30 });
  assert.deepEqual(tieWarmth({ cadence: 30, overdue: -30 }), { pct: 100, state: "тёплая", since: 0, cadence: 30 });
  assert.deepEqual(tieWarmth({ cadence: 30, overdue: -9 })?.state, "остывает");
  assert.deepEqual(tieWarmth({ cadence: 30, overdue: 5 }), { pct: 0, state: "остыла", since: 35, cadence: 30 });
  const v = buildVault({
    root: "", life: [], raw: [], log: "", claude_md: "", media: [],
    pages: [
      person("Первый", { closeness: "10", last_contact: "2030-01-30" }), // core, 2 days of 7
      person("Второй", { closeness: "9", last_contact: "2029-12-01" }), // core, long past 14 days
      person("Третий", { closeness: "5", last_contact: "2030-01-01" }), // circle, 31 of 60
      person("Дома", { closeness: "10", tags: "[household]" }), // lives with him: left out
      person("Без близости", { last_contact: "2030-01-30" }),
    ],
  });
  const w = circleWarmth(buildCircle(v.pages, [], TODAY));
  assert.deepEqual(w.bands.map((b) => [b.title, b.warm, b.total]), [["Ядро", 1, 2], ["Близкие", 0, 0], ["Круг", 1, 1], ["Дальние", 0, 0]]);
  assert.deepEqual([w.warm, w.total, w.pct], [2, 3, 67]);
});

test("his own rhythm overrides the closeness one, and a tie with it and no record is not cold", () => {
  assert.equal(rhythmDays("раз в год"), 365);
  assert.equal(rhythmDays("раз в 2 года"), 730);
  assert.equal(rhythmDays("Раз в полгода"), 180);
  assert.equal(rhythmDays("раз в 3 месяца"), 90);
  assert.equal(rhythmDays("45"), 45);
  assert.equal(rhythmDays("не считать"), null);
  assert.equal(rhythmDays(""), undefined);
  assert.equal(rhythmDays("иногда"), undefined);
  const v = buildVault({
    root: "", life: [], raw: [], log: "", claude_md: "", media: [],
    pages: [
      person("Дядя", { closeness: "7", rhythm: "раз в год" }),
      person("Дядя давно", { closeness: "7", rhythm: "раз в год", last_contact: "2028-12-01" }),
      person("Тётя", { closeness: "7", rhythm: "не считать", last_contact: "2029-01-01" }),
      person("Друг", { closeness: "7" }),
    ],
  });
  const people = v.pages;
  assert.deepEqual(cadenceOf(people.find((p) => p.file === "Друг")!), { cadence: 30, own: false });
  const c = buildCircle(people, [], TODAY);
  const by = (n: string) => c.find((i) => i.name === n)!;
  assert.equal(by("Дядя").cadence, 365);
  assert.equal(by("Дядя").overdue, undefined);
  assert.ok(by("Дядя давно").overdue! > 0);
  assert.equal(by("Тётя").cadence, undefined);
  // past his own year comes first; the friend with no record next; the uncle with his own rhythm and no record after them
  assert.deepEqual(c.map((i) => i.name).slice(0, 2), ["Дядя давно", "Друг"]);
  assert.ok(c.findIndex((i) => i.name === "Дядя") > 1);
  // warmth counts the friend and the overdue uncle only
  assert.equal(circleWarmth(c).total, 2);
});

test("someone no longer alive is not in the circle or the lists; the page stays a person page", async () => {
  const { isGone, isListed } = await import("./people");
  const v = buildVault({ root: "", life: [], raw: [], log: "", claude_md: "", media: [], pages: [person("Живой", { closeness: "9" }), person("Ушедший", { closeness: "9", deceased: "true" })] });
  assert.deepEqual(buildCircle(v.pages, [], TODAY).map((i) => i.page.title), ["Живой"]);
  assert.deepEqual(v.pages.filter(isListed).map((p) => p.title), ["Живой"]);
  assert.deepEqual(v.pages.filter(isGone).map((p) => p.title), ["Ушедший"]);
});
