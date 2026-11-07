import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTicks, closeHeading, findItem, moneyLeft, moneyValue, parseBank, progress, tickedIds } from "./bank";
import { appendTasks, carriedFrom, carryDays, carryWeeks, markMoved, openWeekTasks, stripCarry } from "./carry";
import { parseGoals } from "./goals";
import { emptyDay, parseDay, serializeDay } from "./life";

const BANK = [
  "---",
  "title: Банк заданий — Тест",
  "type: bank",
  "theme: Finance & money",
  "---",
  "# Банк заданий — Тест",
  "",
  "Правило недели.",
  "",
  "## F01. Цель",
  "нужно: доход",
  "деньги: ~200 млн ₸",
  "",
  "### F01.1. Часть — 0 ₸ · после: —",
  "нужно: поток",
  "*Факт из vault.*",
  "",
  "#### F01.1.1. Первый шаг",
  "- [ ] **F01.1.1.1** Узнать",
  "  нужно: сайт",
  "  деньги: 0 ₸",
  "- [x] **F01.1.1.2** Позвонить",
  "- [ ] **F01.1.1.3** Оплатить",
  "  деньги: 100 000 ₸",
  "",
  "### F01.2. Резерв · после: F01.1",
  "- [ ] **F01.2.1** Посчитать",
  "  деньги: ~10 000 ₸",
  "",
].join("\n");

test("parseBank reads four levels, cards and predecessors", () => {
  const b = parseBank("life/goals/Банк/x.md", BANK);
  assert.equal(b.theme, "Finance & money");
  assert.equal(b.goals.length, 1);
  const g = b.goals[0];
  assert.deepEqual([g.id, g.level, g.title, g.need, g.money], ["F01", 1, "Цель", "доход", "~200 млн ₸"]);
  const ii = g.children[0];
  assert.deepEqual([ii.id, ii.level, ii.title, ii.after, ii.need, ii.notes], ["F01.1", 2, "Часть — 0 ₸", "—", "поток", ["*Факт из vault.*"]]);
  const iii = ii.children[0];
  assert.deepEqual([iii.id, iii.level, iii.children.length], ["F01.1.1", 3, 3]);
  const iv = iii.children[0];
  assert.deepEqual([iv.id, iv.level, iv.task, iv.done, iv.need, iv.money], ["F01.1.1.1", 4, true, false, "сайт", "0 ₸"]);
  assert.equal(iii.children[1].done, true);
  // a II that holds its tasks directly: the task is one level below it
  const direct = g.children[1].children[0];
  assert.deepEqual([direct.id, direct.level, direct.task], ["F01.2.1", 3, true]);
});

test("progress counts direct children and closes only at 100 %", () => {
  const b = parseBank("x", BANK);
  const iii = findItem([b], "F01.1.1")!;
  assert.deepEqual([progress(iii).done, progress(iii).total, progress(iii).pct, progress(iii).canClose], [1, 3, 33, false]);
  applyTicks([b], tickedIds(["- [x] **F01.1.1.1** Узнать — [[Банк]]\n- [x] **F01.1.1.3** Оплатить"]));
  assert.deepEqual([progress(iii).pct, progress(iii).canClose], [100, true]);
  // II is not 100 % until its III is closed, however many tasks are ticked
  const ii = findItem([b], "F01.1")!;
  assert.deepEqual([progress(ii).pct, progress(ii).canClose, progress(ii).tasksDone, progress(ii).tasksTotal], [0, false, 3, 3]);
});

