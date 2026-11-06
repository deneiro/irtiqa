import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPrompt } from "./claude";
import { actName, activities, cell, dateRange, dayMonthList, defaultTab, fmt, focusFor, goalTarget, goalView, offWeekday, plainStep, questUrl, runs, series, signals, spheres, waiting, weekCompare, weekOf, weekStory, weightNow, weightPace, windowStats, yesterdayView } from "./dashboard";
import { addDays, weekdayIndex } from "./dates";
import { focusWeekKey, isoWeekKey, parseGoalLine, parseGoals } from "./goals";
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
  assert.deepEqual(s.lateDates, ["2030-01-01"]);
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
  // an activity due within 3 days: its «## Сейчас» step reaches the signal as plain words — no date, no wikilink, no «— ты»
  const soon = buildLife([act("Ж срок", "каждый день", "## Сейчас\n- 2030-01-03 Открыть [[Страница|страницу]] — ты\n", { due: "2030-01-05" })]);
  assert.equal(signals(soon, "2030-01-03")[0].fact, "Открыть страницу");
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

// ---- final review fixes ----

test("yesterdayView: recorded is true only for a day file with a habit mark", () => {
  const life = buildLife([...HABITS, ...DAYS]);
  const quiet = yesterdayView(life, "2030-01-01"); // 2029-12-31 is a file with no mark: falls and good habits are unknown, not empty
  assert.equal(quiet.recorded, false);
  assert.ok(quiet.day);
  assert.equal(yesterdayView(life, "2030-01-02").recorded, true); // 2030-01-01 carries marks
  const none = yesterdayView(life, "2030-01-05"); // no file at all
  assert.deepEqual([none.recorded, none.day], [false, undefined]);
});

test("signals: two goals on one date in one file are two signals, the nearest date first; the cascade still merges", () => {
  const one = buildLife([goalsFile("2030-01", "period: month", [
    "## Цели",
    "- **Поздняя** · мера: шт · сейчас: 0 · срок: 2030-01-05",
    "- **Первая** · мера: шт · сейчас: 0 · срок: 2030-01-04",
    "- **Вторая** · мера: шт · сейчас: 0 · срок: 2030-01-04",
    "",
  ].join("\n"))]);
  assert.deepEqual(signals(one, "2030-01-03").map((x) => [x.level, x.title]), [
    ["red", "Срок завтра — Первая"], ["red", "Срок завтра — Вторая"], ["red", "Срок через 2 дня — Поздняя"],
  ]);
  // the week repeats the month's date: the same goal, the month's wording; the week's own other date stays
  const two = buildLife([
    goalsFile("2030-01", "period: month", "## Цели\n- **Месяц** · мера: шт · сейчас: 0 · срок: 2030-01-04\n"),
    goalsFile("2030-W01", "period: week", "## Цели\n- **Неделя** · мера: шт · сейчас: 0 · срок: 2030-01-04\n- **Ещё** · мера: шт · сейчас: 0 · срок: 2030-01-05\n"),
  ]);
  assert.deepEqual(signals(two, "2030-01-03").map((x) => x.title), ["Срок завтра — Месяц", "Срок через 2 дня — Ещё"]);
});

test("focusWeekKey: a Sunday names the next ISO week, any other day this one — as scripts/focus.sh does", () => {
  assert.equal(focusWeekKey("2026-12-27"), "2026-W53"); // Sunday; the Monday after is 2026-12-28
  assert.equal(focusWeekKey("2027-01-03"), "2027-W01"); // Sunday, itself still in ISO week 53 of 2026
  assert.equal(isoWeekKey("2027-01-03"), "2026-W53");
  assert.equal(focusWeekKey("2027-01-04"), "2027-W01"); // Monday
  assert.equal(focusWeekKey("2026-11-07"), "2026-W45"); // Saturday
  // «Неделя» takes the week before the focus week as the same rule seven days back; it equals the week before the focus week on every day
  for (let d = "2026-12-14", i = 0; i < 60; d = addDays(d, 1), i++) {
    const base = weekdayIndex(d) === 0 ? addDays(d, 1) : d;
    assert.equal(focusWeekKey(addDays(d, -7)), isoWeekKey(addDays(base, -7)), d);
  }
});

test("the Focus button's prompt names the file focusWeekKey and monthKey give", () => {
  const target = (arg: string, today: string) => buildPrompt("focus", arg, today).prompt.match(/Target file: life\/goals\/([^.]+)\.md/)![1];
  assert.equal(target("week", "2026-12-27"), "2026-W53");
  assert.equal(target("week", "2027-01-03"), "2027-W01");
  assert.equal(target("week", "2026-11-07"), "2026-W45");
  assert.equal(target("month", "2026-11-07"), "2026-11");
});

