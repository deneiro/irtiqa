import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Empty } from '../components/ui';
import { addDaysStr, fmtDayFull, parseDay, todayStr, toDayStr } from '../game/engine';
import { buildCalendarItems, type CalendarItem, type CalendarItemType } from '../lib/calendar';
import { useGame } from '../store';

const TYPE_META: Record<CalendarItemType, { icon: IconName; label: string; dotClass: string }> = {
  habit: { icon: 'habits', label: 'Habits', dotClass: 'cal-dot-habit' },
  event: { icon: 'social', label: 'Event', dotClass: 'cal-dot-event' },
  birthday: { icon: 'cake', label: 'Birthday', dotClass: 'cal-dot-birthday' },
  quickTask: { icon: 'check', label: 'Task', dotClass: 'cal-dot-task' },
  journal: { icon: 'journal', label: 'Journal', dotClass: 'cal-dot-journal' },
  questTarget: { icon: 'target', label: 'Quest target', dotClass: 'cal-dot-quest' },
  subscription: { icon: 'subscription', label: 'Subscription', dotClass: 'cal-dot-subscription' },
};
// Display priority inside a day: the daily loop first, then things with other people in them,
// then money, then the records you leave behind. The month cell only has room for the top two.
const TYPE_ORDER: CalendarItemType[] = ['habit', 'event', 'birthday', 'quickTask', 'subscription', 'journal', 'questTarget'];
// Monday-first, to match weekKey() — the weekly boss and the Chronicle both run Mon→Sun,
// so a Sunday-first grid would draw a different week than the one the game scores.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Titles printed inside a month cell before it collapses into "+N more". */
const CELL_PREVIEW = 2;

export function Calendar() {
  const s = useGame();
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const t = parseDay(today);
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(today);

  const monthStart = new Date(cursor.year, cursor.month, 1);
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // getDay() is Sun=0; this shifts it to Mon=0 … Sun=6, which is the number of leading cells
  // the grid needs before the 1st. Getting this wrong slides every item a day sideways.
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const rangeStart = toDayStr(monthStart);
  const rangeEnd = toDayStr(new Date(cursor.year, cursor.month, daysInMonth));
  const gridStart = addDaysStr(rangeStart, -firstWeekday);
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const items = useMemo(
    () => buildCalendarItems(
      {
        events: s.events, contacts: s.contacts, quickTasks: s.quickTasks, journal: s.journal,
        quests: s.quests, subs: s.subs, habits: s.habits, habitLog: s.habitLog, today,
      },
      gridStart,
      addDaysStr(gridStart, totalCells - 1),
    ),
    [s.events, s.contacts, s.quickTasks, s.journal, s.quests, s.subs, s.habits, s.habitLog, today, gridStart, totalCells],
  );

  const byDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    for (const it of items) (map[it.date] ??= []).push(it);
    // One ordering for both the month cell and the day list, so the two rows a cell previews
    // are always the same two rows that open at the top of the detail card.
    for (const day of Object.keys(map)) {
      map[day].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
    }
    return map;
  }, [items]);

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const date = addDaysStr(gridStart, i);
    return { date, inMonth: date >= rangeStart && date <= rangeEnd };
  });

  const goPrev = () => setCursor(c => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const goNext = () => setCursor(c => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  const goToday = () => {
    const t = parseDay(today);
    setCursor({ year: t.getFullYear(), month: t.getMonth() });
    setSelectedDate(today);
  };

  const selectedItems = byDate[selectedDate] ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="muted">Every date-tied thing in one place — habits due, events, birthdays, due tasks, journal entries, quest targets.</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-ghost" onClick={goPrev} aria-label="Previous month"><Icon name="chevronLeft" size={16} /></button>
          <span className="cal-month-label">{monthLabel}</span>
          <button className="btn btn-ghost" onClick={goNext} aria-label="Next month"><Icon name="chevronRight" size={16} /></button>
          <button className="btn btn-ghost" onClick={goToday}>Today</button>
        </div>
      </div>

      <div className="cal-legend">
        {TYPE_ORDER.map(t => (
          <span key={t} className="cal-legend-item">
            <span className={`cal-dot ${TYPE_META[t].dotClass}`} /> {TYPE_META[t].label}
          </span>
        ))}
      </div>

      <div className="card">
        <div className="cal-grid cal-grid-head">
          {WEEKDAYS.map(w => <div key={w} className="cal-weekday">{w}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map(({ date, inMonth }) => {
            const dayItems = byDate[date] ?? [];
            const types = TYPE_ORDER.filter(t => dayItems.some(it => it.type === t));
            const preview = dayItems.slice(0, CELL_PREVIEW);
            const overflow = dayItems.length - preview.length;
            return (
              <button
                key={date}
                className={`cal-cell ${inMonth ? '' : 'out'} ${date === today ? 'today' : ''} ${date === selectedDate ? 'selected' : ''}`}
                onClick={() => setSelectedDate(date)}
                aria-label={`${fmtDayFull(date)} — ${dayItems.length} item${dayItems.length === 1 ? '' : 's'}`}
                aria-pressed={date === selectedDate}
              >
                <span className="cal-daynum">{Number(date.slice(8, 10))}</span>
                {types.length > 0 && (
                  <>
                    {/* Two views of the same day. CSS picks one by width: titles where they fit,
                        dots on a phone where a 40px-wide cell can only carry colour. */}
                    <span className="cal-dots" aria-hidden="true">
                      {types.slice(0, 4).map(t => <span key={t} className={`cal-dot ${TYPE_META[t].dotClass}`} />)}
                    </span>
                    <span className="cal-titles" aria-hidden="true">
                      {preview.map(it => (
                        <span key={it.id} className={`cal-title ${it.done ? 'cal-done' : ''}`}>
                          <span className={`cal-dot ${TYPE_META[it.type].dotClass}`} />
                          <span className="cal-title-text">{it.title}</span>
                        </span>
                      ))}
                      {overflow > 0 && <span className="cal-more">+{overflow} more</span>}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{fmtDayFull(selectedDate)}</h2>
          <span className="muted">{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</span>
        </div>
        {selectedItems.length === 0 ? (
          <Empty>
            Nothing on this day. <Link to="/habits">Set up a habit</Link> or <Link to="/social">add an event</Link> and it will land here.
          </Empty>
        ) : (
          <ul className="list">
            {selectedItems.map(it => (
              <li key={it.id} className="list-row">
                <span className={`cal-dot ${TYPE_META[it.type].dotClass}`} />
                <Icon name={TYPE_META[it.type].icon} size={15} />
                <Link to={it.link} className={`list-title ${it.done ? 'cal-done' : ''}`}>{it.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
