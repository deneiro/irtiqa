import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ayahOfDay } from "../../lib/ayah";
import type { Vault } from "../../lib/types";
import { addDays, plural, weekdayIndex } from "../../lib/dates";
import { actName, activities, dateRange, daysBetween, fmt, focusFor, plainLinks, plainStep, questUrl, streaks, waiting, weightGoal, weightNow, windowStats, yesterdayView, type Stats } from "../../lib/dashboard";
import { isoWeekKey } from "../../lib/goals";
import type { Life } from "../../lib/life";
import { themeColor, themeRu } from "../../lib/themes";
import { Dots, actStatus, dayMonth, short, signed } from "./parts";
import { BANNER } from "../../assets/play";
import { FlameIcon, dayUrl } from "../../components/GameBits";
import { dayScore, standing } from "../../lib/game";
import { useGame } from "../../lib/useGame";
import { trainingFor, type Training } from "../../lib/training";
import { planOf, programWeek, setsNow, useTraining, type TrainingData } from "../../lib/trainingMap";
import { useStore } from "../../store";
import { openInClaude } from "../../lib/projects";
import { Medals, Radar, WeekTasks } from "./Play";
import { Block, Gauge, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./Scene";

const WD = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const days = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;
const list = (xs: [string, number][]) => xs.map(([t, n]) => `${t} ${n}`).join(" · ");
/** The windows of the state, in days; the one before is as long. */
const WINDOWS = [3, 7, 14] as const;
type Win = (typeof WINDOWS)[number];

/**
 * «Обзор» (rebuilt 2026-11-21 the way «Сегодня» is): the view from above. The scene carries the ayah of the day and
 * how much of the window is recorded; beside it yesterday with the height it took. Below, the state of 3, 7 or 14
 * days as gauges — each against the window before — the runs he holds, the activities, what waits, Claude's focus.
 * Since 2026-11-25 everything that is not marked today lives here too (his words: «Сегодня — прям то, что можно
 * отметить… деятельности, проекты там, колесо, награды тоже там, неделя, задачи тоже там»): the week's tasks, the
 * wheel, the medals, and «▸ Claude» on an activity that has a folder. The day itself is marked on «Сегодня».
 */
export default function Today({ life, vault, today }: { life: Life; vault: Vault; today: string }) {
  const [win, setWin] = useState<Win>(7);
  const yesterday = addDays(today, -1);
  const s = useMemo(() => windowStats(life, addDays(yesterday, -(win - 1)), yesterday), [life, yesterday, win]);
  const prev = useMemo(() => windowStats(life, addDays(yesterday, -(2 * win - 1)), addDays(yesterday, -win)), [life, yesterday, win]);
  const acts = useMemo(() => activities(life, today), [life, today]);
  const y = useMemo(() => yesterdayView(life, today), [life, today]);
  const ayah = useMemo(() => ayahOfDay(vault, today), [vault, today]);
  const game = useGame();
  const training = useMemo(() => trainingFor(vault, today), [vault, today]);
  const plan = useTraining(useStore().root).data;
  const focus = focusFor(life, isoWeekKey(today), isoWeekKey(addDays(today, -7)));
  const wait = waiting(life);
  const runs = streaks(life, yesterday);
  const yScore = game ? dayScore(game.habits, life.days.get(yesterday), yesterday) : undefined;
  const tScore = game ? dayScore(game.habits, life.days.get(today), today) : undefined;
  const moving = acts.filter((a) => a.state === "moving").length;
  const { root } = useStore();
  const [opening, setOpening] = useState<string>();
  const [openErr, setOpenErr] = useState<string>();
  const openClaude = async (rel: string, folder: string) => {
    setOpening(rel);
    try { await openInClaude(root, folder); setOpenErr(undefined); } catch (e) { setOpenErr(e instanceof Error ? e.message : String(e)); } finally { setOpening(undefined); }
  };
  return (
    <div className="g-play">
      <div className="g-top">
        <SceneFrame art={BANNER.overview}>
          <SceneTitle kicker={`${WD[weekdayIndex(today)]} · неделя ${Number(isoWeekKey(today).slice(-2))} · вид сверху`} title={dayMonth(today)} />
          {ayah && (
            <div className="g-ayah">
              <div className="g-kick">Аят дня</div>
              <p>{ayah.text}</p>
              <Link to={`/page/${encodeURIComponent(ayah.rel)}`}>{ayah.name} · {ayah.sura}:{ayah.ayah} · перевод Кулиева</Link>
            </div>
          )}
          <SceneNumber value={tScore ? tScore.pct : "—"} unit={tScore ? "%" : undefined} label="сегодня" sub={<Link to="/?tab=play">{tScore ? standing(tScore.pct).at : "день"} · отметить день →</Link>} />
        </SceneFrame>
        <SideCard kicker={`вчера · ${WD[weekdayIndex(y.date)]}, ${dayMonth(y.date)}`}>
          {!y.day ? <div className="g-q">Вчерашний день пуст.</div> : (
            <>
              <div className="g-yest"><b>{yScore?.pct ?? "—"}<small> %</small></b><span>{yScore ? standing(yScore.pct).at : ""}<br />высота вчера</span></div>
              <dl className="g-kv">
                <dt>Сделано</dt><dd>{y.day.done.map(plainLinks).join("; ") || "—"}</dd>
                <dt>Срывы</dt><dd>{y.recorded ? y.falls.join(", ") || "нет" : "—"}</dd>
                <dt>Полезные</dt><dd>{y.recorded ? (y.goodDone.length ? y.goodDone.join(", ") : "ни одной") : "—"}</dd>
                <dt>Состояние</dt><dd>настроение {y.day.mood ?? "—"} · стресс {y.day.stress ?? "—"}{y.day.weight !== undefined && ` · ${y.day.weight} кг`}</dd>
                {y.reflections.length > 0 && <><dt>О дне</dt><dd>{y.reflections.join(" · ")}</dd></>}
              </dl>
            </>
          )}
          <Link className="g-link g-side-link" to={dayUrl(y.date)}>{y.day ? "дополнить вчера →" : "заполнить вчера →"}</Link>
        </SideCard>
      </div>

      <Block title="Состояние" right={<span className="g-chips">{WINDOWS.map((n) => <button key={n} className={n === win ? "on" : ""} aria-pressed={n === win} onClick={() => setWin(n)}>{days(n)}</button>)}</span>}>
        <State life={life} today={today} s={s} prev={prev} win={win} />
      </Block>

      {runs.length > 0 && (
        <Block title="Без срыва, дней подряд" right="по вчера">
          <div className="g-runs">{runs.map((x) => <div key={x.habit} className={x.days >= 30 ? "long" : x.days >= 7 ? "mid" : ""}><FlameIcon /><b>{x.days}</b><span>{x.habit}</span></div>)}</div>
        </Block>
      )}

      <div className="g-two">
        <Block title="Деятельности" right={acts.length ? `${moving} движутся · ${acts.length - moving} стоят` : undefined}>
          {!acts.length && <p className="g-faint">Деятельностей нет.</p>}
          {acts.map((a) => {
            const step = a.now ? plainStep(a.now) : "";
            const { name, sub } = actName(a.quest);
            return (
              <div key={a.quest.rel} className="g-actrow">
                <Link to={questUrl(a.quest.rel)} className="g-act" style={{ ["--c" as string]: themeColor(a.quest.theme) }}>
                  <div>
                    <b>{name}</b>{sub && <span className="sub"> · {sub}</span>}
                    <small>{themeRu(a.quest.theme)} · {a.quest.cadence ?? "—"}</small>
                    {step && <p>{step}</p>}
                  </div>
                  {actStatus(a)}
                </Link>
                {a.quest.folder && <button type="button" className="g-btn sun" disabled={opening === a.quest.rel} onClick={() => void openClaude(a.quest.rel, a.quest.folder!)} title={`Terminal в папке ${a.quest.folder}, Claude уже запущен`}>{opening === a.quest.rel ? "открываю…" : "▸ Claude"}</button>}
              </div>
            );
          })}
          {acts.some((a) => a.quest.folder) && <p className="g-cap">«▸ Claude» открывает Terminal в папке проекта, Claude уже запущен.</p>}
          {openErr && <p className="g-error" role="alert">Не открыл: {openErr}</p>}
        </Block>
        <div className="g-stack">
          <WeekTasks life={life} date={today} />
          {(training || plan?.NUTRITION) && (
            <Block title="Тело сегодня" right="тренировка и еда по плану">
              {training && <TrainingLine t={training} plan={plan} today={today} />}
              {plan?.NUTRITION && <FoodLine plan={plan} />}
            </Block>
          )}
          <Block title="Ждёт тебя" right="из now.md">
            {wait.length ? <ul className="g-plain">{wait.map((w, i) => <li key={i}>{w}</li>)}</ul> : <p className="g-faint">Пока ничего.</p>}
          </Block>
          {focus.lines.length > 0 && (
            <Block title={`Claude · фокус недели${focus.stale ? " · прошлый период" : ""}`} right={<Link to="/?tab=week">неделя →</Link>}>
              <ol className="g-focus">{focus.lines.map((l) => <li key={l}>{l}</li>)}</ol>
            </Block>
          )}
        </div>
      </div>

      <div className="g-two">
        <Block title="Колесо · 30 дней" right={<Link to="/wheel">подробно →</Link>}>
          <Radar life={life} vault={vault} today={today} />
        </Block>
        {game && <Medals habits={game.habits} days={life.days} today={today} />}
      </div>
    </div>
  );
}

/** The state of the window as eight gauges; an arrow only when both windows have records on half their days. */
function State({ life, today, s, prev, win }: { life: Life; today: string; s: Stats; prev: Stats; win: Win }) {
  const half = Math.ceil(win / 2);
  const comparable = s.recorded >= half && prev.recorded >= half;
  const arrow = (a: number | undefined, b: number | undefined, higherIsBetter: boolean) =>
    comparable && a !== undefined && b !== undefined && a !== b ? ((a > b) === higherIsBetter ? "▲ лучше" : "▼ хуже") : undefined;
  const p = s.prayer, marked = p.done + p.late + p.failed;
  const share = (x: Stats) => { const m = x.prayer.done + x.prayer.late + x.prayer.failed; return m ? x.prayer.done / m : undefined; };
  const goodShare = (x: Stats) => (x.good.total ? x.good.done / x.good.total : undefined);
  const perDay = (x: Stats) => (x.recorded ? x.falls / x.recorded : undefined);
  const taskShare = (x: Stats) => (x.tasks.total ? x.tasks.done / x.tasks.total : undefined);
  const w = weightNow(life, today), goal = weightGoal(life, today);
  const thin = (n: number) => n < half;
  const noMarks = s.recorded === 0; // no day of the window carries a mark: «—», never a made-up 0
  return (
    <>
      <div className="g-cover"><Dots flags={s.coverage} dates={dateRange(s.from, s.to)} />записи за {days(s.recorded)} из {s.length} · {short(s.from)} – {short(s.to)}</div>
      <div className="g-gauges">
        <Gauge label="Намаз вовремя" tone="sage" hint={arrow(share(s), share(prev), true)} value={noMarks || !marked ? "—" : p.done} of={marked ? ` / ${marked}` : undefined} share={noMarks ? undefined : share(s)} thin={noMarks || !marked}
          sub={noMarks ? `нет записей за ${days(s.length)}` : marked ? `${p.late} поздно · ${p.failed} пропущено${p.unmarked ? ` · ${p.unmarked} без отметки` : ""}` : `${p.unmarked} без отметки из ${p.due}`} />
        <Gauge label="Полезные" tone="sun" hint={arrow(goodShare(s), goodShare(prev), true)} value={noMarks || !s.good.total ? "—" : s.good.done} of={s.good.total ? ` / ${s.good.total}` : undefined} share={noMarks ? undefined : goodShare(s)} thin={noMarks || !s.good.total}
          sub={noMarks ? `нет записей за ${days(s.length)}` : list(s.good.missedBy) || "все сделаны"} />
        <Gauge label="Задачи" tone="iris" hint={arrow(taskShare(s), taskShare(prev), true)} value={s.tasks.total ? s.tasks.done : "—"} of={s.tasks.total ? ` / ${s.tasks.total}` : undefined} share={taskShare(s)} thin={thin(s.tasks.days)}
          sub={s.tasks.total ? `были в ${s.tasks.days} из ${s.length} дней` : `нет задач за ${days(s.length)}`} />
        <Gauge label="Настроение" tone="iris" hint={arrow(s.mood.avg, prev.mood.avg, true)} value={s.mood.avg ?? "—"} of={s.mood.avg !== undefined ? " / 10" : undefined} share={s.mood.avg !== undefined ? s.mood.avg / 10 : undefined} thin={thin(s.mood.n)} sub={`${days(s.mood.n)} из ${s.length} с ответом`} />
        <Gauge label="Стресс" tone="honey" hint={arrow(s.stress.avg, prev.stress.avg, false)} value={s.stress.avg ?? "—"} of={s.stress.avg !== undefined ? " / 10" : undefined} share={s.stress.avg !== undefined ? s.stress.avg / 10 : undefined} thin={thin(s.stress.n)} sub={`${days(s.stress.n)} из ${s.length} с ответом`} />
        <Gauge label="Срывы" tone="ember" hint={arrow(perDay(s), perDay(prev), false)} value={noMarks ? "—" : s.falls} thin={noMarks}
          sub={noMarks ? `нет записей за ${days(s.length)}` : <>{list(s.fallsBy) || "ни одного"} · удержался {s.held} {plural(s.held, "раз", "раза", "раз")}</>} />
        <Gauge label="Вес" hint={w ? short(w.last.date) : undefined} value={w ? w.last.value : "—"} of={w ? " кг" : undefined} thin={!w}
          sub={w ? <>{w.before ? `${signed(w.last.value - w.before.value)} кг с ${short(w.before.date)}` : "первый замер"}{goal && ` · до ${goal.target} кг: ${signed(goal.target - w.last.value)} за ${days(daysBetween(today, goal.by))}`}</> : "замера ещё нет"} />
        <Gauge label="Деньги" value={s.money.days ? fmt(s.money.spent) : "—"} of={s.money.days ? " ₸" : undefined} thin={!s.money.days}
          sub={s.money.days ? `доход ${fmt(s.money.earned)} ₸ · ${days(s.money.days)} с записями` : `нет записей за ${days(s.length)}`} />
      </div>
      {!comparable && <p className="g-cap">Стрелок «лучше / хуже» нет: {[thin(s.recorded) && `в этих ${win} днях записи за ${days(s.recorded)}`, thin(prev.recorded) && `в прошлых ${win} днях записи за ${days(prev.recorded)}`].filter(Boolean).join("; ")}. Бледные числа — ответы меньше чем за половину дней.</p>}
    </>
  );
}

/** Today's row of the training plan: strength with the part and its exercises (sets × reps from the vault's program when there is one), cardio, or rest. */
function TrainingLine({ t, plan, today }: { t: Training; plan: TrainingData | null; today: string }) {
  const day = plan ? planOf(plan.PROGRAM, today).day : undefined;
  const names = plan ? new Map(plan.EX.map((e) => [e.id, e.name])) : undefined;
  const wk = plan ? programWeek(plan.PROGRAM, today) : undefined;
  return (
    <div className="d-train">
      Сегодня <b>{t.kind || "тренировка"}</b>{t.what ? ` — ${t.what}` : ""}{day && wk ? ` · неделя ${wk}` : ""}
      {day && names
        ? <div className="ex">{day.items.map(([id, s, r]) => `${names.get(id) ?? id} ${setsNow(s, wk)}×${r.split(" · ")[0]}`).join(" · ")}</div>
        : t.exercises.length > 0 && <div className="ex">{t.exercises.join(" · ")}</div>}
      {/силов/i.test(t.kind) && <div className="ex"><Link to="/training?tab=p">упражнения с анимацией и карта мышц →</Link></div>}
    </div>
  );
}

/** The day's food plan in one line: calories, protein, fat, the last meal. */
function FoodLine({ plan }: { plan: TrainingData }) {
  const n = plan.NUTRITION!;
  const v = (k: string) => n.targets.find((x) => x.k === k)?.v;
  const parts = [v("Калории") && `${v("Калории")} ккал`, v("Белок") && `белок ${v("Белок")}`, v("Жир") && `жир ${v("Жир")}, ≤ 30 г за раз`, v("Последняя еда") && `последняя еда ${v("Последняя еда")}`].filter(Boolean);
  return (
    <div className="d-train">
      Еда: {parts.join(" · ")}
      <div className="ex">{n.meals.map((m) => `${m.when} ${m.t.toLowerCase()}`).join(" · ")} · <Link to={`/theme/${encodeURIComponent("Health & sport")}/nutrition`}>план питания →</Link></div>
    </div>
  );
}
