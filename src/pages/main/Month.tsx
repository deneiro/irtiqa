import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { buildCircle, tieWarmth } from "../../lib/circle";
import { addDays, plural } from "../../lib/dates";
import { actName, focusFor, quietPeople, series, spheres, weightGoal, weightSeries, type ActState } from "../../lib/dashboard";
import { monthKey } from "../../lib/goals";
import type { Life } from "../../lib/life";
import { themeRu } from "../../lib/themes";
import { pageUrl, themeUrl } from "../../lib/vault";
import { ROMAN } from "../../lib/bank";
import { useBank } from "./Levels";
import { PickSlots } from "./Pick";
import type { Vault } from "../../lib/types";
import { ClaudeBlock, Columns, CoverageDots, HEX, MOOD_COLOR, MoodLines, STRESS_COLOR, Status, WeightLine, short, type Tone } from "./parts";
import { BANNER, THEME_ART } from "../../assets/play";
import { MonthGrid } from "../../components/GameBits";
import { along, climbSummary, heights, monthDates } from "../../lib/game";
import { useGame } from "../../lib/useGame";
import { Block, GameBand, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./Scene";

const STATE: Record<ActState | "none", [string, Tone]> = {
  overdue: ["срок прошёл", "ember"], empty: ["записей нет", "honey"], idle: ["стоит", "honey"], moving: ["движется", "sage"], none: ["нет деятельности", "smoke"],
};
const MONTH = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
/** One coloured part of a day column — typed, so `.map` does not widen it to `(string | number)[]`. */
const seg = (v: number, c: string): [number, string] => [v, c];
/** The painted trail across the plateau, from the near edge to the foothills; the summit of the range stands beyond its end. */
const TRAIL: [number, number][] = [[840, 541], [1050, 511], [1185, 474], [1155, 444], [1110, 424], [1140, 406], [1230, 384], [1245, 364], [1185, 346], [1207, 331]];
const SUMMIT: [number, number] = [1237, 222];

/**
 * «Месяц» (rebuilt 2026-11-21 the way «Сегодня» is): a plateau with one trail to a far range — the lantern stands as far
 * along it as the month has gone, a mark for every week. Beside the scene Claude's reading; below the month in game
 * numbers, the calendar of heights, the month's results of level III, thirty days in charts, the eight themes as
 * pictures with their levels, and the ties that went quiet.
 */
export default function Month({ life, vault, today }: { life: Life; vault: Vault; today: string }) {
  const yesterday = addDays(today, -1);
  const focus = focusFor(life, monthKey(today), monthKey(addDays(`${today.slice(0, 7)}-01`, -1)));
  const bank = useBank(life);
  const game = useGame();
  const cal = useMemo(() => monthDates(today.slice(0, 7)), [today]);
  const climb = useMemo(() => (game ? heights(game.habits, life.days, cal.dates, today, game.xpOf) : []), [game, life, cal, today]);
  const sum = climbSummary(climb);
  const pts = useMemo(() => series(life, addDays(yesterday, -29), yesterday), [life, yesterday]);
  const circle = useMemo(() => buildCircle(vault.pages.filter((p) => p.zone === "person"), life.events, today), [vault, life, today]);
  const goal = weightGoal(life, today);
  const weights = weightSeries(life, today).filter((w) => w.date >= addDays(today, -60)); // every weight through today; the 30-day counts stop at yesterday
  const rec = pts.filter((p) => p.stats?.recorded);
  const falls = pts.reduce((a, p) => a + (p.stats?.falls ?? 0), 0);
  const none = rec.length === 0; // no day with a mark: the counts taken from marks have nothing behind them, so «—», not a made-up 0
  const quiet = quietPeople(circle);
  const maxDue = Math.max(1, ...pts.map((p) => p.stats?.prayer.due ?? 0));
  const maxFalls = Math.max(3, ...pts.map((p) => p.stats?.falls ?? 0));
  const moodDays = pts.filter((p) => p.stats?.mood.n).length;
  const dayN = Number(today.slice(8)), monthDays = cal.dates.length;
  const range = `${short(pts[0].date)} – ${short(pts[pts.length - 1].date)}`;
  return (
    <div className="g-play">
      <div className="g-top">
        <SceneFrame art={BANNER.month} svg={<Trek day={dayN} days={monthDays} />}>
          <SceneTitle kicker={`месяц · ${dayN}-й день из ${monthDays}`} title={<>{MONTH[Number(today.slice(5, 7)) - 1]} <span className="yr">{today.slice(0, 4)}</span></>} />
          <SceneNumber value={sum.passed ? sum.avg : "—"} unit={sum.passed ? "%" : undefined} label="средняя высота" sub={<>пройдено {Math.round((dayN / monthDays) * 100)} % месяца · {monthDays - dayN} {plural(monthDays - dayN, "день", "дня", "дней")} впереди</>} />
        </SceneFrame>
        <SideCard kicker="Claude · где ты и куда идёшь">
          <div className="g-claude"><ClaudeBlock title="где ты и куда идёшь" focus={focus} period="month" note="Claude пишет 1-го в 06:00." /></div>
        </SideCard>
      </div>

      {game && <GameBand game={game} s={sum} stretch="месяц" />}

      <div className="g-two">
        <Block title={`Высота месяца · ${MONTH[Number(today.slice(5, 7)) - 1].toLowerCase()}`} right="нажми на день — откроется в «Сегодня»">
          <MonthGrid days={climb} lead={cal.lead} today={today} />
        </Block>
        <Block title="Куда двигаюсь · результаты месяца" right={<Link to="/?tab=levels">уровни I → IV →</Link>}>
          <PickSlots life={life} today={today} bank={bank} mode="month" />
          <p className="g-cap">До трёх результатов уровня {ROMAN[3]} за раз: закрыл один — выбираешь следующий. Из них берутся задания недели (уровень {ROMAN[4]}).</p>
        </Block>
      </div>

      <Block title="30 дней" right={range}>
        <div className="g-charts">
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
            <Columns height={40} max={maxFalls} days={pts.map((p) => ({ key: p.date, title: p.stats?.recorded ? `${short(p.date)}: срывов ${p.stats.falls}` : short(p.date), parts: p.stats?.recorded ? [seg(p.stats.falls, HEX.ember)] : [] }))} />
          </Chart>
          <Chart title="Полезные привычки" hint="доля сделанных в день">
            <Columns height={40} max={1} days={pts.map((p) => {
              const g = p.stats?.good;
              return { key: p.date, title: g?.total ? `${short(p.date)}: ${g.done} из ${g.total}` : short(p.date), parts: g?.total ? [seg(g.done / g.total, HEX.sage), seg(1 - g.done / g.total, HEX.well)] : [] };
            })} />
          </Chart>
          <Chart title="Настроение и стресс" hint={<><span className="d-key"><i style={{ background: MOOD_COLOR }} />настроение</span><span className="d-key"><i style={{ background: STRESS_COLOR }} />стресс</span>{moodDays} {plural(moodDays, "день", "дня", "дней")} с ответом</>}>
            <MoodLines days={pts.map((p) => ({ key: p.date, title: short(p.date), mood: p.stats?.mood.avg, stress: p.stats?.stress.avg }))} />
          </Chart>
          <Chart title="Вес" hint={goal ? `цель ${goal.target} кг к ${short(goal.by)} · пунктир — нужный темп` : "цели по весу нет"}>
            <WeightLine points={weights} goal={goal} today={today} />
          </Chart>
        </div>
      </Block>

      <Block title="Восемь тем" right="картина темы · её уровень · что в ней происходит">
        <div className="g-spheres">
          {spheres(life, circle, today).map((s) => {
            const lvl = game?.themes.find((x) => x.theme === s.theme);
            return (
              <Link key={s.theme} to={themeUrl(s.theme)} className="g-sphere" style={{ ["--c" as string]: s.color }}>
                <img src={THEME_ART[s.theme]} alt="" />
                <div className="in">
                  <div className="hd"><b>{s.ru}</b>{lvl && <em title="Уровень темы">{lvl.level.level}</em>}</div>
                  <Status tone={STATE[s.state][1]}>{STATE[s.state][0]}</Status>
                  <p>{s.acts.length > 0 && <strong>{[...new Set(s.acts.map((a) => actName(a.quest).name))].join(", ")}{s.fact ? " · " : ""}</strong>}{s.fact}</p>
                  {lvl && <small>XP за 30 дней: {lvl.last30}</small>}
                </div>
              </Link>
            );
          })}
        </div>
      </Block>

      <Block title="Давно без связи" right={<Link to="/people?sort=contact">все люди →</Link>}>
        {quiet.length ? (
          <div className="g-quiet">
            {quiet.map((c) => {
              const w = tieWarmth(c);
              return (
                <Link key={c.page.rel} to={pageUrl(c.page)}>
                  <b>{c.name}</b><span>{themeRu(c.page.theme)}</span>
                  <i><u style={{ width: `${w?.pct ?? 0}%` }} /></i>
                  <em>{c.sinceContact ?? "—"}<small> дн{c.cadence ? ` из ${c.cadence}` : ""}</small></em>
                </Link>
              );
            })}
          </div>
        ) : <p className="g-faint">Все близкие на связи.</p>}
      </Block>
    </div>
  );
}

/** The trail over the painting: walked as far as the month has gone, a small mark where each week ends, the summit beyond. */
function Trek({ day, days }: { day: number; days: number }) {
  const d = `M${TRAIL.map((p) => p.join(",")).join(" L")}`;
  const pct = (day / days) * 100;
  const [lx, ly] = along(TRAIL, pct);
  const [ex, ey] = TRAIL[TRAIL.length - 1];
  return (
    <g>
      <path className="trail" d={`M${ex},${ey} L${SUMMIT.join(",")}`} />
      <path className="trail" d={d} />
      <path className="walked" d={d} pathLength={100} strokeDasharray={`${pct} 100`} />
      {[7, 14, 21, 28].filter((n) => n < days).map((n) => {
        const [x, y] = along(TRAIL, (n / days) * 100);
        return <path key={n} className={`camp${n <= day ? " on" : ""}`} d={`M${x - 11},${y + 2} L${x},${y - 16} L${x + 11},${y + 2} Z`} />;
      })}
      <g className={`flag${day >= days ? " on" : ""}`}><line x1={SUMMIT[0]} y1={SUMMIT[1]} x2={SUMMIT[0]} y2={SUMMIT[1] - 40} /><path d={`M${SUMMIT[0]},${SUMMIT[1] - 40} L${SUMMIT[0] + 28},${SUMMIT[1] - 31} L${SUMMIT[0]},${SUMMIT[1] - 22} Z`} /></g>
      <g className="lantern" style={{ transform: `translate(${lx}px, ${ly}px)` }}><circle className="halo" r="34" /><circle className="core" r="9.5" /></g>
    </g>
  );
}

function Chart({ title, hint, children }: { title: string; hint: ReactNode; children: ReactNode }) {
  return <div className="d-chart"><div className="ct">{title}<span>{hint}</span></div>{children}</div>;
}
