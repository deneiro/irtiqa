/**
 * Small wins: four numbers Eldar named as goals (the bot's morning summary
 * prints them) and the streaks of what he holds out against (the dashboard
 * reads those too). XP and the wheel are not here.
 */
import type { Page } from "./types";
import { DEBT_I_OWE, debtLeft, streak, type Day, type Habit, type Life } from "./life";

export interface WinNumber {
  key: "suras" | "weight" | "debt" | "clean";
  label: string;
  value: string;
  /** One short line under the number: where it is going. */
  sub: string;
  /** +1 improving, −1 worsening, 0 flat or unknown. */
  trend: -1 | 0 | 1;
}

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ");
/** A sum that fits a tile: «3,26 млн», «422 тыс», «9 500». */
const fmtShort = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(".", ",")} млн` : n >= 1e5 ? `${Math.round(n / 1e3)} тыс` : fmt(n));

/** Pages of `Wiki/Суры/` with a `memorized:` date. */
export function surasMemorized(pages: Page[]): number {
  return pages.filter((p) => /\/Суры\//.test(p.rel) && p.fm.memorized).length;
}

export function surasLearning(pages: Page[]): string[] {
  return pages.filter((p) => /\/Суры\//.test(p.rel) && p.fm.learning && !p.fm.memorized).map((p) => p.title.replace(/^Сура\s+/, ""));
}

/** The last two weights in the day files, newest first. */
export function weights(days: Map<string, Day>): { date: string; weight: number }[] {
  return [...days.values()].filter((d) => d.weight !== undefined).sort((a, b) => b.date.localeCompare(a.date)).map((d) => ({ date: d.date, weight: d.weight! }));
}

export function debtOwed(life: Life): number {
  return life.debts.filter((d) => d.direction === DEBT_I_OWE && !d.closed).reduce((s, d) => s + debtLeft(d), 0);
}

/** Streak of a bad habit = days held out, counting up to and including `upTo`. */
export function heldOut(habit: Habit, days: Map<string, Day>, upTo: string): number {
  return streak(habit, days, upTo);
}

export function winNumbers(life: Life, pages: Page[], upTo: string, weightGoal?: number): WinNumber[] {
  const out: WinNumber[] = [];
  const suras = surasMemorized(pages);
  const learning = surasLearning(pages);
  out.push({ key: "suras", label: "сур выучено", value: String(suras), sub: learning.length ? `учу: ${learning.join(", ")}` : "следующая не взята", trend: 0 });
  const w = weights(life.days);
  if (w.length) {
    const d = w.length > 1 ? w[0].weight - w[1].weight : 0;
    out.push({ key: "weight", label: "вес, кг", value: String(w[0].weight), sub: weightGoal ? `цель ${weightGoal} · ${w[0].weight > weightGoal ? `ещё ${(w[0].weight - weightGoal).toFixed(1)}` : "достигнута"}` : w[0].date, trend: d < 0 ? 1 : d > 0 ? -1 : 0 });
  } else out.push({ key: "weight", label: "вес, кг", value: "—", sub: "замера ещё нет", trend: 0 });
  const owed = debtOwed(life);
  out.push({ key: "debt", label: "долг, ₸", value: fmtShort(owed), sub: owed ? `${fmt(owed)} людям и банкам` : "долгов нет", trend: 0 });
  const best = life.habits.filter((h) => h.status === "active" && h.kind === "bad").map((h) => ({ h, n: heldOut(h, life.days, upTo) })).sort((a, b) => b.n - a.n)[0];
  if (best) out.push({ key: "clean", label: "дней без срыва", value: String(best.n), sub: best.n ? best.h.title : "серия начнётся с первого дня без срыва", trend: best.n ? 1 : 0 });
  return out;
}
