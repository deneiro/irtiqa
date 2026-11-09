import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ayahOfDay } from "../../lib/ayah";
import { PERIODS, byPeriod, periodAt, todayTimes, type PeriodKey } from "../../lib/periods";
import { trainingFor, type Training } from "../../lib/training";
import type { Vault } from "../../lib/types";
import { addDays, plural, weekdayIndex } from "../../lib/dates";
import { activities, dateRange, daysBetween, fmt, focusFor, habitRows, plainLinks, streaks, waiting, weightGoal, weightNow, windowStats, yesterdayView, type Stats, type Yesterday } from "../../lib/dashboard";
import { isoWeekKey } from "../../lib/goals";
import { habitDue, markOf, type Life } from "../../lib/life";
import { ActivityList, TaskLine, Card, DayArc, Dots, Hero, Tile, dayMonth, short, signed, type PrayerMark, type Tone } from "./parts";

const WD = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const days = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;
const list = (xs: [string, number][]) => xs.map(([t, n]) => `${t} ${n}`).join(" · ");
const streakTone = (d: number): Tone => (d >= 30 ? "sage" : d >= 7 ? "honey" : "ember");
/** The windows of «Состояние», in days; the one before is as long. */
const WINDOWS = [3, 7, 14] as const;
type Win = (typeof WINDOWS)[number];

/** The part of the day now, re-read every minute; none when the screen shows another date. */
function useNowPeriod(today: string): PeriodKey | undefined {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 60_000); return () => clearInterval(id); }, []);
  const cal = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return cal === today ? periodAt(t, todayTimes(today)) : undefined;
}

/**
 * «Сегодня» (2026-11-08): the date and an ayah of the day; today's prayers on the day's arc with a dot for every task
 * in its part of the day; the tasks by the five parts, today's training in the part of health; the activities and what
 * waits; the state of 3, 7 or 14 days and yesterday beside them.
 */
export default function Today({ life, vault, today }: { life: Life; vault: Vault; today: string }) {
  const [win, setWin] = useState<Win>(7);
  const yesterday = addDays(today, -1);
  const s = useMemo(() => windowStats(life, addDays(yesterday, -(win - 1)), yesterday), [life, yesterday, win]);
  const prev = useMemo(() => windowStats(life, addDays(yesterday, -(2 * win - 1)), addDays(yesterday, -win)), [life, yesterday, win]);
  const acts = useMemo(() => activities(life, today), [life, today]);
  const y = useMemo(() => yesterdayView(life, today), [life, today]);
  const ayah = useMemo(() => ayahOfDay(vault, today), [vault, today]);
  const training = useMemo(() => trainingFor(vault, today), [vault, today]);
  const now = useNowPeriod(today);
  const focus = focusFor(life, isoWeekKey(today), isoWeekKey(addDays(today, -7)));
  const day = life.days.get(today);
  const tasks = day?.tasks ?? [];
  const groups = byPeriod(tasks);
  const mark = (t: string): PrayerMark => { const m = day ? markOf(day, t) : undefined; return m === "done" ? "done" : m === "late" ? "late" : m === "failed" ? "failed" : "none"; };
  const prayers = habitRows(life).filter((h) => h.kind === "prayer" && habitDue(h, today)).map((h) => ({ title: h.title, mark: mark(h.title) }));
  const arc = groups.filter((g): g is { key: PeriodKey; tasks: typeof tasks } => !!g.key).map((g) => ({ key: g.key, total: g.tasks.length, done: g.tasks.filter((t) => t.done).length }));
  const wait = waiting(life);
  return (
    <>
      <Hero kicker={`${WD[weekdayIndex(today)]} · неделя ${Number(isoWeekKey(today).slice(-2))}`} title={<>{dayMonth(today)} <span className="yr">{today.slice(0, 4)}</span></>} side={<DayArc prayers={prayers} periods={arc} now={now} />}>
        {ayah && (
          <div className="d-ayah">
            <div className="d-kick">Аят дня</div>
            <div className="t">{ayah.text}</div>
            <div className="f"><Link to={`/page/${encodeURIComponent(ayah.rel)}`}>{ayah.name} · {ayah.sura}:{ayah.ayah}</Link> · перевод Кулиева</div>
          </div>
        )}
      </Hero>
      <div className="d-cols">
        <div className="d-stack">
          <Card title="Задачи на сегодня" right={`${tasks.filter((t) => t.done).length} / ${tasks.length} · из утреннего вопроса бота`}>
            {!tasks.length && !training && <p className="d-faint">Задач нет — бот спросит утром.</p>}
            {groups.map((g) => {
              const p = PERIODS.find((x) => x.key === g.key);
              const train = g.key === "магриб" ? training : undefined;
              if (!g.tasks.length && !train) return null;
              return (
                <div key={g.key ?? "none"} className={`d-per${g.key && g.key === now ? " now" : ""}`}>
                  <div className="d-per-h">{p ? <><b>{p.roman} · {p.from}–{p.to}</b><span>{p.what}</span></> : <b>без периода</b>}{g.tasks.length > 0 && <span className="n">{g.tasks.filter((t) => t.done).length} / {g.tasks.length}</span>}</div>
                  {train && <TrainingLine t={train} />}
                  {g.tasks.length > 0 && <ul className="d-tasks">{g.tasks.map((t, i) => <li key={i} className={t.done ? "done" : ""}><TaskLine text={t.text} today={today} /></li>)}</ul>}
                </div>
              );
            })}
            {focus.lines[0] && (
              <div className="d-claude-line">
                <div className="d-kick who">Claude · фокус недели{focus.stale ? " · это прошлый период" : ""}</div>
                <p>{focus.lines[0]}</p>
                {focus.lines.length > 1 && <Link to="/?tab=week">ещё {focus.lines.length - 1} →</Link>}
              </div>
            )}
          </Card>
          <ActivityList acts={acts} />
          <Card title="Ждёт тебя" right="из now.md">
            {wait.length ? <ul className="d-plain">{wait.map((w, i) => <li key={i}>{w}</li>)}</ul> : <p className="d-faint">пока ничего</p>}
          </Card>
        </div>
        <div className="d-stack">
          <StateCard life={life} today={today} s={s} prev={prev} win={win} setWin={setWin} tasksToday={tasks.length} />
          <YesterdayCard y={y} />
        </div>
      </div>
    </>
  );
}

