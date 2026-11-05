import assert from "node:assert/strict";
import { test } from "node:test";
import { activities, cell, dateRange, defaultTab, focusFor, goalView, plainStep, series, signals, spheres, waiting, weekCompare, weekOf, weekStory, weightNow, weightPace, windowStats, yesterdayView } from "./dashboard";
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

test("weightPace: a loss target already passed counts as reached", () => {
  // 77 → 76 → 75 → 74.8, target 75: the direction comes from where the window began, not from the side the last weight is on
  const life = buildLife([
    day("2031-03-01", { weight: "77" }), day("2031-03-05", { weight: "76" }),
    day("2031-03-09", { weight: "75" }), day("2031-03-12", { weight: "74.8" }),
  ]);
  assert.equal(weightPace(life, "2031-03-13", 75, "2031-04-12"), "ontrack");
  assert.equal(weightPace(life, "2031-03-10", 75, "2031-04-12"), "ontrack"); // landed exactly on it
});

test("weightPace: a gain target reads the same way, passed or still ahead", () => {
  // 55 → 56 → 57 → 57.4, about +0.22 per day: near 64 by the deadline
  const life = buildLife([
    day("2031-05-01", { weight: "55" }), day("2031-05-05", { weight: "56" }),
    day("2031-05-09", { weight: "57" }), day("2031-05-12", { weight: "57.4" }),
  ]);
  assert.equal(weightPace(life, "2031-05-13", 57, "2031-06-12"), "ontrack"); // passed
  assert.equal(weightPace(life, "2031-05-13", 60, "2031-06-12"), "ontrack"); // ahead, the trend gets there
  assert.equal(weightPace(life, "2031-05-13", 70, "2031-06-12"), "behind"); // ahead, the trend does not
});

const act = (file: string, cadence: string, body: string, extra: Record<string, string> = {}) =>
  md(`life/activities/${file}.md`, { title: file, type: "activity", theme: "Business & career", status: "active", cadence, ...extra }, body);
const ACTS = [
  act("А движется", "каждый день", "## Сейчас\n- шаг\n\n## Журнал\n- 2030-01-08 · запись\n"),
  act("Б стоит", "каждый день", "## Журнал\n- 2030-01-07 · запись\n"),
  act("В раз в неделю", "раз в неделю", "## Журнал\n- 2030-01-01 · запись\n"),
  act("Г просрочена", "раз в неделю", "## Журнал\n- 2030-01-09 · запись\n", { due: "2030-01-09" }),
  act("Д пустая", "каждый день", "## Сейчас\n- начать\n"),
  act("Е шаг", "каждый день", "## Шаги\n- [x] сделано — ты\n  ✓ 2030-01-09\n"),
];
const goalsFile = (key: string, fm: string, body: string): MdFile => ({ rel: `life/goals/${key}.md`, mtime: 0, content: `---\ntype: goals\n${fm}\n---\n${body}` });

test("activities: overdue, empty, idle by cadence, moving; worst first", () => {
  const list = activities(buildLife(ACTS), "2030-01-10");
  assert.deepEqual(Object.fromEntries(list.map((a) => [a.quest.title, [a.state, a.idle]])), {
    "А движется": ["moving", 2], "Б стоит": ["idle", 3], "В раз в неделю": ["moving", 9],
    "Г просрочена": ["overdue", 1], "Д пустая": ["empty", undefined], "Е шаг": ["moving", 1],
  });
  assert.equal(list[0].quest.title, "Г просрочена");
  assert.equal(list.find((a) => a.quest.title === "А движется")!.now, "шаг");
});

test("goalView: hot, done, no data, weight pace, placeholder", () => {
  const life = buildLife(WEIGHTS);
  assert.equal(goalView("**Оплаты** · мера: оплаты · сейчас: 0 · срок: 2030-01-23", life, "2030-01-21").chip, "hot");
  assert.equal(goalView("**Сайт** · мера: запущен · ✓ 2030-01-05", life, "2030-01-21").chip, "done");
  assert.equal(goalView("**Оплаты** · мера: оплаты · сейчас: —", life, "2030-01-21").chip, "nodata");
  assert.equal(goalView("**Сайт** · мера: запущен · сейчас: да", life, "2030-01-21").chip, undefined);
  const w = goalView("**70 кг к 1 мая** · мера: вес · срок: 2030-05-01", life, "2030-01-21");
  assert.equal(w.chip, "ontrack");
  assert.equal(w.now, "78 кг (2030-01-20)");
  assert.equal(goalView("*(третья — словами)*", life, "2030-01-21").placeholder, true);
});

