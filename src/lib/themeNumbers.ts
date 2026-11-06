/**
 * The number tiles of a theme page (spec v4 «Цифры: источники»). The overview
 * names each number as `- Подпись — источник`; this file knows the kinds of
 * source and nothing else — the habits, people and sums come from the vault.
 * The window is the 30 days ending yesterday (the evening survey of today has
 * not come yet); weight, measures, money and events count through today. No
 * data is «—», never 0, and the note under it says what is missing.
 */
import { atHome, buildCircle } from "./circle";
import { addDays, plural } from "./dates";
import { activityView, cell, dateRange, daysBetween, fmt, goalView, weightGoal, weightSeries, windowStats, type Cell, type GoalChip } from "./dashboard";
import { isoWeekKey, monthKey, parseGoals } from "./goals";
import { lastOf, measures } from "./health";
import { horizonOf } from "./horizon";
import { DEBT_I_OWE, habitDue, markOf, streak, type Habit, type Life } from "./life";
import type { NumberLine } from "./overview";
import { isAuthor } from "./people";
import { suras } from "./quran";
import { lastTalk, parseTalks } from "./talks";
import { attentionShares, dayFiles, eventTheme, themeDays } from "./themeDays";
import { themeRu } from "./themes";
import type { Page, Vault } from "./types";
export interface Tile {
  label: string;
  value: string;
  unit?: string;
  /** A line in plain sight right under the number — what it is about («Бизнес» for `внимание`). */
  sub?: string;
  /** The one line under the number: a date, the target, or how many days have data. */
  note: string;
  /** 30 beads, oldest first, for the series tiles (a habit, `намаз`). */
  beads?: Cell[];
  /** A goal's mark: «горит» or «отстаёт». */
  chip?: GoalChip;
  /** The source was not understood: the note says «не понял: …». */
  unknown?: boolean;
  /** A run that broke (0 days) or a goal that burns: the number is drawn in ember. */
  warn?: boolean;
}

export interface TileCtx { life: Life; vault: Vault; theme: string; today: string }

const MON_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MON_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MON_IN = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];

/** «23 сентября»; with the year when it is not this year's: «1 августа 2025». */
export function dateWords(date: string, today: string): string {
  const d = `${Number(date.slice(8, 10))} ${MON_GEN[Number(date.slice(5, 7)) - 1]}`;
  return date.slice(0, 4) === today.slice(0, 4) ? d : `${d} ${date.slice(0, 4)}`;
}

/** «4 ноя». */
export const shortDate = (date: string) => `${Number(date.slice(8, 10))} ${MON_SHORT[Number(date.slice(5, 7)) - 1]}`;

const nDays = (n: number) => plural(n, "день", "дня", "дней");
const num1 = (x: number) => String(Math.round(x * 10) / 10);

/** The 30-day window: yesterday and the 29 days before it. */
export function tileWindow(today: string): { from: string; to: string } {
  const to = addDays(today, -1);
  return { from: addDays(to, -29), to };
}

/** The target of `[[…]]`, without alias or heading; undefined when the source is not a single wikilink. */
export function wikiTarget(source: string): string | undefined {
  return source.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\\?\|[^\]]*)?\]\]$/)?.[1].trim();
}

/** A habit by the target of `[[…]]`: its title first, else its file name (Obsidian links by file). */
export function findHabit(life: Life, target: string): Habit | undefined {
  const t = target.normalize("NFC");
  const file = (h: Habit) => h.rel.split("/").pop()!.replace(/\.md$/i, "").normalize("NFC");
  return life.habits.find((h) => h.title.normalize("NFC") === t) ?? life.habits.find((h) => file(h) === t);
}

const unknown = (line: NumberLine): Tile => ({ label: line.label, value: "—", note: `не понял: ${line.source || "источник не указан"}`, unknown: true });

/** A bad habit: days without a fall by the app's run (`clean_since` counts from that day). */
function badTile(line: NumberLine, h: Habit, ctx: TileCtx, beads: Cell[]): Tile {
  const { from, to } = tileWindow(ctx.today);
  const days = [...ctx.life.days.values()].filter((d) => d.date <= to);
  const falls = days.filter((d) => markOf(d, h.title) === "failed").map((d) => d.date).sort();
  if (!h.cleanSince && !days.some((d) => markOf(d, h.title))) return { label: line.label, value: "—", note: "отметок нет", beads };
  const n = streak(h, ctx.life.days, to);
  const last = falls[falls.length - 1];
  const head = h.cleanSince && (!last || last < h.cleanSince) ? `чисто с ${dateWords(h.cleanSince, ctx.today)}`
    : last ? `последний срыв — ${dateWords(last, ctx.today)}` : "срывов не отмечено";
  const in30 = falls.filter((d) => d >= from).length;
  return { label: line.label, value: String(n), unit: nDays(n), note: in30 ? `${head} · за 30 дней ${in30}` : head, beads, warn: n === 0 };
}

