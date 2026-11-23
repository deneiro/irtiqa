import assert from "node:assert/strict";
import { test } from "node:test";
import { DEBT_I_OWE, DEBT_THEY_OWE, debtLeft, payPersonDebts, type Debt } from "./life";

const row = (who: string, direction: string, amount: number, since: string, paid = 0): Debt =>
  ({ who: `[[${who}]]`, direction, amount, paid, currency: "₸", since, note: "", closed: undefined });

test("a payment goes on the oldest debts of that person and direction, and the file keeps its order", () => {
  const debts = [row("Б", DEBT_I_OWE, 100, "2030-01-01"), row("А", DEBT_I_OWE, 50, "2030-01-05", 10), row("А", DEBT_I_OWE, 30, "2030-01-02"), row("А", DEBT_THEY_OWE, 20, "2030-01-01")];
  const r = payPersonDebts(debts, "А", DEBT_I_OWE, 50, "2030-02-01");
  assert.equal(r.applied, 50);
  assert.deepEqual(r.rows.map((d) => `${d.who} ${d.direction} ${d.amount}`), debts.map((d) => `${d.who} ${d.direction} ${d.amount}`));
  // 30 from 01-02 closes, the remaining 20 go on 01-05; Б and «мне должны» are untouched
  assert.equal(r.rows[2].closed, "2030-02-01");
  assert.equal(r.rows[1].paid, 30);
  assert.equal(debtLeft(r.rows[1]), 20);
  assert.equal(r.rows[0], debts[0]);
  assert.equal(r.rows[3], debts[3]);
  // more than is owed: only what is owed lands
  assert.equal(payPersonDebts(debts, "А", DEBT_I_OWE, 500, "2030-02-01").applied, 70);
});