test("activities: a session written under the file name moves an activity whose title differs", () => {
  const life = buildLife([
    act("Файл", "каждый день", "## Сейчас\n- шаг\n", { title: "Другое название" }),
    day("2030-01-09", { sessions: '["Файл: 30"]' }),
  ]);
  const [a] = activities(life, "2030-01-10");
  assert.deepEqual([a.quest.title, a.state, a.last, a.idle], ["Другое название", "moving", "2030-01-09", 1]);
  // a session under the title still counts, one under another name does not
  const byTitle = buildLife([act("Файл", "каждый день", "", { title: "Другое название" }), day("2030-01-09", { sessions: '["Другое название: 30"]' })]);
  assert.equal(activities(byTitle, "2030-01-10")[0].state, "moving");
  const other = buildLife([act("Файл", "каждый день", "", { title: "Другое название" }), day("2030-01-09", { sessions: '["Чужое: 30"]' })]);
  assert.equal(activities(other, "2030-01-10")[0].state, "empty");
});

test("goalView: the title, the measure and «сейчас» reach the signal and the row as plain words", () => {
  const line = "**Открыть [[Страница|страницу]]** · мера: [[Меры|оплаты]] · сейчас: 2 из [[Всего|пяти]] · срок: 2030-01-04";
  const life = buildLife([goalsFile("2030-01", "period: month", `## Цели\n- ${line}\n`)]);
  const g = goalView(line, life, "2030-01-03");
  assert.deepEqual([g.line.title, g.line.measure, g.now], ["Открыть страницу", "оплаты", "2 из пяти"]);
  const [sig] = signals(life, "2030-01-03");
  assert.equal(sig.title, "Срок завтра — Открыть страницу");
  assert.equal(sig.fact, "сейчас: 2 из пяти · мера: оплаты");
  assert.ok(!(sig.title + sig.fact).includes("[["));
});

test("goalView: «сейчас: -2» is a value, a lone dash or «нет данных» is not", () => {
  const life = buildLife([]);
  const at = (now: string) => goalView(`**Баланс** · мера: шт · сейчас: ${now}`, life, "2030-01-03");
  assert.deepEqual([at("-2").now, at("-2").chip], ["-2", undefined]);
  assert.deepEqual([at("-").now, at("-").chip], [undefined, "nodata"]);
  assert.deepEqual([at("— пока").now, at("— пока").chip], [undefined, "nodata"]);
  assert.deepEqual([at("нет данных").now, at("нет данных").chip], [undefined, "nodata"]);
  assert.equal(at("—3").now, "—3");
});

test("weekCompare: the week's weight is read through today; a Monday keeps the week that ended", () => {
  const life = buildLife([day("2029-12-27", { weight: "81" }), day("2030-01-01", { weight: "80" }), day("2030-01-03", { weight: "79" }), day("2030-01-07", { weight: "78" })]);
  const thu = weekCompare(life, "2030-01-03"); // today's own weight is the week's last
  assert.deepEqual([thu.curWeight, thu.prevWeight], [{ date: "2030-01-03", value: 79 }, { date: "2029-12-27", value: 81 }]);
  const mon = weekCompare(life, "2030-01-07"); // the week on screen ended yesterday; Monday's weight belongs to the next one
  assert.deepEqual([mon.from, mon.to, mon.curWeight], ["2029-12-31", "2030-01-06", { date: "2030-01-03", value: 79 }]);
  assert.equal(weekCompare(buildLife([]), "2030-01-03").curWeight, undefined);
});

test("spheres: the «Бизнес» fact counts today's income, on the 1st too", () => {
  const money = "## Деньги\n| Сумма | Категория | Счёт | Заметка |\n|---|---|---|---|\n| 5000 | доход | Нал |  |\n";
  const business = (files: MdFile[], today: string) => spheres(buildLife(files), [], today).find((s) => s.theme === "Business & career")!.fact;
  assert.equal(business([day("2030-01-10", {}, money)], "2030-01-10"), `доход за месяц: ${fmt(5000)} ₸`);
  assert.equal(business([day("2030-01-09", {}, money)], "2030-01-10"), `доход за месяц: ${fmt(5000)} ₸`);
  assert.equal(business([day("2030-02-01", {}, money)], "2030-02-01"), `доход за месяц: ${fmt(5000)} ₸`); // yesterday is last month
  assert.equal(business([day("2030-01-31", {}, money)], "2030-02-01"), "доход за месяц не записан");
  // the goal row reads the same window
  assert.equal(goalView("**Доход** · мера: доход", buildLife([day("2030-01-10", {}, money)]), "2030-01-10").now, `${fmt(5000)} ₸ за месяц`);
});