/** A good habit or one prayer: done (on time or late) of the days it was due, from its creation. */
function goodTile(line: NumberLine, h: Habit, ctx: TileCtx, beads: Cell[]): Tile {
  const { from, to } = tileWindow(ctx.today);
  let done = 0, due = 0;
  for (const d of dateRange(from, to)) {
    if (!habitDue(h, d)) continue;
    const day = ctx.life.days.get(d);
    const m = day ? markOf(day, h.title) : undefined;
    if (m === "skipped") continue;
    due++;
    if (m === "done" || m === "late") done++;
  }
  const since = h.created && h.created > from ? `с ${dateWords(h.created, ctx.today)}` : "за 30 дней";
  if (!due) return { label: line.label, value: "—", note: `${since} · положенных дней ещё не было`, beads };
  return { label: line.label, value: String(done), unit: `из ${due}`, note: since, beads };
}

/** A vow holds on a day with nothing written: the run already counts that day, so its bead is green too. A fall stays; days before `start` stay as they are. */
function silentHeld(beads: Cell[], dates: string[], start: string): Cell[] {
  return beads.map((c, i) => ((c === "unmarked" || c === "nofile") && dates[i] >= start ? "held" : c));
}

function habitTile(line: NumberLine, h: Habit, ctx: TileCtx): Tile {
  const { from, to } = tileWindow(ctx.today);
  const dates = dateRange(from, to);
  const beads = dates.map((d) => cell(ctx.life, h, d, ctx.today));
  // not active: no run, whatever its marks
  if (h.status !== "active") return { label: line.label, value: "—", note: "привычка не активна", beads };
  return h.kind === "bad" ? badTile(line, h, ctx, silentHeld(beads, dates, h.cleanSince ?? h.created ?? "")) : goodTile(line, h, ctx, beads);
}

/** The beads of several habits as one: the best mark of the day wins, so a day is done when any of them is done. */
const UNION_ORDER: readonly Cell[] = ["done", "late", "held", "failed", "fall", "pending", "unmarked", "nofile", "skip", "future"];
export function unionCell(life: Life, hs: Habit[], date: string, today: string): Cell {
  const cells = hs.map((h) => cell(life, h, date, today));
  return UNION_ORDER.find((c) => cells.includes(c)) ?? "skip";
}

/**
 * `[[А]] + [[Б]]` (Eldar, 2026-11-06: «просто считается за один»): several good habits as
 * one tile — due on any of their days, done on a day when any of them is done, read as the one-habit tile reads.
 * A bad habit does not join: its run and the count of good days are different numbers.
 */
function unionTile(line: NumberLine, parts: string[], ctx: TileCtx): Tile {
  const hs: Habit[] = [];
  for (const part of parts) {
    const target = wikiTarget(part);
    const h = target === undefined ? undefined : findHabit(ctx.life, target);
    if (!h) return unknown(line);
    hs.push(h);
  }
  if (hs.some((h) => h.kind === "bad")) {
    const note = hs.every((h) => h.kind === "bad") ? "плохие привычки не складываются: по одной на плитку" : "хорошую и плохую привычку в одну плитку не сложить";
    return { label: line.label, value: "—", note };
  }
  const { from, to } = tileWindow(ctx.today);
  const dates = dateRange(from, to);
  const beads = dates.map((d) => unionCell(ctx.life, hs, d, ctx.today));
  const active = hs.filter((h) => h.status === "active");
  if (!active.length) return { label: line.label, value: "—", note: "привычки не активны", beads };
  let done = 0, due = 0;
  for (const c of beads) {
    if (c === "skip" || c === "future") continue;
    due++;
    if (c === "done" || c === "late") done++;
  }
  const created = active.map((h) => h.created);
  const first = created.includes(undefined) ? undefined : (created as string[]).sort()[0];
  const since = first && first > from ? `с ${dateWords(first, ctx.today)}` : "за 30 дней";
  if (!due) return { label: line.label, value: "—", note: `${since} · положенных дней ещё не было`, beads };
  return { label: line.label, value: String(done), unit: `из ${due}`, note: since, beads };
}

