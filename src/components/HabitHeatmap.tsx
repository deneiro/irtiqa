import { addDaysStr, fmtDay, habitDueOn, todayStr } from '../game/engine';
import type { Habit, HabitDayStatus } from '../game/types';
import { useGame } from '../store';

const WEEKS = 12;
const DAYS = WEEKS * 7;

const OUTCOME_CLASS: Record<HabitDayStatus | 'due' | 'none', string> = {
  done: 'hi-done',
  shielded: 'hi-bonus',
  pardoned: 'hi-bonus',
  indulged: 'hi-bonus',
  ghost: 'hi-ghost',
  failed: 'hi-failed',
  due: 'hi-due',
  none: 'hi-none',
};

const OUTCOME_LABEL: Record<HabitDayStatus, string> = {
  done: 'done',
  shielded: 'shielded',
  pardoned: 'pardoned',
  indulged: 'indulged',
  ghost: 'frozen',
  failed: 'failed',
};

/** Per-habit last-12-weeks progress grid — one habit's own history, not the aggregate. */
export function HabitHeatmap({ habit }: { habit: Habit }) {
  const habitLog = useGame(s => s.habitLog);
  const today = todayStr();
  const log = habitLog[habit.id] ?? {};

  const start = addDaysStr(today, -(DAYS - 1));
  const days: { day: string; cls: string; label: string }[] = [];
  for (let d = start; d <= today; d = addDaysStr(d, 1)) {
    const status = log[d];
    if (status) {
      days.push({ day: d, cls: OUTCOME_CLASS[status], label: `${fmtDay(d)}: ${OUTCOME_LABEL[status]}` });
    } else if (habitDueOn(habit, d) && d < today) {
      // Due with no logged status and already in the past — reconciliation just hasn't run for it yet
      days.push({ day: d, cls: OUTCOME_CLASS.failed, label: `${fmtDay(d)}: failed` });
    } else if (habitDueOn(habit, d)) {
      days.push({ day: d, cls: OUTCOME_CLASS.due, label: `${fmtDay(d)}: today, not yet logged` });
    } else {
      days.push({ day: d, cls: OUTCOME_CLASS.none, label: `${fmtDay(d)}: not scheduled` });
    }
  }
  // Pad the front so the grid always fills complete weeks aligned to today
  const pad = (7 - (days.length % 7)) % 7;
  const padded: ({ day: string; cls: string; label: string } | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...days,
  ];

  return (
    <div className="habit-intel">
      <div className="hi-grid" title={`${habit.name} — last ${WEEKS} weeks`}>
        {padded.map((d, i) =>
          d ? <div key={d.day} className={`hi-cell ${d.cls}`} title={d.label} /> : <div key={`pad-${i}`} className="hi-cell hi-pad" />,
        )}
      </div>
      <div className="hi-legend">
        <span><i className="hi-cell hi-done" /> done</span>
        <span><i className="hi-cell hi-failed" /> failed</span>
        <span><i className="hi-cell hi-bonus" /> saved by item</span>
        <span><i className="hi-cell hi-ghost" /> frozen</span>
        <span><i className="hi-cell hi-none" /> not scheduled</span>
      </div>
    </div>
  );
}