test("closeHeading writes the ✓ once, and the parser reads it back", () => {
  const once = closeHeading(BANK, "F01.1.1", "2026-11-10");
  assert.match(once, /^#### F01\.1\.1\. Первый шаг ✓ 2026-11-10$/m);
  assert.equal(closeHeading(once, "F01.1.1", "2026-11-11"), once);
  const it = findItem([parseBank("x", once)], "F01.1.1")!;
  assert.deepEqual([it.done, it.doneOn, it.title], [true, "2026-11-10", "Первый шаг"]);
  // F01.1 is not touched by closing F01.1.1
  assert.match(once, /^### F01\.1\. Часть — 0 ₸ · после: —$/m);
  assert.throws(() => closeHeading(BANK, "Z09.9", "2026-11-10"));
});

test("money: values, open tasks only, estimates marked", () => {
  assert.equal(moneyValue("100 000 ₸"), 100000);
  assert.equal(moneyValue("~200 млн ₸"), 200_000_000);
  assert.equal(moneyValue("1,5 млн ₸"), 1_500_000);
  assert.equal(moneyValue("—"), undefined);
  const g = parseBank("x", BANK).goals[0];
  assert.deepEqual(moneyLeft(g), { sum: 110000, count: 2, estimated: true });
});

test("a day's open tasks move to the next day and stay moved", () => {
  const d1 = parseDay({ rel: "life/days/2026-11-08.md", mtime: 0, content: "---\ndate: 2026-11-08\ntype: day\nclosed: false\n---\n## Задачи\n- [ ] Позвонить — [[X]]\n- [x] Сделано\n\n## Сделано\n" });
  const d2 = emptyDay("2026-11-09");
  const out = carryDays([d1], d2);
  assert.equal(out.length, 2);
  const [old, today] = out;
  assert.deepEqual(old.tasks.map((t) => t.text), ["Сделано"]);
  assert.match(serializeDay(old), /^- \[>\] Позвонить — \[\[X\]\]$/m);
  assert.deepEqual(today.tasks.map((t) => t.text), ["Позвонить — [[X]] · с 2026-11-08"]);
  // the moved line is not a task when read again
  const again = parseDay({ rel: "life/days/2026-11-08.md", mtime: 0, content: serializeDay(old) });
  assert.deepEqual(again.tasks.map((t) => t.text), ["Сделано"]);
  // a second day later: the origin stays, no duplicate, nothing older than the rule moves
  const third = carryDays([out[1]], emptyDay("2026-11-10"))[1];
  assert.deepEqual(third.tasks.map((t) => t.text), ["Позвонить — [[X]] · с 2026-11-08"]);
  assert.equal(carriedFrom(third.tasks[0].text), "2026-11-08");
  assert.equal(stripCarry(third.tasks[0].text), "Позвонить — [[X]]");
  const old7 = { ...emptyDay("2026-11-01"), tasks: [{ done: false, text: "старое" }] };
  assert.deepEqual(carryDays([old7], emptyDay("2026-11-09")), []);
});

test("a week's open tasks move to the next week; the old file keeps them as moved", () => {
  const w45 = "---\ntype: goals\nperiod: week\nfrom: 2026-11-02\nto: 2026-11-08\n---\n# Неделя 45\n\n## Цели\n- x\n\n## Задачи\n\n- [ ] **F01.1.1.1** Узнать — [[Банк]]\n- [x] Готово\n- Времени нет.\n";
  const out = carryWeeks(new Map([["2026-W45", w45]]), "2026-W46", "2026-11-09", "2026-11-15");
  assert.match(out.get("2026-W45")!, /^- \[>\] \*\*F01\.1\.1\.1\*\* Узнать — \[\[Банк\]\]$/m);
  assert.deepEqual(parseGoals("2026-W45", out.get("2026-W45")!).tasks.map((t) => t.text), ["Готово"]);
  const w46 = out.get("2026-W46")!;
  assert.match(w46, /^# Неделя 46 — 9–15 ноября$/m);
  assert.deepEqual(openWeekTasks(w46), ["**F01.1.1.1** Узнать — [[Банк]] · с 2026-W45"]);
  // nothing open → nothing written
  assert.equal(carryWeeks(new Map([["2026-W45", markMoved(w45)]]), "2026-W46", "2026-11-09", "2026-11-15").size, 0);
});

test("appendTasks adds to an existing section before Фокус and skips duplicates", () => {
  const f = "## Цели\n- a\n\n## Задачи\n- [ ] Одна\n\n## Фокус\n1. x\n";
  const out = appendTasks(f, ["Две", "одна"]);
  assert.equal(out, "## Цели\n- a\n\n## Задачи\n- [ ] Одна\n- [ ] Две\n\n## Фокус\n1. x\n");
  assert.equal(appendTasks("## Цели\n- a\n\n## Фокус\n1. x\n", ["Т"]), "## Цели\n- a\n\n## Задачи\n- [ ] Т\n\n## Фокус\n1. x\n");
});