/** The day of the prayers as one bead: a missed prayer makes it a miss; one read on time or late makes it held. */
export function prayerCell(life: Life, date: string, today: string): Cell {
  if (date > today) return "future";
  const d = life.days.get(date);
  if (!d) return date === today ? "pending" : "nofile";
  const marks = life.habits.filter((h) => h.kind === "prayer" && habitDue(h, date)).map((h) => markOf(d, h.title));
  if (marks.includes("failed")) return "fall";
  if (marks.some((m) => m === "done" || m === "late")) return "held";
  return date === today ? "pending" : "unmarked";
}

/** `намаз`: days since the last day with a missed prayer; that day breaks the run. */
function prayerTile(line: NumberLine, ctx: TileCtx): Tile {
  const { life, today } = ctx;
  const { from, to } = tileWindow(today);
  const prayers = life.habits.filter((h) => h.kind === "prayer" && h.status === "active");
  if (!prayers.length) return { label: line.label, value: "—", note: "намазов среди привычек нет" };
  const missed = [...life.days.keys()].filter((d) => d <= to && prayerCell(life, d, today) === "fall").sort();
  const last = missed[missed.length - 1];
  const first = [...prayers.map((h) => h.created).filter((c): c is string => !!c), ...life.days.keys()].sort()[0] ?? to;
  const dates = dateRange(from, to);
  const beads = silentHeld(dates.map((d) => prayerCell(life, d, today)), dates, first);
  const start = last ? addDays(last, 1) : first;
  const run = start <= to ? dateRange(start, to) : [];
  const marked = run.filter((d) => prayerCell(life, d, today) === "held").length;
  if (!last && !marked) return { label: line.label, value: "—", note: "отметок намаза нет", beads };
  const head = last ? `последний пропуск — ${dateWords(last, today)}` : "пропусков не было";
  return {
    label: line.label, value: String(run.length), unit: nDays(run.length),
    note: run.length ? `${head} · отмечено ${marked} ${nDays(marked)} из ${run.length}` : head, beads, warn: run.length === 0,
  };
}

/** `суры`: learnt of 114; the month's new ones (or last month's, when this one has none yet) and what is being learnt. */
function surasTile(line: NumberLine, ctx: TileCtx): Tile {
  const all = suras(ctx.vault);
  if (!all.length) return { label: line.label, value: "—", unit: "/ 114", note: "страниц сур нет" };
  const done = all.filter((s) => s.state === "done");
  const ym = ctx.today.slice(0, 7), prev = addDays(`${ym}-01`, -1).slice(0, 7);
  const added = (m: string) => done.filter((s) => s.memorized!.startsWith(m)).length;
  const month = added(ym) ? ym : prev;
  const learning = all.filter((s) => s.state === "learning").map((s) => `${s.n} ${s.name.split(" (")[0]}`);
  const note = [added(month) ? `в ${MON_IN[Number(month.slice(5, 7)) - 1]} +${added(month)}` : "", learning.length ? `учу: ${learning.join(", ")}` : ""].filter(Boolean).join(" · ");
  return { label: line.label, value: String(done.length), unit: "/ 114", note: note || "за два месяца новых нет" };
}

/** `вес`: the latest weight through today, and the way to the nearest weight goal (`weightGoal`, spec v3). */
function weightTile(line: NumberLine, ctx: TileCtx): Tile {
  const ws = weightSeries(ctx.life, ctx.today);
  const last = ws[ws.length - 1];
  if (!last) return { label: line.label, value: "—", unit: "кг", note: "замеров нет" };
  const goal = weightGoal(ctx.life, ctx.today);
  if (!goal) return { label: line.label, value: num1(last.value), unit: "кг", note: shortDate(last.date) };
  // The direction as weightPace reads it: from the first weight of the last 21 days.
  const down = goal.target < (ws.find((w) => w.date >= addDays(ctx.today, -21)) ?? last).value;
  const reached = down ? last.value <= goal.target : last.value >= goal.target;
  const way = reached ? "цель достигнута" : `ещё ${num1(Math.abs(last.value - goal.target))}`;
  return { label: line.label, value: num1(last.value), unit: "кг", note: `${shortDate(last.date)} · до ${num1(goal.target)} к ${shortDate(goal.by)} — ${way}` };
}

