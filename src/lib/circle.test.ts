import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCircle, coMet, eventsWith, isMeetingRecord, meetWindow, ownNames, triggerStats } from "./circle";
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
