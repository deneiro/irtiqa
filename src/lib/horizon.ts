/**
 * «Когда я выйду в ноль» — the one question the money theme exists to answer.
 *
 * Everything here is derived from what is already written down: the open rows
 * of `debts.md`, the transactions marked «долг» in the day files, and the
 * subscriptions that are really credit instalments. Nothing is estimated from
 * a salary that has not landed as a transaction yet.
 */
import { DEBT_I_OWE, DEBT_THEY_OWE, debtLeft, debtsByPerson, type Day, type Debt, type PersonDebt, type Subscription } from "./life";

export const DEBT_CATEGORY = "долг";

export interface Horizon {
  owed: number;
  owedToMe: number;
  net: number;
  people: PersonDebt[];
  /** Repayments in the last 30 and 90 days, from transactions marked «долг». */
  paid30: number;
  paid90: number;
  /**
   * Repayments per month, measured from the first recorded repayment rather
   * than over a fixed window: dividing by 90 days would understate a pace that
   * only started two weeks ago.
   */
  pace: number;
  paceFrom: string | undefined;
  monthsLeft: number | undefined;
  freeDate: string | undefined;
  /** Fixed monthly instalments living in subscriptions, not in debts.md. */
  credit: number;
  creditNames: string[];
  month: { earned: number; spent: number; paid: number };
  scenarios: { perMonth: number; date: string; months: number }[];
}

function addMonths(today: string, months: number): string {
  const d = new Date(today + "T12:00:00");
  d.setMonth(d.getMonth() + Math.ceil(months));
  return d.toISOString().slice(0, 10);
}

function repayments(days: Map<string, Day>, from: string, to: string): { total: number; first: string | undefined } {
  let total = 0;
  let first: string | undefined;
  for (const [date, d] of days) {
    if (date < from || date > to) continue;
    for (const t of d.txs) {
      if (t.amount >= 0 || t.category.trim().toLowerCase() !== DEBT_CATEGORY) continue;
      total -= t.amount;
      if (!first || date < first) first = date;
    }
  }
  return { total, first };
}
const sumPaid = (days: Map<string, Day>, from: string, to: string) => repayments(days, from, to).total;

export function horizonOf(
  debts: Debt[], days: Map<string, Day>, subs: Subscription[], today: string,
): Horizon {
  const open = debts.filter((d) => !d.closed && debtLeft(d) > 0);
  const owed = open.filter((d) => d.direction === DEBT_I_OWE).reduce((s, d) => s + debtLeft(d), 0);
  const owedToMe = open.filter((d) => d.direction === DEBT_THEY_OWE).reduce((s, d) => s + debtLeft(d), 0);
  const people = debtsByPerson(open).filter((p) => p.direction === DEBT_I_OWE).sort((a, b) => b.left - a.left);

  const back = (n: number) => new Date(new Date(today + "T12:00:00").getTime() - n * 86400000).toISOString().slice(0, 10);
  const paid30 = sumPaid(days, back(30), today);
  const { total: paid90, first } = repayments(days, back(90), today);
  const spanDays = first ? Math.max(1, Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${first}T12:00:00`)) / 86400000)) : 0;
  const months = Math.max(1, spanDays / 30);
  const pace = paid90 > 0 ? paid90 / months : 0;

  const creditSubs = subs.filter((s) => s.category.trim().toLowerCase() === DEBT_CATEGORY);
  const credit = creditSubs.reduce((s, x) => s + x.amount, 0);

  const ym = today.slice(0, 7);
  let earned = 0, spent = 0;
  for (const [date, d] of days) {
    if (!date.startsWith(ym)) continue;
    for (const t of d.txs) { if (t.amount > 0) earned += t.amount; else spent -= t.amount; }
  }
  const month = { earned, spent, paid: sumPaid(days, `${ym}-01`, today) };

  const monthsLeft = pace > 0 && owed > 0 ? owed / pace : undefined;
  const steps = owed > 0 ? [25000, 50000, 100000] : [];
  return {
    owed, owedToMe, net: owed - owedToMe, people,
    paid30, paid90, pace, paceFrom: first,
    monthsLeft,
    freeDate: monthsLeft !== undefined ? addMonths(today, monthsLeft) : undefined,
    credit, creditNames: creditSubs.map((s) => s.name),
    month,
    scenarios: steps.map((perMonth) => {
      const months = owed / perMonth;
      return { perMonth, months, date: addMonths(today, months) };
    }),
  };
}
