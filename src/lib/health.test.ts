import assert from "node:assert/strict";
import { test } from "node:test";
import { BODY_PARTS, parseHealth, withHealth } from "./health";

const OLD = [
  "---", "type: health", "updated: 2030-01-01", "---", "# Карта", "",
  "## Визиты", "", "| Дата | Врач | Повод | Итог |", "|---|---|---|---|", "| 2029-12 | Врач А | повод | итог |", "",
  "## Планы", "", "| Врач | К дате | Зачем |", "|---|---|---|", "| Обследование |  | не срочно |", "",
  "## Симптомы", "", "| Дата | Что | Заметка |", "|---|---|---|", "| 2030-01-02 | Симптом А | заметка |", "",
].join("\n");

test("parseHealth: a symptoms table without «Где» reads as before, with an empty where", () => {
  assert.deepEqual(parseHealth(OLD).symptoms, [{ date: "2030-01-02", what: "Симптом А", where: "", note: "заметка" }]);
});

test("parseHealth finds «Где» by its header, wherever the column stands", () => {
  const four = OLD.replace("| Дата | Что | Заметка |\n|---|---|---|\n| 2030-01-02 | Симптом А | заметка |", "| Дата | Что | Где | Заметка |\n|---|---|---|---|\n| 2030-01-03 | Симптом Б | колено | после бега |\n| 2030-01-02 | Симптом А |  | заметка |");
  assert.deepEqual(parseHealth(four).symptoms, [
    { date: "2030-01-03", what: "Симптом Б", where: "колено", note: "после бега" },
    { date: "2030-01-02", what: "Симптом А", where: "", note: "заметка" },
  ]);
  const moved = OLD.replace("| Дата | Что | Заметка |\n|---|---|---|\n| 2030-01-02 | Симптом А | заметка |", "| Где | Дата | Что | Заметка |\n|---|---|---|---|\n| шея | 2030-01-04 | Симптом В | — |");
  assert.deepEqual(parseHealth(moved).symptoms, [{ date: "2030-01-04", what: "Симптом В", where: "шея", note: "—" }]);
});

test("withHealth writes four columns; an old row gets an empty «Где»", () => {
  const out = withHealth(OLD, parseHealth(OLD), "2030-01-05");
  assert.match(out, /\| Дата \| Что \| Где \| Заметка \|\n\|---\|---\|---\|---\|\n\| 2030-01-02 \| Симптом А \|  \| заметка \|/);
  assert.deepEqual(parseHealth(out).symptoms, parseHealth(OLD).symptoms);
  assert.match(out, /^updated: 2030-01-05$/m);
});

test("BODY_PARTS: the ten words of the «Где» column", () => {
  assert.deepEqual(BODY_PARTS, ["голова", "шея", "грудь", "живот", "спина", "поясница", "плечо", "рука", "колено", "нога"]);
});
