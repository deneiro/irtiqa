import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGoalLine, parseGoals } from "./goals";

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
