import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { useStore, useVault } from "../store";
import { ChartTip } from "../components/Bits";
import { themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { todayStr } from "../lib/dates";
import { XP } from "../lib/life";
import { overallLevelProgress, themeXps } from "../lib/levels";

export default function WheelPage() {
  const v = useVault();
  const { life } = useStore();
  const { themeLabel } = useT();
  const today = todayStr();

  const xps = useMemo(() => (life ? themeXps(life, v.pages, today) : []), [life, v, today]);
  const total = xps.reduce((s, x) => s + x.total, 0);
  const last30 = xps.reduce((s, x) => s + x.last30, 0);
  const overall = overallLevelProgress(total);
  const radar = xps.map((x) => ({ theme: themeLabel(x.theme), "эти 30 дней": x.last30, "прошлые 30": x.prev30 }));
  const maxWeek = Math.max(1, ...xps.flatMap((x) => x.weeks.map((w) => w.xp)));
  const sorted = [...xps].sort((a, b) => b.last30 - a.last30 || b.total - a.total);
  const quiet = sorted.filter((x) => x.last30 === 0);

  if (!life) return null;
  return (
    <div>
      <div className="eyebrow">Баланс по восьми темам</div>
      <h1 className="title">Колесо</h1>
      <p className="lede">
        уровень <b>{overall.level}</b> · {overall.into} / {overall.need} XP до следующего · всего <b>{total}</b> XP · за 30 дней <b>{last30}</b>
      </p>

      <div className="wheel-grid">
        <div className="card">
          <h3>XP за 30 дней <span className="n">против прошлых 30</span></h3>
          {last30 + xps.reduce((s, x) => s + x.prev30, 0) === 0 ? (
            <div className="empty">Колесо пустое: отметь привычку, закрой квест или прочитай страницу, и оно начнёт крутиться.</div>
          ) : (
            <div className="chart" style={{ height: 360 }}>
              <ResponsiveContainer>
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="var(--hair-2)" />
                  <PolarAngleAxis dataKey="theme" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Radar dataKey="прошлые 30" stroke="var(--faint)" fill="var(--faint)" fillOpacity={0.15} strokeDasharray="4 3" />
                  <Radar dataKey="эти 30 дней" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {quiet.length > 0 && (
            <div className="small muted" style={{ marginTop: 8 }}>
              Тихие темы за месяц: {quiet.map((x) => <Link key={x.theme} to={`/theme/${encodeURIComponent(x.theme)}`} style={{ color: themeColor(x.theme) }}>{themeLabel(x.theme)}</Link>).reduce<ReactNode[]>((a, e, i) => (i ? [...a, ", ", e] : [e]), [])}.
            </div>
          )}
        </div>

        <div className="card">
          <h3>Откуда берётся XP</h3>
          <table className="tbl small">
            <tbody>
              <tr><td>привычка выполнена</td><td className="mono" style={{ textAlign: "right" }}>+{XP.habitDone}</td><td className="muted">в тему привычки</td></tr>
              <tr><td>квест закрыт</td><td className="mono" style={{ textAlign: "right" }}>+{XP.questDone} + {XP.questPerHour}/час</td><td className="muted">сессии короче {XP.questMinMinutes} мин не считаются</td></tr>
              <tr><td>запись в журнале</td><td className="mono" style={{ textAlign: "right" }}>+{XP.journal}</td><td className="muted">в Личностный рост и Духовность</td></tr>
              <tr><td>страница прочитана</td><td className="mono" style={{ textAlign: "right" }}>+{XP.resourceRead}</td><td className="muted">в тему страницы, один раз</td></tr>
            </tbody>
          </table>
          <div className="small faint" style={{ marginTop: 8 }}>Уровень темы: 60 XP за первый, каждый следующий на 20 дороже. Общий уровень: 100, потом на 25 дороже. Нет HP, нет штрафов, пропуск виден в стрике.</div>
        </div>
      </div>

      <div className="theme-rows">
        {sorted.map((x) => {
          const delta = x.last30 - x.prev30;
          const color = themeColor(x.theme);
          return (
            <Link key={x.theme} to={`/theme/${encodeURIComponent(x.theme)}`} className="card theme-row" style={{ ["--c" as string]: color }}>
              <div className="trow-head">
                <span className="bar" />
                <b>{themeLabel(x.theme)}</b>
                <span className="lvl">ур. {x.level.level}</span>
                <span className="grow" />
                <span className="mono">{x.last30} XP</span>
                <span className={`mono small ${delta > 0 ? "up" : delta < 0 ? "down" : "faint"}`}>{delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta}</span>
              </div>
              <div className="lvlbar" title={`${x.level.into} / ${x.level.need} XP до уровня ${x.level.level + 1}`}>
                <i style={{ width: `${(100 * x.level.into) / x.level.need}%` }} />
              </div>
              <div className="spark" title="XP по неделям, 8 недель">
                {x.weeks.map((w) => <i key={w.week} style={{ height: `${Math.max(6, (100 * w.xp) / maxWeek)}%` }} title={`${w.week}: ${w.xp}`} />)}
              </div>
              <div className="small faint">{x.level.into} / {x.level.need} до следующего · всего {x.total}</div>
            </Link>
          );
        })}
      </div>
      <div className="small faint" style={{ marginTop: 14 }}>Темы в порядке активности за месяц. <Link to="/charts">Тренды</Link> показывают то же по дням и неделям.</div>
    </div>
  );
}
