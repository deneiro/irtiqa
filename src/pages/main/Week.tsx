import { useMemo, useState } from "react";
import { addDays, plural, weekdayIndex, WEEKDAYS_RU } from "../../lib/dates";
import { actName, activities, cell, dateRange, dayMonth, fmt, focusFor, habitRows, offWeekday, weekCompare, weekStory, weightSeries, type Cell, type Stats, type WeekCompare } from "../../lib/dashboard";
import { focusWeekKey, isoWeekKey, parseGoals } from "../../lib/goals";
import { emptyDay, markOf, withMark, type DayMark, type Habit, type Life } from "../../lib/life";
import { themeColor } from "../../lib/themes";
import { ClaudeBlock, TaskLine, short } from "./parts";
import { findItem, taskId } from "../../lib/bank";
import { stripCarry } from "../../lib/carry";
import { useBank } from "./Levels";
import { PickSlots } from "./Pick";
import { BANNER } from "../../assets/play";
import { dayUrl } from "../../components/GameBits";
import { climbSummary, heights, type DayHeight } from "../../lib/game";
import { useGame } from "../../lib/useGame";
import { useStore } from "../../store";
import { Block, GameBand, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./Scene";

const TITLE: Record<Cell, string> = { done: "да", held: "удержался", late: "поздно", failed: "нет", fall: "срыв", unmarked: "без отметки", skip: "не в этот день", nofile: "файла дня нет", pending: "ещё не отмечено", future: "" };
/** The seven summits of the painting, left to right: Monday … Sunday. */
const PEAKS: [number, number][] = [[675, 318], [805, 273], [933, 285], [1068, 260], [1200, 222], [1342, 260], [1467, 273]];
const RING = 2 * Math.PI * 25;

/**
 * «Неделя» (rebuilt 2026-11-21 the way «Сегодня» is): seven painted summits, one for each day, with a beacon lit to the
 * height the day took — a beacon opens its day. Beside the scene Claude's focus; below the week in game numbers, the
 * week's tasks of level IV, the habits of the week as a grid that is marked by a tap, this week against the last, what
 * moved and what happened.
 */
export default function Week({ life, today }: { life: Life; today: string }) {
  const wc = useMemo(() => weekCompare(life, today), [life, today]);
  const sunday = weekdayIndex(today) === 0;
  const focusKey = focusWeekKey(today); // on a Sunday Claude writes the next week
  const focus = focusFor(life, focusKey, focusWeekKey(addDays(today, -7)));
  const key = isoWeekKey(wc.from);
  const file = life.goals.get(key);
  const goals = file ? parseGoals(key, file) : undefined;
  const bank = useBank(life);
  const acts = useMemo(() => [...activities(life, today)].sort((a, b) => b.week - a.week), [life, today]);
  // The week's level-IV tasks: done when ticked in the week, or when the bank counts it done (ticked in a day or the bank).
  const wt = (goals?.tasks ?? []).map((t) => { const id = taskId(stripCarry(t.text)).id; const item = id ? findItem(bank, id) : undefined; return { text: t.text, item, done: t.done || !!item?.done }; });
  const doneN = wt.filter((t) => t.done).length;
  const pct = wt.length ? Math.round((doneN / wt.length) * 100) : 0;
  const story = useMemo(() => weekStory(life, wc.from, wc.cur.to), [life, wc]);
  const dates = dateRange(wc.from, wc.to);
  const max = Math.max(1, ...acts.map((a) => a.week));
  const game = useGame();
  const climb = useMemo(() => (game ? heights(game.habits, life.days, dates, today, game.xpOf) : []), [game, life, wc, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = climbSummary(climb);
  const title = wc.from.slice(5, 7) === wc.to.slice(5, 7) ? `${Number(wc.from.slice(8))}–${dayMonth(wc.to)}` : `${short(wc.from)} – ${short(wc.to)}`;
  // The focus week is the scene's week except on a Sunday (Claude writes the next week) and a Monday (the scene shows the week that ended): there it is named.
  const focusTitle = focusKey === key ? "фокус недели" : sunday ? "фокус на следующую неделю" : `фокус на неделю ${Number(focusKey.slice(-2))}`;
  return (
    <div className="g-play">
      <div className="g-top">
        <SceneFrame art={BANNER.week} svg={<Ridge days={climb} today={today} />}>
          <SceneTitle kicker={`неделя ${Number(key.slice(-2))} · ${wc.to < today ? "закончилась" : `идёт ${wc.cur.length + 1}-й день`}`} title={title} />
          <SceneNumber value={sum.passed ? sum.avg : "—"} unit={sum.passed ? "%" : undefined} label="средняя высота" sub={sum.best ? <>лучший день — {WEEKDAYS_RU[weekdayIndex(sum.best.date)]}, {sum.best.pct} %</> : "вершина открывает свой день"} />
        </SceneFrame>
        <SideCard kicker={`Claude · ${focusTitle}`}>
          <div className="g-claude"><ClaudeBlock title={focusTitle} focus={focus} period="week" note="Claude пишет в воскресенье в 22:30." /></div>
          <div className="g-side-foot"><span className="g-bar"><i style={{ width: `${pct}%` }} /></span><span>задания недели: {doneN} из {wt.length || "—"}</span></div>
        </SideCard>
      </div>

      {game && <GameBand game={game} s={sum} stretch="неделю" />}

      <Block title="Привычки недели" right="нажми на кружок — отметка дня: да → нет → пусто, намаз: вовремя → поздно → пропустил">
        <WeekGrid life={life} dates={dates} today={today} />
      </Block>

      <div className="g-two">
        <Block title="Задания недели · уровень IV" right={`${doneN} из ${wt.length} · до пяти, только из целей месяца`}>
          <PickSlots life={life} today={today} bank={bank} mode="week" />
        </Block>
        <Versus wc={wc} life={life} today={today} />
      </div>

      <div className="g-two">
        <Block title="Что сдвинулось" right="минуты по деятельностям за 7 дней">
          {!acts.length && <p className="g-faint">Деятельностей нет.</p>}
          {acts.map((a) => (
            <div key={a.quest.rel} className="g-mv">
              <span>{actName(a.quest).name}</span>
              <i><u style={{ width: `${(a.week / max) * 100}%`, background: themeColor(a.quest.theme) }} /></i>
              <b>{a.week || "—"}</b>
            </div>
          ))}
        </Block>
        <Block title="Что было" right="из «Сделано» по дням">
          {wt.some((t) => t.done) && <ul className="g-plain done">{wt.filter((t) => t.done).map((t, i) => <li key={i}><TaskLine text={t.text} today={today} /></li>)}</ul>}
          {story.done.map((x) => <div key={x.date} className="g-story"><b>{short(x.date)}</b><ul className="g-plain">{x.items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>)}
          {!story.done.length && !wt.some((t) => t.done) && <p className="g-faint">За неделю ничего не записано в «Сделано» — строку можно добавить на «Сегодня».</p>}
        </Block>
      </div>
    </div>
  );
}

/** The ridge over the painting: a line from summit to summit, walked up to today, and over every summit a beacon with the day's height. */
function Ridge({ days, today }: { days: DayHeight[]; today: string }) {
  if (days.length !== PEAKS.length) return null;
  const line = (pts: [number, number][]) => `M${pts.map((p) => p.join(",")).join(" L")}`;
  const upTo = days.filter((d) => !d.future).length;
  return (
    <g className="g-ridge">
      <path className="trail" d={line(PEAKS)} />
      {upTo > 1 && <path className="walked" d={line(PEAKS.slice(0, upTo))} />}
      {days.map((h, i) => {
        const [x, y] = PEAKS[i];
        const cy = y - 54;
        const state = h.future ? "future" : h.pct >= 100 ? "summit" : h.pct >= 50 ? "half" : h.pct > 0 ? "some" : "none";
        const text = `${WEEKDAYS_RU[weekdayIndex(h.date)]} ${Number(h.date.slice(8))} · ${h.future ? "впереди" : `${h.pct} %`}`;
        const body = (
          <>
            <line className="stem" x1={x} y1={y - 6} x2={x} y2={cy + 26} />
            {h.date === today && <circle className="halo" cx={x} cy={cy} r="40" />}
            <circle className="disc" cx={x} cy={cy} r="25" />
            {!h.future && h.pct > 0 && <circle className="arc" cx={x} cy={cy} r="25" strokeDasharray={`${(Math.min(h.pct, 100) / 100) * RING} ${RING}`} transform={`rotate(-90 ${x} ${cy})`} />}
            <text className="n" x={x} y={cy + 7} textAnchor="middle">{h.future ? Number(h.date.slice(8)) : h.pct}</text>
            <text className="wd" x={x} y={cy - 38} textAnchor="middle">{WEEKDAYS_RU[weekdayIndex(h.date)]}</text>
          </>
        );
        return h.future
          ? <g key={h.date} className={`beacon ${state}`} aria-label={text}>{body}</g>
          : <a key={h.date} href={`#${dayUrl(h.date)}`} className={`beacon ${state}${h.date === today ? " today" : ""}`} aria-label={`${text} — открыть день`}><title>{text}</title>{body}</a>;
      })}
    </g>
  );
}

/** The habits of the week, one circle a day. A tap marks the day — the same marks «Сегодня» and the bot write. */
function WeekGrid({ life, dates, today }: { life: Life; dates: string[]; today: string }) {
  const { saveDayMerged } = useStore();
  const [err, setErr] = useState<string>();
  const rows = habitRows(life);
  const tap = (h: Habit, date: string) => {
    const base = life.days.get(date) ?? emptyDay(date);
    if (base.closed) { setErr(`${short(date)} — день закрыт, его не правят.`); return; }
    const order: (DayMark | undefined)[] = h.kind === "prayer" ? [undefined, "done", "late", "failed"] : [undefined, "done", "failed"];
    const next = order[(order.indexOf(markOf(base, h.title)) + 1) % order.length];
    saveDayMerged(base, withMark(base, h.title, next)).then(() => setErr(undefined), (e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  };
  return (
    <>
      <div className="g-wgrid" style={{ gridTemplateColumns: `minmax(150px, 1.6fr) repeat(${dates.length}, minmax(34px, 1fr))` }}>
        <span />
        {dates.map((d) => <span key={d} className={`h${d === today ? " today" : ""}`}>{WEEKDAYS_RU[weekdayIndex(d)]} <em>{Number(d.slice(8))}</em></span>)}
        {(["prayer", "bad", "good"] as const).map((kind) => {
          const of = rows.filter((h) => h.kind === kind);
          if (!of.length) return null;
          return [
            <span key={kind} className="grp" style={{ gridColumn: `1 / span ${dates.length + 1}` }}>{kind === "prayer" ? "Намаз" : kind === "bad" ? "Держусь" : "Полезные"}</span>,
            ...of.flatMap((h) => [
              <span key={h.rel} className="nm">{h.title}</span>,
              ...dates.map((d) => {
                const v = cell(life, h, d, today);
                if (v === "future" || (v === "skip" && (offWeekday(h, d) || Array.isArray(h.freq)))) return <span key={h.rel + d} className="c off" />;
                if (v === "skip") return <span key={h.rel + d} className="c off" title={TITLE.skip} />;
                return <button key={h.rel + d} className={`c ${v}`} title={`${h.title} · ${short(d)} · ${TITLE[v]}`} aria-label={`${h.title}, ${short(d)}: ${TITLE[v]}`} onClick={() => tap(h, d)} />;
              }),
            ]),
          ];
        })}
      </div>
      <div className="g-legend"><span><i className="c done" />да · вовремя · удержался</span><span><i className="c late" />поздно</span><span><i className="c failed" />нет · срыв</span><span><i className="c unmarked" />без отметки</span></div>
      {err && <p className="g-error" role="alert">{err}</p>}
    </>
  );
}

/** This week against the last, row by row; a thin last week is said, not hidden. */
function Versus({ wc, life, today }: { wc: WeekCompare; life: Life; today: string }) {
  const { cur, prev } = wc;
  const thin = prev.recorded < 4;
  const avg = (o: Stats["mood"]) => (o.avg === undefined ? "—" : `${o.avg} · ${o.n} дн`);
  const ws = weightSeries(life, today);
  /** The first and the last weight of a week and what changed: «92 → 90,5 кг (−1,5)». */
  const kg = (from: string, to: string) => {
    const w = ws.filter((x) => x.date >= from && x.date <= to);
    if (!w.length) return "—";
    const a = w[0].value, b = w[w.length - 1].value, d = Math.round((b - a) * 10) / 10;
    return w.length === 1 ? `${a} кг` : `${a} → ${b} кг (${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)})`;
  };
  const of = (a: number, b: number) => (b ? `${a} из ${b}` : "—");
  /** A count taken from habit marks: «—» for a week with no day marked, not a made-up 0. */
  const fromMarks = (s: Stats, n: number) => (s.recorded ? n : "—");
  const rows: [string, string | number, string | number][] = [
    ["Дни с записями", `${cur.recorded} из ${cur.length}`, `${prev.recorded} из ${prev.length}`],
    ["Намаз вовремя", fromMarks(cur, cur.prayer.done), fromMarks(prev, prev.prayer.done)],
    ["Намаз поздно", fromMarks(cur, cur.prayer.late), fromMarks(prev, prev.prayer.late)],
    ["Намаз пропущен", fromMarks(cur, cur.prayer.failed), fromMarks(prev, prev.prayer.failed)],
    ["Намаз без отметки", fromMarks(cur, cur.prayer.unmarked), fromMarks(prev, prev.prayer.unmarked)],
    ["Срывы", fromMarks(cur, cur.falls), fromMarks(prev, prev.falls)],
    ["Полезные", of(cur.good.done, cur.good.total), of(prev.good.done, prev.good.total)],
    ["Настроение", avg(cur.mood), avg(prev.mood)],
    ["Стресс", avg(cur.stress), avg(prev.stress)],
    ["Вес", kg(wc.from, wc.to), kg(prev.from, prev.to)],
    ["Деньги", cur.money.days ? `${fmt(cur.money.spent)} ₸` : "—", prev.money.days ? `${fmt(prev.money.spent)} ₸` : "—"],
    ["Задачи", of(cur.tasks.done, cur.tasks.total), of(prev.tasks.done, prev.tasks.total)],
    ["Еда после 21:00", cur.mealDays ? cur.lateMeals : "—", prev.mealDays ? prev.lateMeals : "—"],
  ];
  return (
    <Block title="Неделя против прошлой" right={`${short(wc.from)} – ${short(wc.to)} · ${short(prev.from)} – ${short(prev.to)}`}>
      {thin && <p className="g-warn">Прошлая неделя записана за {prev.recorded} {plural(prev.recorded, "день", "дня", "дней")} из 7 — сравнение ненадёжно.</p>}
      <div className="g-vs">
        <span /><b>эта</b><b>прошлая</b>
        {rows.flatMap(([k, a, b]) => [<span key={k}>{k}</span>, <em key={k + "a"}>{a}</em>, <em key={k + "b"} className={thin ? "thin" : ""}>{b}</em>])}
      </div>
    </Block>
  );
}