/** Today's row of the training plan: strength with the part and its exercises, cardio, or rest. */
function TrainingLine({ t }: { t: Training }) {
  return (
    <div className="d-train">
      Сегодня <b>{t.kind || "тренировка"}</b>{t.what ? ` — ${t.what}` : ""}
      {t.exercises.length > 0 && <div className="ex">{t.exercises.join(" · ")}</div>}
      {/силов/i.test(t.kind) && <div className="ex"><Link to="/training?tab=p">упражнения с анимацией и карта мышц →</Link></div>}
    </div>
  );
}

function StateCard({ life, today, s, prev, win, setWin, tasksToday }: { life: Life; today: string; s: Stats; prev: Stats; win: Win; setWin: (w: Win) => void; tasksToday: number }) {
  const half = Math.ceil(win / 2);
  const comparable = s.recorded >= half && prev.recorded >= half;
  /** ▲ / ▼ against the window before, only when both have records on half the days. */
  const arrow = (a: number | undefined, b: number | undefined, higherIsBetter: boolean) =>
    comparable && a !== undefined && b !== undefined && a !== b ? ((a > b) === higherIsBetter ? "▲ лучше" : "▼ хуже") : undefined;
  const share = (x: Stats) => (x.prayer.due ? x.prayer.done / x.prayer.due : undefined);
  const goodShare = (x: Stats) => (x.good.total ? x.good.done / x.good.total : undefined);
  const perDay = (x: Stats) => (x.recorded ? x.falls / x.recorded : undefined);
  const p = s.prayer, marked = p.done + p.late + p.failed;
  const yesterday = addDays(today, -1);
  const w = weightNow(life, today), goal = weightGoal(life, today), runs = streaks(life, yesterday); // the last weight through today; the counts and the runs through yesterday
  const thin = (n: number) => n < half;
  /** No day of the window carries a habit mark: nothing to count, so «—» and no tone — never a made-up 0. */
  const noMarks = s.recorded === 0;
  const blank = (k: string, foot: string) => <Tile k={k} v="—" foot={foot} thin />;
  const noRecords = `нет записей за ${days(s.length)}`;
  return (
    <Card title="Состояние" right={<span className="d-seg">{WINDOWS.map((n) => <button key={n} className={n === win ? "on" : ""} aria-pressed={n === win} onClick={() => setWin(n)}>{days(n)}</button>)}</span>}>
      <div className="d-cover"><Dots flags={s.coverage} dates={dateRange(s.from, s.to)} />записи за {days(s.recorded)} из {s.length} · {short(s.from)} – {short(s.to)}</div>
      <div className="d-tiles">
        {noMarks ? blank("Намаз", noRecords) : marked === 0 ? blank("Намаз", p.due ? `${p.unmarked} без отметки из ${p.due}` : "нет отметок") : <Tile k="Намаз" hint={arrow(share(s), share(prev), true)} tone={!p.due ? undefined : p.unmarked / p.due > 0.25 ? "honey" : "sage"} v={p.done} of={`/ ${marked}`} sub={`вовремя · ${p.late} поздно · ${p.failed} пропущено`} foot={p.unmarked ? `${p.unmarked} без отметки из ${p.due}` : undefined} />}
        {noMarks ? blank("Срывы", noRecords) : <Tile k="Срывы" hint={arrow(perDay(s), perDay(prev), false)} tone={s.falls ? "ember" : "sage"} v={s.falls} sub={list(s.fallsBy) || "ни одного"} foot={`удержался ${s.held} ${plural(s.held, "раз", "раза", "раз")}`} />}
        {noMarks ? blank("Полезные", noRecords) : !s.good.total ? blank("Полезные", "нет отметок") : <Tile k="Полезные" hint={arrow(goodShare(s), goodShare(prev), true)} tone={!s.good.total ? undefined : s.good.done / s.good.total < 0.3 ? "ember" : "sage"} v={s.good.done} of={`/ ${s.good.total}`} sub={list(s.good.missedBy)} />}
        <Tile k="Вес" hint={w ? short(w.last.date) : undefined} v={w ? w.last.value : "—"} of={w ? "кг" : undefined} sub={w?.before ? `${signed(w.last.value - w.before.value)} кг с ${short(w.before.date)}` : undefined} foot={w && goal ? `до ${goal.target} кг: ${signed(goal.target - w.last.value)} за ${days(daysBetween(today, goal.by))}` : undefined} />
        <Tile k="Настроение" hint={arrow(s.mood.avg, prev.mood.avg, true)} v={s.mood.avg ?? "—"} foot={`${days(s.mood.n)} из ${s.length}`} thin={thin(s.mood.n)} />
        <Tile k="Стресс" hint={arrow(s.stress.avg, prev.stress.avg, false)} v={s.stress.avg ?? "—"} foot={`${days(s.stress.n)} из ${s.length}`} thin={thin(s.stress.n)} />
        <Tile k="Деньги" v={s.money.days ? fmt(s.money.spent) : "—"} of={s.money.days ? "₸" : undefined} sub={s.money.days ? `доход ${fmt(s.money.earned)} ₸` : undefined} foot={s.money.days ? `${days(s.money.days)} с записями` : `нет записей за ${days(s.length)}`} thin={!s.money.days} />
        {s.tasks.total ? <Tile k="Задачи" v={s.tasks.done} of={`/ ${s.tasks.total}`} sub={`сегодня ${tasksToday}`} foot={`были в ${s.tasks.days} из ${s.length} дней`} thin={thin(s.tasks.days)} /> : <Tile k="Задачи" v="—" sub={tasksToday ? `сегодня ${tasksToday}` : undefined} foot={`нет задач за ${days(s.length)}`} thin />}
      </div>
      {runs.length > 0 && (
        <>
          <div className="d-sub"><span className="d-kick">Без срыва, дней подряд</span></div>
          <div className="d-streaks">{runs.map((x) => <span key={x.habit} className={`d-streak ${streakTone(x.days)}`}><b>{x.days}</b>{x.habit}</span>)}</div>
        </>
      )}
      {!comparable && <p className="d-foot">Стрелок «лучше / хуже» нет: {[thin(s.recorded) && `в этих ${win} днях записи за ${days(s.recorded)}`, thin(prev.recorded) && `в прошлых ${win} днях записи за ${days(prev.recorded)}`].filter(Boolean).join("; ")}. Бледные числа — ответы меньше чем за половину дней.</p>}
    </Card>
  );
}

