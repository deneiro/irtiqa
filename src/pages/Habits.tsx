import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { Heatmap } from '../components/Heatmap';
import { Icon, type IconName } from '../components/Icon';
import { RelapseReflect } from '../components/RelapseReflect';
import { TemplateBrowser, isHabitTemplate } from '../components/TemplateBrowser';
import { AttrPicker, AttrTags, Empty, Modal } from '../components/ui';
import { addDaysStr, fmtDayFull, habitDueOn, missDamage, todayStr } from '../game/engine';
import { spawnVFXAt } from '../lib/vfx';
import type { AttributeKey, Habit, HabitFreq, HabitKind } from '../game/types';
import { useGame } from '../store';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type HabitView = 'today' | 'all';

/** How long a habit must have existed before the 12-week grid is worth drawing. */
const HEATMAP_MIN_DAYS = 7;

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

  // The aggregate grid is 84 cells wide. Drawn on day one it is 84 empty squares —
  // a wall of nothing that reads as "you have failed 84 times" before the player has
  // had a chance to do anything. It earns its place once there is a week of history.
  const earliestCreated = useMemo(
    () => s.habits.reduce<string | null>((min, h) => (min === null || h.createdAt < min ? h.createdAt : min), null),
    [s.habits],
  );
  const showHeatmap = earliestCreated !== null && addDaysStr(earliestCreated, HEATMAP_MIN_DAYS) <= today;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Habits</h1>
          <p className="muted">The daily discipline engine. Miss a day and the app notices — automatically.</p>
        </div>
        <button className="btn btn-primary" data-tour="new-habit" onClick={() => setEditing('new')}><Icon name="plus" size={14} /> New habit</button>
      </div>

      {showHeatmap && (
        <section className="card">
          <div className="card-head"><h2>Last 12 weeks</h2></div>
          <Heatmap />
        </section>
      )}

      {active.length === 0 ? (
        <Empty>
          <div>
            No habits yet. Good habits are things to do (“read 20 min”); bad habits are things to avoid
            (“no smoking”). Both build streaks.
          </div>
          <div className="btn-pair" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Icon name="search" size={14} /> Browse the habit library
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            Or open <Link to="/attributes">your life sectors</Link> to see what each one is asking for.
          </div>
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
                        {/* No 'archive' glyph exists in IconName; 'eyeOff' carries the actual meaning
                            here — the habit stops appearing, its history is kept. */}
                        <button className="btn btn-ghost btn-sm" onClick={() => s.archiveHabit(h.id, true)} title="Archive"><Icon name="eyeOff" size={14} /></button>
                      </div>
                    </div>
                    <div className="habit-meta">
                      <span className="muted">{freqLabel(h)}</span>
                      <AttrTags attrs={h.attrs} linked />
                    </div>
                    <div className="habit-streak" data-tour="habit-streak">
                      <span className="streak-big"><Icon name="flame" size={20} /> {h.streak}</span>
                      <span className="muted">best {h.best}</span>
                    </div>
                    <div className="habit-action">
                      {!due ? (
                        <span className="muted">Not scheduled today</span>
                      ) : status ? (
                        <StatusLabel status={status} />
                      ) : ghostToday ? (
                        <span className="status"><Icon name="ghost" size={13} /> Frozen today</span>
                      ) : h.kind === 'good' ? (
                        <button
                          className="btn btn-primary"
                          data-tour="habit-checkin"
                          onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 12); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 5); }}
                        >
                          <Icon name="check" size={14} /> Done today · +12 XP · +5 <Icon name="gold" size={14} />
                        </button>
                      ) : (
                        <div className="btn-pair">
                          <button
                            className="btn btn-primary"
                            onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 3); }}
                          >
                            <Icon name="check" size={14} /> Resisted · +8 XP · +3 <Icon name="gold" size={14} />
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
                            <Icon name="close" size={14} /> Relapsed
                          </button>
                        </div>
                      )}
                    </div>
                    <details className="intel-toggle">
                      <summary><Icon name="calendar" size={13} /> Progress intel</summary>
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
            <span className="muted">
              {pardons > 0
                ? <><Icon name="pardon" size={13} /> {pardons} pardon{pardons > 1 ? 's' : ''} available</>
                : 'Habit Pardons are sold in the Market'}
            </span>
          </div>
          <ul className="list">
            {recentFailures.map(f => {
              const h = s.habits.find(x => x.id === f.habitId);
              return (
                <li key={f.id} className="list-row">
                  <Icon name="close" size={14} />
                  <span className="list-title">{h?.name ?? 'Deleted habit'}</span>
                  <span className="muted">{fmtDayFull(f.date)} · -{f.damage} HP · broke a {f.prevStreak}-day streak</span>
                  {pardons > 0 && h && (
                    <button className="btn btn-ghost btn-sm" onClick={() => s.useItem('habit_pardon', { failureId: f.id })}>
                      <Icon name="pardon" size={13} /> Pardon
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

      {editing && <HabitModal habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      {/* The reflection prompt was built but never mounted, so every relapse silently
          discarded the "what triggered it?" answer the engine stores on the failure. */}
      {reflect && (
        <RelapseReflect failureId={reflect.failureId} habitName={reflect.habitName} onClose={() => setReflect(null)} />
      )}
    </div>
  );
}

function freqLabel(h: Habit): string {
  if (h.freq === 'daily') return 'Every day';
  if (h.freq === 'weekly') return (h.weekdays ?? []).map(d => WEEKDAYS[d]).join(', ') || 'No days set';
  return `${(h.dates ?? []).length} specific date${(h.dates ?? []).length === 1 ? '' : 's'}`;
}

const STATUS_META: Record<string, { icon: IconName; label: string }> = {
  done: { icon: 'check', label: 'Completed today' },
  failed: { icon: 'close', label: 'Missed today' },
  pardoned: { icon: 'pardon', label: 'Pardoned' },
  shielded: { icon: 'shield', label: 'Shielded' },
  ghost: { icon: 'ghost', label: 'Frozen' },
  indulged: { icon: 'indulgence', label: 'Indulged' },
};

function StatusLabel({ status }: { status: string }) {
  const meta = STATUS_META[status];
  // Unknown statuses come from future engine states; show the raw key rather than nothing.
  if (!meta) return <span className={`status status-${status}`}>{status}</span>;
  return (
    <span className={`status status-${status}`}>
      <Icon name={meta.icon} size={13} /> {meta.label}
    </span>
  );
}

type NewHabitTab = 'library' | 'own';

/**
 * One modal, two ways in.
 *
 * "+ New habit" used to open a bare text field, which quietly asks the player to
 * already know which habit they want — the single hardest question in the app. The
 * curated library answers it, so it is the default tab; writing your own is one click
 * away for people who arrived with an idea.
 *
 * Editing an existing habit skips the tabs entirely: there is nothing to browse.
 */
function HabitModal({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const addHabit = useGame(s => s.addHabit);
  const habits = useGame(s => s.habits);
  const profile = useGame(s => s.character?.profile);
  const [tab, setTab] = useState<NewHabitTab>('library');

  const isNew = habit === null;

  // Archived habits are deliberately out of play, so they don't mark a template as
  // "Added" — the library stays a way back in without a trip through the archive.
  const addedTitles = useMemo(() => new Set(habits.filter(h => !h.archived).map(h => h.name)), [habits]);

  return (
    // Stays wide on both tabs: the grid needs the room, and a modal that resizes
    // under the cursor when you switch tabs is unpleasant.
    <Modal title={isNew ? 'New habit' : 'Edit habit'} onClose={onClose} wide={isNew}>
      {isNew && (
        <div className="seg" data-tour="habit-tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={tab === 'library' ? 'seg-on' : ''} onClick={() => setTab('library')}>Browse library</button>
          <button type="button" className={tab === 'own' ? 'seg-on' : ''} onClick={() => setTab('own')}>Write my own</button>
        </div>
      )}

      {isNew && tab === 'library' ? (
        <TemplateBrowser
          kind="habit"
          mode="add"
          profile={profile}
          addedTitles={addedTitles}
          onPick={t => {
            // kind="habit" only ever yields habit templates; the guard narrows the union.
            if (!isHabitTemplate(t)) return;
            addHabit({
              name: t.name,
              kind: t.kind,
              freq: t.freq,
              // A weekly template with no days would never come due, so it falls back
              // to weekdays rather than landing in the list already dead.
              weekdays: t.weekdays ?? [1, 2, 3, 4, 5],
              dates: [],
              attrs: t.attrs,
              archived: false,
            });
            onClose();
          }}
          emptyHint="Nothing matches that. Clear a filter, or switch to “Write my own”."
        />
      ) : (
        <HabitFields habit={habit} onClose={onClose} />
      )}
    </Modal>
  );
}

function HabitFields({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
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
    <>
      <label className="field">
        <span>Name</span>
        <input className="input" data-tour="habit-name" value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'good' ? 'Read for 20 minutes' : 'No smoking'} autoFocus />
      </label>

      <label className="field">
        <span>Type</span>
        {/* The same good/bad dot the habit cards use, so the colour means one thing app-wide. */}
        <div className="seg" data-tour="habit-kind">
          <button type="button" className={kind === 'good' ? 'seg-on' : ''} onClick={() => setKind('good')}>
            <span className="habit-kind good" /> Good — do it
          </button>
          <button type="button" className={kind === 'bad' ? 'seg-on' : ''} onClick={() => setKind('bad')}>
            <span className="habit-kind bad" /> Bad — avoid it
          </button>
        </div>
      </label>

      <label className="field">
        <span>Frequency</span>
        <div className="seg" data-tour="habit-freq">
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
              <button type="button" key={dd} className="chip chip-on chip-icon" onClick={() => setDates(v => v.filter(x => x !== dd))} title="Remove">
                {dd} <Icon name="close" size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span>Life attributes it feeds</span>
        <span data-tour="habit-attrs"><AttrPicker value={attrs} onChange={setAttrs} /></span>
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" data-tour="habit-save" disabled={!valid} onClick={save}>{habit ? 'Save' : 'Create habit'}</button>
      </div>
    </>
  );
}