test("parseGoals reads «1)» numbering and an unsigned focus; focusFor marks it as the previous period's", () => {
  const body = "## Цели\n- x\n\n## Фокус\n1) Первое\n2) Второе\n";
  const f = parseGoals("2030-W02", `---\ntype: goals\nperiod: week\n---\n${body}`);
  assert.deepEqual(f.focus, ["Первое", "Второе"]);
  assert.equal(f.focusOn, undefined);
  const life = buildLife([goalsFile("2030-W02", "period: week", body)]);
  assert.deepEqual(focusFor(life, "2030-W03", "2030-W02"), { key: "2030-W03", lines: ["Первое", "Второе"], on: undefined, stale: true });
  assert.equal(focusFor(life, "2030-W02", "2030-W01").stale, false);
});

// ---- audit 2026-11-06: «Главный» ----

test("signals: each kind opens what it is about", () => {
  const life = buildLife([
    ...HABITS, ...DAYS, ...ACTS,
    goalsFile("2030-W01", "period: week", "## Цели\n- **Оплаты** · мера: оплаты · сейчас: 0 · срок: 2030-01-04\n"),
    goalsFile("2030-01", "period: month", "## Цели\n- **Оплаты месяца** · мера: оплаты · сейчас: 0 · срок: 2030-01-04\n"),
  ]);
  const s = signals(life, "2030-01-03");
  assert.deepEqual(s.map((x) => x.to), [
    "/?tab=month", // no activity moves «Оплаты месяца»: the tab that shows the month's file
    "/theme/Health%20%26%20sport/nutrition", // late meals: the food of 14 days, each day under its date
    "/habits",
    questUrl("life/activities/А движется.md"), // the first the «Не движутся» fact names
  ]);
  // an activity's own date opens that activity
  const soon = buildLife([act("Ж срок", "каждый день", "## Сейчас\n- шаг\n", { due: "2030-01-05" })]);
  assert.equal(signals(soon, "2030-01-03")[0].to, questUrl("life/activities/Ж срок.md"));
});

test("goalTarget: the activity whose goal names the file and the goal, then one named in the goal, else the goals tab", () => {
  const goal = (text: string) => goalView(text, buildLife([]), "2030-01-03").line;
  const acts = activities(buildLife([
    act("Уроки", "каждый день", "", { project: "Проект В" }),
    act("Реклама", "каждый день", "", { goal: '"[[2030-01]] · 10 оплат"' }),
    act("Сайт", "каждый день", "", { goal: '"[[2030]] · 10 оплат"' }),
  ]), "2030-01-03");
  const url = (file: string) => questUrl(`life/activities/${file}.md`);
  // 1. `goal:` names this file and the goal's measure (or title) — even when another activity is named in the title
  assert.equal(goalTarget("2030-01", goal("**Первые деньги с Проект В** · мера: 10 оплат · срок: 2030-01-04"), acts), url("Реклама"));
  // …as whole words: a part of a word is not a name
  assert.equal(goalTarget("2030-01", goal("**Другое** · мера: опл · срок: 2030-01-04"), acts), "/?tab=month");
  // …the same words under another file's link do not count
  assert.equal(goalTarget("2030-W01", goal("**Первые деньги с Проект В** · мера: 10 оплат · срок: 2030-01-04"), acts), url("Уроки"));
  // 2. the project (or the title) stands in the goal's title, in any case, as a word of its own
  assert.equal(goalTarget("2030-01", goal("**Первые деньги с проект в** · мера: оплаты · срок: 2030-01-04"), acts), url("Уроки"));
  assert.equal(goalTarget("2030-01", goal("**Сайт запущен** · мера: да · срок: 2030-01-04"), acts), url("Сайт"));
  assert.equal(goalTarget("2030-01", goal("**Проект Вега** · мера: шт · срок: 2030-01-04"), acts), "/?tab=month");
  // 3. nothing moves it: the tab that shows the file
  assert.equal(goalTarget("2030-W01", goal("**Другое** · мера: шт · срок: 2030-01-04"), acts), "/?tab=week");
  assert.equal(goalTarget("2030", goal("**Другое** · мера: шт · срок: 2030-01-04"), acts), "/?tab=month");
});

test("signals: late meals name their days, each once; a day with two counts twice", () => {
  const meals = (...times: string[]) => `## Еда\n| Время | Что | Заметка |\n|---|---|---|\n${times.map((t) => `| ${t} | еда |  |`).join("\n")}\n`;
  const life = buildLife([
    day("2030-01-03", {}, meals("21:10", "22:40")), day("2030-01-04", {}, meals("13:00")), day("2030-01-05", {}, meals("21:30")),
    day("2030-01-08", {}, meals("23:00")), // today: not in the 7 days before it
  ]);
  const [sig] = signals(life, "2030-01-08");
  assert.equal(sig.title, "Еда после 21:00 — 3 раза за 7 дней");
  assert.equal(sig.fact, "3 и 5 января · записи еды за 3 дня");
});

