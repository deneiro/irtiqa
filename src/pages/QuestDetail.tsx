import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AttrTags, Bar, Empty, Modal } from '../components/ui';
import { QUEST_DURATIONS } from '../game/constants';
import {
  MAX_SESSION_MINUTES,
  fmtDay,
  fmtDayFull,
  fmtMinutes,
  questDeadlineProgress,
  questMinutes,
  questPayout,
  questTargetDate,
  todayStr,
} from '../game/engine';
import { spawnVFXAt } from '../lib/vfx';
import { plural, useT } from '../i18n';
import { useGame } from '../store';

export function QuestDetail() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const s = useGame();
  const quest = s.quests.find(q => q.id === id);

  const [notePrompt, setNotePrompt] = useState(false);
  const [note, setNote] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);
  const [loggingPast, setLoggingPast] = useState(false);

  if (!quest) {
    return (
      <div className="page">
        <Empty>{t('qd.notFound')} <Link to="/quests">{t('qd.backToQuests')}</Link></Empty>
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
          <p><Link to="/quests" className="muted"><Icon name="chevronLeft" size={13} /> {t('nav.quests')}</Link></p>
          <h1>
            {quest.priority && <Icon name="starFilled" size={18} />} {quest.title}{' '}
            {quest.completedAt && <span className="status status-done"><Icon name="flag" size={13} /> {t('qd.completedTag')}</span>}
          </h1>
          {quest.description && <p className="muted">{quest.description}</p>}
          <p className="muted">
            <AttrTags attrs={quest.attrs} linked /> ·{' '}
            {target
              ? `${QUEST_DURATIONS[quest.targetDuration].label} · ${t('qd.target', { date: fmtDay(target) })}`
              : t('questDur.none')}
          </p>
        </div>
        {!quest.completedAt && (
          <div className="btn-pair">
            <button
              className={`btn ${quest.priority ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => s.setQuestPriority(quest.id, !quest.priority)}
              title={t('qd.priorityTitle')}
            >
              <Icon name={quest.priority ? 'starFilled' : 'starOutline'} size={14} />{' '}
              {quest.priority ? t('qd.priority') : t('qd.makePriority')}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => { if (confirm(t('qd.deleteConfirm'))) { s.deleteQuest(quest.id); navigate('/quests'); } }}
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>

      <div className="quest-detail-grid">
        <section className="card session-card">
          <div className="card-head"><h2>{t('qd.workSession')}</h2></div>
          {quest.completedAt ? (
            <p className="muted">{t('qd.finishedNote')}</p>
          ) : isRunning ? (
            <>
              <LiveTimer startedAt={s.activeSession!.startedAt} />
              <button className="btn btn-primary btn-lg" onClick={() => setNotePrompt(true)}>
                <Icon name="stop" size={15} /> {t('qd.finishSession')}
              </button>
            </>
          ) : (
            <>
              <p className="muted">{t('qd.startDesc')}</p>
              <button className="btn btn-primary btn-lg" data-tour="start-session" disabled={otherRunning} onClick={() => s.startSession(quest.id)}>
                <Icon name="play" size={15} /> {t('qd.startSession')}
              </button>
              {/* The payout scales with logged hours, so hours that never met the timer used to
                  be worth zero. This is the way back in: same log, same weight, entered by hand.
                  It stays enabled while another quest's timer runs — recording finished work
                  isn't the same act as starting new work, and blocking it would just lose it. */}
              <button className="btn btn-ghost" onClick={() => setLoggingPast(true)}>
                <Icon name="write" size={14} /> {t('qd.logPast')}
              </button>
              {otherRunning && <p className="muted">{t('qd.otherRunning')}</p>}
            </>
          )}
          <div className="session-totals">
            <div><span className="stat-big">{fmtMinutes(minutes)}</span><span className="muted">{t('qd.lifetime')}</span></div>
            <div><span className="stat-big">{fmtMinutes(todayMinutes)}</span><span className="muted">{t('common.today').toLowerCase()}</span></div>
            <div><span className="stat-big">{quest.sessions.length}</span><span className="muted">{t('qd.sessionsLabel')}</span></div>
          </div>
          {progress !== null && target ? (
            <>
              <Bar value={progress} max={100} className={progress >= 100 ? 'bar-over' : 'bar-xp'} />
              <p className="muted center">{t('qd.progressLine', { pct: progress, date: fmtDay(target), label: QUEST_DURATIONS[quest.targetDuration].label })}</p>
            </>
          ) : (
            <p className="muted center">{t('qd.noDeadline')}</p>
          )}
          {!quest.completedAt && (
            <button className="btn btn-gold btn-lg" disabled={isRunning} onClick={() => setConfirmDone(true)}>
              <Icon name="flag" size={15} /> {t('qd.completeClaim', { xp: payout.xp, gold: payout.gold })} <Icon name="gold" size={14} />
            </button>
          )}
        </section>

        <section className="card" data-tour="session-log">
          <div className="card-head"><h2>{t('qd.workLog')}</h2></div>
          {sessions.length === 0 ? (
            <Empty>
              <div>{t('qd.logEmpty')}</div>
              {/* An empty log is the most likely moment to be sitting on hours that were never
                  clocked, so the way to enter them is offered here rather than only up in the card. */}
              {!quest.completedAt && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setLoggingPast(true)}>
                    <Icon name="write" size={13} /> {t('qd.logAlreadyDid')}
                  </button>
                </div>
              )}
            </Empty>
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
        <Modal title={t('qd.notePrompt')} onClose={() => { /* must answer */ }}>
          <textarea
            className="input"
            rows={3}
            autoFocus
            placeholder={t('qd.notePlaceholder')}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              disabled={!note.trim()}
              onClick={() => { s.finishSession(note); setNote(''); setNotePrompt(false); }}
            >
              {t('qd.logSession')}
            </button>
          </div>
        </Modal>
      )}

      {loggingPast && <ManualSessionForm questId={quest.id} onClose={() => setLoggingPast(false)} />}

      {confirmDone && (
        <Modal title={t('qd.completeTitle')} onClose={() => setConfirmDone(false)}>
          <p>
            {t('qd.youLogged')} <strong>{fmtMinutes(minutes)}</strong>{' '}
            {t('qd.across', { n: quest.sessions.length, word: plural(quest.sessions.length, t('quests.sessionOne'), t('quests.sessionFew'), t('quests.sessionMany')) })}
          </p>
          <p>
            {t('qd.payout')} <strong>+{payout.xp} XP</strong> {t('onb.and')} <strong>+{payout.gold} <Icon name="gold" size={14} /></strong>
            {quest.priority && <> ({t('qd.includesPriority')} <Icon name="starFilled" size={13} />)</>} — {t('qd.paidOnceNow')}
          </p>
          <p className="muted">{t('qd.payoutScales')}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmDone(false)}>{t('qd.notYet')}</button>
            <button
              className="btn btn-gold"
              onClick={e => {
                s.completeQuest(quest.id);
                spawnVFXAt(e, 'xp', payout.xp);
                spawnVFXAt({ clientX: e.clientX + 30, clientY: e.clientY - 16 }, 'gold', payout.gold);
                setConfirmDone(false);
              }}
            >
              <Icon name="flag" size={14} /> {t('qd.claimReward')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * Hand-entered work.
 *
 * Hours are the only thing the quest payout is built from, so an hour that
 * happened away from this tab has to have a way in — otherwise the honest
 * answer to "I did three hours on paper yesterday" is that it never counted.
 * The store applies the same 4h single-sitting cap as the timer and refuses
 * future dates; the form says both out loud rather than silently correcting.
 */
function ManualSessionForm({ questId, onClose }: { questId: string; onClose: () => void }) {
  const t = useT();
  const logManualSession = useGame(s => s.logManualSession);
  const today = todayStr();
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');

  const total = (parseInt(hours, 10) || 0) * 60 + (parseInt(mins, 10) || 0);
  const overCap = total > MAX_SESSION_MINUTES;

  return (
    <Modal title={t('qd.logPast')} onClose={onClose}>
      <p className="muted">{t('qd.manualDesc')}</p>

      <div className="field">
        <span>{t('qd.howLongWorked')}</span>
        <div className="qt-row">
          {/* Placeholder-only would leave these two boxes unnamed the moment a value is
              typed in, so the name lives on aria-label and the placeholder just hints. */}
          <input
            className="input"
            type="number"
            min={0}
            max={4}
            inputMode="numeric"
            aria-label={t('qd.hoursWorked')}
            placeholder={t('qd.hoursPh')}
            value={hours}
            onChange={e => setHours(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="number"
            min={0}
            max={59}
            inputMode="numeric"
            aria-label={t('qd.minutesWorked')}
            placeholder={t('qd.minutesPh')}
            value={mins}
            onChange={e => setMins(e.target.value)}
          />
        </div>
      </div>

      <label className="field">
        <span>{t('qd.whichDay')}</span>
        {/* Capped at today: the log is a record of work done, not a plan. */}
        <input className="input" type="date" value={date} max={today} onChange={e => setDate(e.target.value)} />
      </label>

      <label className="field">
        <span>{t('qd.whatDidYouDo')}</span>
        <textarea
          className="input"
          rows={2}
          placeholder={t('qd.manualNotePh')}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </label>

      {overCap && (
        <p className="muted">{t('qd.overCap', { cap: fmtMinutes(MAX_SESSION_MINUTES) })}</p>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={total < 1 || !date}
          onClick={() => { logManualSession(questId, total, note, date); onClose(); }}
        >
          {t('qd.addToLog')}
        </button>
      </div>
    </Modal>
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
