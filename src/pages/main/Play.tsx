import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../store";
import type { Vault } from "../../lib/types";
import { addDays, plural, weekdayIndex } from "../../lib/dates";
import { dayMonth, fmt, habitRows, weightNow } from "../../lib/dashboard";
import { isoWeekKey } from "../../lib/goals";
import { CAMPS, CAMP_NAMES, along, askOf, asks, campsTaken, dayScore, fire, medals, prayerOpen, rankOf, standing, type Ask, type Score } from "../../lib/game";
import { overallLevelProgress, readsOf, themeXps, xpByDay } from "../../lib/levels";
import { emptyDay, habitDue, isLateMeal, markOf, parseAmount, spentOf, earnedOf, streak, withMark, xpForDay, type Day, type DayMark, type Habit, type Life, type XpContext } from "../../lib/life";
import { prayerTimes, type PrayerTimes } from "../../lib/maghrib";
import { PERIODS, byPeriod, periodAt, withPeriod, type PeriodKey } from "../../lib/periods";
import { THEMES } from "../../lib/themes";
import { TaskLine, short } from "./parts";
import sceneFajr from "../../assets/play/scene-fajr.webp";
import sceneZuhr from "../../assets/play/scene-zuhr.webp";
import sceneAsr from "../../assets/play/scene-asr.webp";
import sceneMaghrib from "../../assets/play/scene-maghrib.webp";
import sceneIsha from "../../assets/play/scene-isha.webp";
import medalCamp from "../../assets/play/medal-camp.webp";
import medalFive from "../../assets/play/medal-five.webp";
import medalSummit from "../../assets/play/medal-summit.webp";
import medalWeek from "../../assets/play/medal-week.webp";
import medalWords from "../../assets/play/medal-words.webp";
import medalTasks from "../../assets/play/medal-tasks.webp";
import "./Play.css";

const MEDAL_ART: Record<string, string> = { camp: medalCamp, five: medalFive, summit: medalSummit, week: medalWeek, words: medalWords, tasks: medalTasks };

const WD = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
const PRAYER_AT: Record<string, keyof PrayerTimes> = { "Фаджр": "fajr", "Зухр": "zuhr", "Жума": "zuhr", "Аср": "asr", "Магриб": "maghrib", "Иша": "isha", "Витр": "isha" };
const REFLECT = ["Благодарен", "Недоволен", "Мог бы изменить", "Хотел, но не сделал"] as const;
type WordLabel = "Сделал" | (typeof REFLECT)[number];

/**
 * The day being marked: a local copy that answers a tap at once, every change written through the three-way merge so
 * the bot, Obsidian and Claude never lose a line. Saves go one after another; the disk wins back when nothing is in flight.
 */
export function useDayEdit(life: Life, date: string) {
  const { saveDayMerged } = useStore();
  const disk = life.days.get(date);
  const [draft, setDraft] = useState<Day>(() => disk ?? emptyDay(date));
  const [error, setError] = useState<string>();
  const cur = useRef(draft);
  const flying = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (flying.current) return;
    const d = disk ?? emptyDay(date);
    cur.current = d;
    setDraft(d);
  }, [disk, date]);
  const edit = useCallback((fn: (d: Day) => Day) => {
    const prev = cur.current;
    if (prev.closed) return;
    const next = fn(prev);
    cur.current = next;
    setDraft(next);
    flying.current++;
    queue.current = queue.current.then(() => saveDayMerged(prev, next)).then(
      () => { flying.current--; setError(undefined); },
      (e: unknown) => { flying.current--; setError(e instanceof Error ? e.message : String(e)); },
    );
  }, [saveDayMerged]);
  return { day: draft, edit, error };
}

/** The clock, re-read every minute. */
function useNow(): Date {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 60_000); return () => clearInterval(id); }, []);
  return t;
}

/**
 * «Сегодня» as a game (2026-11-21): the day is a climb. The scene shows the height taken, the card beside it asks one
 * question at a time as the bot does, and below everything of the day is one tap away — prayers, habits, what he holds
 * out against, tasks, the records. Points, XP, the fire and the medals are counted from the day files, never stored.
 */
