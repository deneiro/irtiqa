import assert from "node:assert/strict";
import { test } from "node:test";
import { along, askOf, asks, campNeed, campsTaken, climbSummary, dayScore, fire, heights, medals, monthDates, prayerOpen, rankOf, standing } from "./game";
import { buildLife, emptyDay, xpForDay, type Day } from "./life";
import type { MdFile, Page } from "./types";
import { meetsOf } from "./levels";
import type { LifeEvent } from "./events";

const habit = (title: string, kind: string, extra = ""): MdFile => ({ rel: `life/habits/${title}.md`, mtime: 0, content: `---\ntitle: ${title}\ntype: habit\ntheme: Health & sport\nkind: ${kind}\nfreq: daily\nstatus: active\n${extra}created: 2030-01-01\n---\n` });
const HABITS = buildLife([habit("Утро", "prayer"), habit("Вечер", "prayer"), habit("Вода", "good", 'ask: "💧 Выпил воду?"\n'), habit("Сладкое", "bad")]).habits;
const day = (date: string, over: Partial<Day> = {}): Day => ({ ...emptyDay(date), ...over });
const full = (date: string): Day => day(date, { habitsDone: ["Утро", "Вечер", "Вода", "Сладкое"], mood: 7, stress: 3, meals: [{ time: "13:00", what: "суп", note: "" }], journal: "- Благодарен: день" });

test("an empty day stands at the foot and a full one on the summit", () => {
  const none = dayScore(HABITS, undefined, "2030-01-05");
  assert.equal(none.pct, 0);
  assert.equal(none.of, 3 + 3 + 2 + 2 + 4);
  const all = dayScore(HABITS, full("2030-01-05"), "2030-01-05");
  assert.equal(all.pct, 100);
  assert.equal(campsTaken(all.pct), 4);
  assert.deepEqual(standing(0), { at: "Подножие", next: "Лагерь I", left: 25 });
  assert.deepEqual(standing(60), { at: "Лагерь II", next: "Лагерь III", left: 15 });
  assert.equal(standing(100).next, undefined);
});

test("a late prayer is worth less than one on time, a fall is worth nothing, tasks join the day", () => {
  const d = day("2030-01-05", { habitsDone: ["Утро"], habitsLate: ["Вечер"], habitsFailed: ["Сладкое"], tasks: [{ done: true, text: "раз" }, { done: false, text: "два" }] });
  const s = dayScore(HABITS, d, "2030-01-05");
  const by = Object.fromEntries(s.parts.map((p) => [p.key, [p.got, p.of]]));
  assert.deepEqual(by, { prayer: [5, 6], good: [0, 2], bad: [0, 2], task: [2, 4], log: [0, 4] });
});

test("the fire counts days in a row through yesterday, and today only once it is taken", () => {
  const days = new Map<string, Day>([["2030-01-02", day("2030-01-02")], ["2030-01-03", full("2030-01-03")], ["2030-01-04", full("2030-01-04")], ["2030-01-05", day("2030-01-05")]]);
  assert.deepEqual(fire(HABITS, days, "2030-01-05"), { days: 2, today: false });
  days.set("2030-01-05", full("2030-01-05"));
  assert.deepEqual(fire(HABITS, days, "2030-01-05"), { days: 3, today: true });
  assert.deepEqual(fire(HABITS, new Map(), "2030-01-05"), { days: 0, today: false });
});

test("medals count over the day files and say how far the rest is", () => {
  const days = new Map<string, Day>([["2030-01-03", full("2030-01-03")], ["2030-01-04", full("2030-01-04")]]);
  const m = Object.fromEntries(medals(HABITS, days, "2030-01-05").map((x) => [x.id, [x.got, x.note]]));
  assert.deepEqual(m.summit, [true, "× 2"]);
  assert.deepEqual(m.five, [true, "× 2"]);
  assert.deepEqual(m.week, [false, "2 из 7"]);
  assert.deepEqual(m.tasks, [false, "0 из 100"]);
});

test("the check-in asks what is not answered, prayers only once their time has come", () => {
  const all = asks(HABITS, undefined, "2030-01-05", (p) => p === "Утро");
  assert.deepEqual(all.map((a) => a.id), ["h:Утро", "h:Сладкое", "h:Вода", "mood", "stress", "food", "words"]);
  const water = all.find((a) => a.id === "h:Вода")!;
  assert.deepEqual([water.kind, "icon" in water && water.icon, water.text], ["good", "💧", "Выпил воду?"]);
  const d = day("2030-01-05", { habitsDone: ["Утро", "Вода"], habitsFailed: ["Сладкое"], mood: 6, tasks: [{ done: true, text: "раз" }, { done: false, text: "два" }] });
  assert.deepEqual(asks(HABITS, d, "2030-01-05", () => true).map((a) => a.id), ["h:Вечер", "stress", "food", "t:1:два", "words"]);
  assert.deepEqual(askOf(HABITS.find((h) => h.title === "Сладкое")!), { icon: undefined, text: undefined });
});

