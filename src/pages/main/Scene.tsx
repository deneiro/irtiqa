import type { ReactNode } from "react";
import { rankOf, type ClimbSummary } from "../../lib/game";
import type { Game } from "../../lib/useGame";
import { plural } from "../../lib/dates";
import { FlameIcon } from "../../components/GameBits";
import "./Play.css";

/**
 * What every tab of «Главный» is built from since 2026-11-21, the way «Сегодня» is: a painted scene with the tab's own
 * drawing over it, a card beside the scene, a band of game numbers, and blocks below. The picture and what is drawn
 * over it share one coordinate space (1536 wide), so they stay together at any size of the window.
 */
export function SceneFrame({ art, height = 640, svg, children }: { art: string; height?: number; svg?: ReactNode; children?: ReactNode }) {
  return (
    <div className="g-scene g-banner">
      <svg viewBox={`0 0 1536 ${height}`} preserveAspectRatio="xMaxYMid slice">
        <defs>
          <linearGradient id="g-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B0D13" stopOpacity="0" /><stop offset="1" stopColor="#0B0D13" stopOpacity=".85" /></linearGradient>
        </defs>
        <image className="art" href={art} width="1536" height={height} preserveAspectRatio="none" />
        <rect y={height - 170} width="1536" height="170" fill="url(#g-mist)" />
        {svg}
      </svg>
      {children}
    </div>
  );
}

/** The scene's own words: a kicker and the period in large serif at the top left, one big number at the bottom right. */
export function SceneTitle({ kicker, title }: { kicker: ReactNode; title: ReactNode }) {
  return <div className="g-date"><div className="g-kick">{kicker}</div><h1>{title}</h1></div>;
}
export function SceneNumber({ value, unit, label, sub }: { value: ReactNode; unit?: string; label: string; sub?: ReactNode }) {
  return <div className="g-height"><b>{value}{unit && <span>{unit}</span>}</b><div><strong>{label}</strong>{sub}</div></div>;
}

/** The card beside a scene. */
export function SideCard({ kicker, children }: { kicker: ReactNode; children: ReactNode }) {
  return <section className="g-ask g-side"><div className="g-kick">{kicker}</div>{children}</section>;
}

export function Block({ title, right, className = "", children }: { title: ReactNode; right?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`g-block ${className}`}><h2>{title}{right && <span>{right}</span>}</h2>{children}</section>;
}

/** The band under a scene: the level, its bar, and a stretch of days in numbers with the fire. */
export function GameBand({ game, s, stretch }: { game: Game; s: ClimbSummary; stretch: string }) {
  const l = game.level, f = game.flame;
  return (
    <div className="g-band">
      <div className="g-lvl"><b>{l.level}</b><span>уровень<br />{rankOf(l.level)}</span></div>
      <div className="g-xp">
        <div className="g-xpbar"><i style={{ width: `${Math.round((l.into / l.need) * 100)}%` }} /></div>
        <span>{l.into} / {l.need} XP до уровня {l.level + 1}</span>
      </div>
      <div className="g-stat"><b>+{s.xp}</b><span>XP за {stretch}</span></div>
      <div className="g-stat"><b>{s.passed ? s.avg : "—"}</b><span>% средняя высота</span></div>
      <div className="g-stat"><b>{s.taken}</b><span>из {s.passed} {plural(s.passed, "дня", "дней", "дней")} от 50 %</span></div>
      <div className="g-stat"><b>{s.summits}</b><span>{plural(s.summits, "вершина", "вершины", "вершин")}</span></div>
      <div className={`g-stat g-fire${f.days ? " on" : ""}${f.today ? " lit" : ""}`} title="Дней подряд, когда взята хотя бы половина дня"><FlameIcon /><b>{f.days}</b><span>{plural(f.days, "день", "дня", "дней")} подряд</span></div>
    </div>
  );
}

/** A share as a half-circle gauge with the number in the middle; without a share it is the number alone. */
export function Gauge({ label, value, of, share, tone = "sun", hint, sub, thin = false }: { label: string; value: ReactNode; of?: string; share?: number; tone?: "sun" | "sage" | "honey" | "ember" | "iris"; hint?: string; sub?: ReactNode; thin?: boolean }) {
  const R = 44, C = Math.PI * R;
  const k = share === undefined ? undefined : Math.max(0, Math.min(1, share));
  return (
    <div className={`g-gauge ${tone}${thin ? " thin" : ""}`}>
      <div className="top"><span>{label}</span>{hint && <em className={hint.startsWith("▲") ? "up" : hint.startsWith("▼") ? "down" : ""}>{hint}</em>}</div>
      <div className="dial">
        {k !== undefined && (
          <svg viewBox="0 0 100 56" aria-hidden="true">
            <path className="rail" d="M6,52 A44,44 0 0 1 94,52" />
            <path className="fill" d="M6,52 A44,44 0 0 1 94,52" strokeDasharray={`${k * C} ${C}`} />
          </svg>
        )}
        <b className={k === undefined ? "plain" : ""}>{value}{of && <small>{of}</small>}</b>
      </div>
      {sub && <p>{sub}</p>}
    </div>
  );
}
