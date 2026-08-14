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
import { plural, t as tr, useT } from '../i18n';
import { weekdayNames } from '../lib/format';
import { useGame } from '../store';

type HabitView = 'today' | 'all';

/** How long a habit must have existed before the 12-week grid is worth drawing. */
const HEATMAP_MIN_DAYS = 7;

export function Habits() {
  const t = useT();
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
          <h1>{t('habits.title')}</h1>
          <p className="muted">{t('habits.subtitle')}</p>
        </div>
        <button className="btn btn-primary" data-tour="new-habit" onClick={() => setEditing('new')}><Icon name="plus" size={14} /> {t('habits.new')}</button>
      </div>

      {showHeatmap && (
        <section className="card">
          <div className="card-head"><h2>{t('habits.last12')}</h2></div>
          <Heatmap />
        </section>
      )}

      {active.length === 0 ? (
        <Empty>
          <div>{t('habits.emptyBody')}</div>
          <div className="btn-pair" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Icon name="search" size={14} /> {t('habits.browseLibrary')}
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            {t('habits.emptyOr')} <Link to="/attributes">{t('habits.lifeSectors')}</Link> {t('habits.emptyOrTail')}
          </div>
        </Empty>
      ) : (
        <>
          <div className="filter-row">
            <div className="seg">
              <button type="button" className={view === 'today' ? 'seg-on' : ''} onClick={() => setView('today')}>{t('common.today')}</button>
              <button type="button" className={view === 'all' ? 'seg-on' : ''} onClick={() => setView('all')}>{t('habits.allHabits')}</button>
            </div>
            <AttrPicker value={attrFilter} onChange={setAttrFilter} />
          </div>

          {visible.length === 0 ? (
            <Empty>
              {view === 'today'
                ? attrFilter.length > 0 ? t('habits.noneDueFiltered') : t('habits.noneDue')
                : t('habits.noneMatchFilter')}
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
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(h)} title={t('common.edit')}><Icon name="edit" size={14} /></button>
                        {/* No 'archive' glyph exists in IconName; 'eyeOff' carries the actual meaning
                            here — the habit stops appearing, its history is kept. */}
                        <button className="btn btn-ghost btn-sm" onClick={() => s.archiveHabit(h.id, true)} title={t('habits.archive')}><Icon name="eyeOff" size={14} /></button>
                      </div>
                    </div>
                    <div className="habit-meta">
                      <span className="muted">{freqLabel(h)}</span>
                      <AttrTags attrs={h.attrs} linked />
                    </div>
                    <div className="habit-streak" data-tour="habit-streak">
                      <span className="streak-big"><Icon name="flame" size={20} /> {h.streak}</span>
                      <span className="muted">{t('habits.best', { n: h.best })}</span>
                    </div>
                    <div className="habit-action">
                      {!due ? (
                        <span className="muted">{t('habits.notToday')}</span>
                      ) : status ? (
                        <StatusLabel status={status} />
                      ) : ghostToday ? (
                        <span className="status"><Icon name="ghost" size={13} /> {t('habits.frozenToday')}</span>
                      ) : h.kind === 'good' ? (
                        <button
                          className="btn btn-primary"
                          data-tour="habit-checkin"
                          onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 12); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 5); }}
                        >
                          <Icon name="check" size={14} /> {t('habits.doneToday')} · +12 XP · +5 <Icon name="gold" size={14} />
                        </button>
                      ) : (
                        <div className="btn-pair">
                          <button
                            className="btn btn-primary"
                            onClick={e => { s.checkinHabit(h.id); spawnVFXAt(e, 'xp', 8); spawnVFXAt({ clientX: e.clientX + 24, clientY: e.clientY - 14 }, 'gold', 3); }}
                          >
                            <Icon name="check" size={14} /> {t('habits.resisted')} · +8 XP · +3 <Icon name="gold" size={14} />
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
                            <Icon name="close" size={14} /> {t('habits.relapsed')}
                          </button>
                        </div>
                      )}
                    </div>
                    <details className="intel-toggle">
                      <summary><Icon name="calendar" size={13} /> {t('habits.progressIntel')}</summary>
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
            <h2>{t('habits.recentFailures')}</h2>
            <span className="muted">
              {pardons > 0
                ? <><Icon name="pardon" size={13} /> {t('habits.pardonsAvailable', { n: pardons })}</>
                : t('habits.pardonsSold')}
            </span>
          </div>
          <ul className="list">
            {recentFailures.map(f => {
              const h = s.habits.find(x => x.id === f.habitId);
              return (
                <li key={f.id} className="list-row">
                  <Icon name="close" size={14} />
                  <span className="list-title">{h?.name ?? t('habits.deletedHabit')}</span>
                  <span className="muted">{fmtDayFull(f.date)} · -{f.damage} HP · {t('habits.brokeStreak', { n: f.prevStreak })}</span>
                  {pardons > 0 && h && (
                    <button className="btn btn-ghost btn-sm" onClick={() => s.useItem('habit_pardon', { failureId: f.id })}>
                      <Icon name="pardon" size={13} /> {t('habits.pardon')}
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
            <h2>{t('habits.archived', { n: archived.length })}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived(v => !v)}>{showArchived ? t('habits.hide') : t('habits.show')}</button>
          </div>
          {showArchived && (
            <ul className="list">
              {archived.map(h => (
                <li key={h.id} className="list-row">
                  <span className="list-title">{h.name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => s.archiveHabit(h.id, false)}>{t('habits.restore')}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => confirm(t('habits.deleteConfirm', { name: h.name })) && s.deleteHabit(h.id)}>{t('common.delete')}</button>
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
  if (h.freq === 'daily') return tr('habits.everyDay');
  if (h.freq === 'weekly') {
    const names = weekdayNames();
    return (h.weekdays ?? []).map(d => names[d]).join(', ') || tr('habits.noDaysSet');
  }
  const n = (h.dates ?? []).length;
  return `${n} ${plural(n, tr('habits.dateOne'), tr('habits.dateFew'), tr('habits.dateMany'))}`;
}

/** Status key → icon. The label is looked up as `habits.status.<key>`. */
const STATUS_ICON: Record<string, IconName> = {
  done: 'check',
  failed: 'close',
  pardoned: 'pardon',
  shielded: 'shield',
  ghost: 'ghost',
  indulged: 'indulgence',
};

function StatusLabel({ status }: { status: string }) {
  const t = useT();
  const icon = STATUS_ICON[status];
  // Unknown statuses come from future engine states; show the raw key rather than nothing.
  if (!icon) return <span className={`status status-${status}`}>{status}</span>;
  return (
    <span className={`status status-${status}`}>
      <Icon name={icon} size={13} /> {t(`habits.status.${status}`)}
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
  const t = useT();
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
    <Modal title={isNew ? t('habits.new') : t('habits.edit')} onClose={onClose} wide={isNew}>
      {isNew && (
        <div className="seg" data-tour="habit-tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={tab === 'library' ? 'seg-on' : ''} onClick={() => setTab('library')}>{t('habits.tabLibrary')}</button>
          <button type="button" className={tab === 'own' ? 'seg-on' : ''} onClick={() => setTab('own')}>{t('habits.tabOwn')}</button>
        </div>
      )}

      {isNew && tab === 'library' ? (
        <TemplateBrowser
          kind="habit"
          mode="add"
          profile={profile}
          addedTitles={addedTitles}
          onPick={tpl => {
            // kind="habit" only ever yields habit templates; the guard narrows the union.
            if (!isHabitTemplate(tpl)) return;
            addHabit({
              name: tpl.name,
              kind: tpl.kind,
              freq: tpl.freq,
              // A weekly template with no days would never come due, so it falls back
              // to weekdays rather than landing in the list already dead.
              weekdays: tpl.weekdays ?? [1, 2, 3, 4, 5],
              dates: [],
              attrs: tpl.attrs,
              archived: false,
            });
            onClose();
          }}
          emptyHint={t('habits.libraryEmptyHint')}
        />
      ) : (
        <HabitFields habit={habit} onClose={onClose} />
      )}
    </Modal>
  );
}

function HabitFields({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const t = useT();
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
        <span>{t('habits.fieldName')}</span>
        <input className="input" data-tour="habit-name" value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'good' ? t('habits.phGood') : t('habits.phBad')} autoFocus />
      </label>

      <label className="field">
        <span>{t('habits.fieldType')}</span>
        {/* The same good/bad dot the habit cards use, so the colour means one thing app-wide. */}
        <div className="seg" data-tour="habit-kind">
          <button type="button" className={kind === 'good' ? 'seg-on' : ''} onClick={() => setKind('good')}>
            <span className="habit-kind good" /> {t('habits.kindGood')}
          </button>
          <button type="button" className={kind === 'bad' ? 'seg-on' : ''} onClick={() => setKind('bad')}>
            <span className="habit-kind bad" /> {t('habits.kindBad')}
          </button>
        </div>
      </label>

      <label className="field">
        <span>{t('habits.fieldFreq')}</span>
        <div className="seg" data-tour="habit-freq">
          <button type="button" className={freq === 'daily' ? 'seg-on' : ''} onClick={() => setFreq('daily')}>{t('habits.freqDaily')}</button>
          <button type="button" className={freq === 'weekly' ? 'seg-on' : ''} onClick={() => setFreq('weekly')}>{t('habits.freqWeekly')}</button>
          <button type="button" className={freq === 'dates' ? 'seg-on' : ''} onClick={() => setFreq('dates')}>{t('habits.freqDates')}</button>
        </div>
      </label>

      {freq === 'weekly' && (
        <div className="field">
          <span>{t('habits.fieldDays')}</span>
          <div className="weekday-row">
            {weekdayNames().map((w, i) => (
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
          <span>{t('habits.fieldDates')}</span>
          <div className="qt-row">
            <input type="date" className="input" value={dateInput} onChange={e => setDateInput(e.target.value)} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { if (dateInput && !dates.includes(dateInput)) setDates(v => [...v, dateInput].sort()); setDateInput(''); }}
            >
              {t('common.add')}
            </button>
          </div>
          <div className="weekday-row">
            {dates.map(dd => (
              <button type="button" key={dd} className="chip chip-on chip-icon" onClick={() => setDates(v => v.filter(x => x !== dd))} title={t('habits.remove')}>
                {dd} <Icon name="close" size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span>{t('habits.fieldAttrs')}</span>
        <span data-tour="habit-attrs"><AttrPicker value={attrs} onChange={setAttrs} /></span>
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" data-tour="habit-save" disabled={!valid} onClick={save}>{habit ? t('common.save') : t('habits.create')}</button>
      </div>
    </>
  );
}