/** `отжимания`, `подтягивания`: the latest measure for one set, through today, and the target from `· цель N`. */
function measureTile(key: "pushups" | "pullups") {
  return (line: NumberLine, ctx: TileCtx): Tile => {
    const m = lastOf(measures(ctx.life.days).filter((x) => x.date <= ctx.today), key);
    const goal = line.target ? `цель ${line.target}` : "";
    if (!m) return { label: line.label, value: "—", note: ["замеров нет", goal].filter(Boolean).join(" · ") };
    return { label: line.label, value: String(m[key]), note: [shortDate(m.date), goal].filter(Boolean).join(" · ") };
  };
}

/** `настроение` and `стресс`: the mean of the window's answers, out of 10. Stress is better low; no tile marks either. */
function meanTile(key: "mood" | "stress") {
  return (line: NumberLine, ctx: TileCtx): Tile => {
    const { from, to } = tileWindow(ctx.today);
    const m = windowStats(ctx.life, from, to);
    const note = `ответов ${m[key].n} из ${m.length}`;
    const avg = m[key].avg;
    return avg === undefined ? { label: line.label, value: "—", note } : { label: line.label, value: num1(avg), unit: "из 10", note };
  };
}

/**
 * `внимание`: the share of the theme that got the most of the 30 days' attention, and its name in plain sight
 * (Eldar, 2026-11-06: «один, самый большой процент и куда оно уходит»). A tie names both. Until then the tile
 * summed the first three shares, which read as one big number with the themes in small print.
 */
function attentionTile(line: NumberLine, ctx: TileCtx): Tile {
  const { from, to } = tileWindow(ctx.today);
  const shares = attentionShares(ctx.life, from, to).filter((s) => s.days > 0);
  if (!shares.length) return { label: line.label, value: "—", note: "дней с вниманием нет" };
  const most = Math.max(...shares.map((s) => s.days));
  const top = shares.filter((s) => s.days === most);
  return { label: line.label, value: String(top[0].share), unit: "%", sub: top.map((s) => themeRu(s.theme)).join(" и "), note: `${most} ${nDays(most)} из 30 · доля среди тем` };
}

/** What a day of `тема` is, in the tile's own words: themeDays counts these. */
const THEME_DAY = "дни, когда по теме было что-то: привычка, дело, событие";

/** `тема`: the days of the 30 this theme got attention (`themeDays`), what such a day is, and the last one. */
function themeTile(line: NumberLine, ctx: TileCtx): Tile {
  const { from, to } = tileWindow(ctx.today);
  const n = themeDays(ctx.life, from, to).get(ctx.theme)?.size ?? 0;
  const last = [...(themeDays(ctx.life, "", to).get(ctx.theme) ?? [])].sort().pop();
  const note = last ? `${THEME_DAY} · последнее — ${dateWords(last, ctx.today)}` : `${THEME_DAY} · таких ещё не было`;
  if (!n && !dayFiles(ctx.life, from, to)) return { label: line.label, value: "—", note };
  return { label: line.label, value: String(n), unit: `${nDays(n)} из 30`, note };
}

const monthStart = (today: string) => `${today.slice(0, 7)}-01`;

/** `доход`: received this calendar month through today, and the target from `· цель N`. Spending alone says nothing of income: «—». */
function incomeTile(line: NumberLine, ctx: TileCtx): Tile {
  const s = windowStats(ctx.life, monthStart(ctx.today), ctx.today);
  const goal = line.target ? `цель ${line.target}` : "";
  if (!s.money.earned) return { label: line.label, value: "—", note: ["доход в днях не записан", goal].filter(Boolean).join(" · ") };
  return { label: line.label, value: fmt(s.money.earned), unit: "₸", note: goal || `записи за ${s.money.days} ${nDays(s.money.days)}` };
}

const fold = (s: string) => s.replace(/[\s\u00a0\u202f]+/g, " ").trim().toLowerCase();

/** `цель «начало»`: «сейчас» of the goal whose bold text starts so, from the week, the month, then the year file. */
function goalTile(line: NumberLine, start: string, ctx: TileCtx): Tile {
  const want = fold(start);
  for (const key of [isoWeekKey(ctx.today), monthKey(ctx.today), ctx.today.slice(0, 4)]) {
    const c = ctx.life.goals.get(key);
    for (const text of c ? parseGoals(key, c).goals : []) {
      const g = goalView(text, ctx.life, ctx.today);
      if (g.placeholder || !fold(g.line.title).startsWith(want)) continue;
      const note = [g.line.measure, g.line.due && `срок ${shortDate(g.line.due)}`, g.line.doneOn && `✓ ${shortDate(g.line.doneOn)}`].filter(Boolean).join(" · ");
      const chip = g.chip === "hot" || g.chip === "behind" ? g.chip : undefined;
      return { label: line.label, value: g.now ?? "—", note: note || "мера не записана", chip, warn: chip === "hot" };
    }
  }
  return { label: line.label, value: "—", note: `цели «${start}» нет в файлах недели, месяца и года` };
}

