/**
 * «Главный» as a dashboard (spec v3, 2026-11-05): the numbers, signals and
 * views of its three tabs. Pure — no React, no writes — so the bot can call it
 * too (`--dashboard`). Nothing here names a habit, a person or a sum: the
 * repository is public, everything comes from the vault files.
 */
import type { CircleItem } from "./circle";
import { addDays, plural, weekdayIndex } from "./dates";
import { isoWeekKey, monthKey, parseGoalLine, parseGoals, type GoalLine, type GoalsFile } from "./goals";
import { DEBT_I_OWE, debtLeft, habitDue, isLateMeal, markOf, nowStep, type Day, type Habit, type Life, type Quest } from "./life";
import { THEMES } from "./themes";
import { heldOut } from "./wins";

export type Tab = "day" | "week" | "month";

/** The 1st opens Месяц (even on a Sunday), a Sunday opens Неделя, any other day Сегодня. */
export function defaultTab(today: string): Tab {
  if (today.endsWith("-01")) return "month";
  return weekdayIndex(today) === 0 ? "week" : "day";
}

const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
export const daysBetween = (from: string, to: string) => Math.round(dayNum(to) - dayNum(from));

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday to Sunday around a date. */
export function weekOf(date: string): { from: string; to: string } {
  const from = addDays(date, -((weekdayIndex(date) + 6) % 7));
  return { from, to: addDays(from, 6) };
}

export interface Count { due: number; done: number; late: number; failed: number; unmarked: number }

export interface Stats {
  from: string;
  to: string;
  length: number;
  /** One flag per day, oldest first: a day file with at least one habit mark. */
  coverage: boolean[];
  recorded: number;
  prayer: Count;
  falls: number;
  held: number;
  fallsBy: [string, number][];
  good: { done: number; total: number; missedBy: [string, number][] };
  mood: { avg: number | undefined; n: number };
  stress: { avg: number | undefined; n: number };
  money: { spent: number; earned: number; days: number };
  tasks: { done: number; total: number; days: number };
  lateMeals: number;
  mealDays: number;
}

const marked = (d: Day) => d.habitsDone.length + d.habitsLate.length + d.habitsFailed.length > 0;
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : undefined);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const ranked = (m: Map<string, number>): [string, number][] => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));

/**
 * The numbers of a window, as the spec reads them: a habit is known by the
 * `title` of its file, only active habits count, a day with records is a day
 * file with a mark, and nothing is filled in — no mark is «без отметки».
 */
export function windowStats(life: Life, from: string, to: string): Stats {
  const active = life.habits.filter((h) => h.status === "active");
  const range = dateRange(from, to);
  const prayer: Count = { due: 0, done: 0, late: 0, failed: 0, unmarked: 0 };
  const fallsBy = new Map<string, number>(), missedBy = new Map<string, number>();
  const mood: number[] = [], stress: number[] = [], coverage: boolean[] = [];
  const money = { spent: 0, earned: 0, days: 0 }, tasks = { done: 0, total: 0, days: 0 };
  let falls = 0, held = 0, goodDone = 0, lateMeals = 0, mealDays = 0;
  for (const date of range) {
    const d = life.days.get(date);
    coverage.push(!!d && marked(d));
    if (!d) continue;
    if (marked(d)) {
      for (const h of active) {
        if (!habitDue(h, date)) continue;
        const m = markOf(d, h.title);
        if (m === "skipped") continue;
        if (h.kind === "prayer") {
          prayer.due++;
          if (m) prayer[m]++;
          else prayer.unmarked++;
        } else if (h.kind === "bad") {
          if (m === "failed") { falls++; bump(fallsBy, h.title); } else if (m) held++;
        } else if (m === "failed") bump(missedBy, h.title);
        else if (m) goodDone++;
      }
    }
    if (d.mood !== undefined) mood.push(d.mood);
    if (d.stress !== undefined) stress.push(d.stress);
    if (d.txs.length) {
      money.days++;
      for (const t of d.txs) if (t.amount < 0) money.spent -= t.amount; else money.earned += t.amount;
    }
    if (d.tasks.length) { tasks.days++; tasks.total += d.tasks.length; tasks.done += d.tasks.filter((t) => t.done).length; }
    if (d.meals.length) { mealDays++; lateMeals += d.meals.filter(isLateMeal).length; }
  }
  const missed = ranked(missedBy);
  return {
    from, to, length: range.length, coverage, recorded: coverage.filter(Boolean).length,
    prayer, falls, held, fallsBy: ranked(fallsBy),
    good: { done: goodDone, total: goodDone + missed.reduce((a, [, n]) => a + n, 0), missedBy: missed },
    mood: { avg: avg(mood), n: mood.length }, stress: { avg: avg(stress), n: stress.length },
    money, tasks, lateMeals, mealDays,
  };
}

