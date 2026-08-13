import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { TemplateBrowser, isHabitTemplate, type AnyTemplate } from '../components/TemplateBrowser';
import { AttrPicker, AttrTags, Bar, Empty, Modal } from '../components/ui';
import { QUEST_DURATIONS, QUEST_DURATION_KEYS } from '../game/constants';
import { addDaysStr, fmtDay, fmtDayFull, fmtMinutes, parseDay, questDeadlineProgress, questMinutes, questPayout, questTargetDate, todayStr } from '../game/engine';
import type { AttributeKey, Goal, QuestDuration } from '../game/types';
import { plural, useT } from '../i18n';
import { useGame } from '../store';

const GOAL_HORIZON_DAYS = [30, 60, 90, 180];

export function Quests() {
  const t = useT();
  const s = useGame();
  const [creating, setCreating] = useState(false);
  const [attrFilter, setAttrFilter] = useState<AttributeKey[]>([]);
  const active = s.quests.filter(q => !q.completedAt);
  const visible = active.filter(q => attrFilter.length === 0 || q.attrs.some(a => attrFilter.includes(a)));
  const done = [...s.quests.filter(q => q.completedAt)].sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('quests.title')}</h1>
          <p className="muted">{t('quests.subtitle')}</p>
        </div>
        <button className="btn btn-primary" data-tour="new-quest" onClick={() => setCreating(true)}>{t('quests.new')}</button>
      </div>

      <GoalsSection />

      {active.length === 0 ? (
        <Empty>
          <div>{t('quests.emptyBody')}</div>
          {/* The modal opens on the library tab, so this button lands on the curated quests
              rather than on a blank title field nobody knows how to fill. */}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Icon name="search" size={14} /> {t('quests.browseLibrary')}
            </button>
          </div>
        </Empty>
      ) : (
        <>
          <div className="filter-row">
            <AttrPicker value={attrFilter} onChange={setAttrFilter} />
          </div>

          {visible.length === 0 ? (
            <Empty>{t('quests.noneMatchFilter')}</Empty>
          ) : (
            <div className="quest-grid">
              {visible.map(q => {
                const minutes = questMinutes(q);
                const target = questTargetDate(q);
                const progress = questDeadlineProgress(q);
                return (
                  // The card is a plain div, not a Link. The title's link is stretched
                  // over the whole card in CSS, so clicking anywhere still opens the
                  // quest — but interactive children (the attribute tags) can sit above
                  // it and be clicked. Wrapping the card in an anchor would forbid that.
                  <div key={q.id} className="card quest-card">
                    <div className="card-head">
                      <h3>
                        <Link to={`/quests/${q.id}`} className="stretched-link">
                          {q.priority && <Icon name="starFilled" size={13} />} {q.title}
                        </Link>
                      </h3>
                      {s.activeSession?.questId === q.id && (
                        <span className="status status-live"><Icon name="play" size={11} /> {t('quests.recording')}</span>
                      )}
                    </div>
                    {q.description && <p className="muted clamp2">{q.description}</p>}
                    <div className="quest-meta">
                      <AttrTags attrs={q.attrs} linked />
                      <span className="muted">
                        {q.sessions.length} {plural(q.sessions.length, t('quests.sessionOne'), t('quests.sessionFew'), t('quests.sessionMany'))}
                      </span>
                    </div>
                    {progress !== null && target ? (
                      <Bar
                        value={progress}
                        max={100}
                        className={progress >= 100 ? 'bar-over' : 'bar-xp'}
                        label={t('quests.progressLabel', { pct: progress, date: fmtDay(target) })}
                      />
                    ) : null}
                    <div className="quest-meta">
                      <span>{t('quests.logged', { time: fmtMinutes(minutes) })}</span>
                      <span className="muted">
                        {target
                          ? `${QUEST_DURATIONS[q.targetDuration].label} · ${t('quests.by', { date: fmtDay(target) })}`
                          : t('questDur.none')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {done.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>{t('quests.completed', { n: done.length })}</h2></div>
          <ul className="list">
            {done.map(q => (
              <li key={q.id} className="list-row">
                <Icon name="flag" size={14} />
                <Link to={`/quests/${q.id}`} className="list-title">{q.title}</Link>
                <span className="muted">{t('quests.totalPaid', { time: fmtMinutes(questMinutes(q)), xp: questPayout(q, s.character?.classes).xp })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {creating && <QuestForm onClose={() => setCreating(false)} />}
    </div>
  );
}

/** The layer above quests: a long-horizon "why" that links the daily grind to something bigger. */
function GoalsSection() {
  const t = useT();
  const s = useGame();
  const today = todayStr();
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<Goal | null>(null);
  const open = s.goals.filter(gl => !gl.completedAt);
  const achieved = s.goals.filter(gl => gl.completedAt);

  return (
    <section className="card goals-card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="target" size={18} /> {t('quests.goalsTitle')}</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setCreating(true)}>{t('quests.newGoal')}</button>
      </div>
      {open.length === 0 && achieved.length === 0 ? (
        <p className="muted">{t('quests.goalsEmpty')}</p>
      ) : (
        <div className="goal-grid">
          {open.map(goal => {
            const linked = goal.questIds.map(id => s.quests.find(q => q.id === id)).filter(q => !!q);
            const doneCount = linked.filter(q => q!.completedAt).length;
            const daysLeft = Math.round((parseDay(goal.targetDate).getTime() - parseDay(today).getTime()) / 86400000);
            return (
              <div key={goal.id} className="goal-row">
                <div className="goal-main">
                  <div className="goal-title">{goal.title}</div>
                  {goal.why && <div className="muted goal-why">"{goal.why}"</div>}
                  <div className="quest-meta">
                    <AttrTags attrs={goal.attrs} linked />
                    <span className={`muted ${daysLeft < 0 ? 'goal-overdue' : ''}`}>
                      {daysLeft >= 0
                        ? t('quests.daysLeft', { n: daysLeft, date: fmtDay(goal.targetDate) })
                        : t('quests.daysPast', { n: -daysLeft, date: fmtDay(goal.targetDate) })}
                    </span>
                  </div>
                  {linked.length > 0 ? (
                    <>
                      <Bar value={doneCount} max={linked.length} className="bar-xp" label={t('quests.linkedDone', { done: doneCount, total: linked.length })} />
                      <div className="muted goal-linked">
                        {linked.map(q => (
                          <Link key={q!.id} to={`/quests/${q!.id}`} className={q!.completedAt ? 'cal-done' : ''}>
                            <Icon name={q!.completedAt ? 'flag' : 'quests'} size={13} /> {q!.title}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="muted">{t('quests.noLinked')}</p>
                  )}
                </div>
                <div className="goal-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setLinking(goal)}>
                    <Icon name="link" size={13} /> {t('quests.linkQuests')}
                  </button>
                  <button
                    className="btn btn-gold btn-sm"
                    disabled={doneCount === 0}
                    title={doneCount === 0 ? t('quests.finishOneFirst') : t('quests.claimMilestone')}
                    onClick={() => s.completeGoal(goal.id)}
                  >
                    <Icon name="flag" size={13} /> {t('quests.achieved')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    title={t('quests.deleteGoal')}
                    aria-label={t('quests.deleteGoal')}
                    onClick={() => confirm(t('quests.deleteGoalConfirm')) && s.deleteGoal(goal.id)}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {achieved.map(goal => (
            <div key={goal.id} className="goal-row goal-achieved">
              <div className="goal-main">
                <div className="goal-title"><Icon name="flag" size={14} /> {goal.title}</div>
                <span className="muted">{t('quests.achievedOn', { date: fmtDayFull(goal.completedAt!.slice(0, 10)) })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {creating && <GoalForm onClose={() => setCreating(false)} />}
      {linking && <LinkQuestsModal goal={linking} onClose={() => setLinking(null)} />}
    </section>
  );
}

function GoalForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const addGoal = useGame(s => s.addGoal);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [days, setDays] = useState(90);
  const [attrs, setAttrs] = useState<AttributeKey[]>(['career']);
  const valid = title.trim() && attrs.length > 0;

  return (
    <Modal title={t('quests.goalFormTitle')} onClose={onClose}>
      <label className="field">
        <span>{t('quests.goalInDays', { n: days })}</span>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('quests.goalPlaceholder')} autoFocus />
      </label>
      <label className="field">
        <span>{t('quests.goalWhy')}</span>
        <textarea className="input" rows={2} value={why} onChange={e => setWhy(e.target.value)} placeholder={t('quests.goalWhyPlaceholder')} />
      </label>
      <div className="field">
        <span>{t('quests.horizon')}</span>
        <div className="duration-grid">
          {GOAL_HORIZON_DAYS.map(d => (
            <button type="button" key={d} className={`chip ${days === d ? 'chip-on' : ''}`} onClick={() => setDays(d)}>
              {d} {plural(d, t('onb.dayOne'), t('onb.dayFew'), t('onb.dayMany'))}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>{t('quests.goalAttrs')}</span>
        <AttrPicker value={attrs} onChange={setAttrs} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => {
            addGoal({ title, why: why.trim() || undefined, targetDate: addDaysStr(todayStr(), days), attrs, questIds: [] });
            onClose();
          }}
        >
          {t('quests.setGoal')}
        </button>
      </div>
    </Modal>
  );
}

function LinkQuestsModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const [selected, setSelected] = useState<string[]>(goal.questIds);
  const candidates = s.quests; // completed quests can be linked too — retroactive credit is honest, the work happened

  return (
    <Modal title={t('quests.linkTo', { goal: goal.title })} onClose={onClose}>
      {candidates.length === 0 ? (
        <p className="muted">{t('quests.noQuestsYet')}</p>
      ) : (
        <ul className="list">
          {candidates.map(q => (
            <li key={q.id} className="list-row">
              <input
                type="checkbox"
                checked={selected.includes(q.id)}
                onChange={e => setSelected(sel => (e.target.checked ? [...sel, q.id] : sel.filter(x => x !== q.id)))}
              />
              <span className="list-title">{q.completedAt && <Icon name="flag" size={13} />} {q.title}</span>
              <span className="muted">{fmtMinutes(questMinutes(q))}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" onClick={() => { s.updateGoal(goal.id, { questIds: selected }); onClose(); }}>
          {t('quests.saveLinks')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * New quest.
 *
 * The library leads and the blank form follows, because "what should I even work
 * on" is a harder question than "what do I call it". The curated quests already
 * carry a description, a realistic duration and their first concrete sessions —
 * everything the empty form asks you to invent on the spot.
 */
function QuestForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useGame();
  const addQuest = s.addQuest;
  const [tab, setTab] = useState<'library' | 'own'>('library');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDuration, setTargetDuration] = useState<QuestDuration>('1m');
  const [attrs, setAttrs] = useState<AttributeKey[]>(['career']);

  const valid = title.trim() && attrs.length > 0;

  // Titles already on the board, so the library marks them "Added" instead of
  // quietly letting you start the same quest twice.
  const addedTitles = useMemo(() => new Set(s.quests.map(q => q.title)), [s.quests]);

  const addFromTemplate = (tpl: AnyTemplate) => {
    if (isHabitTemplate(tpl)) return; // this browser is quest-only; the guard is for the union type
    // The steps are the part that makes a template a quest rather than a wish,
    // so they ride along in the description instead of being lost on the way in.
    const steps = tpl.steps.length
      ? ` ${t('quests.firstSessions')} ${tpl.steps.map((step, i) => `${i + 1}) ${step}`).join(' ')}`
      : '';
    addQuest({ title: tpl.title, description: `${tpl.description}${steps}`, targetDuration: tpl.targetDuration, attrs: tpl.attrs });
  };

  return (
    <Modal title={t('quests.newQuestTitle')} onClose={onClose} wide>
      <span data-tour="quest-form" hidden />
      <div className="field">
        <div className="seg">
          <button type="button" className={tab === 'library' ? 'seg-on' : ''} onClick={() => setTab('library')}>{t('habits.tabLibrary')}</button>
          <button type="button" className={tab === 'own' ? 'seg-on' : ''} onClick={() => setTab('own')}>{t('habits.tabOwn')}</button>
        </div>
      </div>

      {tab === 'library' ? (
        <>
          <TemplateBrowser
            kind="quest"
            mode="add"
            profile={s.character?.profile}
            addedTitles={addedTitles}
            onPick={tpl => addFromTemplate(tpl)}
            emptyHint={t('quests.libraryEmptyHint')}
          />
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setTab('own')}>{t('habits.tabOwn')}</button>
            <button className="btn btn-primary" onClick={onClose}>{t('common.done')}</button>
          </div>
        </>
      ) : (
        <QuestFields
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          targetDuration={targetDuration}
          setTargetDuration={setTargetDuration}
          attrs={attrs}
          setAttrs={setAttrs}
          valid={!!valid}
          onBrowse={() => setTab('library')}
          onClose={onClose}
          onCreate={() => { addQuest({ title: title.trim(), description: description.trim() || undefined, targetDuration, attrs }); onClose(); }}
        />
      )}
    </Modal>
  );
}

function QuestFields({
  title,
  setTitle,
  description,
  setDescription,
  targetDuration,
  setTargetDuration,
  attrs,
  setAttrs,
  valid,
  onBrowse,
  onClose,
  onCreate,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  targetDuration: QuestDuration;
  setTargetDuration: (v: QuestDuration) => void;
  attrs: AttributeKey[];
  setAttrs: (v: AttributeKey[]) => void;
  valid: boolean;
  onBrowse: () => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const t = useT();
  return (
    <>
      <label className="field">
        <span>{t('quests.whatIsIt')}</span>
        <input className="input" data-tour="quest-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('quests.titlePlaceholder')} autoFocus />
      </label>
      <label className="field">
        <span>{t('quests.details')}</span>
        <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('quests.detailsPlaceholder')} />
      </label>
      <div className="field">
        <span>{t('quests.howLong')}</span>
        <div className="duration-grid">
          {QUEST_DURATION_KEYS.map(k => (
            <button
              type="button"
              key={k}
              className={`chip ${targetDuration === k ? 'chip-on' : ''}`}
              onClick={() => setTargetDuration(k)}
            >
              {QUEST_DURATIONS[k].label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>{t('habits.fieldAttrs')}</span>
        <AttrPicker value={attrs} onChange={setAttrs} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onBrowse}>
          <Icon name="search" size={13} /> {t('habits.tabLibrary')}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" disabled={!valid} onClick={onCreate}>
          {t('quests.create')}
        </button>
      </div>
    </>
  );
}
