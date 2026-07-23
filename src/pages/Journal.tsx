import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Modal } from '../components/ui';
import { MOODS, REFLECTION_QUESTIONS } from '../game/constants';
import { fmtDayFull, journalEditable, journalXp, questionsForDay, todayStr } from '../game/engine';
import type { JournalEntry } from '../game/types';
import { useGame } from '../store';

export function Journal() {
  const s = useGame();
  const today = todayStr();
  const todayEntry = s.journal.find(e => e.date === today);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const feathers = s.inventory.feather ?? 0;

  const archive = useMemo(() => {
    const sorted = [...s.journal].sort((a, b) => b.date.localeCompare(a.date));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(e => e.answers.some(x => x.a.toLowerCase().includes(q) || x.q.toLowerCase().includes(q)) || e.date.includes(q));
  }, [s.journal, search]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Journal</h1>
          <p className="muted">Daily reflection. Entries seal after 72 hours — the past is not for retouching.</p>
        </div>
      </div>

      {!todayEntry ? (
        <section className="card">
          <div className="card-head"><h2>Today's entry</h2><span className="muted">+{journalXp(s.character?.classes)} XP → 🔮 Spirituality &amp; 📚 Development</span></div>
          <EntryForm
            initial={null}
            onSave={(mood, stress, answers) => s.addJournalEntry(mood, stress, answers)}
          />
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>Today's entry ✓</h2>
            {journalEditable(todayEntry) && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(todayEntry)}>✎ Edit</button>}
          </div>
          <EntryView entry={todayEntry} />
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Archive ({s.journal.length})</h2>
          <input className="input input-sm" placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {archive.length === 0 ? (
          <Empty>No entries {search ? 'match your search' : 'yet — tonight is a good night to start'}.</Empty>
        ) : (
          <div className="journal-archive">
            {archive.filter(e => e.date !== today).map(e => {
              const editable = journalEditable(e);
              return (
                <details key={e.id} className="journal-item">
                  <summary>
                    <span className="mood">{MOODS[e.mood - 1]}</span>
                    <span className="list-title">{fmtDayFull(e.date)}</span>
                    <span className="muted">stress {e.stress}/10</span>
                    {editable ? (
                      e.unlocked
                        ? <span className="status status-live">🪶 unlocked</span>
                        : <span className="status">✎ editable</span>
                    ) : (
                      <span className="status status-locked">🔒 sealed</span>
                    )}
                  </summary>
                  <EntryView entry={e} />
                  <div className="journal-item-actions">
                    {editable && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e)}>✎ Edit</button>}
                    {!editable && feathers > 0 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => s.useItem('feather', { entryId: e.id })}>
                        🪶 Unseal with Feather of Time ({feathers} owned)
                      </button>
                    )}
                    {!editable && feathers === 0 && (
                      <span className="muted">Sealed. A <Link to="/market">Feather of Time</Link> can unseal it — for a price.</span>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <Modal title={`Edit entry — ${fmtDayFull(editing.date)}`} onClose={() => setEditing(null)} wide>
          <EntryForm
            initial={editing}
            onSave={(mood, stress, answers) => { s.updateJournalEntry(editing.id, mood, stress, answers); setEditing(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function EntryView({ entry }: { entry: JournalEntry }) {
  return (
    <div className="entry-view">
      <p><span className="mood">{MOODS[entry.mood - 1]}</span> mood {entry.mood}/5 · stress {entry.stress}/10</p>
      {entry.answers.map((a, i) => (
        <div key={i} className="entry-qa">
          <div className="entry-q">{a.q}</div>
          <div className="entry-a">{a.a || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function EntryForm({
  initial,
  onSave,
}: {
  initial: JournalEntry | null;
  onSave: (mood: number, stress: number, answers: { q: string; a: string }[]) => void;
}) {
  const classes = useGame(x => x.character?.classes);
  const questions = initial ? initial.answers.map(a => a.q) : questionsForDay(todayStr(), REFLECTION_QUESTIONS);
  const [mood, setMood] = useState(initial?.mood ?? 3);
  const [stress, setStress] = useState(initial?.stress ?? 5);
  const [answers, setAnswers] = useState<string[]>(initial ? initial.answers.map(a => a.a) : questions.map(() => ''));

  const valid = answers.some(a => a.trim().length > 0);

  return (
    <div className="entry-form">
      <div className="field">
        <span>Mood</span>
        <div className="mood-row">
          {MOODS.map((m, i) => (
            <button key={i} type="button" className={`mood-btn ${mood === i + 1 ? 'mood-on' : ''}`} onClick={() => setMood(i + 1)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Stress level: {stress}/10</span>
        <input type="range" min={1} max={10} value={stress} onChange={e => setStress(Number(e.target.value))} />
      </label>
      {questions.map((q, i) => (
        <label className="field" key={i}>
          <span>{q}</span>
          <textarea
            className="input"
            rows={2}
            value={answers[i]}
            onChange={e => setAnswers(v => v.map((x, j) => (j === i ? e.target.value : x)))}
          />
        </label>
      ))}
      <div className="modal-actions">
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => onSave(mood, stress, questions.map((q, i) => ({ q, a: answers[i].trim() })))}
        >
          {initial ? 'Save changes' : `Save entry (+${journalXp(classes)} XP)`}
        </button>
      </div>
    </div>
  );
}
