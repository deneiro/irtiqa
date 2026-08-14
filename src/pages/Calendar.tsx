import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Empty } from '../components/ui';
import { addDaysStr, fmtDayFull, parseDay, todayStr, toDayStr } from '../game/engine';
import { buildCalendarItems, type CalendarItem, type CalendarItemType } from '../lib/calendar';
import { plural, useT } from '../i18n';
import { fmtMonthYear, weekdayInitials } from '../lib/format';
import { useGame } from '../store';

// Labels are resolved from `cal.type.<key>` at render time.
const TYPE_META: Record<CalendarItemType, { icon: IconName; dotClass: string }> = {
  habit: { icon: 'habits', dotClass: 'cal-dot-habit' },
  event: { icon: 'social', dotClass: 'cal-dot-event' },
  birthday: { icon: 'cake', dotClass: 'cal-dot-birthday' },
  quickTask: { icon: 'check', dotClass: 'cal-dot-task' },
  journal: { icon: 'journal', dotClass: 'cal-dot-journal' },
  questTarget: { icon: 'target', dotClass: 'cal-dot-quest' },
  subscription: { icon: 'subscription', dotClass: 'cal-dot-subscription' },
};
// Display priority inside a day: the daily loop first, then things with other people in them,
// then money, then the records you leave behind. The month cell only has room for the top two.
const TYPE_ORDER: CalendarItemType[] = ['habit', 'event', 'birthday', 'quickTask', 'subscription', 'journal', 'questTarget'];
// Monday-first, to match weekKey() — the weekly boss and the Chronicle both run Mon→Sun,
// so a Sunday-first grid would draw a different week than the one the game scores.
// Monday-first, matching the grid this calendar draws.
const WEEKDAYS = () => weekdayInitials();
/** Titles printed inside a month cell before it collapses into "+N more". */
const CELL_PREVIEW = 2;

export function Calendar() {
  const t = useT();
  const s = useGame();
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const t = parseDay(today);
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(today);

  const monthStart = new Date(cursor.year, cursor.month, 1);
  const monthLabel = fmtMonthYear(monthStart);
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
          <h1>{t('nav.calendar')}</h1>
          <p className="muted">{t('cal.subtitle')}</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-ghost" onClick={goPrev} aria-label={t('cal.prevMonth')}><Icon name="chevronLeft" size={16} /></button>
          <span className="cal-month-label">{monthLabel}</span>
          <button className="btn btn-ghost" onClick={goNext} aria-label={t('cal.nextMonth')}><Icon name="chevronRight" size={16} /></button>
          <button className="btn btn-ghost" onClick={goToday}>{t('common.today')}</button>
        </div>
      </div>

      <div className="cal-legend">
        {TYPE_ORDER.map(type => (
          <span key={type} className="cal-legend-item">
            <span className={`cal-dot ${TYPE_META[type].dotClass}`} /> {t(`cal.type.${type}`)}
          </span>
        ))}
      </div>

      <div className="card">
        <div className="cal-grid cal-grid-head">
          {WEEKDAYS().map(w => <div key={w} className="cal-weekday">{w}</div>)}
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
                      {overflow > 0 && <span className="cal-more">{t('cal.more', { n: overflow })}</span>}
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
          <span className="muted">
            {selectedItems.length} {plural(selectedItems.length, t('cal.itemOne'), t('cal.itemFew'), t('cal.itemMany'))}
          </span>
        </div>
        {selectedItems.length === 0 ? (
          <Empty>
            {t('cal.emptyDay')} <Link to="/habits">{t('cal.setUpHabit')}</Link> {t('cal.or')} <Link to="/social">{t('cal.addEvent')}</Link> {t('cal.emptyDayTail')}
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