function YesterdayCard({ y }: { y: Yesterday }) {
  const d = y.day;
  return (
    <Card title="Вчера" right={`${WD[weekdayIndex(y.date)]}, ${dayMonth(y.date)}`}>
      {!d ? <p className="d-faint">Файла дня нет.</p> : (
        <dl className="d-kv">
          <dt>Сделано</dt><dd>{d.done.map(plainLinks).join("; ") || "—"}</dd>
          <dt>Срывы</dt><dd>{y.recorded ? y.falls.join(", ") || "нет" : "—"}</dd>
          <dt>Полезные</dt><dd>{y.recorded ? <>{y.goodDone.length ? y.goodDone.join(", ") : "ни одной"}{y.goodMissed.length > 0 && <span className="d-faint"> · не сделано: {y.goodMissed.join(", ")}</span>}</> : "—"}</dd>
          <dt>Самочувствие</dt><dd>настроение {d.mood ?? "—"} · стресс {d.stress ?? "—"} · {d.weight !== undefined ? `${d.weight} кг` : "вес —"}</dd>
          <dt>О дне</dt><dd className={y.reflections.length ? "d-refl" : "d-faint"}>{y.reflections.length ? y.reflections.map((r, i) => { const at = r.indexOf(":"); return <span key={i}><b>{at > 0 ? r.slice(0, at) : r}</b> {at > 0 ? r.slice(at + 1).trim() : ""}</span>; }) : "вечерние вопросы о дне без ответа"}</dd>
        </dl>
      )}
    </Card>
  );
}
