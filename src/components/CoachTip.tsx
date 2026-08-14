import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { COACH_TIPS } from '../game/tutorial';
import { useT } from '../i18n';
import { useGame } from '../store';
import { Icon } from './Icon';

const DISMISS_MS = 8000;

/**
 * Layer two: one line, once.
 *
 * The guided tour covers the main loop, but a player who skipped it — or who
 * wanders into Chronicle or Calendar, which the tour never visits — still deserves
 * to know what a page is for. Fires on the first visit to a route and never again,
 * because a tip that reappears is an annoyance rather than an explanation.
 */
export function CoachTip() {
  const t = useT();
  const { pathname } = useLocation();
  const seenPages = useGame(s => s.seenPages);
  const markPageSeen = useGame(s => s.markPageSeen);
  const tutorialStep = useGame(s => s.tutorialStep);
  const [shown, setShown] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const tip = COACH_TIPS[pathname];
    const alreadySeen = seenPages.includes(pathname);
    // Only routes that actually carry a tip are worth remembering. Recording every
    // path would file `/quests/<uuid>` forever — a list that grows without bound and
    // can never match a tip anyway. Recording happens even mid-tour, so the tour's
    // own navigation doesn't leave a trail of tips to ambush the player afterwards.
    if (tip && !alreadySeen) markPageSeen(pathname);
    // Never compete with the tour for attention.
    if (!tip || alreadySeen || (tutorialStep !== null && tutorialStep >= 0)) return;

    setShown(pathname);
    setLeaving(false);
    const out = setTimeout(() => setLeaving(true), DISMISS_MS);
    const gone = setTimeout(() => setShown(null), DISMISS_MS + 260);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
    // seenPages is deliberately not a dependency: marking the page seen updates it
    // immediately, which would re-run this effect and tear the tip down at once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!shown) return null;
  const tip = COACH_TIPS[shown];
  if (!tip) return null;

  return (
    <div className={`coach-tip ${leaving ? 'coach-leaving' : ''}`} role="status">
      <span className="coach-icon"><Icon name={tip.icon} size={16} /></span>
      <p className="coach-text">{tip.text}</p>
      <button className="coach-close" onClick={() => setShown(null)} aria-label={t('coach.dismiss')}>
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}