export default function Play({ life, vault, today, open }: { life: Life; vault: Vault; today: string; open?: string }) {
  // `?date=` opens a day from «Неделя» or «Месяц»; a day ahead or a broken date is today
  const asked = open && /^\d{4}-\d{2}-\d{2}$/.test(open) && open <= today ? open : today;
  const [date, setDate] = useState(asked);
  useEffect(() => { setDate(asked); }, [asked]);
  const was = useRef(today);
  useEffect(() => { if (was.current !== today) { setDate((d) => (d === was.current ? today : d)); was.current = today; } }, [today]);
  return <PlayDay key={date} life={life} vault={vault} today={today} date={date} setDate={setDate} />;
}

function PlayDay({ life, vault, today, date, setDate }: { life: Life; vault: Vault; today: string; date: string; setDate: (d: string) => void }) {
  const { day, edit, error } = useDayEdit(life, date);
  const now = useNow();
  const isToday = date === today;
  const times = useMemo(() => prayerTimes(date), [date]);
  const period: PeriodKey | undefined = isToday ? periodAt(now, times) : undefined;
  const habits = useMemo(() => habitRows(life), [life]);
  const days = useMemo(() => new Map(life.days).set(date, day), [life.days, date, day]);
  const score = useMemo(() => dayScore(habits, day, date), [habits, day, date]);
  const flame = useMemo(() => fire(habits, days, today), [habits, days, today]);
  const ctx: XpContext = useMemo(() => ({ habits: life.habits, quests: life.quests, days, reads: readsOf(vault.pages) }), [life.habits, life.quests, days, vault.pages]);
  const dayXp = useMemo(() => sum(xpForDay(day, ctx)), [day, ctx]);
  const restXp = useMemo(() => { let n = 0; for (const [d, m] of xpByDay(life, vault.pages)) if (d !== date) n += sum(m); return n; }, [life, vault.pages, date]);
  const level = overallLevelProgress(restXp + dayXp);
  const open = useCallback((p: string) => !isToday || prayerOpen(p, now, times), [isToday, now, times]);
  const [later, setLater] = useState<Set<string>>(() => new Set());
  const queue = useMemo(() => asks(habits, day, date, open).filter((a) => !later.has(a.id)), [habits, day, date, open, later]);

  // what just happened: XP gained, a camp taken, a level reached
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const [party, setParty] = useState<string>();
  const seen = useRef({ xp: dayXp, camps: campsTaken(score.pct), level: level.level });
  useEffect(() => {
    const s = seen.current;
    const camps = campsTaken(score.pct);
    if (dayXp > s.xp) {
      const id = Date.now() + Math.random();
      setPops((p) => [...p, { id, text: `+${dayXp - s.xp} XP` }]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1500);
    }
    const said = level.level > s.level ? `Уровень ${level.level}` : camps > s.camps ? (camps === CAMPS.length ? "Вершина взята" : `${CAMP_NAMES[camps - 1]} взят`) : undefined;
    seen.current = { xp: dayXp, camps, level: level.level };
    if (!said) return;
    setParty(said);
    const t = window.setTimeout(() => setParty(undefined), 2600);
    return () => window.clearTimeout(t);
  }, [dayXp, score.pct, level.level]);

  const mark = (habit: string, m: DayMark | undefined) => edit((d) => withMark(d, habit, m));
  const cycle = (habit: string, order: (DayMark | undefined)[]) => { const i = order.indexOf(markOf(day, habit)); mark(habit, order[(i + 1) % order.length]); };
  const answer = (a: Ask, v: string | number) => {
    if (a.kind === "prayer") mark(a.habit, v as DayMark);
    else if (a.kind === "good") mark(a.habit, v === "yes" ? "done" : "failed");
    else if (a.kind === "bad") mark(a.habit, v === "yes" ? "failed" : "done");
    else if (a.kind === "scale") edit((d) => ({ ...d, [a.id]: Number(v) }));
    else if (a.kind === "task") { if (v === "yes") toggleTask(a.index); else setLater((s) => new Set(s).add(a.id)); }
    else if (a.id === "food") addMeal(String(v));
    else addWords("Благодарен", String(v));
  };
  const toggleTask = (i: number) => edit((d) => ({ ...d, tasks: d.tasks.map((t, j) => (j === i ? { ...t, done: !t.done } : t)) }));
  const addMeal = (what: string) => edit((d) => ({ ...d, meals: [...d.meals, { time: isToday ? hm(new Date()) : "", what, note: "" }] }));
  const addWords = (label: string, text: string) => edit((d) => ({ ...d, journal: [d.journal.trimEnd(), `- ${label}: ${text}`].filter(Boolean).join("\n") }));

  const prayers = habits.filter((h) => h.kind === "prayer" && habitDue(h, date));
  const good = habits.filter((h) => h.kind === "good" && habitDue(h, date));
  const bad = habits.filter((h) => h.kind === "bad" && habitDue(h, date));
  const st = standing(score.pct);
  const won = useMemo(() => medals(habits, days, today), [habits, days, today]);
  return (
    <div className="g-play">
      <div className="g-top">
        <Scene pct={score.pct} period={period} party={party}>
          <div className="g-date">
            <div className="g-kick">{WD[weekdayIndex(date)]} · неделя {Number(isoWeekKey(date).slice(-2))}{!isToday && " · не сегодня"}</div>
            <h1>{dayMonth(date)}</h1>
          </div>
          <div className="g-nav">
            <button onClick={() => setDate(addDays(date, -1))} aria-label="День назад">←</button>
            {!isToday && <button className="wide" onClick={() => setDate(today)}>сегодня</button>}
            <button onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="День вперёд">→</button>
          </div>
          <div className="g-height">
            <b>{score.pct}<span>%</span></b>
            <div><strong>{st.at}</strong>{st.next ? <>до «{st.next}» — {st.left} %</> : "день взят целиком"}</div>
          </div>
          {party && <div className="g-party" role="status">{party}</div>}
        </Scene>
        <AskCard key={queue[0]?.id ?? "none"} date={date} ask={queue[0]} left={queue.length} score={score} closed={day.closed} nextPrayer={isToday ? nextPrayer(prayers, day, now, times) : undefined} onAnswer={answer} onLater={(a) => setLater((s) => new Set(s).add(a.id))} hasLater={later.size > 0} onBack={() => setLater(new Set())} />
      </div>

      <div className="g-band">
        <div className="g-lvl"><b>{level.level}</b><span>уровень<br />{rankOf(level.level)}</span></div>
        <div className="g-xp">
          <div className="g-xpbar"><i style={{ width: `${Math.round((level.into / level.need) * 100)}%` }} /></div>
          <span>{level.into} / {level.need} XP до уровня {level.level + 1}</span>
          <div className="g-pops" aria-live="polite">{pops.map((p) => <em key={p.id}>{p.text}</em>)}</div>
        </div>
        <div className="g-stat"><b>+{dayXp}</b><span>XP за день</span></div>
        <div className={`g-stat g-fire${flame.days ? " on" : ""}${flame.today ? " lit" : ""}`} title="Дней подряд, когда взята хотя бы половина дня">
          <Flame /><b>{flame.days}</b><span>{plural(flame.days, "день", "дня", "дней")} подряд{isToday && !flame.today && flame.days > 0 ? " · сегодня ещё нет" : ""}</span>
        </div>
        <div className="g-parts">{score.parts.filter((p) => p.of > 0).map((p) => <div key={p.key} className={`g-part ${p.key}${p.got === p.of ? " full" : ""}`}><span>{p.label}</span><i><u style={{ width: `${(p.got / p.of) * 100}%` }} /></i></div>)}</div>
      </div>
      {error && <p className="g-error" role="alert">Не записал: {error}</p>}
      {day.closed && <p className="g-error">Этот день закрыт — его не правят.</p>}

      <Block title="Намазы" right={`${prayers.filter((h) => markOf(day, h.title) === "done").length} вовремя из ${prayers.length} · нажми: вовремя → поздно → пропустил`}>
        <div className="g-prayers">
          {prayers.map((h) => {
            const m = markOf(day, h.title);
            return (
              <button key={h.title} className={`g-prayer ${m ?? "none"}${open(h.title) ? "" : " early"}`} onClick={() => cycle(h.title, [undefined, "done", "late", "failed"])} aria-label={`${h.title}: ${markLabel(m)}`}>
                <span className="orb">{m === "done" ? "✓" : m === "late" ? "◔" : m === "failed" ? "✕" : ""}</span>
                <b>{h.title}</b>
                <small>{m ? markLabel(m) : PRAYER_AT[h.title] ? hm(times[PRAYER_AT[h.title]]) : ""}</small>
              </button>
            );
          })}
        </div>
      </Block>

      <div className="g-two">
        <Block title="Привычки" right={`${good.filter((h) => markOf(day, h.title) === "done").length} / ${good.length}`}>
          <div className="g-tiles">
            {good.map((h) => <HabitTile key={h.title} h={h} mark={markOf(day, h.title)} run={streak(h, days, date)} onClick={() => cycle(h.title, [undefined, "done", "failed"])} />)}
            {!good.length && <p className="g-faint">На этот день привычек нет.</p>}
          </div>
        </Block>
        <Block title="Держусь" right={bad.some((h) => !markOf(day, h.title)) ? <button className="g-link" onClick={() => edit((d) => bad.reduce((x, h) => (markOf(x, h.title) ? x : withMark(x, h.title, "done")), d))}>всё чисто за день</button> : `${bad.filter((h) => markOf(day, h.title) === "done").length} / ${bad.length} чисто`}>
          <div className="g-tiles">
            {bad.map((h) => <HabitTile key={h.title} h={h} bad mark={markOf(day, h.title)} run={streak(h, days, date)} onClick={() => cycle(h.title, [undefined, "done", "failed"])} />)}
          </div>
        </Block>
      </div>

      <div className="g-two">
        <Block title="Задачи дня" right={`${day.tasks.filter((t) => t.done).length} / ${day.tasks.length}`}>
          {byPeriod(day.tasks.map((t, i) => ({ ...t, i }))).map((g) => {
            const p = PERIODS.find((x) => x.key === g.key);
            if (!g.tasks.length) return null;
            return (
              <div key={g.key ?? "none"} className={`g-per${g.key && g.key === period ? " now" : ""}`}>
                <div className="g-per-h">{p ? <><b>{p.roman} · {p.from}–{p.to}</b><span>{p.what}</span></> : <b>без части дня</b>}</div>
                {g.tasks.map((t) => (
                  <div key={t.i} className={`g-task${t.done ? " done" : ""}`} onClick={(e) => { if (!(e.target as HTMLElement).closest("a, button")) toggleTask(t.i); }}>
                    <button className="box" onClick={() => toggleTask(t.i)} aria-pressed={t.done} aria-label={t.done ? "Снять отметку" : "Отметить сделанной"}>{t.done ? "✓" : ""}</button><TaskLine text={t.text} today={date} />
                  </div>
                ))}
              </div>
            );
          })}
          <AddTask period={period} onAdd={(text, key) => edit((d) => ({ ...d, tasks: [...d.tasks, { done: false, text: key ? withPeriod(text, key) : text }] }))} />
        </Block>
        <Block title="Записи дня" right="вес · состояние · еда · деньги · слова">
          <Logs day={day} life={life} date={date} edit={edit} addMeal={addMeal} addWords={addWords} />
        </Block>
      </div>

      <div className="g-three">
        <Block title="Путь · 5 недель" right="нажми на день — откроется">
          <Trail habits={habits} days={days} today={today} date={date} onPick={setDate} />
        </Block>
        <Block title="Колесо · 30 дней" right={<Link to="/wheel">подробно →</Link>}>
          <Radar life={life} vault={vault} today={today} />
        </Block>
        <Block title="Награды" right={`${won.filter((m) => m.got).length} из ${won.length}`}>
          <div className="g-medals">
            {won.map((m) => <div key={m.id} className={`g-medal${m.got ? " got" : ""}`} title={m.how}><img src={MEDAL_ART[m.id]} alt="" width="52" height="52" /><b>{m.title}</b><span>{m.got ? m.note : `${m.how} · ${m.note}`}</span></div>)}
          </div>
        </Block>
      </div>
    </div>
  );
}

