import { habitDueOn, addDaysStr, todayStr, fmtDay } from '../game/engine';
import { useGame } from '../store';

const DONE: string[] = ['done', 'shielded', 'pardoned', 'indulged', 'ghost'];

/** Last ~12 weeks of habit completion, GitHub-style. */
export function Heatmap() {
  const habits = useGame(s => s.habits);
  const habitLog = useGame(s => s.habitLog);
  const today = todayStr();

  // Build columns of weeks, ending today.
  const days: { day: string; ratio: number | null }[] = [];
  const start = addDaysStr(today, -83);
  for (let d = start; d <= today; d = addDaysStr(d, 1)) {
    const due = habits.filter(h => habitDueOn(h, d));
    if (due.length === 0) {
      days.push({ day: d, ratio: null });
      continue;
    }
    const done = due.filter(h => DONE.includes(habitLog[h.id]?.[d] ?? '')).length;
    days.push({ day: d, ratio: done / due.length });
  }

  const level = (r: number | null) => {
    if (r === null) return 0;
    if (r === 0) return 1;
    if (r < 0.5) return 2;
    if (r < 1) return 3;
    return 4;
  };

  return (
    <div className="heatmap" title="Habit completion — last 12 weeks">
      {days.map(({ day, ratio }) => (
        <div
          key={day}
          className={`hm-cell hm-${level(ratio)}`}
          title={`${fmtDay(day)}: ${ratio === null ? 'nothing scheduled' : `${Math.round(ratio * 100)}% done`}`}
        />
      ))}
    </div>
  );
}
