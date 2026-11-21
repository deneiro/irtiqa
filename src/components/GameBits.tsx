import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { CAMPS, campsTaken, rankOf, type ClimbSummary, type DayHeight } from "../lib/game";
import type { LevelProgress } from "../lib/levels";
import type { CircleWarmth, TieWarmth } from "../lib/circle";
import { plural } from "../lib/dates";
import "./GameBits.css";

/**
 * The pieces of the game that pages other than «Сегодня» show (2026-11-21): a painted header, a level with its bar,
 * a week as seven pillars, a month as a calendar of heights. They carry their own colours (prefix `gb-`), so they sit
 * the same inside the dashboard, a theme page and the sidebar. Everything is read only; a day opens in «Сегодня».
 */
const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const dayOf = (date: string) => Number(date.slice(8));
const wdOf = (date: string) => WD[new Date(`${date}T00:00:00`).getDay()];
const label = (h: DayHeight) => `${dayOf(h.date)} ${MON[Number(h.date.slice(5, 7)) - 1]} · ${h.future ? "впереди" : `${h.pct} %`}`;
export const dayUrl = (date: string) => `/?tab=play&date=${date}`;

export function FlameIcon() {
  return <svg className="gb-flame" viewBox="0 0 16 20" aria-hidden="true"><path d="M8.2 0.8c.5 3.2-1.2 4.6-2.6 6.4C4.2 9 3 10.700 3 13a5 5 0 0 0 10 0c0-1.700-.6-3.200-1.500-4.400-.3 1.300-.9 2.100-1.700 2.500.5-3.700-.6-7.700-1.600-10.300Z" /></svg>;
}

/** A painted header: the picture across, the page's name over its calm left side, and what the page wants to say on the right. */
export function Banner({ art, kicker, title, color, aside, children }: { art: string; kicker: ReactNode; title: ReactNode; color?: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <header className="gb" style={color ? ({ "--gb-c": color } as CSSProperties) : undefined}>
      <img className="gb-art" src={art} alt="" />
      <div className="gb-in">
        <div className="gb-text">
          <div className="gb-kick">{kicker}</div>
          <h1>{title}</h1>
          {children}
        </div>
        {aside && <div className="gb-aside">{aside}</div>}
      </div>
    </header>
  );
}

/** A level as a round mark with the bar to the next one. */
export function LevelMark({ level, caption, note, small = false }: { level: LevelProgress; caption: string; note?: ReactNode; small?: boolean }) {
  return (
    <div className={`gb-lvl${small ? " small" : ""}`}>
      <b>{level.level}</b>
      <div>
        <span>{caption}</span>
        <i><u style={{ width: `${Math.round((level.into / level.need) * 100)}%` }} /></i>
        <small>{level.into} / {level.need} XP{note ? <> · {note}</> : null}</small>
      </div>
    </div>
  );
}

/** XP of the last eight weeks as small bars, the current week last. */
export function WeekBars({ weeks }: { weeks: { week: string; xp: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.xp));
  return (
    <div className="gb-weeks" role="img" aria-label={`XP по неделям: ${weeks.map((w) => w.xp).join(", ")}`}>
      {weeks.map((w, i) => <i key={w.week} className={i === weeks.length - 1 ? "now" : ""} title={`неделя с ${dayOf(w.week)} ${MON[Number(w.week.slice(5, 7)) - 1]} · ${w.xp} XP`}><u style={{ height: `${Math.max(w.xp ? 8 : 0, (w.xp / max) * 100)}%` }} /></i>)}
    </div>
  );
}

/** The player in the sidebar: the level, the rank, the fire. */
export function PlayerBadge({ level, flame }: { level: LevelProgress; flame: { days: number; today: boolean } }) {
  return (
    <Link to="/" className="gb-badge" title="Уровень и дни подряд — открыть «Сегодня»">
      <b>{level.level}</b>
      <div>
        <span>{rankOf(level.level)}</span>
        <i><u style={{ width: `${Math.round((level.into / level.need) * 100)}%` }} /></i>
      </div>
      <em className={flame.today ? "lit" : flame.days ? "on" : ""}><FlameIcon />{flame.days}</em>
    </Link>
  );
}

