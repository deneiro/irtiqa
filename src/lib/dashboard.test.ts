import assert from "node:assert/strict";
import { test } from "node:test";
import { dateRange, defaultTab, weekOf, weightNow, weightPace, windowStats } from "./dashboard";
import { parseGoalLine, parseGoals } from "./goals";
import { buildLife } from "./life";
import type { MdFile } from "./types";

test("parseGoals reads Claude's focus and its date", () => {
  const f = parseGoals("2030-W01", "---\ntype: goals\nperiod: week\n---\n## Цели\n- **Цель** · мера: раз\n\n## Фокус\n1. Первое — потому что 3 дня\n2. Второе\n\n_Claude, 2030-01-05_\n");
  assert.deepEqual(f.focus, ["Первое — потому что 3 дня", "Второе"]);
  assert.equal(f.focusOn, "2030-01-05");
  assert.deepEqual(parseGoals("2030-W02", "## Цели\n- x\n").focus, []);
});

test("parseGoalLine splits the parts and cuts the pointer", () => {
  assert.deepEqual(parseGoalLine("**Цель с датой** · мера: оплаты · сейчас: 0 · срок: 2030-11-06 · → [[2030-11]] (выше)"), {
    title: "Цель с датой", measure: "оплаты", now: "0", due: "2030-11-06", doneOn: undefined,
  });
  assert.equal(parseGoalLine("**Сайт запущен** · мера: запущен · ✓ 2030-01-05").doneOn, "2030-01-05");
  assert.equal(parseGoalLine("*(третья — словами или пусто)*").title, "(третья — словами или пусто)");
});

test("parseGoalLine leaves no separator behind where the pointer was cut", () => {
  const f = parseGoals("2030-11", "## Цели\n- **Цель** · мера: раз · сейчас: 3 · → [[2030]] (выше). Пояснение.\n- **Другая** · мера: шт · → [[2030]]\n- **Третья** · → [[2030]]\n");
  assert.deepEqual(f.goals.map(parseGoalLine).map((g) => [g.title, g.measure, g.now]), [
    ["Цель", "раз", "3"], ["Другая", "шт", undefined], ["Третья", undefined, undefined],
  ]);
});

test("a reached goal keeps its ✓ date whether it stands after the pointer or before it", () => {
  const f = parseGoals("2030-11", [
    "## Цели",
    "- **Первая** · мера: раз · сейчас: 3 · → [[2030]] ✓ 2030-01-05",
    "- **Вторая** · мера: шт · → [[2030]] (выше) ✓ 2030-01-05",
    "- **Третья** · мера: раз · ✓ 2030-01-05 · → [[2030]]",
    "",
  ].join("\n"));
  const lines = f.goals.map(parseGoalLine);
  assert.deepEqual(lines.map((g) => g.doneOn), ["2030-01-05", "2030-01-05", "2030-01-05"]);
  assert.deepEqual(lines.map((g) => g.title), ["Первая", "Вторая", "Третья"]);
  // the mark is a part of its own: it does not leak into the field before it
  assert.deepEqual(lines.map((g) => [g.measure, g.now]), [["раз", "3"], ["шт", undefined], ["раз", undefined]]);
});

const md = (rel: string, fm: Record<string, string>, body = ""): MdFile =>
  ({ rel, mtime: 0, content: `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${body}` });
const habit = (file: string, kind: string, extra: Record<string, string> = {}) =>
  md(`life/habits/${file}.md`, { title: file, type: "habit", kind, freq: "daily", status: "active", created: "2029-12-01", ...extra });
const day = (date: string, fm: Record<string, string>, body = "") => md(`life/days/${date}.md`, { date, type: "day", ...fm }, body);

// 2030-01-01 is a Tuesday. «Вода» has its own title; «Растяжка» is archived and must not count.
const HABITS = [
  habit("Фаджр", "prayer"),
  habit("Жума", "prayer", { freq: "[пт]" }),
  habit("Сладкое", "bad"),
  habit("Вода", "good", { title: "Выпить 2 литра воды" }),
  habit("Прогулка", "good"),
  habit("Растяжка", "good", { status: "archived" }),
];
const DAYS = [
  day("2029-12-31", {}, "## Сделано\n- без отметок\n"),
  day("2030-01-01", { habits_done: '[Фаджр, "Выпить 2 литра воды", Сладкое]', habits_failed: "[Прогулка, Растяжка]", mood: "6" },
    "## Задачи\n- [x] Первая\n- [ ] Вторая\n\n## Еда\n| Время | Что | Заметка |\n|---|---|---|\n| 21:30 | ужин |  |\n\n## Журнал\n- Благодарен: семье\n"),
  day("2030-01-02", { habits_late: "[Фаджр]", habits_failed: '[Сладкое, Прогулка, "Выпить 2 литра воды"]', stress: "4" },
    "## Деньги\n| Сумма | Категория | Счёт | Заметка |\n|---|---|---|---|\n| -1000 | такси | Нал |  |\n"),
];
const WEIGHTS = [day("2030-01-01", { weight: "80" }), day("2030-01-10", { weight: "79" }), day("2030-01-20", { weight: "78" })];

test("defaultTab: the 1st beats Sunday, Sunday opens the week", () => {
  assert.equal(defaultTab("2030-09-01"), "month"); // a Sunday
  assert.equal(defaultTab("2030-01-06"), "week");
  assert.equal(defaultTab("2030-01-04"), "day");
});

test("weekOf and dateRange", () => {
  assert.deepEqual(weekOf("2030-01-04"), { from: "2029-12-31", to: "2030-01-06" });
  assert.deepEqual(weekOf("2030-01-06"), { from: "2029-12-31", to: "2030-01-06" });
  assert.deepEqual(dateRange("2029-12-30", "2030-01-01"), ["2029-12-30", "2029-12-31", "2030-01-01"]);
});

test("windowStats counts by title, skips archived habits and days without marks", () => {
  const s = windowStats(buildLife([...HABITS, ...DAYS]), "2029-12-31", "2030-01-03");
  assert.deepEqual(s.coverage, [false, true, true, false]);
  assert.equal(s.recorded, 2);
  assert.deepEqual(s.prayer, { due: 2, done: 1, late: 1, failed: 0, unmarked: 0 });
  assert.equal(s.falls, 1);
  assert.equal(s.held, 1);
  assert.deepEqual(s.fallsBy, [["Сладкое", 1]]);
  assert.deepEqual(s.good, { done: 1, total: 4, missedBy: [["Прогулка", 2], ["Выпить 2 литра воды", 1]] });
  assert.deepEqual(s.mood, { avg: 6, n: 1 });
  assert.deepEqual(s.stress, { avg: 4, n: 1 });
  assert.deepEqual(s.money, { spent: 1000, earned: 0, days: 1 });
  assert.deepEqual(s.tasks, { done: 1, total: 2, days: 1 });
  assert.equal(s.lateMeals, 1);
  assert.equal(s.mealDays, 1);
});

test("weightNow and weightPace follow the 21-day trend", () => {
  const life = buildLife(WEIGHTS);
  assert.deepEqual(weightNow(life, "2030-01-21"), { last: { date: "2030-01-20", value: 78 }, before: { date: "2030-01-10", value: 79 } });
  assert.equal(weightPace(life, "2030-01-21", 75, "2030-02-20"), "ontrack"); // −0.105 kg/day reaches about 74.7
  assert.equal(weightPace(life, "2030-01-21", 70, "2030-02-20"), "behind");
  assert.equal(weightPace(life, "2030-03-01", 75, "2030-04-01"), "nodata");
});
