import { useMemo, type ReactNode } from "react";
import { buildCircle } from "../../lib/circle";
import { addDays, plural } from "../../lib/dates";
import { focusFor, ladder, quietPeople, series, spheres, weightGoal, weightSeries, type ActState } from "../../lib/dashboard";
import { monthKey } from "../../lib/goals";
import type { Life } from "../../lib/life";
import { themeRu } from "../../lib/themes";
import type { Vault } from "../../lib/types";
import { Card, ClaudeBlock, Columns, CoverageDots, Glance, GoalRow, HEX, Hero, Points, Status, WeightLine, short, type Tone } from "./parts";

const STATE: Record<ActState | "none", [string, Tone]> = {
  overdue: ["срок прошёл", "ember"], empty: ["записей нет", "honey"], idle: ["стоит", "honey"], moving: ["движется", "sage"], none: ["нет деятельности", "smoke"],
};
const MONTH = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
/** One coloured part of a day column — typed, so `.map` does not widen it to `(string | number)[]`. */
const seg = (v: number, c: string): [number, string] => [v, c];

/** «Месяц»: where he stands and where he goes — the month in four numbers beside Claude's reading, the ascent of goals, 30 days in charts, the eight themes, people gone quiet. */
export default function Month({ life, vault, today }: { life: Life; vault: Vault; today: string }) {
  const yesterday = addDays(today, -1);
  const focus = focusFor(life, monthKey(today), monthKey(addDays(`${today.slice(0, 7)}-01`, -1)));
  const rungs = useMemo(() => ladder(life, today), [life, today]);
  const pts = useMemo(() => series(life, addDays(yesterday, -29), yesterday), [life, yesterday]);
  const circle = useMemo(() => buildCircle(vault.pages.filter((p) => p.zone === "person"), life.events, today), [vault, life, today]);
  const goal = weightGoal(life, today);
  const weights = weightSeries(life, yesterday).filter((w) => w.date >= addDays(yesterday, -60));
  const rec = pts.filter((p) => p.stats?.recorded);
  const prayed = rec.reduce((a, p) => { const c = p.stats!.prayer; return { done: a.done + c.done, marked: a.marked + c.done + c.late + c.failed }; }, { done: 0, marked: 0 });
  const falls = pts.reduce((a, p) => a + (p.stats?.falls ?? 0), 0);
  const none = rec.length === 0; // no day with a mark: the counts taken from marks have nothing behind them, so «—», not a made-up 0
  const quiet = quietPeople(circle);
  const last = weights[weights.length - 1];
  const maxDue = Math.max(1, ...pts.map((p) => p.stats?.prayer.due ?? 0));
  const maxFalls = Math.max(3, ...pts.map((p) => p.stats?.falls ?? 0));
  const moodDays = pts.filter((p) => p.stats?.mood.n).length;
  const monthDays = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  return (
    <>
      <Hero top kicker={`месяц · ${Number(today.slice(8))}-й день из ${monthDays}`} title={<>{MONTH[Number(today.slice(5, 7)) - 1]} <span className="yr">{today.slice(0, 4)}</span></>}
        side={<ClaudeBlock title="где ты и куда идёшь" focus={focus} period="month" note="Claude пишет 1-го в 06:00." />}>
        <Glance items={[
          { v: rec.length, of: `/ ${pts.length}`, label: "дней с записями" },
          { v: prayed.marked ? prayed.done : "—", of: prayed.marked ? `/ ${prayed.marked}` : undefined, label: "намазов вовремя" }, // «—» also for «0 / 0»: days are recorded, no prayer was marked
          { v: none ? "—" : falls, label: plural(falls, "срыв", "срыва", "срывов") },
          { v: last ? last.value : "—", of: last ? "кг" : undefined, label: goal ? `вес, цель ${goal.target}` : "вес" },
        ]} />
      </Hero>
      <Card title="Куда двигаюсь" right="восхождение: неделя → месяц → год → пять лет" className="d-full">
        <div className="d-stairs">
          {[...rungs].reverse().map((r) => (
            <div key={r.label} className="d-step">
              <h3><b>{r.label}</b><span className="d-kick">{r.key ?? "файла нет"}</span></h3>
              {r.goals.map((g, i) => <GoalRow key={i} g={g} />)}
              {r.key && !r.goals.length && !r.tasks.total && <p className="d-faint">целей нет</p>}
              {r.tasks.total > 0 && <div className="d-goal"><div className="gt">Задачи</div><div className="gm"><Status tone={r.tasks.done === r.tasks.total ? "sage" : "honey"}>{r.tasks.done} из {r.tasks.total}</Status></div></div>}
            </div>
          ))}
        </div>
        <div className="d-stairs-cap">Каждая ступень — период из life/goals/. «Горит» — срок через 3 дня или раньше; «отстаёт» — тренд веса за 21 день не доходит до цели к сроку.</div>
      </Card>
      <div className="d-cols">
        <div className="d-stack">
          <Card title="30 дней" right={`${short(pts[0].date)} – ${short(pts[pts.length - 1].date)}`}>
            <Chart title="Дни с записями" hint={`${rec.length} из ${pts.length}`}>
              <CoverageDots days={pts.map((p) => ({ key: p.date, title: `${short(p.date)}: ${p.stats?.recorded ? "есть запись" : "нет записи"}`, on: !!p.stats?.recorded }))} />
            </Chart>
            <Chart title="Намаз" hint="вовремя · поздно · пропуск · без отметки">
              <Columns height={56} max={maxDue} days={pts.map((p) => {
                const c = p.stats?.recorded ? p.stats.prayer : undefined;
                return { key: p.date, title: c ? `${short(p.date)}: вовремя ${c.done}, поздно ${c.late}, пропущено ${c.failed}, без отметки ${c.unmarked}` : short(p.date), parts: c ? [seg(c.done, HEX.sage), seg(c.late, HEX.honey), seg(c.failed, HEX.ember), seg(c.unmarked, HEX.well)] : [] };
              })} />
            </Chart>
            <Chart title="Срывы" hint={`${none ? "—" : falls} за 30 дней`}>
              <Columns height={34} max={maxFalls} days={pts.map((p) => ({ key: p.date, title: p.stats?.recorded ? `${short(p.date)}: срывов ${p.stats.falls}` : short(p.date), parts: p.stats?.recorded ? [seg(p.stats.falls, HEX.ember)] : [] }))} />
            </Chart>
            <Chart title="Полезные привычки" hint="доля сделанных в день">
              <Columns height={34} max={1} days={pts.map((p) => {
                const g = p.stats?.good;
                return { key: p.date, title: g?.total ? `${short(p.date)}: ${g.done} из ${g.total}` : short(p.date), parts: g?.total ? [seg(g.done / g.total, HEX.sage), seg(1 - g.done / g.total, HEX.well)] : [] };
              })} />
            </Chart>
            <Chart title="Настроение и стресс" hint={`● настроение · ○ стресс · ${moodDays} ${plural(moodDays, "день", "дня", "дней")} с ответом`}>
              <Points days={pts.map((p) => ({ key: p.date, mood: p.stats?.mood.avg, stress: p.stats?.stress.avg }))} />
            </Chart>
            <Chart title="Вес" hint={goal ? `цель ${goal.target} кг к ${short(goal.by)} · пунктир — нужный темп` : "цели по весу нет"}>
              <WeightLine points={weights} goal={goal} today={today} />
            </Chart>
          </Card>
        </div>
        <div className="d-stack">
          <Card title="Сферы" right="что происходит по темам">
            <div className="d-spheres">
              {spheres(life, circle, today).map((s) => (
                <div key={s.theme} className="d-sphere">
                  <div className="sh"><span className="d-dot" style={{ background: s.color }} />{s.ru}<Status tone={STATE[s.state][1]}>{STATE[s.state][0]}</Status></div>
                  <div className="sb">{s.acts.length > 0 && <b>{s.acts.map((a) => a.quest.title).join(", ")}{s.fact ? " · " : ""}</b>}{s.fact}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Давно без связи" right="близкие, по отметкам «Контакт»">
            {quiet.length ? (
              <div className="d-people">
                {quiet.map((c) => <div key={c.page.rel}><span>{c.name}</span><span className="th">{themeRu(c.page.theme)}</span><span className="d">{c.sinceContact}<small> дн</small></span></div>)}
              </div>
            ) : <p className="d-faint">Отметок «Контакт» у близких нет.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

function Chart({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return <div className="d-chart"><div className="ct">{title}<span>{hint}</span></div>{children}</div>;
}
