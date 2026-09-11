import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore, useVault } from "../store";
import { ChartTip } from "../components/Bits";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { addDays, todayStr, monthOfToday } from "../lib/dates";
import { bestStreak, habitDue, streak, workMinutesOf, xpForDay, type Day, type XpContext } from "../lib/life";

const axis = { stroke: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)" };
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
  const today = todayStr();

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
    const weeks = new Map<string, { week: string; "потрачено": number; "получено": number; "прочитано": number }>();
    const from = addDays(today, -7 * 12);
    for (let d = weekKey(from); d <= today; d = addDays(d, 7)) weeks.set(d, { week: d.slice(5), "потрачено": 0, "получено": 0, "прочитано": 0 });
    for (const [date, d] of days) {
      if (date < from) continue;
      const w = weeks.get(weekKey(date)); if (!w) continue;
      for (const tx of d.txs) { if (tx.amount < 0) w["потрачено"] -= tx.amount; else w["получено"] += tx.amount; }
    }
    const reads = v.pages.filter((p) => p.zone === "resource" && p.fm.read).map((p) => ({ date: String(p.fm.read instanceof Date ? p.fm.read.toISOString() : p.fm.read).slice(0, 10), theme: p.theme }));
    for (const r of reads) { const w = weeks.get(weekKey(r.date)); if (w && r.date >= from) w["прочитано"]++; }
    const ctx: XpContext = { habits: life?.habits ?? [], quests: life?.quests ?? [], days, reads };
    const ym = monthOfToday(today);
    const xp = new Map<string, number>();
    for (const [date, d] of days) if (date.startsWith(ym)) for (const [th, n] of xpForDay(d, ctx)) xp.set(th, (xp.get(th) ?? 0) + n);
    const xpRows = THEMES.map((t) => ({ theme: t.name, xp: xp.get(t.name) ?? 0 })).sort((a, b) => b.xp - a.xp);
    const streaks = habits.map((h) => ({ h, cur: streak(h.title, days, today), best: bestStreak(h.title, days) })).sort((a, b) => b.cur - a.cur);
    const monthSpent = daily.length ? [...days].filter(([date]) => date.startsWith(ym)).reduce((s, [, d]) => s + d.txs.filter((t) => t.amount < 0).reduce((x, t) => x - t.amount, 0), 0) : 0;
    const done30 = daily.reduce((s, d) => s + d["сделано"], 0);
    const due30 = daily.reduce((s, d) => s + d["сделано"] + d["сорвано"] + d["не отмечено"], 0);
    const work30 = daily.reduce((s, d) => s + d["работа, мин"], 0);
    return { daily, weekly: [...weeks.values()], xpRows, streaks, monthSpent, done30, due30, work30, reads30: reads.filter((r) => r.date >= addDays(today, -30)).length };
  }, [life, v, today]);

  const maxXp = Math.max(1, ...data.xpRows.map((r) => r.xp));
  const moodData = data.daily.filter((d) => d["настроение"] !== undefined || d["стресс"] !== undefined);

  return (
    <div>
      <div className="eyebrow">За последние 30 дней</div>
      <h1 className="title">Тренды</h1>
      <p className="lede">
        привычки <b>{data.due30 ? Math.round((100 * data.done30) / data.due30) : 0}%</b> · работа <b>{Math.round(data.work30 / 60)} ч</b> · прочитано <b>{data.reads30}</b> · потрачено в этом месяце <b>{fmt(data.monthSpent)}</b>
      </p>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Привычки по дням <Link to="/habits" className="n">открыть</Link></h3>
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                <Bar dataKey="сделано" stackId="a" fill="var(--success)" />
                <Bar dataKey="сорвано" stackId="a" fill="var(--danger)" />
                <Bar dataKey="не отмечено" stackId="a" fill="var(--hair-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Деньги по неделям <Link to="/finance" className="n">открыть</Link></h3>
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.weekly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="потрачено" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="получено" fill="var(--success)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Настроение и стресс</h3>
          {moodData.length === 0 ? <div className="small muted">Пока нет оценок: ставь настроение и стресс при закрытии дня.</div> : (
            <div className="chart" style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={data.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--hair)" />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                  <YAxis domain={[0, 10]} tick={axis} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="настроение" stroke="var(--accent-2)" dot={false} connectNulls strokeWidth={2} />
                  <Line type="monotone" dataKey="стресс" stroke="var(--danger)" dot={false} connectNulls strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Работа над квестами, минут в день <Link to="/quests" className="n">открыть</Link></h3>
          <div className="chart" style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                <Bar dataKey="работа, мин" fill="var(--gold)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
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
        <div className="card">
          <h3>Чтение по неделям</h3>
          <div className="chart" style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={data.weekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--raised)" }} />
                <Bar dataKey="прочитано" fill="var(--accent-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Стрики</h3>
        {data.streaks.length === 0 ? <div className="small muted">Активных привычек нет.</div> : (
          <table className="tbl">
            <thead><tr><th>привычка</th><th>тема</th><th style={{ textAlign: "right" }}>сейчас</th><th style={{ textAlign: "right" }}>лучший</th></tr></thead>
            <tbody>
              {data.streaks.map(({ h, cur, best }) => (
                <tr key={h.rel}>
                  <td><Link to="/habits">{h.title}</Link></td>
                  <td><span className="chip c" style={{ ["--c" as string]: themeColor(h.theme) }}>{h.theme ? themeLabel(h.theme) : "—"}</span></td>
                  <td className="mono" style={{ textAlign: "right" }}>{cur}</td>
                  <td className="mono muted" style={{ textAlign: "right" }}>{best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