/**
 * Held-out run per active bad habit, longest first (`heldOut`). With `clean_since`: every day since the last failed day
 * (or since `clean_since`) counts as held. Without it: consecutive done/late marks on due days.
 */
export function streaks(life: Life, upTo: string): { habit: string; days: number }[] {
  return life.habits.filter((h) => h.status === "active" && h.kind === "bad")
    .map((h) => ({ habit: h.title, days: heldOut(h, life.days, upTo) }))
    .sort((a, b) => b.days - a.days || a.habit.localeCompare(b.habit, "ru"));
}

export interface Weight { date: string; value: number }

export function weightSeries(life: Life, upTo: string): Weight[] {
  return [...life.days.values()].filter((d) => d.weight !== undefined && d.date <= upTo)
    .map((d) => ({ date: d.date, value: d.weight as number })).sort((a, b) => a.date.localeCompare(b.date));
}

/** The latest weight and the last one taken at least 7 days before it. */
export function weightNow(life: Life, upTo: string): { last: Weight; before: Weight | undefined } | undefined {
  const ws = weightSeries(life, upTo);
  const last = ws[ws.length - 1];
  return last ? { last, before: ws.filter((w) => w.date <= addDays(last.date, -7)).pop() } : undefined;
}

/**
 * The 21-day trend carried to the deadline: does it reach the target? The direction is read from the first weight of
 * the window, so a target the last weight has already reached or passed is on track. Fewer than two weights — no data.
 */
export function weightPace(life: Life, today: string, target: number, by: string): "behind" | "ontrack" | "nodata" {
  const pts = weightSeries(life, today).filter((w) => w.date >= addDays(today, -21));
  if (pts.length < 2) return "nodata";
  const xs = pts.map((p) => dayNum(p.date)), ys = pts.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0;
  const last = pts[pts.length - 1];
  const down = target < pts[0].value;
  if (down ? last.value <= target : last.value >= target) return "ontrack";
  const projected = last.value + slope * (dayNum(by) - dayNum(last.date));
  return (down ? projected <= target : projected >= target) ? "ontrack" : "behind";
}

export const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ");
export const plainLinks = (s: string) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");

/**
 * A «## Сейчас» line as the activity list shows it, in plain words: no leading date (nor the separator after it), wikilinks
 * and `[text](url)` reduced to their text, no backticks, no owner « — ты» (the reader is the owner). « — Claude» stays: it says who does the step.
 */
export function plainStep(s: string): string {
  return plainLinks(s).trim()
    .replace(/^\d{4}-\d{2}-\d{2}\s+(?:[·—–:]\s+)?/, "")
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\s+—\s+ты\s*$/i, "")
    .trim();
}

export const PRAYER_ORDER = ["Фаджр", "Зухр", "Жума", "Аср", "Магриб", "Иша", "Витр"];
const KIND_RANK: Record<Habit["kind"], number> = { prayer: 0, bad: 1, good: 2 };

/** Active habits in the bot's order: prayers by the time of day, then held out, then good. */
export function habitRows(life: Life): Habit[] {
  const pr = (t: string) => { const i = PRAYER_ORDER.indexOf(t); return i < 0 ? PRAYER_ORDER.length : i; };
  return life.habits.filter((h) => h.status === "active")
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || pr(a.title) - pr(b.title) || a.title.localeCompare(b.title, "ru"));
}

export type ActState = "overdue" | "empty" | "idle" | "moving";
/** Worst first: what does not move goes to the top. */
export const ACT_RANK: Record<ActState, number> = { overdue: 0, empty: 1, idle: 2, moving: 3 };

