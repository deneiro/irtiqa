import { useLayoutEffect, useRef, useState } from 'react';
import { CHAPTER_STEPS, openerFor, type TutorialStepDef } from '../game/tutorial';
import type { ClassId } from '../game/types';
import { Icon } from './Icon';
import { Sigil } from './Sigil';

const MOBILE_MAX = 768;

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * The narrator's speech bubble.
 *
 * Positioned against the spotlight rather than fixed, so the bubble reads as
 * pointing at the thing being explained. On phones it always docks to the bottom
 * — there is no room to place a 320px card beside anything, and a bubble that
 * covers the element it is describing is worse than one that is simply below.
 */
export function TutorialBubble({
  step,
  stepIndex,
  indexInChapter,
  classId,
  rect,
  canAdvance,
  onNext,
  onSkip,
}: {
  step: TutorialStepDef;
  stepIndex: number;
  indexInChapter: number;
  classId: ClassId | undefined;
  rect: Rect | null;
  canAdvance: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; tail: 'up' | 'down' | 'none' }>({
    top: 0,
    left: 0,
    tail: 'none',
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { width: bw, height: bh } = el.getBoundingClientRect();

    // Phones: dock to the bottom, full width. The spotlight still cuts out in place.
    if (vw <= MOBILE_MAX) {
      setPos({ top: vh - bh - 12, left: 8, tail: 'none' });
      return;
    }
    // Chapter intros and the finale have no target — centre them.
    if (!rect) {
      setPos({ top: Math.max(16, vh / 2 - bh / 2), left: vw / 2 - bw / 2, tail: 'none' });
      return;
    }

    const GAP = 18;
    let tail: 'up' | 'down' = 'up';
    let top = rect.top + rect.height + GAP;
    // Not enough room below → flip above, so the bubble never runs off the fold.
    if (top + bh > vh - 16) {
      top = rect.top - bh - GAP;
      tail = 'down';
    }
    let left = rect.left + rect.width / 2 - bw / 2;
    // Hug the spotlight's near edge when it sits far to one side, so the bubble
    // stays visually attached instead of drifting to the middle of the screen.
    if (rect.left > vw * 0.6) left = rect.left + rect.width - bw;
    else if (rect.left + rect.width < vw * 0.4) left = rect.left;

    setPos({
      top: Math.max(8, Math.min(top, vh - bh - 8)),
      left: Math.max(8, Math.min(left, vw - bw - 8)),
      tail,
    });
  }, [rect, stepIndex]);

  const total = CHAPTER_STEPS[step.chapter] ?? 1;
  const opener = step.opener ?? openerFor(classId, stepIndex);

  return (
    <div
      ref={ref}
      className={`tutorial-bubble tail-${pos.tail}`}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-live="polite"
      aria-label={`Tutorial: ${step.title}`}
    >
      <button className="tutorial-skip" onClick={onSkip}>Skip tour</button>

      <div className="tutorial-head">
        <span className="tutorial-sigil"><Sigil size={26} /></span>
        <span className="tutorial-chapter">{step.chapterTitle}</span>
      </div>

      <div className="tutorial-title">{step.title}</div>
      <p className="tutorial-opener">{opener}</p>
      <p className="tutorial-body">{step.body}</p>

      {step.action && (
        <p className={`tutorial-action ${canAdvance ? 'tutorial-action-done' : ''}`}>
          {canAdvance ? <Icon name="check" size={13} /> : <Icon name="arrowDown" size={13} />} {step.action}
        </p>
      )}

      <div className="tutorial-foot">
        <span className="tutorial-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`tutorial-dot ${i <= indexInChapter ? 'on' : ''}`} />
          ))}
        </span>
        {step.cta ? (
          <button className="btn btn-primary btn-sm" onClick={onNext}>{step.cta} →</button>
        ) : (
          // An active step advances on the real action. The button is a deliberate
          // escape hatch, not the intended path — a player who cannot complete a
          // step must never be trapped in the tour.
          <button className="btn btn-ghost btn-sm" onClick={onNext}>Skip this step</button>
        )}
      </div>
    </div>
  );
}
