import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AttrTags, Bar, Empty, Modal } from '../components/ui';
import { QUEST_DURATIONS } from '../game/constants';
import { fmtDay, fmtDayFull, fmtMinutes, questDeadlineProgress, questMinutes, questPayout, questTargetDate, todayStr } from '../game/engine';
import { spawnVFXAt } from '../lib/vfx';
import { useGame } from '../store';

export function QuestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const s = useGame();
  const quest = s.quests.find(q => q.id === id);

  const [notePrompt, setNotePrompt] = useState(false);
  const [note, setNote] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);

  if (!quest) {
    return (
      <div className="page">
        <Empty>Quest not found. <Link to="/quests">Back to quests</Link></Empty>
      </div>
    );
  }

  const isRunning = s.activeSession?.questId === quest.id;
  const otherRunning = !!s.activeSession && !isRunning;
  const minutes = questMinutes(quest);
  const today = todayStr();
  const todayMinutes = quest.sessions.filter(x => x.date === today).reduce((a, x) => a + x.minutes, 0);
  const payout = questPayout(quest, s.character?.classes);
  const sessions = [...quest.sessions].reverse();
  const target = questTargetDate(quest);
  const progress = questDeadlineProgress(quest);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p><Link to="/quests" className="muted">← Quests</Link></p>
          <h1>{quest.priority && '⭐ '}{quest.title} {quest.completedAt && <span className="status status-done">🏁 completed</span>}</h1>
          {quest.description && <p className="muted">{quest.description}</p>}
          <p className="muted">
            <AttrTags attrs={quest.attrs} linked /> ·{' '}
            {target ? `${QUEST_DURATIONS[quest.targetDuration].label} · target ${fmtDay(target)}` : 'No deadline'}
          </p>
        </div>
        {!quest.completedAt && (
          <div className="btn-pair">
            <button
              className={`btn ${quest.priority ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => s.setQuestPriority(quest.id, !quest.priority)}
              title="Priority quests pay +25% XP"
            >
              {quest.priority ? '⭐ Priority' : '☆ Make priority'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => { if (confirm('Delete this quest and all its logged sessions?')) { s.deleteQuest(quest.id); navigate('/quests'); } }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="quest-detail-grid">
        <section className="card session-card">
          <div className="card-head"><h2>Work session</h2></div>
          {quest.completedAt ? (
            <p className="muted">This quest is finished. The saga is written below.</p>
          ) : isRunning ? (
            <>
              <LiveTimer startedAt={s.activeSession!.startedAt} />
              <button className="btn btn-primary btn-lg" onClick={() => setNotePrompt(true)}>■ Finish session</button>
            </>
          ) : (
            <>
              <p className="muted">
                Start the timer, do the real work, then finish and write down what you did.
                Sessions earn nothing by themselves — the single big payout lands when the quest is completed.
              </p>
              <button className="btn btn-primary btn-lg" disabled={otherRunning} onClick={() => s.startSession(quest.id)}>
                ▶ Start session
              </button>
              {otherRunning && <p className="muted">Another quest's session is running — finish it first.</p>}
            </>
          )}
          <div className="session-totals">
            <div><span className="stat-big">{fmtMinutes(minutes)}</span><span className="muted">lifetime</span></div>
            <div><span className="stat-big">{fmtMinutes(todayMinutes)}</span><span className="muted">today</span></div>
            <div><span className="stat-big">{quest.sessions.length}</span><span className="muted">sessions</span></div>
          </div>
          {progress !== null && target ? (
            <>
              <Bar value={progress} max={100} className={progress >= 100 ? 'bar-over' : 'bar-xp'} />
              <p className="muted center">{progress}% of the way to {fmtDay(target)} ({QUEST_DURATIONS[quest.targetDuration].label} goal)</p>
            </>
          ) : (
            <p className="muted center">No deadline set — work it at your own pace.</p>
          )}
          {!quest.completedAt && (
            <button className="btn btn-gold btn-lg" disabled={isRunning} onClick={() => setConfirmDone(true)}>
              🏁 Complete quest — claim {payout.xp} XP + {payout.gold} 🪙
            </button>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Work log</h2></div>
          {sessions.length === 0 ? (
            <Empty>No sessions yet. The log fills up as you work — date, duration, and what you actually did.</Empty>
          ) : (
            <ul className="worklog">
              {sessions.map(sess => (
                <li key={sess.id} className="worklog-row">
                  <div className="worklog-meta">
                    <span className="worklog-date">{fmtDayFull(sess.date)}</span>
                    <span className="worklog-dur">{fmtMinutes(sess.minutes)}</span>
                  </div>
                  <div className="worklog-note">"{sess.note || '—'}"</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {notePrompt && (
        <Modal title="What did you do this session?" onClose={() => { /* must answer */ }}>
          <textarea
            className="input"
            rows={3}
            autoFocus
            placeholder="e.g. Made the plan, outlined the structure"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              disabled={!note.trim()}
              onClick={() => { s.finishSession(note); setNote(''); setNotePrompt(false); }}
            >
              Log session
            </button>
          </div>
        </Modal>
      )}

      {confirmDone && (
        <Modal title="Complete this quest?" onClose={() => setConfirmDone(false)}>
          <p>
            You logged <strong>{fmtMinutes(minutes)}</strong> across {quest.sessions.length} session{quest.sessions.length === 1 ? '' : 's'}.
          </p>
          <p>
            Payout: <strong>+{payout.xp} XP</strong> and <strong>+{payout.gold} 🪙</strong>
            {quest.priority && ' (includes the ⭐ priority bonus)'} — paid once, now.
          </p>
          <p className="muted">The payout scales with hours actually logged. No takebacks, no partial credit later.</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmDone(false)}>Not yet</button>
            <button
              className="btn btn-gold"
              onClick={e => {
                s.completeQuest(quest.id);
                spawnVFXAt(e, 'xp', payout.xp);
                spawnVFXAt({ clientX: e.clientX + 30, clientY: e.clientY - 16 }, 'gold', payout.gold);
                setConfirmDone(false);
              }}
            >
              🏁 Claim the reward
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LiveTimer({ startedAt }: { startedAt: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="live-timer">
      <span className="session-pulse" />
      {Math.floor(secs / 3600)}:{p(Math.floor((secs % 3600) / 60))}:{p(secs % 60)}
    </div>
  );
}
