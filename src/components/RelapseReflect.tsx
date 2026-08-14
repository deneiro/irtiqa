import { useState } from 'react';
import { useT } from '../i18n';
import { useGame } from '../store';
import { Modal } from './ui';

/**
 * The one honest question after a relapse: "what triggered it?"
 * Optional — skipping is always allowed — but every answer becomes data the
 * Insights engine can hold up as a mirror later. Failure as information.
 */
export function RelapseReflect({ failureId, habitName, onClose }: { failureId: string; habitName: string; onClose: () => void }) {
  const t = useT();
  const setFailureTrigger = useGame(s => s.setFailureTrigger);
  const [text, setText] = useState('');

  return (
    <Modal title={t('relapse.title', { habit: habitName })} onClose={onClose}>
      <p className="muted">
        {t('relapse.intro')}
        <strong> {t('relapse.question')}</strong>
      </p>
      <textarea
        className="input"
        rows={2}
        autoFocus
        placeholder={t('relapse.placeholder')}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('relapse.skip')}</button>
        <button
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            setFailureTrigger(failureId, text);
            onClose();
          }}
        >
          {t('relapse.save')}
        </button>
      </div>
    </Modal>
  );
}