test("dayMonthList: the month once per run, «и» before the last", () => {
  assert.equal(dayMonthList([]), "");
  assert.equal(dayMonthList(["2030-01-02"]), "2 января");
  assert.equal(dayMonthList(["2030-01-03", "2030-01-05"]), "3 и 5 января");
  assert.equal(dayMonthList(["2029-12-30", "2029-12-31", "2030-01-02"]), "30, 31 декабря и 2 января");
});

test("actName: the project names the activity, the title goes under it; without a project nothing changes", () => {
  const life = buildLife([
    act("Уроки для Проект В", "каждый день", "", { project: "Проект В" }),
    act("Проект Г", "каждый день", "", { project: "[[Проект Г]]" }),
    act("Своё", "каждый день", ""),
  ]);
  const by = (title: string) => actName(life.quests.find((q) => q.title === title)!);
  assert.deepEqual(by("Уроки для Проект В"), { name: "Проект В", sub: "Уроки для Проект В" });
  assert.deepEqual(by("Проект Г"), { name: "Проект Г", sub: undefined }); // the same words twice say nothing more
  assert.deepEqual(by("Своё"), { name: "Своё", sub: undefined });
  // the signals list activities by that name too
  const s = signals(buildLife([act("Уроки для Проект В", "каждый день", "", { project: "Проект В", due: "2030-01-04" })]), "2030-01-03");
  assert.deepEqual(s.map((x) => x.title), ["Срок завтра — Проект В", "Не движутся 1 из 1 деятельности"]);
  assert.equal(s[1].fact, "записей нет: Проект В");
});

test("offWeekday: a habit of some weekdays is off on the others; daily and weekly never are", () => {
  // 2030-01-07 is a Monday, 2030-01-08 a Tuesday
  const life = buildLife([habit("Привычка Б", "good", { freq: "[пн, чт]" }), habit("Привычка В", "good"), habit("Привычка Г", "good", { freq: "weekly" })]);
  const h = (t: string) => life.habits.find((x) => x.title === t)!;
  assert.equal(offWeekday(h("Привычка Б"), "2030-01-07"), false);
  assert.equal(offWeekday(h("Привычка Б"), "2030-01-08"), true);
  assert.equal(offWeekday(h("Привычка В"), "2030-01-08"), false);
  assert.equal(offWeekday(h("Привычка Г"), "2030-01-08"), false);
});

test("runs: days in a row with a value make one line; a day without breaks it, and is never 0", () => {
  assert.deepEqual(runs([5, undefined, 3, 4, undefined, undefined, 6]), [[[0, 5]], [[2, 3], [3, 4]], [[6, 6]]]);
  assert.deepEqual(runs([undefined, undefined]), []);
  assert.deepEqual(runs([1, 1]), [[[0, 1], [1, 1]]]);
});

test("goalTarget: several activities on one goal — the one named in the goal's title, else the name rule, else the tab", () => {
  const goal = (text: string) => goalView(text, buildLife([]), "2030-01-03").line;
  const share = { goal: '"[[2030]] · 10 оплат в месяц"' };
  const acts = activities(buildLife([
    act("Уроки", "каждый день", "", { ...share, project: "Проект В" }),
    act("Реклама", "каждый день", "", share),
    act("Сайт", "каждый день", "", share),
  ]), "2030-01-03");
  const url = (file: string) => questUrl(`life/activities/${file}.md`);
  assert.equal(goalTarget("2030", goal("**10 оплат в месяц с Проект В** · мера: оплаты · срок: 2030-01-04"), acts), url("Уроки"));
  // none of the three is named: no pick among them, and nothing else is named either — the tab
  assert.equal(goalTarget("2030", goal("**10 оплат в месяц** · мера: оплаты · срок: 2030-01-04"), acts), "/?tab=month");
  // one alone on the goal is taken as before
  const one = activities(buildLife([act("Реклама", "каждый день", "", share), act("Уроки", "каждый день", "", { project: "Проект В" })]), "2030-01-03");
  assert.equal(goalTarget("2030", goal("**10 оплат в месяц с Проект В** · мера: оплаты · срок: 2030-01-04"), one), url("Реклама"));
});

test("activities sort by the shown name; two of one project are named once in the fact", () => {
  const life = buildLife([
    act("Я первая", "каждый день", "", { project: "Проект Б" }),
    act("А вторая", "каждый день", "", { project: "Проект В" }),
    act("Б третья", "каждый день", "", { project: "Проект В" }),
  ]);
  assert.deepEqual(activities(life, "2030-01-03").map((a) => a.quest.title), ["Я первая", "А вторая", "Б третья"]);
  const stuck = signals(life, "2030-01-03").find((x) => x.title.startsWith("Не движутся"))!;
  assert.equal(stuck.title, "Не движутся 3 из 3 деятельностей");
  assert.equal(stuck.fact, "записей нет: Проект Б, Проект В");
});
