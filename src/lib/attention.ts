/**
 * «Требует тебя»: what needs Eldar today, gathered from data he already keeps
 * but that lives on ten different screens — the medical plan in health.md, the
 * circle's cadence, birthdays on person pages, charges in subscriptions.md,
 * quests nobody has touched. The Day screen shows the top of this list, the bot
 * sends it with the morning digest. Pure: the app and the bot both call it.
 */
import type { Page } from "./types";
import type { Life } from "./life";
import { questJournal, questSteps, nextStep, subscriptionsDue } from "./life";
import { parseHealth, daysUntil } from "./health";
import { buildCircle } from "./circle";
import { daysToBirthday } from "./people";
import { addDays } from "./dates";

export type AttentionKind = "health" | "birthday" | "people" | "money" | "quest";

export interface Attention {
  kind: AttentionKind;
  /** One line, already in words. */
  text: string;
  /** App route to act on it. */
  to: string;
  /** Higher first. Overdue things outrank upcoming ones. */
  urgency: number;
}

/** A quest counts as stalled after this many days without a timer session or a journal line. Ticking a step leaves no date, so it does not count. */
export const STALL_DAYS = 7;
const BIRTHDAY_AHEAD = 21;
const CHARGE_AHEAD = 7;
/** Only the core and the close: a distant acquaintance going quiet is not a task. */
const CIRCLE_MIN = 7;

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
const days = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/\u00a0/g, " ");
const themeRoute = (name: string) => `/theme/${encodeURIComponent(name)}`;

export function attention(life: Life, people: Page[], today: string): Attention[] {
  const out: Attention[] = [];

  // Medical plans: a visit that was due and has not happened.
  if (life.health) {
    for (const p of parseHealth(life.health).plans) {
      const left = daysUntil(p.by, today);
      if (left === undefined || left > 7) continue;
      // The first clause of «зачем» is enough to know which visit; the rest is on the Health screen.
      const why = p.why.split(/[;,.]/)[0].trim();
      const what = [p.doctor, why].filter(Boolean).join(" — ");
      out.push({
        kind: "health",
        text: left < 0 ? `${what}: просрочено на ${days(-left)} (к ${p.by})` : left === 0 ? `${what}: сегодня` : `${what}: через ${days(left)}`,
        to: themeRoute("Health & sport"),
        urgency: left < 0 ? 100 + Math.min(-left, 60) : 80 - left,
      });
    }
  }

  // Birthdays coming up: time to call, or to buy something.
  const bdays = people
    .map((p) => ({ p, left: daysToBirthday(typeof p.fm.birthday === "string" ? p.fm.birthday : undefined, today) }))
    .filter((x): x is { p: Page; left: number } => x.left !== undefined && x.left <= BIRTHDAY_AHEAD)
    .sort((a, b) => a.left - b.left);
  for (const { p, left } of bdays) {
    out.push({
      kind: "birthday",
      text: left === 0 ? `День рождения сегодня: ${p.title}` : `День рождения: ${p.title} через ${days(left)}`,
      to: `/page/${encodeURIComponent(p.rel)}`,
      urgency: left <= 1 ? 95 : 70 - left,
    });
  }

  // The circle: close people past their cadence, and close people with no contact recorded at all.
  const circle = buildCircle(people, life.events, today).filter((i) => (i.closeness ?? 0) >= CIRCLE_MIN);
  const late = circle.filter((i) => (i.overdue ?? 0) > 0).sort((a, b) => (b.overdue ?? 0) - (a.overdue ?? 0));
  const never = circle.filter((i) => i.overdue === undefined && i.cadence !== undefined && !i.lastContact && !i.lastMeet)
    .sort((a, b) => (b.closeness ?? 0) - (a.closeness ?? 0));
  const names = (xs: typeof circle, n: number, tail: (x: (typeof circle)[number]) => string) =>
    xs.slice(0, n).map((x) => `${x.name}${tail(x)}`).join(", ") + (xs.length > n ? ` и ещё ${xs.length - n}` : "");
  if (late.length) {
    out.push({ kind: "people", text: `Давно не на связи: ${names(late, 3, (x) => ` (${x.overdue} дн. сверх)`)}`, to: themeRoute("Social & friends"), urgency: 60 + Math.min(late[0].overdue ?? 0, 30) });
  }
  if (never.length) {
    out.push({ kind: "people", text: `Ни одного контакта не записано: ${names(never, 4, () => "")}`, to: themeRoute("Social & friends"), urgency: 55 });
  }

  // Charges in the coming week, so the account is not empty on the day.
  const charges: string[] = [];
  let soonest = CHARGE_AHEAD + 1;
  for (let i = 0; i <= CHARGE_AHEAD; i++) {
    const date = addDays(today, i);
    for (const s of subscriptionsDue(life.subscriptions, date)) {
      charges.push(`${s.name} ${fmt(s.amount)} ₸ ${i === 0 ? "сегодня" : i === 1 ? "завтра" : `через ${days(i)}`}`);
      soonest = Math.min(soonest, i);
    }
  }
  if (charges.length) out.push({ kind: "money", text: `Списания: ${charges.join("; ")}`, to: "/finance", urgency: soonest <= 1 ? 75 : 45 - soonest });

  // Quests: past their due date, or not moved for a week.
  const lastTouch = new Map<string, string>();
  for (const d of life.days.values()) for (const s of d.sessions) if (s.minutes > 0 && (lastTouch.get(s.quest) ?? "") < d.date) lastTouch.set(s.quest, d.date);
  const stallFrom = addDays(today, -STALL_DAYS);
  for (const q of life.quests.filter((x) => x.status === "active")) {
    const steps = questSteps(q.body);
    const next = nextStep(steps);
    const done = steps.filter((s) => s.done).length;
    const stepInfo = steps.length ? `, шаги ${done}/${steps.length}${next ? ` — дальше: ${next.text.replace(/\s+—\s+\S+$/, "")}` : ""}` : "";
    const to = `/quest/${encodeURIComponent(q.rel)}`;
    const dueLeft = q.due ? daysUntil(q.due, today) : undefined;
    if (dueLeft !== undefined && dueLeft < 0) {
      out.push({ kind: "quest", text: `Квест просрочен на ${days(-dueLeft)}: ${q.title}${stepInfo}`, to, urgency: 85 });
      continue;
    }
    const touched = [lastTouch.get(q.title), ...questJournal(q.body).map((e) => e.date), q.created].filter(Boolean).sort().pop();
    if (touched && touched <= stallFrom) {
      const idle = daysUntil(today, touched) ?? STALL_DAYS;
      out.push({ kind: "quest", text: `Не двигался ${days(idle)}: ${q.title}${stepInfo}`, to, urgency: 40 + Math.min(idle, 20) });
    } else if (dueLeft !== undefined && dueLeft <= 3) {
      out.push({ kind: "quest", text: `Срок квеста ${dueLeft === 0 ? "сегодня" : `через ${days(dueLeft)}`}: ${q.title}${stepInfo}`, to, urgency: 65 - dueLeft });
    }
  }

  return out.sort((a, b) => b.urgency - a.urgency);
}