export interface ActivityView {
  quest: Quest;
  state: ActState;
  /** The latest day it moved: a journal line, a ticked step, a session. */
  last: string | undefined;
  idle: number | undefined;
  /** Moves in the last 7 days, today included. */
  week: number;
  now: string | undefined;
}

function moves(q: Quest, days: Map<string, Day>, today: string): string[] {
  const journal = ("\n" + q.body).split(/\n## /).find((s) => s.startsWith("Журнал")) ?? "";
  const dates = [...journal.matchAll(/^- (\d{4}-\d{2}-\d{2})/gm), ...q.body.matchAll(/✓\s*(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  for (const d of days.values()) if (d.sessions.some((s) => s.quest === q.title)) dates.push(d.date);
  return dates.filter((d) => d <= today);
}

/** Overdue past `due:`, empty with no move at all, idle after 3 quiet days (daily, пн–пт) or 10 (the rest), else moving. */
export function activityView(q: Quest, days: Map<string, Day>, today: string): ActivityView {
  const ds = moves(q, days, today);
  const last = ds.length ? ds.reduce((a, b) => (a > b ? a : b)) : undefined;
  const idle = last ? daysBetween(last, today) : undefined;
  const limit = /кажд|пн/i.test(q.cadence ?? "") ? 3 : 10;
  const state: ActState = q.due && q.due < today ? "overdue" : idle === undefined ? "empty" : idle >= limit ? "idle" : "moving";
  return { quest: q, state, last, idle, week: ds.filter((d) => d >= addDays(today, -6)).length, now: nowStep(q.body) };
}

export function activities(life: Life, today: string): ActivityView[] {
  return life.quests.filter((q) => q.status === "active").map((q) => activityView(q, life.days, today))
    .sort((a, b) => ACT_RANK[a.state] - ACT_RANK[b.state] || a.quest.title.localeCompare(b.quest.title, "ru"));
}

export type GoalChip = "hot" | "done" | "behind" | "ontrack" | "nodata";
export interface GoalView { line: GoalLine; chip: GoalChip | undefined; now: string | undefined; placeholder: boolean }

const kgTarget = (title: string) => { const m = title.match(/(\d+(?:[.,]\d+)?)\s*кг/); return m ? Number(m[1].replace(",", ".")) : undefined; };

/**
 * A goal's chip: hot when its date is 3 days off or past, done with ✓. For
 * weight and income the app reads «сейчас» from the days itself; any other
 * goal shows its own «сейчас:» and gets no chip unless that is empty.
 */
export function goalView(text: string, life: Life, today: string): GoalView {
  const line = parseGoalLine(text);
  if (/^\(/.test(line.title)) return { line, chip: undefined, now: undefined, placeholder: true };
  if (line.doneOn) return { line, chip: "done", now: line.now, placeholder: false };
  const measure = (line.measure ?? "").toLowerCase();
  let now = line.now && !/^(—|-|нет данных)/i.test(line.now) ? line.now : undefined;
  let chip: GoalChip | undefined = now ? undefined : "nodata";
  if (/вес/.test(measure)) {
    const w = weightNow(life, today), target = kgTarget(line.title);
    now = w ? `${w.last.value} кг (${w.last.date})` : undefined;
    chip = w && target && line.due ? weightPace(life, today, target, line.due) : "nodata";
  } else if (/доход/.test(measure)) {
    const s = windowStats(life, `${today.slice(0, 7)}-01`, today);
    now = s.money.days ? `${fmt(s.money.earned)} ₸ за месяц` : undefined;
    chip = now ? undefined : "nodata";
  }
  if (line.due && line.due <= addDays(today, 3)) chip = "hot";
  return { line, chip, now, placeholder: false };
}

/** The nearest open goal measured in weight, from the week, month and year files. */
export function weightGoal(life: Life, today: string): { target: number; by: string } | undefined {
  for (const key of [isoWeekKey(today), monthKey(today), today.slice(0, 4)]) {
    const c = life.goals.get(key);
    for (const g of c ? parseGoals(key, c).goals.map(parseGoalLine) : []) {
      const target = kgTarget(g.title);
      if (/вес/i.test(g.measure ?? "") && target && g.due && g.due >= today && !g.doneOn) return { target, by: g.due };
    }
  }
  return undefined;
}

export interface Rung { label: string; key: string | undefined; goals: GoalView[]; tasks: { done: number; total: number } }

/** Five years → year → month → week. Five-year goals carry no measure, so no chip. */
export function ladder(life: Life, today: string): Rung[] {
  const year = today.slice(0, 4);
  const five = [...life.goals].find(([, c]) => /^period:\s*five\s*$/m.test(c)) ?? [...life.goals].find(([k]) => /^\d{4}$/.test(k) && k > year);
  const rung = (label: string, key: string | undefined, chips = true): Rung => {
    const c = key ? life.goals.get(key) : undefined;
    const f = key && c ? parseGoals(key, c) : undefined;
    const goals = (f?.goals ?? []).map((g) => goalView(g, life, today)).map((g) => (chips ? g : { ...g, chip: undefined }));
    return { label, key: f ? key : undefined, goals, tasks: { done: f?.tasks.filter((t) => t.done).length ?? 0, total: f?.tasks.length ?? 0 } };
  };
  return [rung("5 лет", five?.[0], false), rung("Год", year), rung("Месяц", monthKey(today)), rung("Неделя", isoWeekKey(today))];
}

export interface Signal { level: "red" | "gold"; title: string; fact: string; source: string }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nDays = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;
function dueWords(due: string, today: string): string {
  const n = daysBetween(today, due);
  return n < 0 ? `срок прошёл ${nDays(-n)} назад` : n === 0 ? "срок сегодня" : n === 1 ? "срок завтра" : `срок через ${nDays(n)}`;
}

/** «Горит», at most four: dates first, then late meals (red), then good habits and what does not move (gold). */
export function signals(life: Life, today: string): Signal[] {
  const out: Signal[] = [];
  const seen = new Set<string>();
  for (const key of [monthKey(today), isoWeekKey(today), today.slice(0, 4)]) {
    const c = life.goals.get(key);
    for (const g of c ? parseGoals(key, c).goals.map((t) => goalView(t, life, today)) : []) {
      if (g.chip !== "hot" || !g.line.due || seen.has(g.line.due)) continue;
      seen.add(g.line.due);
      out.push({ level: "red", title: `${cap(dueWords(g.line.due, today))} — ${g.line.title}`, fact: [`сейчас: ${g.now ?? "—"}`, g.line.measure ? `мера: ${g.line.measure}` : ""].filter(Boolean).join(" · "), source: `цели ${key}` });
    }
  }
  const acts = activities(life, today);
  for (const a of acts) {
    const due = a.quest.due;
    if (due && due >= today && due <= addDays(today, 3)) out.push({ level: "red", title: `${cap(dueWords(due, today))} — ${a.quest.title}`, fact: a.now ? plainStep(a.now) : "", source: "деятельность" });
  }
  const s = windowStats(life, addDays(today, -7), addDays(today, -1));
  if (s.lateMeals) out.push({ level: "red", title: `Еда после 21:00 — ${s.lateMeals} ${plural(s.lateMeals, "раз", "раза", "раз")} за неделю`, fact: `записи еды за ${nDays(s.mealDays)}`, source: "файлы дней, ## Еда" });
  if (s.good.total && s.good.done / s.good.total < 0.3) out.push({ level: "gold", title: `Полезные привычки — ${s.good.done} из ${s.good.total} за 7 дней`, fact: s.good.missedBy.map(([t, n]) => `${t} ${n}`).join(" · "), source: "вечерний опрос" });
  const stuck = acts.filter((a) => a.state !== "moving");
  if (stuck.length) {
    const group = (st: ActState, head: string, item: (a: ActivityView) => string) => {
      const xs = stuck.filter((a) => a.state === st);
      return xs.length ? `${head}: ${xs.map(item).join(", ")}` : "";
    };
    const fact = [group("overdue", "срок прошёл", (a) => a.quest.title), group("empty", "записей нет", (a) => a.quest.title), group("idle", "стоят", (a) => `${a.quest.title} ${a.idle} дн`)].filter(Boolean).join(" · ");
    out.push({ level: "gold", title: `Не движутся ${stuck.length} из ${acts.length} ${plural(acts.length, "деятельности", "деятельностей", "деятельностей")}`, fact, source: "деятельности: журнал, шаги, сессии" });
  }
  return out.slice(0, 4);
}

export interface Focus { key: string; lines: string[]; on: string | undefined; stale: boolean }

/** Claude's `## Фокус` of a period; when it is missing, the previous period's lines, marked stale. */
export function focusFor(life: Life, key: string, prevKey: string): Focus {
  const read = (k: string): GoalsFile | undefined => { const c = life.goals.get(k); return c ? parseGoals(k, c) : undefined; };
  const cur = read(key);
  if (cur?.focus.length) return { key, lines: cur.focus, on: cur.focusOn, stale: false };
  const prev = read(prevKey);
  return { key, lines: prev?.focus ?? [], on: prev?.focusOn, stale: !!prev?.focus.length };
}

/** The bullets under `## Ждёт …` in life/now.md, links reduced to their text. */
export function waiting(life: Life): string[] {
  const lines = (life.now ?? "").split("\n");
  const at = lines.findIndex((l) => /^## Ждёт/.test(l));
  const out: string[] = [];
  for (const l of at < 0 ? [] : lines.slice(at + 1)) {
    if (/^## /.test(l)) break;
    const m = l.match(/^\s*-\s+(.+)$/);
    if (m) out.push(plainLinks(m[1]).trim());
  }
  return out;
}

const REFLECT = /^-\s*(Недоволен|Мог бы изменить|Хотел, но не сделал|Благодарен):/;
/** The four evening questions about the day, as the bot writes them into `## Журнал`. */
export function reflections(d: Day | undefined): string[] {
  return d ? d.journal.split("\n").filter((l) => REFLECT.test(l)).map((l) => l.replace(/^-\s*/, "")) : [];
}

export interface Yesterday {
  date: string;
  day: Day | undefined;
  prayer: { done: string[]; late: string[]; failed: string[] };
  falls: string[];
  goodDone: string[];
  goodMissed: string[];
  reflections: string[];
}

export function yesterdayView(life: Life, today: string): Yesterday {
  const date = addDays(today, -1);
  const d = life.days.get(date);
  const rows = habitRows(life).filter((h) => habitDue(h, date));
  const titles = (kind: Habit["kind"], ok: (m: string | undefined) => boolean) => (d ? rows.filter((h) => h.kind === kind && ok(markOf(d, h.title))).map((h) => h.title) : []);
  return {
    date, day: d,
    prayer: { done: titles("prayer", (m) => m === "done"), late: titles("prayer", (m) => m === "late"), failed: titles("prayer", (m) => m === "failed") },
    falls: titles("bad", (m) => m === "failed"),
    goodDone: titles("good", (m) => m === "done" || m === "late"),
    goodMissed: titles("good", (m) => m === "failed"),
    reflections: reflections(d),
  };
}

export type Cell = "done" | "late" | "failed" | "held" | "fall" | "unmarked" | "skip" | "nofile" | "pending" | "future";

/** One square of the week grid. Today waits for the 21:00 survey; a bad habit is held or a fall. */
export function cell(life: Life, h: Habit, date: string, today: string): Cell {
  if (date > today) return "future";
  if (!habitDue(h, date)) return "skip";
  const d = life.days.get(date);
  const m = d ? markOf(d, h.title) : undefined;
  if (!m) return date === today ? "pending" : d ? "unmarked" : "nofile";
  if (m === "skipped") return "skip";
  if (h.kind === "bad") return m === "failed" ? "fall" : "held";
  return m;
}

export interface WeekCompare { from: string; to: string; cur: Stats; prev: Stats; curWeight: Weight | undefined; prevWeight: Weight | undefined }

/** The week on screen — on a Monday the one that just ended — up to yesterday, against the full week before it. */
export function weekCompare(life: Life, today: string): WeekCompare {
  const yesterday = addDays(today, -1);
  const wk = weekOf(weekdayIndex(today) === 1 ? yesterday : today);
  const to = wk.to < yesterday ? wk.to : yesterday;
  const pw = weekOf(addDays(wk.from, -1));
  const lastIn = (from: string, upTo: string) => weightSeries(life, upTo).filter((w) => w.date >= from).pop();
  return { from: wk.from, to: wk.to, cur: windowStats(life, wk.from, to), prev: windowStats(life, pw.from, pw.to), curWeight: lastIn(wk.from, to), prevWeight: lastIn(pw.from, pw.to) };
}

export interface Story { done: { date: string; items: string[] }[]; events: { date: string; title: string }[]; thoughts: { date: string; line: string }[] }

export function weekStory(life: Life, from: string, to: string): Story {
  const ds = dateRange(from, to);
  return {
    done: ds.map((date) => ({ date, items: (life.days.get(date)?.done ?? []).map(plainLinks) })).filter((x) => x.items.length),
    events: life.events.filter((e) => e.date >= from && e.date <= to).map((e) => ({ date: e.date, title: e.title })).reverse(),
    thoughts: ds.flatMap((date) => reflections(life.days.get(date)).map((line) => ({ date, line }))),
  };
}

export interface DayPoint { date: string; stats: Stats | undefined; weight: number | undefined }

export function series(life: Life, from: string, to: string): DayPoint[] {
  return dateRange(from, to).map((date) => {
    const d = life.days.get(date);
    return { date, stats: d ? windowStats(life, date, date) : undefined, weight: d?.weight };
  });
}

export interface Sphere { theme: string; ru: string; color: string; acts: ActivityView[]; state: ActState | "none"; fact: string }

/** The eight themes: their activities, the worst state among them, and one number each (spec v3 «Сферы»). */
export function spheres(life: Life, circle: CircleItem[], today: string): Sphere[] {
  const yesterday = addDays(today, -1);
  const acts = activities(life, today);
  const m30 = windowStats(life, addDays(today, -30), yesterday);
  const w7 = windowStats(life, addDays(today, -7), yesterday);
  const month = windowStats(life, `${today.slice(0, 7)}-01`, yesterday);
  const w = weightNow(life, today); // through today, as goalView reads it
  const pr = m30.prayer;
  const debt = life.debts.filter((d) => d.direction === DEBT_I_OWE && !d.closed).reduce((a, d) => a + debtLeft(d), 0);
  const quiet = (theme: string) => quietPeople(circle.filter((c) => c.page.theme === theme), 1)[0];
  const lastEvent = life.events.find((e) => e.date <= today); // newest first
  const fact: Record<string, string> = {
    "Business & career": month.money.days ? `доход за месяц: ${fmt(month.money.earned)} ₸` : "доход за месяц не записан",
    "Spirituality & Religion": pr.due ? `намаз за 30 дней: ${pr.done} вовремя, ${pr.late} поздно, ${pr.failed} пропущено, ${pr.unmarked} без отметки` : "намаз за 30 дней: нет отметок",
    "Health & sport": `${w ? `вес ${w.last.value} кг (${w.last.date})` : "веса нет"} · ${w7.mealDays ? `еда после 21:00 за неделю: ${w7.lateMeals} (записи за ${w7.mealDays} из 7 дн.)` : "записей еды нет"}`,
    "Finance & money": debt ? `долги: ${fmt(debt)} ₸` : "долгов нет",
    "Memories & Fun": lastEvent ? `последнее событие: ${lastEvent.title}, ${lastEvent.date}` : "событий нет",
  };
  for (const t of ["Family & relationship", "Social & friends"]) {
    const q = quiet(t);
    fact[t] = q ? `${q.name}: ${q.sinceContact} дн без контакта` : "контактов не отмечено";
  }
  return THEMES.map((t) => {
    const mine = acts.filter((a) => a.quest.theme === t.name);
    const state = mine.length ? mine.reduce<ActState>((worst, a) => (ACT_RANK[a.state] < ACT_RANK[worst] ? a.state : worst), "moving") : "none";
    return { theme: t.name, ru: t.ru, color: t.color, acts: mine, state, fact: fact[t.name] ?? "" };
  });
}

/** Close people (closeness ≥ 7) by the days since the last marked contact. */
export function quietPeople(circle: CircleItem[], n = 6): CircleItem[] {
  return circle.filter((c) => (c.closeness ?? 0) >= 7 && c.sinceContact !== undefined).sort((a, b) => b.sinceContact! - a.sinceContact!).slice(0, n);
}
