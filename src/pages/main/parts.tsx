import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { startRun } from "../../lib/claude";
import { useRuns } from "../../lib/claudeRuns";
import { daysBetween, plainStep, type ActivityView, type Focus, type GoalView, type Signal } from "../../lib/dashboard";
import { themeColor, themeRu } from "../../lib/themes";
import { useDayToday } from "../../lib/useDayToday";
import { useStore } from "../../store";

export type Tone = "sage" | "honey" | "ember" | "smoke";
/** The dashboard palette as hex, for SVG fills (Main.css carries the same values as variables). */
export const HEX = { sun: "#E7C27A", sage: "#86C9A4", honey: "#E2AB5E", ember: "#E26A61", iris: "#A89DFF", moon: "#EDE7DA", ash: "#A19D93", smoke: "#6F6D6A", hair: "rgba(237,231,218,0.10)", well: "rgba(237,231,218,0.05)" };

const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MON_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
/** «4 ноя». */
export const short = (date: string) => `${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]}`;
/** «4 ноября». */
export const dayMonth = (date: string) => `${Number(date.slice(8, 10))} ${MON_GEN[Number(date.slice(5, 7)) - 1]}`;
export const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(Math.round(x * 10) / 10)}`;

/** A status as a dot and a few words — the one way the dashboard says good, attention, bad. */
export const Status = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`d-st ${tone}`}>{children}</span>;

export function Card({ title, right, className = "", children }: { title?: ReactNode; right?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`d-card ${className}`}>
      {title && <h2>{title}{right && <span className="d-right">{right}</span>}</h2>}
      {children}
    </section>
  );
}

/** The top of a tab: a small kicker, the period in large serif, and what sits beside it. */
export function Hero({ kicker, title, side, top = false, children }: { kicker: string; title: ReactNode; side: ReactNode; top?: boolean; children?: ReactNode }) {
  return (
    <header className={`d-hero${top ? " top" : ""}`}>
      <div>
        <div className="d-kick">{kicker}</div>
        <h1>{title}</h1>
        {children}
      </div>
      {side}
    </header>
  );
}

/** The period in four numbers under the title of «Неделя» and «Месяц». */
export function Glance({ items }: { items: { v: ReactNode; of?: string; label: string }[] }) {
  return <div className="d-glance">{items.map((x) => <div key={x.label}><b>{x.v}{x.of && <span> {x.of}</span>}</b>{x.label}</div>)}</div>;
}

export function Tile({ k, v, of, sub, foot, tone, thin, hint }: { k: string; v: ReactNode; of?: string; sub?: ReactNode; foot?: ReactNode; tone?: Tone; thin?: boolean; hint?: string }) {
  return (
    <div className={`d-tile${thin ? " thin" : ""}`}>
      <div className="k"><span>{k}</span>{hint && <span className="hint">{hint}</span>}{tone && <i className={tone} />}</div>
      <div className="v">{v}{of && <span className="of"> {of}</span>}</div>
      {sub && <div className="s">{sub}</div>}
      {foot && <div className="c">{foot}</div>}
    </div>
  );
}

export function SignalRow({ s }: { s: Signal }) {
  return (
    <div className={`d-sig ${s.level}`}>
      <i />
      <div>
        <div className="t">{s.title}</div>
        {s.fact && <div className="f">{s.fact}</div>}
        <div className="src">{s.source}</div>
      </div>
    </div>
  );
}

export function Dots({ flags, dates }: { flags: boolean[]; dates: string[] }) {
  return <span className="d-dots">{flags.map((f, i) => <i key={dates[i]} className={f ? "on" : ""} title={short(dates[i])} />)}</span>;
}

export function actStatus(a: ActivityView): ReactNode {
  if (a.state === "overdue") return <Status tone="ember">срок прошёл {a.quest.due ? short(a.quest.due) : ""}</Status>;
  if (a.state === "empty") return <Status tone="honey">записей нет</Status>;
  if (a.state === "idle") return <Status tone="honey">стоит {a.idle} дн</Status>;
  return <Status tone="sage">{a.idle === 0 ? "сегодня" : `${a.idle} дн назад`}</Status>;
}

export function ActivityList({ acts }: { acts: ActivityView[] }) {
  const moving = acts.filter((a) => a.state === "moving").length;
  return (
    <Card title="Деятельности" right={acts.length ? `${moving} движутся · ${acts.length - moving} стоят` : undefined}>
      {!acts.length && <p className="d-faint">деятельностей нет</p>}
      {acts.map((a) => {
        const step = a.now ? plainStep(a.now) : "";
        return (
          <Link key={a.quest.rel} to={`/quest/${encodeURIComponent(a.quest.rel)}`} className="d-act">
            <span className="bar" style={{ background: themeColor(a.quest.theme) }} />
            <div>
              <div className="t">{a.quest.title}</div>
              <div className="th">{themeRu(a.quest.theme)} · {a.quest.cadence ?? "—"}</div>
              {step && <div className="d-now">{step}</div>}
            </div>
            {actStatus(a)}
          </Link>
        );
      })}
    </Card>
  );
}

/** Claude's lines for the period in italic serif — the one voice on the page that is not a fact — or the button that asks for them. */
export function ClaudeBlock({ title, focus, period, note }: { title: string; focus: Focus; period: "week" | "month"; note: string }) {
  const { root } = useStore();
  const today = useDayToday();
  const running = useRuns().some((r) => r.op === "focus" && r.status === "running");
  return (
    <div className="d-claude">
      <div className="d-kick who">Claude · {title}</div>
      {focus.lines.length ? <ol>{focus.lines.map((l) => <li key={l}>{l}</li>)}</ol> : <p className="d-faint">Claude ещё не написал.</p>}
      <div className="note">
        {focus.on && <>написано {short(focus.on)} · </>}
        {focus.stale && <>это прошлый период · </>}
        {note}{" "}
        {running ? <Link to="/claude">Claude пишет… открыть</Link> : <button className="d-link" onClick={() => void startRun(root, "focus", period, today, undefined)}>Попросить Claude</button>}
      </div>
    </div>
  );
}

export function GoalRow({ g }: { g: GoalView }) {
  if (g.placeholder) return <div className="d-goal d-empty"><div className="gt">цели нет — твоими словами или пусто</div></div>;
  const chip = g.chip === "hot" ? <Status tone="ember">горит</Status>
    : g.chip === "done" ? <Status tone="sage">готово</Status>
    : g.chip === "behind" ? <Status tone="honey">отстаёт</Status>
    : g.chip === "ontrack" ? <Status tone="sage">идёт</Status>
    : g.chip === "nodata" ? <Status tone="smoke">нет данных</Status> : null;
  const meta = [g.line.measure && `мера: ${g.line.measure}`, g.now && `сейчас: ${g.now}`, g.line.due && `срок ${short(g.line.due)}`].filter(Boolean).join(" · ");
  return <div className="d-goal"><div className="gt">{g.line.title}</div>{(meta || chip) && <div className="gm">{meta && <span>{meta}</span>}{chip}</div>}</div>;
}

export type PrayerMark = "done" | "late" | "failed" | "none";
/** Where each prayer falls on the sun's path, in degrees: 180 is dawn on the horizon, 90 the zenith, 0 dusk; below the horizon is night. */
const ARC_DEG: Record<string, number> = { "Фаджр": 205, "Зухр": 86, "Жума": 86, "Аср": 40, "Магриб": 0, "Иша": -28, "Витр": -55 };
const ARC_WORD: Record<PrayerMark, string> = { done: "вовремя", late: "поздно", failed: "пропущен", none: "без отметки" };

/** The signature of «Сегодня»: yesterday's prayers on the sun's path over the horizon — fajr before dawn, isha and witr after dusk. */
export function DayArc({ prayers }: { prayers: { title: string; mark: PrayerMark }[] }) {
  const W = 560, cx = W / 2, hy = 150, rx = 236, ry = 116;
  const pt = (deg: number): [number, number] => { const r = (deg * Math.PI) / 180; return [cx + rx * Math.cos(r), hy - ry * Math.sin(r)]; };
  const path = (a: number, b: number) => {
    const n = Math.ceil(Math.abs(b - a) / 2);
    return Array.from({ length: n + 1 }, (_, i) => { const [x, y] = pt(a + ((b - a) * i) / n); return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join("");
  };
  const of = (m: PrayerMark) => prayers.filter((p) => p.mark === m);
  const late = of("late"), failed = of("failed");
  // Not a made-up «0 вовремя»: with no mark at all (no day file, or nothing answered) the caption is «—».
  const said = of("none").length === prayers.length ? "—" : `${of("done").length} вовремя${late.length ? ` · ${late.length} поздно (${late.map((p) => p.title).join(", ")})` : ""}${failed.length ? ` · ${failed.length} пропущено` : ""}`;
  return (
    <div className="d-arc">
      <svg viewBox={`-12 0 ${W + 24} 286`} role="img" aria-label="Намаз вчера по времени дня">
        <defs>
          <linearGradient id="d-sunpath" x1="0" x2="1">
            <stop offset="0" stopColor="#E39A7A" stopOpacity="0.55" />
            <stop offset="0.5" stopColor={HEX.sun} />
            <stop offset="1" stopColor="#C98A6A" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <line className="horizon" x1={0} x2={W} y1={hy} y2={hy} />
        <path className="night" d={path(214, 180)} />
        <path className="night" d={path(0, -62)} />
        <path className="day" pathLength={1} stroke="url(#d-sunpath)" d={path(180, 0)} />
        <text x={0} y={hy + 16} className="edge">рассвет</text>
        <text x={W} y={hy + 16} textAnchor="end" className="edge">закат</text>
        {prayers.map((p, i) => {
          const [x, y] = pt(ARC_DEG[p.title] ?? 90);
          return (
            <g key={p.title} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
              <g className={`pt ${p.mark}`} style={{ animationDelay: `${0.55 + i * 0.09}s` }}>
                <title>{`${p.title} — ${ARC_WORD[p.mark]}`}</title>
                {p.mark === "done" && <circle r={14} className="halo" />}
                {p.mark === "late" && <circle r={11} className="ring" />}
                <circle r={p.mark === "none" ? 6 : 6.5} className="core" />
                <text y={y > hy ? 26 : -17} textAnchor="middle">{p.title}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="cap">
        <span>Вчера: {said}</span>
        <span>намаз по времени дня</span>
      </div>
    </div>
  );
}

const CW = 600;
/** One dot per day: a day file with a mark is lit. */
export function CoverageDots({ days }: { days: { key: string; title: string; on: boolean }[] }) {
  const step = CW / Math.max(1, days.length);
  return (
    <svg viewBox={`0 0 ${CW} 12`} className="d-svg">
      {days.map((d, i) => <circle key={d.key} cx={i * step + step / 2} cy={6} r={3.2} fill={d.on ? HEX.sun : HEX.hair}><title>{d.title}</title></circle>)}
    </svg>
  );
}

/** Day columns: each day a stack of [value, colour] from the bottom, out of `max`. */
export function Columns({ days, max, height = 44 }: { days: { key: string; title: string; parts: [number, string][] }[]; max: number; height?: number }) {
  const step = CW / Math.max(1, days.length), bw = step * 0.5;
  return (
    <svg viewBox={`0 0 ${CW} ${height}`} className="d-svg">
      {days.map((d, i) => {
        let y = height;
        return (
          <g key={d.key}>
            <title>{d.title}</title>
            {d.parts.map(([v, c], j) => {
              const h = max > 0 ? (v / max) * height : 0;
              y -= h;
              return h > 1.2 ? <rect key={j} x={i * step + (step - bw) / 2} y={y + 0.6} width={bw} height={h - 1.2} rx={1.5} fill={c} /> : null;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Mood (filled) and stress (ring), 1–10, as points over the days. */
export function Points({ days, height = 46 }: { days: { key: string; mood?: number; stress?: number }[]; height?: number }) {
  const step = CW / Math.max(1, days.length), y = (v: number) => height - ((v - 1) / 9) * height;
  return (
    <svg viewBox={`0 -4 ${CW} ${height + 8}`} className="d-svg">
      <line x1={0} x2={CW} y1={y(5)} y2={y(5)} stroke={HEX.hair} strokeDasharray="2 5" />
      {days.map((d, i) => (
        <g key={d.key}>
          {d.mood !== undefined && <circle cx={i * step + step / 2} cy={y(d.mood)} r={3.6} fill={HEX.iris}><title>{`настроение ${d.mood}`}</title></circle>}
          {d.stress !== undefined && <circle cx={i * step + step / 2} cy={y(d.stress)} r={3.6} fill="none" stroke={HEX.honey} strokeWidth={1.4}><title>{`стресс ${d.stress}`}</title></circle>}
        </g>
      ))}
    </svg>
  );
}

/** Every weight, the target line and the pace needed from the last weight to the deadline. */
export function WeightLine({ points, goal, today }: { points: { date: string; value: number }[]; goal: { target: number; by: string } | undefined; today: string }) {
  if (!points.length) return <p className="d-faint">Замеров нет.</p>;
  const H = 70, start = points[0].date, end = goal && goal.by > today ? goal.by : today;
  const span = Math.max(1, daysBetween(start, end));
  const vals = [...points.map((p) => p.value), ...(goal ? [goal.target] : [])];
  const lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
  const x = (d: string) => (daysBetween(start, d) / span) * CW, y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 -8 ${CW} ${H + 24}`} className="d-svg">
      {goal && <line x1={0} x2={CW} y1={y(goal.target)} y2={y(goal.target)} stroke={HEX.sage} strokeOpacity={0.45} strokeDasharray="3 5" />}
      {goal && <text x={4} y={y(goal.target) + 13}>цель {goal.target}</text>}
      {goal && <path d={`M${x(last.date)},${y(last.value)} L${x(goal.by)},${y(goal.target)}`} stroke={HEX.iris} strokeOpacity={0.8} strokeDasharray="2 5" fill="none" />}
      <path d={points.map((p, i) => `${i ? "L" : "M"}${x(p.date)},${y(p.value)}`).join(" ")} stroke={HEX.moon} strokeWidth={1.5} fill="none" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(p.date)} cy={y(p.value)} r={3.4} fill={HEX.moon}><title>{`${short(p.date)}: ${p.value} кг`}</title></circle>
          {(i === 0 || i === points.length - 1) && <text x={x(p.date)} y={y(p.value) - 9} textAnchor={i === 0 ? "start" : "middle"}>{p.value}</text>}
        </g>
      ))}
      <text x={0} y={H + 15}>{short(start)}</text>
      <text x={CW} y={H + 15} textAnchor="end">{short(end)}</text>
    </svg>
  );
}