const markLabel = (m: DayMark | undefined) => (m === "done" ? "вовремя" : m === "late" ? "поздно" : m === "failed" ? "пропустил" : "не отмечен");

/** The first prayer of today whose time has not come and that is not marked. */
function nextPrayer(prayers: Habit[], day: Day, now: Date, times: PrayerTimes): { title: string; at: string } | undefined {
  const p = prayers.find((h) => PRAYER_AT[h.title] && now < times[PRAYER_AT[h.title]] && !markOf(day, h.title));
  return p && { title: p.title, at: hm(times[PRAYER_AT[p.title]]) };
}

function Block({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return <section className="g-block"><h2>{title}{right && <span>{right}</span>}</h2>{children}</section>;
}

// ---------- the scene ----------

/** The paintings are 1536 × 1024; the trail follows the ridge that climbs from the lower left to the summit in all five. */
const ART: Record<PeriodKey, string> = { "фаджр": sceneFajr, "зухр": sceneZuhr, "аср": sceneAsr, "магриб": sceneMaghrib, "иша": sceneIsha };
const TRAIL: [number, number][] = [[92, 862], [222, 794], [384, 725], [512, 657], [657, 589], [802, 543], [922, 503], [1007, 461], [1062, 427]];
const SPARKS = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return { dx: Math.cos(a) * (50 + (i % 3) * 22), dy: Math.sin(a) * (50 + (i % 3) * 22) - 18 }; });

