/**
 * «Требует тебя»: what needs Eldar today, gathered from data he already keeps
 * but that lives on ten different screens — the medical plan in health.md, the
 * circle's cadence, birthdays on person pages, charges in subscriptions.md,
 * quests nobody has touched. The Day screen shows the top of this list, the bot
 * sends it with the morning digest. Pure: the app and the bot both call it.
 */
import type { Page } from "./types";
import type { Life } from "./life";
import { questJournal, questSteps, nextStep, stepTally, subscriptionsDue } from "./life";
import { blockOn, parseCalendar } from "./calendar";
import { staleMentions } from "./stale";
import { parseHealth, daysUntil } from "./health";
import { buildCircle } from "./circle";
import { daysToBirthday } from "./people";
import { addDays } from "./dates";
import { THEMES, themeRu } from "./themes";

export type AttentionKind = "health" | "birthday" | "people" | "money" | "quest";

export interface Attention {
  kind: AttentionKind;
  /** One line, already in words. */
  text: string;
  /** App route to act on it. */
  to: string;
  /** Higher first. Overdue things outrank upcoming ones. */
  urgency: number;
  /**
   * The same line in pieces, when it names people: each name links to that
   * person's page, where the contact is marked. People live in several themes
   * (family is not in Social & friends), so no single theme screen shows them all.
   */
  parts?: { lead: string; items: { label: string; to: string; tail: string }[]; rest: string };
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

/** A theme overview as the attention list needs it: which theme, and the text to check. */
export interface OverviewText { theme: string; body: string }

export function attention(life: Life, people: Page[], today: string, overviews: OverviewText[] = []): Attention[] {
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
  const peopleLine = (lead: string, xs: typeof circle, n: number, tail: (x: (typeof circle)[number]) => string, urgency: number): Attention => {
    const items = xs.slice(0, n).map((x) => ({ label: x.name, to: `/page/${encodeURIComponent(x.page.rel)}`, tail: tail(x) }));
    const rest = xs.length > n ? ` и ещё ${xs.length - n}` : "";
    return {
      kind: "people",
      text: `${lead}${items.map((i) => i.label + i.tail).join(", ")}${rest}`,
      to: "/people?sort=contact",
      urgency,
      parts: { lead, items, rest },
    };
  };
  if (late.length) out.push(peopleLine("Давно не на связи: ", late, 3, (x) => ` (${x.overdue} дн. сверх)`, 60 + Math.min(late[0].overdue ?? 0, 30)));
  if (never.length) out.push(peopleLine("Ни одного контакта не записано: ", never, 4, () => "", 55));

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
    const { done, total } = stepTally(steps);
    const stepInfo = total ? `, шаги ${done}/${total}${next ? ` — дальше: ${next.text.replace(/\s+—\s+\S+$/, "")}` : ""}` : "";
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

  // Every theme has something in work, however small (Eldar, 2026-10-03): a part
  // of life with no quest falls behind unseen. The cap of three active quests is gone.
  const active = life.quests.filter((x) => x.status === "active");
  const bare = THEMES.filter((t) => !life.quests.some((q) => q.theme === t.name && (q.status === "active" || q.status === "passive")));
  if (bare.length) {
    out.push({ kind: "quest", text: `Нет квеста в теме: ${bare.map((t) => themeRu(t.name)).join(", ")}`, to: "/quests", urgency: 35 });
  }
  const blocks = parseCalendar(life.calendar ?? "");
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const noSlot = active.filter((q) => !blocks.some((b) => b.quest === q.title && week.some((d) => blockOn(b, d))));
  if (noSlot.length) {
    out.push({
      kind: "quest",
      text: `Нет времени в календаре на неделю: ${noSlot.slice(0, 3).map((q) => q.title).join("; ")}${noSlot.length > 3 ? ` и ещё ${noSlot.length - 3}` : ""}`,
      to: noSlot.length === 1 ? `/quest/${encodeURIComponent(noSlot[0].rel)}` : "/quests",
      urgency: 58,
    });
  }

  // Overviews still describing closed quests as open: the prose has drifted from the state.
  const drift = overviews
    .map((o) => ({ theme: o.theme, n: staleMentions(o.body.split(/^## (Changes|Заметки)\b/m)[0], life.quests, life.days.values()).length }))
    .filter((x) => x.n > 0);
  if (drift.length) {
    out.push({
      kind: "quest",
      text: `Обзоры отстали от квестов: ${drift.map((d) => `${d.theme} (${d.n})`).join(", ")} — там закрытые квесты всё ещё «в движении»`,
      to: themeRoute(drift[0].theme),
      urgency: 30,
    });
  }

  return out.sort((a, b) => b.urgency - a.urgency);
}
