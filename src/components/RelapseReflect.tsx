import { useState } from 'react';
import { useGame } from '../store';
import { Modal } from './ui';

/**
 * The one honest question after a relapse: "what triggered it?"
 * Optional — skipping is always allowed — but every answer becomes data the
 * Insights engine can hold up as a mirror later. Failure as information.
 */
export function RelapseReflect({ failureId, habitName, onClose }: { failureId: string; habitName: string; onClose: () => void }) {
  const setFailureTrigger = useGame(s => s.setFailureTrigger);
  const [text, setText] = useState('');

  return (
    <Modal title={`Relapse logged: ${habitName}`} onClose={onClose}>
      <p className="muted">
        Damage is dealt, streak is gone — that part is done. One optional question, for future-you:
        <strong> what triggered it?</strong>
      </p>
      <textarea
        className="input"
        rows={2}
        autoFocus
        placeholder="e.g. stress after the meeting, boredom at night, drinks with friends…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Skip</button>
        <button
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            setFailureTrigger(failureId, text);
            onClose();
          }}
        >
          Save the lesson
        </button>
      </div>
    </Modal>
  );
}