test("signals: dates first, then late meals, good habits, what stands — at most four", () => {
  const life = buildLife([
    ...HABITS, ...DAYS, ...ACTS,
    goalsFile("2030-W01", "period: week", "## Цели\n- **Оплаты** · мера: оплаты · сейчас: 0 · срок: 2030-01-04\n"),
    goalsFile("2030-01", "period: month", "## Цели\n- **Оплаты месяца** · мера: оплаты · сейчас: 0 · срок: 2030-01-04\n"),
  ]);
  const s = signals(life, "2030-01-03");
  assert.deepEqual(s.map((x) => x.level), ["red", "red", "gold", "gold"]);
  assert.equal(s[0].title, "Срок завтра — Оплаты месяца"); // one signal per date, the month's wording
  assert.match(s[1].title, /^Еда после 21:00 — 1 раз/);
  assert.match(s[2].title, /^Полезные привычки — 1 из 4/);
  assert.match(s[3].title, /^Не движутся 5 из 6/); // on 2030-01-03 only «В раз в неделю» has a move (01-01)
});

test("focusFor falls back to the previous period and marks it stale", () => {
  const life = buildLife([goalsFile("2030-W01", "period: week", "## Цели\n- x\n\n## Фокус\n1. Строка\n\n_Claude, 2029-12-29_\n")]);
  assert.deepEqual(focusFor(life, "2030-W02", "2030-W01"), { key: "2030-W02", lines: ["Строка"], on: "2029-12-29", stale: true });
  assert.equal(focusFor(life, "2030-W01", "2029-W52").stale, false);
});

test("waiting reads the list under «## Ждёт», links as text", () => {
  const life = buildLife([{ rel: "life/now.md", mtime: 0, content: "---\ntype: now\n---\n## Ждёт тебя\n- Снять [[Ролик|ролик]]\n- Позвонить\n\n## Последнее\n- не это\n" }]);
  assert.deepEqual(waiting(life), ["Снять ролик", "Позвонить"]);
});

test("plainStep: a «## Сейчас» line in plain words; «— ты» goes, «— Claude» stays", () => {
  assert.equal(plainStep("2030-01-05 Первый шаг"), "Первый шаг"); // the leading date
  assert.equal(plainStep("2030-01-05 · Первый шаг"), "Первый шаг"); // …and a separator after it
  assert.equal(plainStep("Открыть [[Страница|страницу]] и [[Другая]]"), "Открыть страницу и Другая"); // wikilink: alias, else target
  assert.equal(plainStep("Прочитать [текст](https://example.com/a_(b)) до конца"), "Прочитать текст до конца"); // markdown link, parentheses in the url
  assert.equal(plainStep("Запустить `build` и `test`"), "Запустить build и test"); // backticks
  assert.equal(plainStep("Первый шаг — ты"), "Первый шаг"); // the reader is the owner
  assert.equal(plainStep("Первый шаг — Claude"), "Первый шаг — Claude"); // who does it stays
  assert.equal(plainStep("Первый шаг — ты и Claude"), "Первый шаг — ты и Claude");
  assert.equal(plainStep("Срок 2030-01-05 близко, ты знаешь"), "Срок 2030-01-05 близко, ты знаешь"); // a date or «ты» inside the line stays
  assert.equal(plainStep("2030-01-05 Открыть [[Страница|страницу]], [текст](https://example.com) и `код` — ты"), "Открыть страницу, текст и код"); // all at once
});

test("yesterdayView names the marks and the evening thoughts", () => {
  const y = yesterdayView(buildLife([...HABITS, ...DAYS]), "2030-01-02");
  assert.deepEqual(y.prayer, { done: ["Фаджр"], late: [], failed: [] });
  assert.deepEqual([y.falls, y.goodDone, y.goodMissed, y.reflections], [[], ["Выпить 2 литра воды"], ["Прогулка"], ["Благодарен: семье"]]);
});

