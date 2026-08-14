import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TUTORIAL_STEPS, type TutorialSnapshot } from '../game/tutorial';
import { t as tr } from '../i18n';
import { useGame, type GameState } from '../store';
import { Icon } from './Icon';
import { TutorialBubble, type Rect } from './TutorialBubble';

/** The slice of state every advanceOn predicate is evaluated against. */
function snapshot(s: GameState, pathname: string): TutorialSnapshot {
  return {
    habitCount: s.habits.length,
    checkinCount: s.stats.checkins,
    questCount: s.quests.length,
    sessionCount: s.quests.reduce((a, q) => a + q.sessions.length, 0),
    hasActiveSession: !!s.activeSession,
    journalCount: s.journal.length,
    txCount: s.txs.filter(t => !t.transferId).length,
    budgetCount: Object.values(s.budgets).filter(v => v > 0).length,
    contactCount: s.contacts.length,
    accountCount: s.accounts.length,
    firstQuestId: s.quests[0]?.id ?? null,
    pathname,
  };
}

/**
 * The guided tour.
 *
 * Renders a dimmed backdrop with a hole cut over the element being explained, and
 * a narrator bubble anchored to it. Everything under the hole stays fully
 * interactive — the whole design of the tour is that the player performs the real
 * action on the real control, so the spotlight must never intercept the click.
 */
