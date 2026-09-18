import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import { themeColor } from "../lib/themes";
import { fromMin, itemsOn, parseCalendar } from "../lib/calendar";

/** Today's column of the calendar, as a list on the Day screen. */
export default function TodayPlan() {
  const { life, timer, startTimer } = useStore();
  const today = todayStr();
  const plan = useMemo(
    () => (life ? itemsOn(today, parseCalendar(life.calendar ?? ""), undefined, life.quests) : []),
    [life, today],
  );
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="card">
      <h3>Сегодня по плану <Link className="n" to="/calendar">календарь →</Link></h3>
      {plan.length === 0 && <div className="small muted">Ничего не поставлено. Протяни по часам в <Link to="/calendar">календаре</Link>.</div>}
      {plan.map((p, i) => {
        const past = p.to <= nowMin;
        const live = p.from <= nowMin && nowMin < p.to;
        return (
          <div key={i} className={`plan-row ${past ? "past" : ""} ${live ? "live" : ""}`} style={{ ["--c" as string]: themeColor(p.theme) }}>
            <span className="mono small">{fromMin(p.from)}–{fromMin(p.to)}</span>
            <span className="w">{p.title}</span>
            {p.quest && !past && (
              <button
                className="tbtn" disabled={!!timer}
                title={timer ? `таймер уже идёт: ${timer.quest}` : "запустить таймер квеста"}
                onClick={() => startTimer(p.quest)}
              >▶</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