/** `движения`: moves of the theme's activities in the 7 days through today, by project (or title). */
function movesTile(line: NumberLine, ctx: TileCtx): Tile {
  const acts = ctx.life.quests.filter((q) => q.theme === ctx.theme);
  if (!acts.length) return { label: line.label, value: "—", note: "деятельностей нет" };
  const by = new Map<string, number>();
  for (const q of acts) {
    const n = activityView(q, ctx.life.days, ctx.today).week;
    if (n) by.set(q.project ?? q.title, (by.get(q.project ?? q.title) ?? 0) + n);
  }
  const rows = [...by].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  const total = rows.reduce((a, [, n]) => a + n, 0);
  return { label: line.label, value: String(total), note: rows.length ? rows.map(([t, n]) => `${t} ${n}`).join(" · ") : "за 7 дней записей нет" };
}

/** Person pages as the circle counts them: no authors, no templates. */
export function peopleOf(vault: Vault, theme?: string): Page[] {
  return vault.pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p) && (!theme || p.theme === theme));
}

/** The latest touch with a person through today: `last_contact`, a talk in `life/talks.md` or an event with them. */
export function lastTouch(page: Page, people: Page[], life: Life, today: string): { date: string; how: string } | undefined {
  const item = buildCircle(people, life.events.filter((e) => e.date <= today), today).find((i) => i.page.rel === page.rel);
  const talk = lastTalk(parseTalks(life.talks ?? "").filter((t) => t.date <= today), [page.title, page.file, ...page.aliases]);
  const all = [
    item?.lastContact && item.lastContact <= today ? { date: item.lastContact, how: "контакт" } : undefined,
    talk ? { date: talk.date, how: "разговор" } : undefined,
    item?.lastMeet ? { date: item.lastMeet, how: "встреча" } : undefined,
  ].filter((x): x is { date: string; how: string } => !!x);
  return all.sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** `[[Человек]]`: days since the latest touch. */
function personTile(line: NumberLine, page: Page, ctx: TileCtx): Tile {
  const t = lastTouch(page, peopleOf(ctx.vault), ctx.life, ctx.today);
  if (!t) return { label: line.label, value: "—", note: "контакт не отмечен" };
  const n = daysBetween(t.date, ctx.today);
  return { label: line.label, value: String(n), unit: nDays(n), note: `${dateWords(t.date, ctx.today)} · ${t.how}` };
}

export interface Quiet { page: Page; name: string; since: number | undefined; cadence: number | undefined; overdue: boolean }

/**
 * Close people of a theme (closeness 7 and more, as v3 «давно без связи») by the days since the latest touch,
 * the longest silence first; nobody touched at all comes first, as the «Круг» sorts them. `overdue`: past the
 * rhythm their closeness sets (`cadenceFor`, as the «Круг» counts it) or never touched.
 */
export function quietClose(vault: Vault, life: Life, theme: string, today: string): Quiet[] {
  const people = peopleOf(vault, theme);
  const items = buildCircle(people, life.events.filter((e) => e.date <= today), today).filter((i) => (i.closeness ?? 0) >= 7 && !atHome(i.page)); // those he lives with he sees every day
  return items.map((i) => {
    const t = lastTouch(i.page, people, life, today);
    const since = t ? daysBetween(t.date, today) : undefined;
    return { page: i.page, name: i.name, since, cadence: i.cadence, overdue: since === undefined || (i.cadence !== undefined && since > i.cadence) };
  }).sort((a, b) => (b.since ?? Infinity) - (a.since ?? Infinity) || a.name.localeCompare(b.name, "ru"));
}

/** `близкие`: how many close people are silent past their rhythm; the one silent longest. */
function closeTile(line: NumberLine, ctx: TileCtx): Tile {
  const q = quietClose(ctx.vault, ctx.life, ctx.theme, ctx.today);
  if (!q.length) return { label: line.label, value: "—", note: "близких с оценкой 7 и выше нет" };
  const late = q.filter((x) => x.overdue).length;
  const first = q[0];
  return { label: line.label, value: String(late), unit: `из ${q.length}`, note: `${first.name} · ${first.since === undefined ? "контакт не отмечен" : `${first.since} дн`}` };
}

/** `встречи`: events with people (`people:` filled) this calendar month through today. */
function meetingsTile(line: NumberLine, ctx: TileCtx): Tile {
  const met = ctx.life.events.filter((e) => e.people.length > 0 && e.date <= ctx.today);
  const last = met.map((e) => e.date).sort().pop();
  if (!last) return { label: line.label, value: "—", note: "встреч не записано" };
  return { label: line.label, value: String(met.filter((e) => e.date >= monthStart(ctx.today)).length), note: `последняя — ${dateWords(last, ctx.today)}` };
}

export interface DebtGlance { owed: number; paid: number; pace: number; paceFrom: string | undefined; freeDate: string | undefined }

/** What the «Горизонт» says in four numbers: left, paid in of the open rows, the pace and the date of zero. */
export function debtGlance(life: Life, today: string): DebtGlance {
  const h = horizonOf(life.debts, life.days, life.subscriptions, today);
  const paid = life.debts.filter((d) => d.direction === DEBT_I_OWE && !d.closed).reduce((a, d) => a + d.paid + (d.auto ?? 0), 0);
  return { owed: h.owed, paid, pace: h.pace, paceFrom: h.paceFrom, freeDate: h.freeDate };
}

/** «авг 2027». */
const monthYear = (date: string) => `${MON_SHORT[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** `долг`: what is left to pay, what is paid in, and zero at this pace — as the «Горизонт» has it. */
function debtTile(line: NumberLine, ctx: TileCtx): Tile {
  if (!ctx.life.debts.length) return { label: line.label, value: "—", note: "долгов в таблице нет" };
  const g = debtGlance(ctx.life, ctx.today);
  if (!g.owed) return { label: line.label, value: "0", unit: "₸", note: "долгов нет" };
  return { label: line.label, value: fmt(g.owed), unit: "₸", note: `выплачено ${fmt(g.paid)} · ${g.freeDate ? `до нуля к ${monthYear(g.freeDate)} при этом темпе` : "темпа погашения нет"}` };
}

/** `события`: the theme's events this calendar month through today, and how long ago the last one was. */
function eventsTile(line: NumberLine, ctx: TileCtx): Tile {
  const mine = ctx.life.events.filter((e) => eventTheme(e) === ctx.theme && e.date <= ctx.today);
  const last = mine.map((e) => e.date).sort().pop();
  if (!last) return { label: line.label, value: "—", note: "событий нет" };
  return { label: line.label, value: String(mine.filter((e) => e.date >= monthStart(ctx.today)).length), note: `последнее — ${daysBetween(last, ctx.today)} дн назад` };
}

/** The sources that are one plain word. */
const KINDS: Record<string, (line: NumberLine, ctx: TileCtx) => Tile> = {
  "намаз": prayerTile,
  "суры": surasTile,
  "вес": weightTile,
  "отжимания": measureTile("pushups"),
  "подтягивания": measureTile("pullups"),
  "настроение": meanTile("mood"),
  "стресс": meanTile("stress"),
  "внимание": attentionTile,
  "тема": themeTile,
  "доход": incomeTile,
  "движения": movesTile,
  "близкие": closeTile,
  "встречи": meetingsTile,
  "долг": debtTile,
  "события": eventsTile,
};

export function numberTile(line: NumberLine, ctx: TileCtx): Tile {
  if (line.parts) return unionTile(line, line.parts, ctx);
  const src = line.source.trim();
  const link = wikiTarget(src);
  if (link !== undefined) {
    const h = findHabit(ctx.life, link);
    if (h) return habitTile(line, h, ctx);
    const page = ctx.vault.resolve(link);
    return page?.zone === "person" ? personTile(line, page, ctx) : unknown(line);
  }
  const goal = src.match(/^цель\s+[«"](.+)[»"]$/i)?.[1];
  if (goal) return goalTile(line, goal, ctx);
  // own keys only: a word like «constructor» must not reach Object.prototype
  const key = src.toLowerCase();
  const kind = Object.prototype.hasOwnProperty.call(KINDS, key) ? KINDS[key] : undefined;
  return kind ? kind(line, ctx) : unknown(line);
}