export function TutorialOverlay() {
  const stepIndex = useGame(s => s.tutorialStep);
  const character = useGame(s => s.character);
  const advance = useGame(s => s.advanceTutorial);
  const skip = useGame(s => s.skipTutorial);
  const goToStep = useGame(s => s.goToTutorialStep);
  const finishSession = useGame(s => s.finishSession);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rect, setRect] = useState<Rect | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);
  const [offRoute, setOffRoute] = useState(false);
  const enteredRef = useRef<number | null>(null);
  // Which step we have already auto-navigated for. Distinct from `enteredRef`:
  // "the step ran its side effects" and "we already drove the router for it" are
  // different questions, and conflating them made every routed step think the
  // player had wandered off before it ever got the chance to navigate.
  const navigatedRef = useRef<number | null>(null);

  const active = stepIndex !== null && stepIndex >= 0 && !!character;
  const step = active ? TUTORIAL_STEPS[stepIndex!] : undefined;

  // ---- Skip steps that ask for something the player has already done ----
  useEffect(() => {
    if (!active || !step?.skipIf) return;
    if (step.skipIf(snapshot(useGame.getState(), pathname))) advance();
  }, [active, step, pathname, advance]);

  // ---- Side effects on entering a step (currently: close the tour's own session) ----
  useEffect(() => {
    if (!active || stepIndex === null) return;
    if (enteredRef.current === stepIndex) return;
    enteredRef.current = stepIndex;
    if (step?.onEnter === 'finishTutorialSession' && useGame.getState().activeSession) {
      finishSession(tr('tour.firstSessionNote'));
    }
  }, [active, stepIndex, step, finishSession]);

  // ---- Drive navigation to the step's route ----
  useEffect(() => {
    if (!active || !step) return;
    // A step's page can be static (`route`) or resolved from state (`routeFor`, which
    // the quest chapter uses to open the quest the player just created).
    const target = step.route ?? step.routeFor?.(snapshot(useGame.getState(), pathname)) ?? null;
    if (!target) return;
    if (pathname === target) {
      // Arriving counts as delivered, whether we navigated or the player was
      // already here. Without this, a step that opens on its own page never marks
      // itself delivered — so the player's first click *away* looks like a brand
      // new step and gets navigated straight back, which is what the tour did when
      // the Attributes step asked you to open a sector.
      navigatedRef.current = stepIndex;
      setOffRoute(false);
      return;
    }
    if (navigatedRef.current !== stepIndex) {
      // First time we've seen this step: drive the player to its page.
      navigatedRef.current = stepIndex;
      setOffRoute(false);
      navigate(target);
    } else {
      // We already delivered them here and they left — back button, a stray click.
      // Offer a way back rather than yanking them: re-navigating mid-gesture reads
      // as the app fighting the player.
      setOffRoute(true);
    }
  }, [active, step, pathname, navigate, stepIndex]);

  // A step with no page of its own follows wherever the player is.
  useEffect(() => {
    if (!step?.route && !step?.routeFor) setOffRoute(false);
  }, [step]);

  // ---- Measure the target ----
  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return true;
    }
    const el = document.querySelector(step.target);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    return true;
  }, [step]);

  useEffect(() => {
    if (!active) return;
    let tries = 0;
    let raf = 0;
    const attempt = () => {
      if (measure()) return;
      // The target may not have mounted yet (route transition, modal opening).
      // Retry a few frames before giving up and showing an un-spotlit bubble,
      // which is still usable — better than a tour that stalls on a missing node.
      if (tries++ < 30) raf = requestAnimationFrame(attempt);
      else setRect(null);
    };
    attempt();
    return () => cancelAnimationFrame(raf);
  }, [active, measure, stepIndex, pathname]);

  // Keep the hole glued to the element through scroll, resize and layout shifts.
  useEffect(() => {
    if (!active || !step?.target) return;
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void measure());
    };
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    const iv = setInterval(onChange, 400); // catches modals and async content
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
      clearInterval(iv);
      cancelAnimationFrame(frame);
    };
  }, [active, step, measure]);

  // ---- Watch the store for the step's completion condition ----
  useEffect(() => {
    if (!active || !step?.advanceOn) {
      setCanAdvance(false);
      return;
    }
    let prev = snapshot(useGame.getState(), pathname);
    // advance() writes to the store, which synchronously re-runs every subscriber —
    // including this one, still holding THIS step's predicate because React has not
    // re-rendered yet. Without a latch that re-entry satisfies the same condition
    // again and again and walks the cursor off the end of the tour in one tick.
    let fired = false;
    const check = () => {
      if (fired) return;
      const next = snapshot(useGame.getState(), pathname);
      if (step.advanceOn!(prev, next)) {
        fired = true;
        setCanAdvance(true);
        advance();
        return;
      }
      prev = next;
    };
    // Some conditions read the DOM (a field with text in it, a modal that opened),
    // which the store never notifies about — so poll alongside the subscription.
    const unsub = useGame.subscribe(check);
    const iv = setInterval(check, 300);
    // A condition can already hold the moment the step opens: a replayed tour, or a
    // player who did the thing before being asked. Checking once on entry means such
    // a step is satisfied rather than stuck.
    const initial = setTimeout(check, 0);
    return () => {
      unsub();
      clearInterval(iv);
      clearTimeout(initial);
    };
  }, [active, step, pathname, advance]);

  useEffect(() => {
    setCanAdvance(false);
  }, [stepIndex]);

  if (!active || !step) return null;

  const confirmSkip = () => {
    if (confirm(tr('tour.skipConfirm'))) {
      skip();
    }
  };

  const resumeRoute = step.route ?? step.routeFor?.(snapshot(useGame.getState(), pathname)) ?? null;
  if (offRoute && resumeRoute) {
    return (
      <button className="tutorial-resume" onClick={() => navigate(resumeRoute)}>
        <Icon name="flag" size={14} /> Resume the tour
      </button>
    );
  }

  const indexInChapter = TUTORIAL_STEPS.slice(0, stepIndex!).filter(s => s.chapter === step.chapter).length;

  return (
    <>
      {rect ? (
        <div
          className="tutorial-spotlight"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            borderRadius: step.radius ?? 10,
          }}
        />
      ) : (
        <div className="tutorial-backdrop" />
      )}
      <TutorialBubble
        step={step}
        stepIndex={stepIndex!}
        indexInChapter={indexInChapter}
        classId={character?.classId}
        rect={rect}
        canAdvance={canAdvance}
        onNext={advance}
        onSkip={confirmSkip}
      />
      {stepIndex! > 0 && (
        <button className="tutorial-back" onClick={() => goToStep(stepIndex! - 1)} aria-label={tr('tour.prevStep')}>
          <Icon name="chevronLeft" size={14} /> Back
        </button>
      )}
    </>
  );
}