test("a prayer opens at its time", () => {
  const at = (h: number) => new Date(2030, 0, 5, h, 0);
  const times = { fajr: at(6), zuhr: at(13), asr: at(16), maghrib: at(18), isha: at(20) };
  assert.equal(prayerOpen("Аср", at(15), times), false);
  assert.equal(prayerOpen("Аср", at(16), times), true);
  assert.equal(prayerOpen("Витр", at(19), times), false);
  assert.equal(prayerOpen("Вода", at(1), times), true);
});

test("a point along the path, by length", () => {
  const path: [number, number][] = [[0, 0], [10, 0], [10, 30]];
  assert.deepEqual(along(path, 0), [0, 0]);
  assert.deepEqual(along(path, 25), [10, 0]);
  assert.deepEqual(along(path, 100), [10, 30]);
  assert.deepEqual(along(path, 62.5), [10, 15]);
});

test("ranks by level, and XP for late prayers, tasks by their part of the day and the day's records", () => {
  assert.deepEqual([1, 5, 15, 30, 50].map(rankOf), ["У подножия", "Путник", "Восходитель", "Проводник", "Хранитель вершины"]);
  const d = day("2030-01-05", { habitsDone: ["Вода"], habitsLate: ["Утро"], mood: 5, weight: 90, tasks: [{ done: true, text: "звонок · @фаджр" }, { done: true, text: "без части" }, { done: false, text: "нет · @зухр" }] });
  const xp = xpForDay(d, { habits: HABITS, quests: [], days: new Map() });
  assert.deepEqual(Object.fromEntries(xp), { "Health & sport": 10 + 5 + 3, "Business & career": 8, "—": 8, "Personal growth": 3 });
});

test("a stretch of days: heights, what is still ahead, and the five numbers", () => {
  const days = new Map<string, Day>([["2030-01-03", full("2030-01-03")], ["2030-01-04", day("2030-01-04", { habitsDone: ["Утро"] })]]);
  const hs = heights(HABITS, days, ["2030-01-02", "2030-01-03", "2030-01-04", "2030-01-05"], "2030-01-04", (d) => (d === "2030-01-03" ? 40 : 0));
  assert.deepEqual(hs.map((h) => [h.pct, h.future]), [[0, false], [100, false], [21, false], [0, true]]);
  const s = climbSummary(hs);
  assert.deepEqual([s.xp, s.avg, s.taken, s.summits, s.passed, s.best?.date], [40, 40, 1, 1, 3, "2030-01-03"]);
  assert.equal(climbSummary([]).best, undefined);
});

test("the days of a month and the empty cells before its first Monday-week", () => {
  const feb = monthDates("2030-02");
  assert.equal(feb.dates.length, 28);
  assert.equal(feb.dates[0], "2030-02-01");
  assert.equal(feb.lead, 4); // 1 February 2030 is a Friday
  assert.equal(monthDates("2030-09").lead, 6); // a Sunday
});

test("a camp names the points it still needs and what of the day has not given its points", () => {
  const d = day("2030-01-05", { habitsDone: ["Утро"], habitsLate: ["Вечер"], habitsFailed: ["Сладкое"], tasks: [{ done: false, text: "написать главу · @аср" }] });
  // of = 6 + 2 + 2 + 2 + 4 = 16, got = 3 + 2 = 5 → 31 %
  const c1 = campNeed(HABITS, d, "2030-01-05", 25);
  assert.equal(c1.taken, true);
  assert.equal(c1.need, 0);
  const c2 = campNeed(HABITS, d, "2030-01-05", 50);
  assert.equal(c2.name, "Лагерь II");
  assert.equal(c2.taken, false);
  assert.equal(c2.need, 3); // 7.92 → 8 points, 5 taken
  assert.deepEqual(c2.items.map((i) => [i.label, i.pts, i.missed]), [
    ["Вода", 2, false], ["написать главу", 2, false],
    ["записать настроение", 1, false], ["записать стресс", 1, false], ["записать что ел", 1, false], ["записать слово о дне", 1, false],
    ["Вечер — прочитан поздно", 1, true], ["Сладкое — без срыва", 2, true],
  ]);
});

test("an event earns for its theme and each person seen for theirs, a theme capped a day", () => {
  const person = (file: string, theme: string) => ({ zone: "person", file, title: file, aliases: [], theme, fm: {} }) as unknown as Page;
  const pages = [person("А", "Social & friends"), person("Б", "Social & friends"), person("В", "Family & relationship"), ...["Г", "Д", "Е", "Ж"].map((n) => person(n, "Social & friends"))];
  const ev = (date: string, theme: string, people: string[]) => ({ date, theme, people }) as unknown as LifeEvent;
  const meets = meetsOf([ev("2030-01-05", "Memories & Fun", ["[[А]]", "[[В]]", "Нет такого"]), ev("2030-01-05", "Social & friends", ["[[А]]", "[[Б]]"]), ev("2030-01-06", "Memories & Fun", ["А", "Б", "Г", "Д", "Е", "Ж"])], pages);
  const xp = xpForDay(day("2030-01-05", {}), { habits: [], quests: [], days: new Map(), meets });
  assert.deepEqual(Object.fromEntries(xp), { "Memories & Fun": 15, "Social & friends": 15 + 10, "Family & relationship": 5 });
  assert.equal(xpForDay(day("2030-01-06", {}), { habits: [], quests: [], days: new Map(), meets }).get("Social & friends"), 20);
});
