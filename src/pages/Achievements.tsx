import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ACHIEVEMENTS, TIER_LABEL, TIER_REWARDS } from '../game/constants';
import { useT } from '../i18n';
import { fmtDate } from '../lib/format';
import { useGame } from '../store';

/**
 * Sixty achievements, four tiers deep in fifteen families.
 *
 * Rendering all of them meant a brand-new player's first visit was fifteen rows of
 * identical grey padlocks — a wall of everything they hadn't done, on a page whose
 * whole job is to say "you're getting somewhere". The default view now shows what
 * you've earned plus the one rung you're actually on; the full ladder is one click
 * away for anyone who wants to see where it goes.
 */
export function Achievements() {
  const t = useT();
  const unlocked = useGame(s => s.unlocked);
  const [showAll, setShowAll] = useState(false);
  const total = ACHIEVEMENTS.length;
  const got = Object.keys(unlocked).length;

  const families = useMemo(() => {
    const map = new Map<string, typeof ACHIEVEMENTS>();
    for (const a of ACHIEVEMENTS) {
      if (!map.has(a.family)) map.set(a.family, []);
      map.get(a.family)!.push(a);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('ach.title')}</h1>
          <p className="muted">{t('ach.subtitle')}</p>
        </div>
        <div className="ach-head-right">
          <div className="ach-progress"><Icon name="trophy" size={22} /> {got} / {total}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)}>
            {showAll ? t('ach.showNext') : t('ach.showAll', { n: total })}
          </button>
        </div>
      </div>

      {families.map(([family, achs]) => {
        const earned = achs.filter(a => unlocked[a.id]);
        // The tiers are authored in ascending order, so the first unearned one is
        // the rung in play. A finished family has none, and shows only its trophies.
        const next = achs.find(a => !unlocked[a.id]);
        const shown = showAll ? achs : [...earned, ...(next ? [next] : [])];
        const complete = earned.length === achs.length;

        return (
          <section key={family} className="ach-family">
            <div className="ach-family-head">
              <h2 className="section-title">
                <Icon name={achs[0].familyIcon} size={16} /> {family}
              </h2>
              <span className={`ach-family-count ${complete ? 'ach-family-done' : ''}`}>
                {complete && <Icon name="check" size={12} />} {t('ach.xOfY', { got: earned.length, total: achs.length })}
              </span>
            </div>
            <div className="ach-grid">
              {shown.map(a => {
                const at = unlocked[a.id];
                const r = TIER_REWARDS[a.tier];
                const isNext = !at && a.id === next?.id;
                return (
                  <div
                    key={a.id}
                    className={`ach-card tier-${a.tier} ${at ? 'ach-unlocked' : 'ach-locked'} ${isNext ? 'ach-next' : ''}`}
                  >
                    <div className="ach-tier">{TIER_LABEL[a.tier]}</div>
                    <div className="ach-emoji">
                      <Icon name={at ? 'trophy' : isNext ? 'target' : 'lock'} size={26} />
                    </div>
                    <div className="ach-name">{a.name}</div>
                    <div className="ach-desc">{a.desc}</div>
                    <div className="ach-reward">
                      +{r.xp} XP · +{r.gold} <Icon name="gold" size={12} className="ach-gold" />
                    </div>
                    {at && <div className="ach-date">{fmtDate(at)}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
