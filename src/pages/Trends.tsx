import { useMemo } from "react";
import { BANNER } from "../assets/play";
import { FlameIcon } from "../components/GameBits";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore, useVault } from "../store";
import { ChartTip } from "../components/Bits";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { addDays, monthOfToday } from "../lib/dates";
import { bestStreak, habitDue, streak, workMinutesOf, xpForDay, type Day, type XpContext } from "../lib/life";
import { useDayToday } from "../lib/useDayToday";
import { meetsOf } from "../lib/levels";

const axis = { stroke: "#6F6D6A", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" };
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export default function TrendsPage() {
  const v = useVault();
  const { life } = useStore();
  const { themeLabel } = useT();
  const today = useDayToday();

  const data = useMemo(() => {
    const days: Map<string, Day> = life?.days ?? new Map<string, Day>();
    const habits = (life?.habits ?? []).filter((h) => h.status === "active");
    const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
    const daily = last30.map((date) => {
      const d = days.get(date);
      const due = habits.filter((h) => habitDue(h, date)).length;
      return {
        date, day: date.slice(8),
        "сделано": d?.habitsDone.length ?? 0,
        "сорвано": d?.habitsFailed.length ?? 0,
        "не отмечено": Math.max(0, due - (d?.habitsDone.length ?? 0) - (d?.habitsFailed.length ?? 0) - (d?.habitsSkipped.length ?? 0)),
        "работа, мин": d ? workMinutesOf(d) : 0,
        "настроение": d?.mood, "стресс": d?.stress,
      };
    });
    const weeks = new Map<string, { week: string; "потрачено": number; "получено": number; "прочитано": number; done: number; due: number; "привычки, %": number }>();
    const from = addDays(today, -7 * 12);
    for (let d = weekKey(from); d <= today; d = addDays(d, 7)) weeks.set(d, { week: d.slice(5), "потрачено": 0, "получено": 0, "прочитано": 0, done: 0, due: 0, "привычки, %": 0 });
    for (const [date, d] of days) {
      if (date < from) continue;
      const w = weeks.get(weekKey(date)); if (!w) continue;
      for (const tx of d.txs) { if (tx.amount < 0) w["потрачено"] -= tx.amount; else w["получено"] += tx.amount; }
      w.done += d.habitsDone.length;
      w.due += habits.filter((h) => habitDue(h, date)).length;
    }
    for (const w of weeks.values()) w["привычки, %"] = w.due ? Math.round((100 * w.done) / w.due) : 0;
    const reads = v.pages.filter((p) => p.zone === "resource" && p.fm.read).map((p) => ({ date: String(p.fm.read instanceof Date ? p.fm.read.toISOString() : p.fm.read).slice(0, 10), theme: p.theme }));
    for (const r of reads) { const w = weeks.get(weekKey(r.date)); if (w && r.date >= from) w["прочитано"]++; }
    const ctx: XpContext = { habits: life?.habits ?? [], quests: life?.quests ?? [], days, reads, meets: meetsOf(life?.events ?? [], v.pages) };
    const ym = monthOfToday(today);
    const xp = new Map<string, number>();
    for (const [date, d] of days) if (date.startsWith(ym)) for (const [th, n] of xpForDay(d, ctx)) xp.set(th, (xp.get(th) ?? 0) + n);
    const xpRows = THEMES.map((t) => ({ theme: t.name, xp: xp.get(t.name) ?? 0 })).sort((a, b) => b.xp - a.xp);
    const streaks = habits.map((h) => ({ h, cur: streak(h, days, today), best: bestStreak(h, days) })).sort((a, b) => b.cur - a.cur);
    const monthSpent = daily.length ? [...days].filter(([date]) => date.startsWith(ym)).reduce((s, [, d]) => s + d.txs.filter((t) => t.amount < 0).reduce((x, t) => x - t.amount, 0), 0) : 0;
    const done30 = daily.reduce((s, d) => s + d["сделано"], 0);
    const due30 = daily.reduce((s, d) => s + d["сделано"] + d["сорвано"] + d["не отмечено"], 0);
    const work30 = daily.reduce((s, d) => s + d["работа, мин"], 0);
    return { daily, weekly: [...weeks.values()], xpRows, streaks, monthSpent, done30, due30, work30, reads30: reads.filter((r) => r.date >= addDays(today, -30)).length };
  }, [life, v, today]);

  const maxXp = Math.max(1, ...data.xpRows.map((r) => r.xp));
  const moodData = data.daily.filter((d) => d["настроение"] !== undefined || d["стресс"] !== undefined);

  return (
    <div className="g-page">
      <div className="g-play">
      <div className="g-top">
        <SceneFrame art={BANNER.trends}>
          <SceneTitle kicker="за последние 30 дней и 12 недель" title="Тренды" />
          <div className="g-xp8">
            <span>работа <b>{Math.round(data.work30 / 60)} ч</b> · прочитано <b>{data.reads30}</b></span>
            <span>потрачено в этом месяце <b>{fmt(data.monthSpent)} ₸</b></span>
          </div>
          <SceneNumber value={data.due30 ? Math.round((100 * data.done30) / data.due30) : "—"} unit={data.due30 ? "%" : undefined} label="привычек сделано" sub={`${data.done30} из ${data.due30} за 30 дней`} />
        </SceneFrame>
        <SideCard kicker="серии сейчас">
          {data.streaks.filter((x) => x.cur > 0).length ? (
            <div className="g-rules">{data.streaks.filter((x) => x.cur > 0).slice(0, 7).map(({ h, cur, best }) => <div key={h.rel}><span style={{ color: themeColor(h.theme) }}>{h.title}<small>лучшая {best}</small></span><b><FlameIcon /> {cur}</b></div>)}</div>
          ) : <p className="g-rule">Серий пока нет — первая начнётся с отмеченного дня.</p>}
          <Link className="g-link g-side-link" to="/habits">все привычки →</Link>
        </SideCard>
      </div>

      <Block title="Графики" right="дни — 30 последних · недели — 12 последних">
      <div className="g-charts g-recharts">
        <div className="g-chart">
          <h3>Привычки по дням <Link to="/habits" className="n">открыть</Link></h3>
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(237,231,218,.08)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(237,231,218,.06)" }} />
                <Bar dataKey="сделано" stackId="a" fill="#86C9A4" />
                <Bar dataKey="сорвано" stackId="a" fill="#E26A61" />
                <Bar dataKey="не отмечено" stackId="a" fill="rgba(237,231,218,.16)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="g-chart">
          <h3>Деньги по неделям <Link to="/finance" className="n">открыть</Link></h3>
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.weekly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(237,231,218,.08)" />
                <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(237,231,218,.06)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="потрачено" fill="#E7C27A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="получено" fill="#86C9A4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="g-chart">
          <h3>Настроение и стресс</h3>
          {moodData.length === 0 ? <div className="small muted">Пока нет оценок: настроение и стресс спрашивает вечерний опрос бота.</div> : (
            <div className="chart" style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={data.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(237,231,218,.08)" />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                  <YAxis domain={[0, 10]} tick={axis} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="настроение" stroke="#A89DFF" dot={false} connectNulls strokeWidth={2} />
                  <Line type="monotone" dataKey="стресс" stroke="#E26A61" dot={false} connectNulls strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="g-chart">
          <h3>Работа над квестами, минут в день <Link to="/quests" className="n">открыть</Link></h3>
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(237,231,218,.08)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(237,231,218,.06)" }} />
                <Bar dataKey="работа, мин" fill="#E2AB5E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="g-chart">
          <h3>XP по темам в этом месяце</h3>
          <div className="cats">
            {data.xpRows.map((r) => (
              <Link to={`/theme/${encodeURIComponent(r.theme)}`} className="cat" key={r.theme} style={{ textDecoration: "none" }}>
                <span className="cname" style={{ color: themeColor(r.theme) }}>{themeLabel(r.theme)}</span>
                <span className="cbar"><i style={{ width: `${(100 * r.xp) / maxXp}%`, background: themeColor(r.theme) }} /></span>
                <span className="cnum">{r.xp}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="g-chart">
          <h3>Доля выполненных привычек по неделям</h3>
          <div className="chart" style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={data.weekly.filter((w) => w.due > 0)} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(237,231,218,.08)" />
                <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(237,231,218,.06)" }} />
                <Bar dataKey="привычки, %" fill="#86C9A4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="g-chart">
          <h3>Чтение по неделям</h3>
          <div className="chart" style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={data.weekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(237,231,218,.08)" />
                <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(237,231,218,.06)" }} />
                <Bar dataKey="прочитано" fill="#A89DFF" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      </Block>
      </div>
    </div>
  );
}