/** A stretch in numbers: XP, the average height, days from half, summits — and the fire when it is given. */
export function ClimbNumbers({ s, flame }: { s: ClimbSummary; flame?: { days: number; today: boolean } }) {
  return (
    <div className="gb-nums">
      <div><b>+{s.xp}</b><span>XP</span></div>
      <div><b>{s.passed ? s.avg : "—"}<small>{s.passed ? " %" : ""}</small></b><span>средняя высота</span></div>
      <div><b>{s.taken}<small> / {s.passed}</small></b><span>{plural(s.taken, "день", "дня", "дней")} от 50 %</span></div>
      <div><b>{s.summits}</b><span>{plural(s.summits, "вершина", "вершины", "вершин")}</span></div>
      {flame && <div className={`fire${flame.today ? " lit" : flame.days ? " on" : ""}`}><b><FlameIcon />{flame.days}</b><span>{plural(flame.days, "день", "дня", "дней")} подряд</span></div>}
    </div>
  );
}

/** Seven days as pillars: the higher the day went, the taller; the camps are lines across. */
export function Climb({ days, today }: { days: DayHeight[]; today: string }) {
  return (
    <div className="gb-climb">
      <div className="gb-lines" aria-hidden="true">{CAMPS.map((c) => <i key={c} style={{ bottom: `${c}%` }}><span>{c}</span></i>)}</div>
      {days.map((h) => (
        <Link key={h.date} to={dayUrl(h.date)} className={`gb-col${h.future ? " future" : ` s${campsTaken(h.pct)}`}${h.date === today ? " today" : ""}`} title={label(h)} aria-label={label(h)} aria-disabled={h.future} tabIndex={h.future ? -1 : 0} onClick={(e) => { if (h.future) e.preventDefault(); }}>
          <div className="pillar"><u style={{ height: `${h.future ? 0 : Math.max(h.pct, 2)}%` }}>{!h.future && h.pct > 0 && <b>{h.pct}</b>}</u></div>
          <span>{wdOf(h.date)} <em>{dayOf(h.date)}</em></span>
        </Link>
      ))}
    </div>
  );
}

/** A month as a calendar: every day a cell filled to its height, a summit marked. */
export function MonthGrid({ days, lead, today }: { days: DayHeight[]; lead: number; today: string }) {
  return (
    <div className="gb-month">
      {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => <span key={d} className="wd">{d}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
      {days.map((h) => (
        <Link key={h.date} to={dayUrl(h.date)} className={`gb-cell${h.future ? " future" : ` s${campsTaken(h.pct)}`}${h.date === today ? " today" : ""}`} title={label(h)} aria-label={label(h)} aria-disabled={h.future} tabIndex={h.future ? -1 : 0} onClick={(e) => { if (h.future) e.preventDefault(); }}>
          <u style={{ height: `${h.future ? 0 : h.pct}%` }} />
          <b>{dayOf(h.date)}</b>
          {!h.future && h.pct >= 100 && <em aria-hidden="true">▲</em>}
        </Link>
      ))}
    </div>
  );
}

/** One tie: how warm it is now and how far into its rhythm. */
export function TieMeter({ w }: { w: TieWarmth }) {
  return (
    <div className={`gb-tie ${w.state === "тёплая" ? "warm" : w.state === "остывает" ? "cooling" : "cold"}`}>
      <span>связь · {w.state}</span>
      <i><u style={{ width: `${w.pct}%` }} /></i>
      <small>{w.since === undefined ? `ритм — раз в ${w.cadence} ${plural(w.cadence, "день", "дня", "дней")}` : `${w.since} ${plural(w.since, "день", "дня", "дней")} из ${w.cadence} — ритм близости`}</small>
    </div>
  );
}

/** The circle: the share of ties still within their rhythm, and the same by the four bands. */
export function CircleMeter({ w }: { w: CircleWarmth }) {
  return (
    <div className="gb-circle">
      <div className="top"><b>{w.total ? w.pct : "—"}<small>{w.total ? " %" : ""}</small></b><span>тепло круга<br />{w.warm} из {w.total} в ритме</span></div>
      {w.bands.filter((b) => b.total > 0).map((b) => (
        <div key={b.title} className="band"><span>{b.title}</span><i><u style={{ width: `${(b.warm / b.total) * 100}%` }} /></i><em>{b.warm} / {b.total}</em></div>
      ))}
      {!w.total && <small>Близость не отмечена ни у кого — её ставят на «Кругах».</small>}
    </div>
  );
}
