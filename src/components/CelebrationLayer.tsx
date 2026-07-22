import { useEffect, useRef } from 'react';
import { playSound, type SoundId } from '../lib/sound';
import { useGame } from '../store';
import type { Celebration, CelebrationType } from '../game/types';

const TOAST_TYPES = ['reward', 'damage', 'info', 'item'];
const TOAST_MS = 4200;
const POPUP_MS = 5000;

// info is deliberately silent — it fires for banners/notices and would get noisy
const SOUND_FOR: Partial<Record<CelebrationType, SoundId>> = {
  reward: 'reward',
  damage: 'damage',
  item: 'item',
  levelup: 'levelup',
  rankup: 'rankup',
  achievement: 'achievement',
};

export function CelebrationLayer() {
  const celebrations = useGame(s => s.celebrations);
  const dismiss = useGame(s => s.dismissCelebration);
  const soundOn = useGame(s => s.soundOn);
  const timers = useRef<Set<string>>(new Set());

  const toasts = celebrations.filter(c => TOAST_TYPES.includes(c.type)).slice(0, 5);
  const popup = celebrations.find(c => !TOAST_TYPES.includes(c.type));

  useEffect(() => {
    for (const t of toasts) {
      if (timers.current.has(t.id)) continue;
      timers.current.add(t.id);
      if (soundOn && SOUND_FOR[t.type]) playSound(SOUND_FOR[t.type]!);
      setTimeout(() => {
        dismiss(t.id);
        timers.current.delete(t.id);
      }, TOAST_MS);
    }
    if (popup && !timers.current.has(popup.id)) {
      timers.current.add(popup.id);
      if (soundOn && SOUND_FOR[popup.type]) playSound(SOUND_FOR[popup.type]!);
      setTimeout(() => {
        dismiss(popup.id);
        timers.current.delete(popup.id);
      }, POPUP_MS);
    }
  }, [toasts, popup, dismiss, soundOn]);

  return (
    <>
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            <div className="toast-title">{t.title}</div>
            {t.subtitle && <div className="toast-sub">{t.subtitle}</div>}
          </div>
        ))}
      </div>
      {popup && <Popup c={popup} onClose={() => dismiss(popup.id)} />}
    </>
  );
}

function Popup({ c, onClose }: { c: Celebration; onClose: () => void }) {
  const emoji = c.type === 'levelup' ? '🎉' : c.type === 'rankup' ? '👑' : '🏆';
  const heading = c.type === 'levelup' ? 'LEVEL UP!' : c.type === 'rankup' ? 'RANK UP!' : 'ACHIEVEMENT UNLOCKED';
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className={`popup-card popup-${c.type} ${c.tier ? `tier-${c.tier}` : ''}`}>
        <div className="popup-burst" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="spark" style={{ ['--i' as string]: i }} />
          ))}
        </div>
        <div className="popup-emoji">{emoji}</div>
        <div className="popup-heading">{heading}</div>
        <div className="popup-title">{c.title}</div>
        {c.subtitle && <div className="popup-sub">{c.subtitle}</div>}
        <button className="btn btn-primary" onClick={onClose}>Glorious</button>
      </div>
    </div>
  );
}
