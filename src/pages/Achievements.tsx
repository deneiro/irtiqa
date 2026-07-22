import { useMemo } from 'react';
import { Icon } from '../components/Icon';
import { ACHIEVEMENTS, TIER_LABEL, TIER_REWARDS } from '../game/constants';
import { useGame } from '../store';

export function Achievements() {
  const unlocked = useGame(s => s.unlocked);
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
          <h1>Achievements</h1>
          <p className="muted">Trophies for the grind. Early ones come fast — the last ones cost you years. Worth it.</p>
        </div>
        <div className="ach-progress"><Icon name="trophy" size={22} /> {got} / {total}</div>
      </div>

      {families.map(([family, achs]) => (
        <section key={family} className="ach-family">
          <h2 className="section-title">{achs[0].familyEmoji} {family}</h2>
          <div className="ach-grid">
            {achs.map(a => {
              const at = unlocked[a.id];
              const r = TIER_REWARDS[a.tier];
              return (
                <div key={a.id} className={`ach-card tier-${a.tier} ${at ? 'ach-unlocked' : 'ach-locked'}`}>
                  <div className="ach-tier">{TIER_LABEL[a.tier]}</div>
                  <div className="ach-emoji">{at ? <Icon name="trophy" size={26} /> : <Icon name="lock" size={26} />}</div>
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc">{a.desc}</div>
                  <div className="ach-reward">+{r.xp} XP · +{r.gold} 🪙</div>
                  {at && <div className="ach-date">{new Date(at).toLocaleDateString()}</div>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
