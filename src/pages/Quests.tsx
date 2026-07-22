import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AttrPicker, AttrTags, Bar, Empty, Modal } from '../components/ui';
import { QUEST_DURATIONS, QUEST_DURATION_KEYS } from '../game/constants';
import { addDaysStr, fmtDay, fmtDayFull, fmtMinutes, parseDay, questDeadlineProgress, questMinutes, questPayout, questTargetDate, todayStr } from '../game/engine';
import type { AttributeKey, Goal, QuestDuration } from '../game/types';
import { useGame } from '../store';

const GOAL_HORIZONS = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
];

export function Quests() {
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
          <h1>Quests</h1>
          <p className="muted">
            Time-tracked work. Sessions log the grind; the single big payout comes only when the whole quest is done.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New quest</button>
      </div>

      <GoalsSection />

      {active.length === 0 ? (
        <Empty>No active quests. A quest is real work — write what it is, pick a rough deadline, then clock sessions until it's finished.</Empty>
      ) : (
        <>
          <div className="filter-row">
            <AttrPicker value={attrFilter} onChange={setAttrFilter} />
          </div>

          {visible.length === 0 ? (
            <Empty>No quests match this attribute filter.</Empty>
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
                          {q.priority && '⭐ '}{q.title}
                        </Link>
                      </h3>
                      {s.activeSession?.questId === q.id && <span className="status status-live">● recording</span>}
                    </div>
                    {q.description && <p className="muted clamp2">{q.description}</p>}
                    <div className="quest-meta">
                      <AttrTags attrs={q.attrs} linked />
                      <span className="muted">{q.sessions.length} session{q.sessions.length === 1 ? '' : 's'}</span>
                    </div>
                    {progress !== null && target ? (
                      <Bar
                        value={progress}
                        max={100}
                        className={progress >= 100 ? 'bar-over' : 'bar-xp'}
                        label={`${progress}% of the way to ${fmtDay(target)}`}
                      />
                    ) : null}
                    <div className="quest-meta">
                      <span>{fmtMinutes(minutes)} logged</span>
                      <span className="muted">
                        {target ? `${QUEST_DURATIONS[q.targetDuration].label} · by ${fmtDay(target)}` : 'No deadline'}
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
          <div className="card-head"><h2>Completed ({done.length})</h2></div>
          <ul className="list">
            {done.map(q => (
              <li key={q.id} className="list-row">
                <span>🏁</span>
                <Link to={`/quests/${q.id}`} className="list-title">{q.title}</Link>
                <span className="muted">{fmtMinutes(questMinutes(q))} total · paid {questPayout(q, s.character?.classId).xp} XP</span>
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
  const s = useGame();
  const today = todayStr();
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<Goal | null>(null);
  const open = s.goals.filter(gl => !gl.completedAt);
  const achieved = s.goals.filter(gl => gl.completedAt);

  return (
    <section className="card goals-card">
      <div className="card-head">
        <h2>🎯 Long-term goals</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setCreating(true)}>+ New goal</button>
      </div>
      {open.length === 0 && achieved.length === 0 ? (
        <p className="muted">
          A goal is the campaign your quests fight for — "in 90 days I want X." Link quests to it;
          the milestone can only be claimed once at least one linked quest is actually finished.
        </p>
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
                      {daysLeft >= 0 ? `${daysLeft} days left · by ${fmtDay(goal.targetDate)}` : `${-daysLeft} days past ${fmtDay(goal.targetDate)}`}
                    </span>
                  </div>
                  {linked.length > 0 ? (
                    <>
                      <Bar value={doneCount} max={linked.length} className="bar-xp" label={`${doneCount}/${linked.length} linked quests done`} />
                      <div className="muted goal-linked">
                        {linked.map(q => (
                          <Link key={q!.id} to={`/quests/${q!.id}`} className={q!.completedAt ? 'cal-done' : ''}>
                            {q!.completedAt ? '🏁 ' : '⚔️ '}{q!.title}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="muted">No quests linked yet — a goal without quests is just a wish.</p>
                  )}
                </div>
                <div className="goal-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setLinking(goal)}>🔗 Link quests</button>
                  <button
                    className="btn btn-gold btn-sm"
                    disabled={doneCount === 0}
                    title={doneCount === 0 ? 'Finish at least one linked quest first' : 'Claim the milestone: +100 XP, +50 🪙'}
                    onClick={() => s.completeGoal(goal.id)}
                  >
                    🏁 Achieved
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => confirm('Delete this goal? Linked quests stay.') && s.deleteGoal(goal.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
          {achieved.map(goal => (
            <div key={goal.id} className="goal-row goal-achieved">
              <div className="goal-main">
                <div className="goal-title">🏁 {goal.title}</div>
                <span className="muted">Achieved {fmtDayFull(goal.completedAt!.slice(0, 10))}</span>
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
  const addGoal = useGame(s => s.addGoal);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [days, setDays] = useState(90);
  const [attrs, setAttrs] = useState<AttributeKey[]>(['career']);
  const valid = title.trim() && attrs.length > 0;

  return (
    <Modal title="🎯 New long-term goal" onClose={onClose}>
      <label className="field">
        <span>In {days} days, I want…</span>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="…to have launched my business site" autoFocus />
      </label>
      <label className="field">
        <span>Why does it matter? (optional, future-you will read this)</span>
        <textarea className="input" rows={2} value={why} onChange={e => setWhy(e.target.value)} placeholder="Because…" />
      </label>
      <div className="field">
        <span>Horizon</span>
        <div className="duration-grid">
          {GOAL_HORIZONS.map(h => (
            <button type="button" key={h.days} className={`chip ${days === h.days ? 'chip-on' : ''}`} onClick={() => setDays(h.days)}>
              {h.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Life attributes it serves</span>
        <AttrPicker value={attrs} onChange={setAttrs} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => {
            addGoal({ title, why: why.trim() || undefined, targetDate: addDaysStr(todayStr(), days), attrs, questIds: [] });
            onClose();
          }}
        >
          Set the goal
        </button>
      </div>
    </Modal>
  );
}

function LinkQuestsModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const s = useGame();
  const [selected, setSelected] = useState<string[]>(goal.questIds);
  const candidates = s.quests; // completed quests can be linked too — retroactive credit is honest, the work happened

  return (
    <Modal title={`🔗 Link quests to: ${goal.title}`} onClose={onClose}>
      {candidates.length === 0 ? (
        <p className="muted">No quests exist yet. Forge one first — goals are won through quests.</p>
      ) : (
        <ul className="list">
          {candidates.map(q => (
            <li key={q.id} className="list-row">
              <input
                type="checkbox"
                checked={selected.includes(q.id)}
                onChange={e => setSelected(sel => (e.target.checked ? [...sel, q.id] : sel.filter(x => x !== q.id)))}
              />
              <span className="list-title">{q.completedAt ? '🏁 ' : ''}{q.title}</span>
              <span className="muted">{fmtMinutes(questMinutes(q))}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { s.updateGoal(goal.id, { questIds: selected }); onClose(); }}>
          Save links
        </button>
      </div>
    </Modal>
  );
}

function QuestForm({ onClose }: { onClose: () => void }) {
  const addQuest = useGame(s => s.addQuest);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDuration, setTargetDuration] = useState<QuestDuration>('1m');
  const [attrs, setAttrs] = useState<AttributeKey[]>(['career']);

  const valid = title.trim() && attrs.length > 0;

  return (
    <Modal title="New quest" onClose={onClose}>
      <label className="field">
        <span>What is the quest?</span>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Launch my portfolio site" autoFocus />
      </label>
      <label className="field">
        <span>Details (optional)</span>
        <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does 'done' look like?" />
      </label>
      <div className="field">
        <span>How long do you think this'll take? — a pacing reference, not a hard deadline</span>
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
        <span>Life attributes it feeds</span>
        <AttrPicker value={attrs} onChange={setAttrs} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => { addQuest({ title: title.trim(), description: description.trim() || undefined, targetDuration, attrs }); onClose(); }}
        >
          Create quest
        </button>
      </div>
    </Modal>
  );
}
