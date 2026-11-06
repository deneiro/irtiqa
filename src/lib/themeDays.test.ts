import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLife } from "./life";
import { attentionShares, dayFiles, eventTheme, themeDays } from "./themeDays";
import type { MdFile } from "./types";

const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });
const habit = (title: string, kind: string, theme: string, status = "active") =>
  md(`life/habits/${title}.md`, { title, type: "habit", kind, theme, freq: "daily", status, created: "2029-12-01" });
const day = (date: string, fm: Record<string, string>) => md(`life/days/${date}.md`, { date, type: "day", ...fm });
const event = (folder: string, fm: Record<string, string>) => md(`life/events/${folder}/event.md`, { type: "event", ...fm });

const FILES = [
  habit("Привычка А", "good", "Personal growth"),
  habit("Фаджр", "prayer", "Spirituality & Religion"),
  habit("Плохая Б", "bad", "Health & sport"),
  habit("Старая В", "good", "Family & relationship", "archived"),
  day("2030-01-02", { habits_done: "[Привычка А, Плохая Б]", habits_late: "[Фаджр]" }),
  day("2030-01-03", { habits_done: "[Плохая Б]", habits_failed: "[Привычка А, Фаджр]" }),
  day("2030-01-04", { habits_done: '["Старая В"]', sessions: '["Файл Б: 30"]' }),
  day("2029-12-31", { habits_done: "[Привычка А]" }),
  md("life/activities/Дело А.md", { title: "Дело А", type: "activity", theme: "Business & career", status: "done" },
    "## Шаги\n- [x] шаг — ты\n  ✓ 2030-01-06\n\n## Журнал\n- 2030-01-05 · запись\n- 2030-01-05 · вторая запись того же дня\n- 2030-01-20 · после окна\n"),
  md("life/activities/Файл Б.md", { title: "Дело Б", type: "activity", theme: "Social & friends", status: "active" }, "## Сейчас\n- шаг\n"),
  event("2030-01-07 Игра", { title: "Игра", date: "2030-01-07", theme: "Health & sport" }),
  event("2030-01-08 Поездка", { title: "Поездка", date: "2030-01-08" }),
];

test("themeDays: «да»/«поздно» on a good habit or prayer, activity moves, events; a held bad habit is not attention", () => {
  const d = themeDays(buildLife(FILES), "2030-01-02", "2030-01-08");
  const got = Object.fromEntries([...d].map(([t, s]) => [t, [...s].sort()]));
  assert.deepEqual(got, {
    "Spirituality & Religion": ["2030-01-02"], // late counts, failed does not
    "Social & friends": ["2030-01-04"], // a session under the file name of an activity whose title differs
    "Personal growth": ["2030-01-02"],
    "Health & sport": ["2030-01-07"], // the event; «Плохая Б» held twice and counted never
    "Finance & money": [],
    "Family & relationship": ["2030-01-04"], // an archived habit's «да» was attention that day
    "Business & career": ["2030-01-05", "2030-01-06"], // two journal lines on one day are one day; the ✓ step; a done activity too
    "Memories & Fun": ["2030-01-08"], // an event without a theme
  });
  assert.equal(eventTheme(buildLife(FILES).events.find((e) => e.title === "Поездка")!), "Memories & Fun");
  // "" is the start of history
  assert.deepEqual([...themeDays(buildLife(FILES), "", "2030-01-08").get("Personal growth")!].sort(), ["2029-12-31", "2030-01-02"]);
});

test("themeDays: an event with no parseable date adds no day, even from the start of history", () => {
  const life = buildLife([event("Без даты", { title: "Без даты", theme: "Health & sport" })]); // no `date:`, no date in the folder name
  assert.equal(life.events[0].date, "");
  assert.deepEqual([...themeDays(life, "", "2030-01-08").get("Health & sport")!], []);
  assert.deepEqual(attentionShares(life, "", "2030-01-08").map((s) => s.days), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("attentionShares: whole percents that add up to 100 by the largest remainder, THEMES order", () => {
  const sh = attentionShares(buildLife(FILES), "2030-01-02", "2030-01-08");
  // eight days in all, 12.5 % each: the three leftover points go to the first themes with a half; «Бизнес» has two days, 25 %
  assert.deepEqual(sh.map((s) => [s.days, s.share]), [[1, 13], [1, 13], [1, 13], [1, 12], [0, 0], [1, 12], [2, 25], [1, 12]]);
  assert.equal(sh.reduce((a, s) => a + s.share, 0), 100);
  assert.deepEqual(attentionShares(buildLife([]), "2030-01-02", "2030-01-08").map((s) => s.share), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("dayFiles counts the day files in the window", () => {
  assert.equal(dayFiles(buildLife(FILES), "2030-01-02", "2030-01-08"), 3);
  assert.equal(dayFiles(buildLife(FILES), "2030-01-05", "2030-01-08"), 0);
});
