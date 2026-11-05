import { useMemo, type ReactNode } from "react";
import { addDays, plural, weekdayIndex, WEEKDAYS_RU } from "../../lib/dates";
import { activities, cell, dateRange, fmt, focusFor, goalView, habitRows, plainLinks, weekCompare, weekStory, type Cell, type Stats, type WeekCompare, type Weight } from "../../lib/dashboard";
import { isoWeekKey, parseGoals } from "../../lib/goals";
import type { Life } from "../../lib/life";
import { themeColor } from "../../lib/themes";
import { Card, ClaudeBlock, Glance, GoalRow, Hero, dayMonth, short } from "./parts";

const TITLE: Record<Cell, string> = { done: "да", held: "удержался", late: "поздно", failed: "нет", fall: "срыв", unmarked: "без отметки", skip: "не в этот день", nofile: "файла дня нет", pending: "спросит в 21:00", future: "" };

/** «Неделя»: the week in four numbers beside Claude's focus; the goals and the habit grid on the left; this week against the last, what moved and what happened on the right. */
export default function Week({ life, today }: { life: Life; today: string }) {
  const wc = useMemo(() => weekCompare(life, today), [life, today]);
  const sunday = weekdayIndex(today) === 0;
  const base = sunday ? addDays(today, 1) : today; // on a Sunday Claude writes the next week
  const focusKey = isoWeekKey(base);
  const focus = focusFor(life, focusKey, isoWeekKey(addDays(base, -7)));
  const key = isoWeekKey(wc.from);
  const file = life.goals.get(key);
  const goals = file ? parseGoals(key, file) : undefined;
  const acts = useMemo(() => [...activities(life, today)].sort((a, b) => b.week - a.week), [life, today]);
  const story = useMemo(() => weekStory(life, wc.from, wc.cur.to), [life, wc]);
  const dates = dateRange(wc.from, wc.to);
  const rows = habitRows(life);
  const max = Math.max(1, ...acts.map((a) => a.week));
  const c = wc.cur;
  const none = c.recorded === 0; // no day with a mark: the counts taken from marks have nothing behind them, so «—», not a made-up 0
  const title = wc.from.slice(5, 7) === wc.to.slice(5, 7) ? `${Number(wc.from.slice(8))}–${dayMonth(wc.to)}` : `${short(wc.from)} – ${short(wc.to)}`;
  // The focus week is the hero's week except on a Sunday (Claude writes the next week) and a Monday (the hero shows the week that ended): there it is named.
  const focusTitle = focusKey === key ? "фокус недели" : sunday ? "фокус на следующую неделю" : `фокус на неделю ${Number(focusKey.slice(-2))}`;
  return (
    <>
      <Hero top kicker={`неделя ${Number(key.slice(-2))} · ${wc.to < today ? "закончилась" : `идёт ${c.length + 1}-й день`}`} title={title}
        side={<ClaudeBlock title={focusTitle} focus={focus} period="week" note="Claude пишет в воскресенье в 22:30." />}>
        <Glance items={[
          { v: c.recorded, of: `/ ${c.length}`, label: "дней с записями" },
          { v: none ? "—" : c.falls, label: plural(c.falls, "срыв", "срыва", "срывов") },
          { v: none ? "—" : c.good.done, of: none ? undefined : `/ ${c.good.total}`, label: "полезных" },
          { v: none ? "—" : c.prayer.done, of: none ? undefined : `/ ${c.prayer.due}`, label: "намазов вовремя" },
        ]} />
      </Hero>
      <div className="d-cols">
        <div className="d-stack">
          <Card title="Цели недели" right={`life/goals/${key}`}>
            {goals ? goals.goals.map((g, i) => <GoalRow key={i} g={goalView(g, life, today)} />) : <p className="d-faint">Файла недели нет — Claude создаст его в воскресенье.</p>}
            {goals && goals.tasks.length > 0 && (
              <>
                <div className="d-sub"><span className="d-kick">Задачи недели</span><span className="n">{goals.tasks.filter((t) => t.done).length} / {goals.tasks.length}</span></div>
                <ul className="d-tasks">{goals.tasks.map((t, i) => <li key={i} className={t.done ? "done" : ""}>{plainLinks(t.text)}</li>)}</ul>
              </>
            )}
          </Card>
          <Card title="Привычки — неделя" right="отметки из вечернего опроса">
            <div className="d-gridwrap">
              <table className="d-grid">
                <thead><tr><th />{dates.map((d) => <th key={d} className={d === today ? "today" : ""}>{WEEKDAYS_RU[weekdayIndex(d)]} {Number(d.slice(8))}</th>)}</tr></thead>
                <tbody>
                  {(["prayer", "bad", "good"] as const).map((kind) => (
                    <Group key={kind} label={kind === "prayer" ? "Намаз" : kind === "bad" ? "Удержался" : "Полезные"}>
                      {rows.filter((h) => h.kind === kind).map((h) => (
                        <tr key={h.rel}>
                          <td>{h.title}</td>
                          {dates.map((d) => { const v = cell(life, h, d, today); return <td key={d}><span className={`d-gd ${v}`} title={TITLE[v]} /></td>; })}
                        </tr>
                      ))}
                    </Group>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-legend">
              <span><span className="d-gd done" />да / удержался</span><span><span className="d-gd late" />поздно</span><span><span className="d-gd failed" />нет / срыв</span><span><span className="d-gd unmarked" />без отметки</span><span><span className="d-gd pending" />спросит в 21:00</span>
            </div>
          </Card>
        </div>
        <div className="d-stack">
          <VsCard wc={wc} />
          <Card title="Что сдвинулось" right="записи за 7 дней">
            {acts.map((a) => (
              <div key={a.quest.rel} className="d-mv">
                <span>{a.quest.title}</span>
                <span className="track"><span className="fill" style={{ width: `${(a.week / max) * 100}%`, background: themeColor(a.quest.theme) }} /></span>
                <span className="d-num">{a.week || "—"}</span>
              </div>
            ))}
          </Card>
          <Card title="Что было">
            {story.done.map((x) => <div key={x.date}><div className="d-day">{short(x.date)}</div><ul className="d-plain">{x.items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>)}
            {story.events.length > 0 && <><div className="d-sub"><span className="d-kick">События</span></div><ul className="d-plain">{story.events.map((e) => <li key={e.date + e.title}>{short(e.date)} — {e.title}</li>)}</ul></>}
            <div className="d-sub"><span className="d-kick">Мысли о неделе</span></div>
            {story.thoughts.length ? <ul className="d-plain">{story.thoughts.map((t, i) => <li key={i}>{short(t.date)} · {t.line}</li>)}</ul> : <p className="d-faint">Ответов на вечерние вопросы о дне за неделю нет.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return <><tr className="group"><td colSpan={8}><span className="d-kick">{label}</span></td></tr>{children}</>;
}

function VsCard({ wc }: { wc: WeekCompare }) {
  const { cur, prev } = wc;
  const thin = prev.recorded < 4;
  const avg = (o: Stats["mood"]) => (o.avg === undefined ? "—" : `${o.avg} · ${o.n} дн`);
  const kg = (w: Weight | undefined) => (w ? `${w.value} кг` : "—");
  const of = (a: number, b: number) => (b ? `${a} из ${b}` : "—");
  /** A count taken from habit marks: «—» for a week with no day marked, not a made-up 0. The coverage row above it stays a number. */
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
    ["Вес", kg(wc.curWeight), kg(wc.prevWeight)],
    ["Деньги", cur.money.days ? `${fmt(cur.money.spent)} ₸` : "—", prev.money.days ? `${fmt(prev.money.spent)} ₸` : "—"],
    ["Задачи", of(cur.tasks.done, cur.tasks.total), of(prev.tasks.done, prev.tasks.total)],
    ["Еда после 21:00", cur.mealDays ? cur.lateMeals : "—", prev.mealDays ? prev.lateMeals : "—"],
  ];
  return (
    <Card title="Неделя против прошлой">
      {thin && <div className="d-warn">Прошлая неделя записана за {prev.recorded} {plural(prev.recorded, "день", "дня", "дней")} из 7 — сравнение ненадёжно.</div>}
      <table className="d-vs">
        <thead><tr><th /><th>{short(wc.from)} – {short(wc.to)}</th><th>{short(prev.from)} – {short(prev.to)}</th></tr></thead>
        <tbody>{rows.map(([k, a, b], i) => <tr key={k} className={i === 0 ? "cov" : ""}><td>{k}</td><td>{a}</td><td className={thin ? "thin" : ""}>{b}</td></tr>)}</tbody>
      </table>
    </Card>
  );
}