test("cell: skip by weekday, future, pending today, held and fall for bad habits", () => {
  const life = buildLife([...HABITS, ...DAYS]);
  const h = (t: string) => life.habits.find((x) => x.title === t)!;
  assert.equal(cell(life, h("Жума"), "2030-01-01", "2030-01-03"), "skip");
  assert.equal(cell(life, h("Фаджр"), "2030-01-05", "2030-01-03"), "future");
  assert.equal(cell(life, h("Фаджр"), "2030-01-03", "2030-01-03"), "pending");
  assert.equal(cell(life, h("Сладкое"), "2030-01-01", "2030-01-03"), "held");
  assert.equal(cell(life, h("Сладкое"), "2030-01-02", "2030-01-03"), "fall");
  assert.equal(cell(life, h("Фаджр"), "2030-01-02", "2030-01-03"), "late");
  assert.equal(cell(life, h("Фаджр"), "2029-12-30", "2030-01-03"), "nofile");
  assert.equal(cell(life, h("Фаджр"), "2029-12-31", "2030-01-03"), "unmarked");
});

test("weekCompare: a Monday shows the week that ended; other days the week up to yesterday", () => {
  const life = buildLife([...HABITS, ...DAYS]);
  const mon = weekCompare(life, "2030-01-07");
  assert.deepEqual([mon.from, mon.to, mon.cur.to, mon.prev.from, mon.prev.to], ["2029-12-31", "2030-01-06", "2030-01-06", "2029-12-24", "2029-12-30"]);
  assert.equal(mon.cur.recorded, 2);
  const thu = weekCompare(life, "2030-01-03");
  assert.deepEqual([thu.cur.from, thu.cur.to], ["2029-12-31", "2030-01-02"]);
});

test("series: one point per day, stats only where a file is", () => {
  const pts = series(buildLife([...HABITS, ...DAYS]), "2029-12-30", "2030-01-02");
  assert.deepEqual(pts.map((p) => [p.date, p.stats?.recorded ?? null]), [["2029-12-30", null], ["2029-12-31", 0], ["2030-01-01", 1], ["2030-01-02", 1]]);
});

test("weekStory gathers done and the evening thoughts", () => {
  const st = weekStory(buildLife([...HABITS, ...DAYS]), "2029-12-31", "2030-01-06");
  assert.deepEqual(st.done, [{ date: "2029-12-31", items: ["без отметок"] }]);
  assert.deepEqual(st.thoughts, [{ date: "2030-01-01", line: "Благодарен: семье" }]);
});

test("spheres: eight themes, the worst activity state, none without activities", () => {
  const sp = spheres(buildLife([...HABITS, ...DAYS, ...ACTS]), [], "2030-01-10");
  assert.equal(sp.length, 8);
  assert.equal(sp.find((s) => s.theme === "Business & career")!.state, "overdue");
  assert.equal(sp.find((s) => s.theme === "Personal growth")!.state, "none");
  // two marked days in the 30; no weight, and no meal rows in the last 7 days
  assert.equal(sp.find((s) => s.theme === "Spirituality & Religion")!.fact, "намаз за 30 дней: 1 вовремя, 1 поздно, 0 пропущено, 0 без отметки");
  assert.equal(sp.find((s) => s.theme === "Health & sport")!.fact, "веса нет · записей еды нет");
});

test("spheres: the prayer and meal facts say how much was recorded", () => {
  const fact = (files: MdFile[], theme: string) => spheres(buildLife(files), [], "2030-01-10").find((s) => s.theme === theme)!.fact;
  // a due prayer with no mark on a marked day is «без отметки», not «пропущено»
  assert.equal(fact([...HABITS, ...DAYS, day("2030-01-03", { habits_done: "[Прогулка]" })], "Spirituality & Religion"), "намаз за 30 дней: 1 вовремя, 1 поздно, 0 пропущено, 1 без отметки");
  // no marked day in the window: no counts, not zeros
  assert.equal(fact(HABITS, "Spirituality & Religion"), "намаз за 30 дней: нет отметок");
  // the weight is current through today; the meals say on how many of the 7 days they were written
  const meal = "## Еда\n| Время | Что | Заметка |\n|---|---|---|\n| 22:15 | чай |  |\n";
  assert.equal(fact([...HABITS, day("2030-01-05", { weight: "80" }, meal), day("2030-01-10", { weight: "79" })], "Health & sport"), "вес 79 кг (2030-01-10) · еда после 21:00 за неделю: 1 (записи за 1 из 7 дн.)");
});