/**
 * The mountain of the day: one painted range in the light of the part of the day (a day that is over stands in the
 * night), the trail with its camps drawn over the ridge, and a lantern at the height taken. The picture and the trail
 * share one coordinate space, so they stay together at any size of the window.
 */
function Scene({ pct, period, party, children }: { pct: number; period: PeriodKey | undefined; party: string | undefined; children: ReactNode }) {
  const [lx, ly] = along(TRAIL, pct);
  const d = `M${TRAIL.map((p) => p.join(",")).join(" L")}`;
  const taken = campsTaken(pct);
  return (
    <div className="g-scene">
      <svg viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="g-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B0D13" stopOpacity="0" /><stop offset="1" stopColor="#0B0D13" stopOpacity=".85" /></linearGradient>
        </defs>
        <image key={period ?? "past"} className="art" href={ART[period ?? "иша"]} width="1536" height="1024" preserveAspectRatio="none" />
        <rect y="820" width="1536" height="204" fill="url(#g-mist)" />
        <path className="trail" d={d} />
        <path className="walked" d={d} pathLength={100} strokeDasharray={`${pct} 100`} />
        {CAMPS.map((c, i) => {
          const [x, y] = along(TRAIL, c);
          return i < CAMPS.length - 1
            ? <path key={c} className={`camp${i < taken ? " on" : ""}`} d={`M${x - 14},${y + 2} L${x},${y - 20} L${x + 14},${y + 2} Z`} />
            : <g key={c} className={`flag${taken === CAMPS.length ? " on" : ""}`}><line x1={x} y1={y} x2={x} y2={y - 44} /><path d={`M${x},${y - 44} L${x + 30},${y - 34} L${x},${y - 24} Z`} /></g>;
        })}
        <g className="lantern" style={{ transform: `translate(${lx}px, ${ly}px)` }}>
          <circle className="halo" r="38" /><circle className="core" r="10.5" />
          {party && SPARKS.map((s, i) => <circle key={i} className="spark" r={i % 2 ? 4.2 : 3} style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px` } as CSSProperties} />)}
        </g>
      </svg>
      {children}
    </div>
  );
}

// ---------- the check-in card ----------

function AskCard({ date, ask, left, score, closed, nextPrayer, onAnswer, onLater, hasLater, onBack }: { date: string; ask: Ask | undefined; left: number; score: Score; closed: boolean; nextPrayer: { title: string; at: string } | undefined; onAnswer: (a: Ask, v: string | number) => void; onLater: (a: Ask) => void; hasLater: boolean; onBack: () => void }) {
  const [text, setText] = useState("");
  const options: { v: string; label: string; tone: string }[] = !ask ? [] : ask.kind === "prayer"
    ? [{ v: "done", label: "Вовремя", tone: "yes" }, { v: "late", label: "Поздно", tone: "mid" }, { v: "failed", label: "Пропустил", tone: "no" }]
    : ask.kind === "bad" ? [{ v: "no", label: "Нет, чисто", tone: "yes" }, { v: "yes", label: "Да, было", tone: "no" }]
    : ask.kind === "good" ? [{ v: "yes", label: "Да", tone: "yes" }, { v: "no", label: "Нет", tone: "no" }]
    : ask.kind === "task" ? [{ v: "yes", label: "Сделал", tone: "yes" }, { v: "no", label: "Ещё нет", tone: "mid" }] : [];
  // 1 · 2 · 3 on the keyboard answer the buttons, unless he is typing somewhere
  useEffect(() => {
    if (!ask || closed || !options.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "")) return;
      const o = options[Number(e.key) - 1];
      if (o) { e.preventDefault(); onAnswer(ask, o.v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!ask || closed) {
    return (
      <section className="g-ask done">
        <div className="g-kick">{closed ? "день закрыт" : "вопросов нет"}</div>
        <div className="g-q">{score.pct >= 100 ? "Вершина. День взят целиком." : nextPrayer ? `Пока всё. Дальше — ${nextPrayer.title} в ${nextPrayer.at}.` : "Пока всё отмечено."}</div>
        <p className="g-faint">Высота {score.pct} % — {score.got} из {score.of} очков дня.</p>
        {hasLater && <button className="g-link" onClick={onBack}>вернуть отложенные вопросы</button>}
      </section>
    );
  }
  const submit = () => { const t = text.trim(); if (t) { onAnswer(ask, t); setText(""); } };
  return (
    <section className="g-ask">
      <div className="g-kick">вопрос · осталось {left}</div>
      <div className="g-q">{"icon" in ask && ask.icon && <span className="ico">{ask.icon}</span>}{ask.kind === "task" ? <TaskLine text={ask.text} today={date} /> : ask.text}</div>
      {ask.kind === "task" && <p className="g-faint">Задача дня — сделал?</p>}
      {options.length > 0 && <div className="g-opts">{options.map((o, i) => <button key={o.v} className={o.tone} onClick={() => onAnswer(ask, o.v)}>{o.label}<kbd>{i + 1}</kbd></button>)}</div>}
      {ask.kind === "scale" && <div className={`g-scale ${ask.id}`}>{Array.from({ length: 10 }, (_, i) => <button key={i} onClick={() => onAnswer(ask, i + 1)}>{i + 1}</button>)}</div>}
      {ask.kind === "text" && (
        <form className="g-line" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={ask.hint} aria-label={ask.text} />
          <button type="submit" disabled={!text.trim()}>Записать</button>
        </form>
      )}
      <button className="g-link later" onClick={() => onLater(ask)}>позже →</button>
    </section>
  );
}

// ---------- rows of the day ----------

export function HabitTile({ h, mark, run, bad = false, onClick }: { h: Habit; mark: DayMark | undefined; run: number; bad?: boolean; onClick: () => void }) {
  const icon = askOf(h).icon;
  const state = mark === "done" ? (bad ? "чисто" : "сделал") : mark === "failed" ? (bad ? "срыв" : "не сделал") : mark === "late" ? "поздно" : mark === "skipped" ? "пропуск" : "";
  return (
    <button className={`g-tile ${mark ?? "none"}${bad ? " bad" : ""}`} onClick={onClick} aria-label={`${h.title}: ${state || "не отмечено"}`}>
      <span className="ico">{icon ?? h.title.slice(0, 1)}</span>
      <b>{h.title}</b>
      <small>{state || (bad ? "нажми — чисто" : "нажми — сделал")}</small>
      {run > 0 && <em title={bad ? "Дней без срыва" : "Дней подряд"}><Flame />{run}</em>}
    </button>
  );
}

function AddTask({ period, onAdd }: { period: PeriodKey | undefined; onAdd: (text: string, key: PeriodKey | undefined) => void }) {
  const [text, setText] = useState("");
  const [key, setKey] = useState<PeriodKey | undefined>(period);
  return (
    <form className="g-add" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { onAdd(t, key); setText(""); } }}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Новая задача — Enter" aria-label="Новая задача" />
      <div className="g-chips" role="group" aria-label="Часть дня">
        {PERIODS.map((p) => <button type="button" key={p.key} className={p.key === key ? "on" : ""} aria-pressed={p.key === key} title={`${p.from}–${p.to}: ${p.what}`} onClick={() => setKey(p.key === key ? undefined : p.key)}>{p.roman}</button>)}
      </div>
    </form>
  );
}

function Logs({ day, life, date, edit, addMeal, addWords }: { day: Day; life: Life; date: string; edit: (fn: (d: Day) => Day) => void; addMeal: (what: string) => void; addWords: (label: string, text: string) => void }) {
  const last = weightNow(life, date);
  const [w, setW] = useState<number | undefined>(day.weight ?? last?.last.value);
  const [earn, setEarn] = useState(false);
  const [label, setLabel] = useState<WordLabel>("Благодарен");
  const [bad, setBad] = useState(false);
  const money = (text: string) => {
    const m = text.match(/^([+\-−]?\d[\d\s.,]*)(.*)$/);
    const n = m ? parseAmount(m[1].trim()) : undefined;
    if (!m || n === undefined || n === 0) { setBad(true); return false; }
    setBad(false);
    edit((d) => ({ ...d, txs: [...d.txs, { amount: earn ? Math.abs(n) : -Math.abs(n), category: "", account: "", note: m[2].trim() }] }));
    return true;
  };
  const words = [...day.done.map((x) => `Сделал: ${x}`), ...day.journal.split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean)];
  return (
    <div className="g-logs">
      <div className="g-log"><label>Настроение</label><Scale kind="mood" value={day.mood} onPick={(n) => edit((d) => ({ ...d, mood: d.mood === n ? undefined : n }))} /></div>
      <div className="g-log"><label>Стресс</label><Scale kind="stress" value={day.stress} onPick={(n) => edit((d) => ({ ...d, stress: d.stress === n ? undefined : n }))} /></div>
      <div className="g-log">
        <label>Вес</label>
        <div className="g-weight">
          <button onClick={() => setW((x) => Math.round(((x ?? 80) - 0.1) * 10) / 10)} aria-label="Меньше на 100 г">−</button>
          <b>{w ?? "—"}<span> кг</span></b>
          <button onClick={() => setW((x) => Math.round(((x ?? 80) + 0.1) * 10) / 10)} aria-label="Больше на 100 г">+</button>
          <button className="save" disabled={w === undefined || w === day.weight} onClick={() => edit((d) => ({ ...d, weight: w }))}>{day.weight !== undefined && w === day.weight ? "записан" : "записать"}</button>
          {last && day.weight === undefined && <small>был {last.last.value} · {short(last.last.date)}</small>}
        </div>
      </div>
      <div className="g-log">
        <label>Еда</label>
        <div>
          <Line placeholder="Что съел — Enter" onSubmit={(t) => { addMeal(t); return true; }} />
          {day.meals.length > 0 && <div className="g-pills">{day.meals.map((m, i) => <span key={i} className={isLateMeal(m) ? "late" : ""}>{m.time && <i>{m.time}</i>}{m.what}</span>)}</div>}
        </div>
      </div>
      <div className="g-log">
        <label>Деньги</label>
        <div>
          <div className="g-money">
            <div className="g-chips"><button className={!earn ? "on" : ""} aria-pressed={!earn} onClick={() => setEarn(false)}>расход</button><button className={earn ? "on" : ""} aria-pressed={earn} onClick={() => setEarn(true)}>доход</button></div>
            <Line placeholder="1500 такси — Enter" onSubmit={money} />
          </div>
          {bad && <small className="g-bad">Начни с суммы: «1500 такси».</small>}
          {day.txs.length > 0 && <div className="g-pills"><span><i>расход</i>{fmt(spentOf(day))} ₸</span>{earnedOf(day) > 0 && <span><i>доход</i>{fmt(earnedOf(day))} ₸</span>}{day.txs.slice(-3).map((t, i) => <span key={i}>{t.amount > 0 ? "+" : "−"}{fmt(Math.abs(t.amount))}{t.note && ` ${t.note}`}</span>)}</div>}
        </div>
      </div>
      <div className="g-log">
        <label>Слова</label>
        <div>
          <div className="g-chips wrap">{(["Сделал", ...REFLECT] as WordLabel[]).map((l) => <button key={l} className={l === label ? "on" : ""} aria-pressed={l === label} onClick={() => setLabel(l)}>{l}</button>)}</div>
          <Line placeholder={label === "Сделал" ? "Что сделал — Enter" : `${label}… — Enter`} onSubmit={(t) => { if (label === "Сделал") edit((d) => ({ ...d, done: [...d.done, t] })); else addWords(label, t); return true; }} />
          {words.length > 0 && <ul className="g-words">{words.slice(-4).map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      </div>
    </div>
  );
}

function Scale({ kind, value, onPick }: { kind: "mood" | "stress"; value: number | undefined; onPick: (n: number) => void }) {
  return <div className={`g-scale ${kind}`}>{Array.from({ length: 10 }, (_, i) => <button key={i} className={value !== undefined && i + 1 <= value ? (i + 1 === value ? "on at" : "on") : ""} aria-pressed={value === i + 1} onClick={() => onPick(i + 1)}>{i + 1}</button>)}</div>;
}

/** One line that is written on Enter; stays when the text was not understood. */
function Line({ placeholder, onSubmit }: { placeholder: string; onSubmit: (text: string) => boolean }) {
  const [text, setText] = useState("");
  return <form className="g-line" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t && onSubmit(t)) setText(""); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></form>;
}

// ---------- the pictures below ----------

/** Thirty-five days as squares, the brighter the higher the day went. */
function Trail({ habits, days, today, date, onPick }: { habits: Habit[]; days: Map<string, Day>; today: string; date: string; onPick: (d: string) => void }) {
  const end = addDays(today, 6 - ((weekdayIndex(today) + 6) % 7)); // the Sunday closing this week
  const cells = Array.from({ length: 35 }, (_, i) => addDays(end, i - 34));
  return (
    <div className="g-trail">
      {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => <span key={d} className="wd">{d}</span>)}
      {cells.map((d) => {
        const pct = d > today ? -1 : dayScore(habits, days.get(d), d).pct;
        return <button key={d} disabled={d > today} className={`c${pct < 0 ? " future" : ` s${campsTaken(pct)}`}${pct > 0 && pct < 25 ? " low" : ""}${d === date ? " sel" : ""}${d === today ? " today" : ""}`} title={`${dayMonth(d)} · ${pct < 0 ? "впереди" : `${pct} %`}`} aria-label={`${dayMonth(d)}: ${pct < 0 ? "впереди" : `${pct} %`}`} onClick={() => onPick(d)}>{Number(d.slice(8))}</button>;
      })}
    </div>
  );
}

/** XP of the last thirty days over the eight themes: where the month went and what it left out. */
function Radar({ life, vault, today }: { life: Life; vault: Vault; today: string }) {
  const xs = useMemo(() => themeXps(life, vault.pages, today), [life, vault.pages, today]);
  const max = Math.max(1, ...xs.map((x) => x.last30));
  const R = 78, C = 110;
  const at = (i: number, r: number): [number, number] => { const a = (i / xs.length) * Math.PI * 2 - Math.PI / 2; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
  const pts = xs.map((x, i) => at(i, 8 + Math.sqrt(x.last30 / max) * (R - 8))); // the root, so one loud theme does not flatten the rest
  const quiet = xs.filter((x) => !x.last30).map((x) => THEMES.find((t) => t.name === x.theme)?.ru ?? x.theme);
  return (
    <div className="g-radar">
      <svg viewBox="0 0 220 220" role="img" aria-label="XP по восьми темам за 30 дней">
        {[0.33, 0.66, 1].map((k) => <polygon key={k} className="web" points={xs.map((_, i) => at(i, R * k).join(",")).join(" ")} />)}
        {xs.map((_, i) => <line key={i} className="web" x1={C} y1={C} x2={at(i, R)[0]} y2={at(i, R)[1]} />)}
        <polygon className="shape" points={pts.map((p) => p.join(",")).join(" ")} />
        {xs.map((x, i) => {
          const t = THEMES.find((th) => th.name === x.theme);
          const [lx, ly] = at(i, R + 16);
          return <g key={x.theme}><circle cx={pts[i][0]} cy={pts[i][1]} r="3.5" fill={t?.color} /><text x={lx} y={ly + 3} textAnchor={Math.abs(lx - C) < 8 ? "middle" : lx > C ? "start" : "end"} className={x.last30 ? "" : "off"}>{t?.ru}</text></g>;
        })}
      </svg>
      <p className="g-faint">{quiet.length ? `Без XP за месяц: ${quiet.join(", ")}.` : "Все восемь тем получили XP за месяц."}</p>
    </div>
  );
}

function Flame() {
  return <svg className="g-flame" viewBox="0 0 16 20" aria-hidden="true"><path d="M8.2 0.8c.5 3.2-1.2 4.6-2.6 6.4C4.2 9 3 10.700 3 13a5 5 0 0 0 10 0c0-1.700-.6-3.200-1.500-4.400-.3 1.300-.9 2.100-1.700 2.500.5-3.700-.6-7.700-1.600-10.300Z" /></svg>;
}
