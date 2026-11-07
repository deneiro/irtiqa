import { useMemo, type ReactNode } from "react";
import { buildCircle } from "../../lib/circle";
import { addDays, plural } from "../../lib/dates";
import { actName, focusFor, quietPeople, series, spheres, weightGoal, weightSeries, type ActState } from "../../lib/dashboard";
import { monthKey } from "../../lib/goals";
import type { Life } from "../../lib/life";
import { themeColor, themeRu } from "../../lib/themes";
import { Link } from "react-router-dom";
import { BANK_THEME_ORDER, progress } from "../../lib/bank";
import { useBank } from "./Levels";
import type { Vault } from "../../lib/types";
import { Card, ClaudeBlock, Columns, CoverageDots, Glance, HEX, Hero, MOOD_COLOR, MoodLines, STRESS_COLOR, Status, WeightLine, short, type Tone } from "./parts";

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
  const bank = useBank(life);
  const goals = useMemo(() => [...bank].sort((a, b) => BANK_THEME_ORDER.indexOf(a.goals[0]?.id[0] ?? "") - BANK_THEME_ORDER.indexOf(b.goals[0]?.id[0] ?? "")).flatMap((f) => f.goals), [bank]);
  const pts = useMemo(() => series(life, addDays(yesterday, -29), yesterday), [life, yesterday]);
  const circle = useMemo(() => buildCircle(vault.pages.filter((p) => p.zone === "person"), life.events, today), [vault, life, today]);
  const goal = weightGoal(life, today);
  const weights = weightSeries(life, today).filter((w) => w.date >= addDays(today, -60)); // every weight through today; the 30-day counts stop at yesterday
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
        <p className="d-foot">за 30 дней, {short(pts[0].date)} – {short(pts[pts.length - 1].date)}</p>
      </Hero>
      <Card title="Куда двигаюсь" right={<Link to="/?tab=levels">уровни I → IV · банк заданий →</Link>} className="d-full">
        <div className="l-goals">
          {goals.map((g) => {
            const p = progress(g);
            return (
              <Link key={g.id} className="l-goal" to={`/?tab=levels&id=${g.id}`}>
                <span className="d-dot" style={{ background: themeColor(g.theme) }} />
                <span className="l-id">{g.id}</span>
                <span className="l-t">{g.title}</span>
                <span className="l-bar"><span style={{ width: `${g.done ? 100 : p.pct}%` }} className={g.done ? "done" : ""} /></span>
                <span className="l-n">{g.done ? "✓" : `${p.done}/${p.total}`}</span>
              </Link>
            );
          })}
        </div>
        {!goals.length && <p className="d-faint">Банка заданий нет.</p>}
        <div className="d-stairs-cap">Цели месяца и года заменены уровнями: I — цель, II — достижение, III — результат, IV — задание недели. Прогресс — по закрытым частям.</div>
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
            <Chart title="Настроение и стресс" hint={<><span className="d-key"><i style={{ background: MOOD_COLOR }} />настроение</span><span className="d-key"><i style={{ background: STRESS_COLOR }} />стресс</span>1–10 · {moodDays} {plural(moodDays, "день", "дня", "дней")} с ответом</>}>
              <MoodLines days={pts.map((p) => ({ key: p.date, title: short(p.date), mood: p.stats?.mood.avg, stress: p.stats?.stress.avg }))} />
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
                  <div className="sh"><span className="d-dot" style={{ background: s.color }} /><span className="nm">{s.ru}</span><Status tone={STATE[s.state][1]}>{STATE[s.state][0]}</Status></div>
                  <div className="sb">{s.acts.length > 0 && <b>{[...new Set(s.acts.map((a) => actName(a.quest).name))].join(", ")}{s.fact ? " · " : ""}</b>}{s.fact}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Давно без связи" right="близкие · кроме тех, с кем живёшь">
            {quiet.length ? (
              <div className="d-people">
                {quiet.map((c) => <div key={c.page.rel}><span>{c.name}</span><span className="th">{themeRu(c.page.theme)}</span><span className="d">{c.sinceContact}<small> дн</small></span></div>)}
              </div>
            ) : <p className="d-faint">Все близкие на связи.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

function Chart({ title, hint, children }: { title: string; hint: ReactNode; children: ReactNode }) {
  return <div className="d-chart"><div className="ct">{title}<span>{hint}</span></div>{children}</div>;
}
