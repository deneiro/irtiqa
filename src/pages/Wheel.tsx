import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BANNER, THEME_ART } from "../assets/play";
import { WeekBars } from "../components/GameBits";
import { useStore, useVault } from "../store";
import { themeColor, themeRu } from "../lib/themes";
import { useT } from "../lib/i18n";
import { XP } from "../lib/life";
import { rankOf } from "../lib/game";
import { overallLevelProgress, themeXps } from "../lib/levels";
import { useDayToday } from "../lib/useDayToday";
import { themeUrl } from "../lib/vault";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";

/**
 * «Колесо» (rebuilt 2026-11-21 the way «Сегодня» is): the balance of the eight themes. The scene carries the overall
 * level; beside it where XP comes from. Below, the wheel itself — these thirty days over the thirty before — and the
 * eight themes as pictures with their level, eight weeks of XP and what the month gave.
 */
export default function WheelPage() {
  const v = useVault();
  const { life } = useStore();
  const { themeLabel } = useT();
  const today = useDayToday();
  const xps = useMemo(() => (life ? themeXps(life, v.pages, today) : []), [life, v, today]);
  if (!life) return null;
  const total = xps.reduce((s, x) => s + x.total, 0);
  const last30 = xps.reduce((s, x) => s + x.last30, 0), prev30 = xps.reduce((s, x) => s + x.prev30, 0);
  const overall = overallLevelProgress(total);
  const sorted = [...xps].sort((a, b) => b.last30 - a.last30 || b.total - a.total);
  const quiet = sorted.filter((x) => x.last30 === 0);
  // the wheel: the root of the share, so one loud theme does not flatten the rest
  const max = Math.max(1, ...xps.flatMap((x) => [x.last30, x.prev30]));
  const R = 150, C = 200;
  const at = (i: number, r: number): [number, number] => { const a = (i / xps.length) * Math.PI * 2 - Math.PI / 2; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
  const shape = (key: "last30" | "prev30") => xps.map((x, i) => at(i, 10 + Math.sqrt(x[key] / max) * (R - 10)).join(",")).join(" ");
  const rules: [string, string, string][] = [
    ["привычка выполнена", `+${XP.habitDone}`, "в тему привычки"],
    ["намаз с опозданием", `+${XP.prayerLate}`, "в Духовность"],
    ["задача дня сделана", `+${XP.taskDone}`, "в тему её части дня"],
    ["запись дня", `+${XP.log}`, "настроение · вес или еда · деньги"],
    ["деятельность закрыта", `+${XP.questDone} и ${XP.questPerHour}/час`, `сессии от ${XP.questMinMinutes} мин`],
    ["запись в журнале", `+${XP.journal}`, "в Рост и Духовность"],
    ["страница прочитана", `+${XP.resourceRead}`, "в тему страницы"],
  ];
  return (
    <div className="g-page">
      <div className="g-play">
        <div className="g-top">
          <SceneFrame art={BANNER.wheel}>
            <SceneTitle kicker="баланс по восьми темам" title="Колесо" />
            <div className="g-xp8">
              <span>за 30 дней <b>{last30}</b> XP · до того {prev30} · всего <b>{total}</b></span>
              <span>{quiet.length ? <>тихие темы: {quiet.map((x) => themeLabel(x.theme)).join(", ")}</> : "все восемь тем получили XP за месяц"}</span>
            </div>
            <SceneNumber value={overall.level} label={`уровень · ${rankOf(overall.level)}`} sub={`${overall.into} / ${overall.need} XP до следующего`} />
          </SceneFrame>
          <SideCard kicker="откуда берётся XP">
            <div className="g-rules">{rules.map(([what, n, where]) => <div key={what}><span>{what}<small>{where}</small></span><b>{n}</b></div>)}</div>
            <p className="g-cap">Уровень темы: 60 XP за первый, каждый следующий на 20 дороже. Общий: 100, потом на 25 дороже. Штрафов нет.</p>
          </SideCard>
        </div>

        <div className="g-two">
          <Block title="Колесо · 30 дней" right="сплошное — эти 30 дней · пунктир — прошлые 30">
            {last30 + prev30 === 0 ? <p className="g-faint">Колесо пустое: отметь привычку, сделай задачу или прочитай страницу, и оно начнёт крутиться.</p> : (
              <svg className="g-wheel" viewBox="0 0 400 400" role="img" aria-label="XP по восьми темам: эти 30 дней и прошлые 30">
                {[0.33, 0.66, 1].map((k) => <polygon key={k} className="web" points={xps.map((_, i) => at(i, R * k).join(",")).join(" ")} />)}
                {xps.map((_, i) => <line key={i} className="web" x1={C} y1={C} x2={at(i, R)[0]} y2={at(i, R)[1]} />)}
                <polygon className="prev" points={shape("prev30")} />
                <polygon className="now" points={shape("last30")} />
                {xps.map((x, i) => {
                  const [px, py] = at(i, 10 + Math.sqrt(x.last30 / max) * (R - 10));
                  const [lx, ly] = at(i, R + 22);
                  return <g key={x.theme}><circle cx={px} cy={py} r="5" fill={themeColor(x.theme)} /><text x={lx} y={ly + 4} textAnchor={Math.abs(lx - C) < 10 ? "middle" : lx > C ? "start" : "end"} className={x.last30 ? "" : "off"}>{themeRu(x.theme)}</text></g>;
                })}
              </svg>
            )}
          </Block>
          <Block title="Месяц по темам" right="XP за 30 дней · к прошлым 30">
            {sorted.map((x) => {
              const delta = x.last30 - x.prev30;
              return (
                <Link key={x.theme} to={themeUrl(x.theme)} className="g-mv g-mv4">
                  <span style={{ color: themeColor(x.theme) }}>{themeLabel(x.theme)}</span>
                  <i><u style={{ width: `${(x.last30 / Math.max(1, sorted[0].last30)) * 100}%`, background: themeColor(x.theme) }} /></i>
                  <b>{x.last30}</b>
                  <em className={delta > 0 ? "up" : delta < 0 ? "down" : ""}>{delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta}</em>
                </Link>
              );
            })}
          </Block>
        </div>

        <Block title="Восемь тем" right={<><Link to="/trends">тренды по дням и неделям →</Link></>}>
          <div className="g-spheres">
            {sorted.map((x) => (
              <Link key={x.theme} to={themeUrl(x.theme)} className="g-sphere" style={{ ["--c" as string]: themeColor(x.theme) }}>
                <img src={THEME_ART[x.theme]} alt="" />
                <div className="in">
                  <div className="hd"><b>{themeLabel(x.theme)}</b><em title="Уровень темы">{x.level.level}</em></div>
                  <span className="g-bar"><i style={{ width: `${(100 * x.level.into) / x.level.need}%`, background: themeColor(x.theme) }} /></span>
                  <small>{x.level.into} / {x.level.need} до следующего · всего {x.total}</small>
                  <WeekBars weeks={x.weeks} />
                </div>
              </Link>
            ))}
          </div>
        </Block>
      </div>
    </div>
  );
}
