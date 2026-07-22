import { useMemo, useState } from 'react';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { Heatmap } from '../components/Heatmap';
import { Icon } from '../components/Icon';
import { RelapseReflect } from '../components/RelapseReflect';
import { AttrPicker, AttrTags, Empty, Modal } from '../components/ui';
import { fmtDayFull, habitDueOn, missDamage, todayStr } from '../game/engine';
import { spawnVFXAt } from '../lib/vfx';
import type { AttributeKey, Habit, HabitFreq, HabitKind } from '../game/types';
import { useGame } from '../store';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type HabitView = 'today' | 'all';

export function Habits() {
  const s = useGame();
  const today = todayStr();
  const [editing, setEditing] = useState<Habit | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<HabitView>('today');
  const [attrFilter, setAttrFilter] = useState<AttributeKey[]>([]);
  const [reflect, setReflect] = useState<{ failureId: string; habitName: string } | null>(null);

  const active = s.habits.filter(h => !h.archived);
  const archived = s.habits.filter(h => h.archived);
  const ghostToday = s.effects.ghostDays.includes(today);

  const visible = active
    .filter(h => (view === 'today' ? habitDueOn(h, today) : true))
    .filter(h => (attrFilter.length === 0 ? true : h.attrs.some(a => attrFilter.includes(a))));

  const recentFailures = useMemo(
    () => s.failures.filter(f => !f.pardoned && s.habitLog[f.habitId]?.[f.date] === 'failed').slice(-8).reverse(),
    [s.failures, s.habitLog],
  );
  const pardons = s.inventory.habit_pardon ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Habits</h1>
          <p className="muted">The daily discipline engine. Miss a day and the app notices — automatically.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>+ New habit</button>
      </div>

      <section className="card">
        <div className="card-head"><h2>Last 12 weeks</h2></div>
        <Heatmap />
      </section>

      {active.length === 0 ? (
        <Empty>
          No habits yet. Good habits are things to do ("read 20 min"); bad habits are things to avoid ("no smoking").
          Both build streaks. Both bite back when ignored.
        </Empty>
      ) : (
        <>
          <div className="filter-row">
            <div className="seg">
              <button type="button" className={view === 'today' ? 'seg-on' : ''} onClick={() => setView('today')}>Today</button>
              <button type="button" className={view === 'all' ? 'seg-on' : ''} onClick={() => setView('all')}>All habits</button>
            </div>
            <AttrPicker value={attrFilter} onChange={setAttrFilter} />
          </div>

          {visible.length === 0 ? (
            <Empty>
              {view === 'today'
                ? 'Nothing due today' + (attrFilter.length > 0 ? ' for this attribute filter.' : '.')
                : 'No habits match this attribute filter.'}
            </Empty>
          ) : (
            <div className="habit-grid">
              {visible.map(h => {
                const due = habitDueOn(h, today);
                const status = s.habitLog[h.id]?.[today];
                return (
                  <div key={h.id} className={`card habit-card ${h.kind}`}>
                    <div className="card-head">
                      <h3><span className={`habit-kind ${h.kind}`} /> {h.name}</h3>
                      <div className="btn-pair">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(h)} title="Edit"><Icon name="edit" size={14} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => s.archiveHabit(h.id, true)} title="Archive">🗄</button>
                      </div>
                    </div>
                    <div className="habit-meta">
                      <span className="muted">{freqLabel(h)}</span>
                      <AttrTags attrs={h.attrs} linked />
                    </div>
                    <div className="habit-streak">
                      <span className="streak-big">🔥 {h.streak}</span>
                      <span className="muted">best {h.best}</span>
                    </div>
                    <div className="habit-action">
                      {!due ? (
                        <span className="muted">Not scheduled today</span>
                      ) : status ? (
                        <span className={`status status-${status}`}>{statusText(status)}</span>
                      ) : ghostToday ? (
                        <span className="status">👻 frozen today</span>
                      ) : h.kind === 'good' ? (
                        <button
                          className="btn btn-primary"
                          onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 12); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 5); }}
                        >
                          ✓ Done today (+12 XP, +5 🪙)
                        </button>
                      ) : (
                        <div className="btn-pair">
                          <button
                            className="btn btn-primary"
                            onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 3); }}
                          >
                            ✓ Resisted (+8 XP, +3 🪙)
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={e => {
                              spawnVFXAt(e, 'damage', missDamage('bad', h.streak));
                              s.relapseHabit(h.id);
                              // No failure record means an Indulgence absorbed it — nothing to reflect on
                              const f = useGame.getState().failures.filter(x => x.habitId === h.id && x.date === today).pop();
                              if (f) setReflect({ failureId: f.id, habitName: h.name });
                            }}
                          >
                            ✗ Relapsed
                          </button>
                        </div>
                      )}
                    </div>
                    <details className="intel-toggle">
                      <summary>📊 Progress intel</summary>
                      <HabitHeatmap habit={h} />
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {recentFailures.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Recent failures</h2>
            <span className="muted">{pardons > 0 ? `📜 ${pardons} pardon${pardons > 1 ? 's' : ''} available` : 'Habit Pardons are sold in the Market'}</span>
          </div>
          <ul className="list">
            {recentFailures.map(f => {
              const h = s.habits.find(x => x.id === f.habitId);
              return (
                <li key={f.id} className="list-row">
                  <span>✗</span>
                  <span className="list-title">{h?.name ?? 'Deleted habit'}</span>
                  <span className="muted">{fmtDayFull(f.date)} · -{f.damage} HP · broke a {f.prevStreak}-day streak</span>
                  {pardons > 0 && h && (
                    <button className="btn btn-ghost btn-sm" onClick={() => s.useItem('habit_pardon', { failureId: f.id })}>
                      📜 Pardon
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Archived ({archived.length})</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived(v => !v)}>{showArchived ? 'hide' : 'show'}</button>
          </div>
          {showArchived && (
            <ul className="list">
              {archived.map(h => (
                <li key={h.id} className="list-row">
                  <span className="list-title">{h.name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => s.archiveHabit(h.id, false)}>Restore</button>
                  <button className="btn btn-danger btn-sm" onClick={() => confirm(`Delete "${h.name}" and its history forever?`) && s.deleteHabit(h.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editing && <HabitForm habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function freqLabel(h: Habit): string {
  if (h.freq === 'daily') return 'Every day';
  if (h.freq === 'weekly') return (h.weekdays ?? []).map(d => WEEKDAYS[d]).join(', ') || 'No days set';
  return `${(h.dates ?? []).length} specific date${(h.dates ?? []).length === 1 ? '' : 's'}`;
}

function statusText(status: string) {
  switch (status) {
    case 'done': return '✓ Completed today';
    case 'failed': return '— Missed today';
    case 'pardoned': return '📜 Pardoned';
    case 'shielded': return '🛡️ Shielded';
    case 'ghost': return '👻 Frozen';
    case 'indulged': return '🕯️ Indulged';
    default: return status;
  }
}

function HabitForm({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const addHabit = useGame(s => s.addHabit);
  const updateHabit = useGame(s => s.updateHabit);

  const [name, setName] = useState(habit?.name ?? '');
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'good');
  const [freq, setFreq] = useState<HabitFreq>(habit?.freq ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? [1, 2, 3, 4, 5]);
  const [dates, setDates] = useState<string[]>(habit?.dates ?? []);
  const [dateInput, setDateInput] = useState('');
  const [attrs, setAttrs] = useState<AttributeKey[]>(habit?.attrs ?? ['health']);

  const valid = name.trim() && attrs.length > 0 && (freq !== 'weekly' || weekdays.length > 0) && (freq !== 'dates' || dates.length > 0);

  const save = () => {
    if (!valid) return;
    const data = { name: name.trim(), kind, freq, weekdays, dates, attrs, archived: false };
    if (habit) updateHabit(habit.id, data);
    else addHabit(data);
    onClose();
  };

  return (
    <Modal title={habit ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <label className="field">
        <span>Name</span>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'good' ? 'Read for 20 minutes' : 'No smoking'} autoFocus />
      </label>

      <label className="field">
        <span>Type</span>
        <div className="seg">
          <button type="button" className={kind === 'good' ? 'seg-on' : ''} onClick={() => setKind('good')}>🟢 Good — do it</button>
          <button type="button" className={kind === 'bad' ? 'seg-on' : ''} onClick={() => setKind('bad')}>🔴 Bad — avoid it</button>
        </div>
      </label>

      <label className="field">
        <span>Frequency</span>
        <div className="seg">
          <button type="button" className={freq === 'daily' ? 'seg-on' : ''} onClick={() => setFreq('daily')}>Daily</button>
          <button type="button" className={freq === 'weekly' ? 'seg-on' : ''} onClick={() => setFreq('weekly')}>Days of week</button>
          <button type="button" className={freq === 'dates' ? 'seg-on' : ''} onClick={() => setFreq('dates')}>Specific dates</button>
        </div>
      </label>

      {freq === 'weekly' && (
        <div className="field">
          <span>Days</span>
          <div className="weekday-row">
            {WEEKDAYS.map((w, i) => (
              <button
                type="button"
                key={w}
                className={`chip ${weekdays.includes(i) ? 'chip-on' : ''}`}
                onClick={() => setWeekdays(v => (v.includes(i) ? v.filter(x => x !== i) : [...v, i].sort()))}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {freq === 'dates' && (
        <div className="field">
          <span>Dates</span>
          <div className="qt-row">
            <input type="date" className="input" value={dateInput} onChange={e => setDateInput(e.target.value)} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { if (dateInput && !dates.includes(dateInput)) setDates(v => [...v, dateInput].sort()); setDateInput(''); }}
            >
              Add
            </button>
          </div>
          <div className="weekday-row">
            {dates.map(dd => (
              <button type="button" key={dd} className="chip chip-on" onClick={() => setDates(v => v.filter(x => x !== dd))} title="Remove">
                {dd} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span>Life attributes it feeds</span>
        <AttrPicker value={attrs} onChange={setAttrs} />
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}>{habit ? 'Save' : 'Create habit'}</button>
      </div>
    </Modal>
  );
}
