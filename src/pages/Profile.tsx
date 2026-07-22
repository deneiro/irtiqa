import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttributeProgress } from '../components/AttributeProgress';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { RadarChart } from '../components/RadarChart';
import { Bar, Empty } from '../components/ui';
import { ACHIEVEMENTS, CLASSES, COSMETIC_RARITY_META, COSMETICS, MOODS, TIER_LABEL } from '../game/constants';
import { charLevelProgress, fmtDayFull, fmtMinutes, questPayout, rankFor, todayStr } from '../game/engine';
import { buildInsights } from '../game/insights';
import type { CosmeticSlot, HabitDayStatus } from '../game/types';
import { useGame } from '../store';

const HABIT_ICON: Record<HabitDayStatus, string> = {
  done: '✅', failed: '✗', pardoned: '📜', shielded: '🛡️', ghost: '👻', indulged: '🕯️',
};
const HABIT_LABEL: Record<HabitDayStatus, string> = {
  done: 'completed', failed: 'failed', pardoned: 'pardoned', shielded: 'streak shielded', ghost: 'frozen day', indulged: 'relapse forgiven',
};

interface ActivityEntry {
  id: string;
  day: string; // YYYY-MM-DD
  icon: string;
  title: string;
  subtitle?: string;
}

const DAYS_PER_PAGE = 10;

export function Profile() {
  const s = useGame();
  const character = s.character!;
  const lp = charLevelProgress(character.xp);
  const rank = rankFor(lp.level);
  const cls = CLASSES.find(c => c.id === character.classId);
  const [visibleDays, setVisibleDays] = useState(DAYS_PER_PAGE);

  const totalAch = ACHIEVEMENTS.length;
  const unlockedCount = Object.keys(s.unlocked).length;
  const equippedTitle = COSMETICS.find(c => c.id === s.equippedCosmetics.title);

  const insights = useMemo(
    () => buildInsights({ habits: s.habits, habitLog: s.habitLog, journal: s.journal, txs: s.txs, failures: s.failures }, todayStr()),
    [s.habits, s.habitLog, s.journal, s.txs, s.failures],
  );

  const recentAchievements = useMemo(
    () =>
      Object.entries(s.unlocked)
        .sort((a, b) => b[1].localeCompare(a[1]))
        .slice(0, 6)
        .map(([id, at]) => ({ def: ACHIEVEMENTS.find(a => a.id === id), at }))
        .filter((x): x is { def: (typeof ACHIEVEMENTS)[number]; at: string } => !!x.def),
    [s.unlocked],
  );

  const byDay = useMemo(() => {
    const entries: ActivityEntry[] = [];

    for (const h of s.habits) {
      const log = s.habitLog[h.id] ?? {};
      for (const [day, status] of Object.entries(log)) {
        entries.push({ id: `habit-${h.id}-${day}`, day, icon: HABIT_ICON[status], title: h.name, subtitle: HABIT_LABEL[status] });
      }
    }

    for (const q of s.quests) {
      for (const sess of q.sessions) {
        entries.push({
          id: `qs-${sess.id}`, day: sess.date, icon: '⏱️',
          title: `Worked on: ${q.title}`,
          subtitle: `${fmtMinutes(sess.minutes)}${sess.note ? ` — "${sess.note}"` : ''}`,
        });
      }
      if (q.completedAt) {
        const payout = questPayout(q, s.character?.classId);
        entries.push({
          id: `qc-${q.id}`, day: q.completedAt.slice(0, 10), icon: '🏁',
          title: `Completed quest: ${q.title}`, subtitle: `+${payout.xp} XP · +${payout.gold} 🪙`,
        });
      }
    }

    for (const t of s.quickTasks) {
      if (t.doneAt) entries.push({ id: `qt-${t.id}`, day: t.doneAt.slice(0, 10), icon: '☑️', title: `Quick task: ${t.title}` });
    }

    for (const e of s.journal) {
      entries.push({
        id: `j-${e.id}`, day: e.date, icon: '📖',
        title: 'Wrote a journal entry', subtitle: `${MOODS[e.mood - 1]} mood ${e.mood}/5 · stress ${e.stress}/10`,
      });
    }

    for (const c of s.contacts) {
      entries.push({ id: `c-${c.id}`, day: c.createdAt.slice(0, 10), icon: '🤝', title: `Added contact: ${c.name}` });
    }

    for (const d of s.debts) {
      const name = s.contacts.find(c => c.id === d.contactId)?.name ?? 'someone';
      entries.push({
        id: `d-${d.id}`, day: d.createdAt.slice(0, 10), icon: '💳',
        title: `Logged debt with ${name}`, subtitle: `${d.direction === 'theyOwe' ? 'they owe you' : 'you owe'} ${d.amount}`,
      });
      for (const p of d.payments) {
        entries.push({
          id: `dp-${p.id}`, day: p.date, icon: '💰',
          title: `${d.direction === 'theyOwe' ? 'Collected from' : 'Paid'} ${name}`, subtitle: `${p.amount}`,
        });
      }
    }

    for (const t of s.txs) {
      entries.push({
        id: `tx-${t.id}`, day: t.date,
        icon: t.transferId ? '🔁' : t.type === 'income' ? '🟢' : '🔴',
        title: t.note || t.category,
        subtitle: `${t.type === 'income' ? '+' : '−'}${t.amount.toLocaleString()} · ${t.category}`,
      });
    }

    for (const w of s.wishlist) {
      if (w.purchasedAt) {
        entries.push({
          id: `w-${w.id}`, day: w.purchasedAt.slice(0, 10), icon: '🎁',
          title: `Claimed: ${w.name}`, subtitle: `${w.goldCost} 🪙${w.moneyCost > 0 ? ` + ${w.moneyCost.toLocaleString()}` : ''}`,
        });
      }
    }

    for (const [id, at] of Object.entries(s.unlocked)) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (!def) continue;
      entries.push({ id: `ach-${id}`, day: at.slice(0, 10), icon: '🏆', title: `Achievement: ${def.name}`, subtitle: `${TIER_LABEL[def.tier]} · ${def.desc}` });
    }

    const grouped = new Map<string, ActivityEntry[]>();
    for (const e of entries) {
      if (!grouped.has(e.day)) grouped.set(e.day, []);
      grouped.get(e.day)!.push(e);
    }
    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [s]);

  const shownDays = byDay.slice(0, visibleDays);

  return (
    <div className="page">
      <div className="page-head">
        <div className="profile-head">
          <Avatar classId={character.classId} size={64} frameId={s.equippedCosmetics.frame} />
          <div>
            <h1>
              {character.name}
              {equippedTitle && <span className="char-title"> {equippedTitle.name}</span>}
            </h1>
            <p className="muted">{rank.emoji} {rank.name} · {cls?.name} · Level {lp.level}</p>
            {cls && <p className="muted">★ {cls.perk}</p>}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-head"><h2>Level progress</h2><span className="muted">{lp.into}/{lp.need} XP</span></div>
        <Bar value={lp.into} max={lp.need} className="bar-xp" />
      </section>

      <div className="profile-stats">
        <div className="profile-stat"><span className="stat-big">{s.stats.checkins}</span><span className="muted">habit check-ins</span></div>
        <div className="profile-stat"><span className="stat-big">{s.stats.bestStreak}</span><span className="muted">best streak</span></div>
        <div className="profile-stat"><span className="stat-big">{s.stats.questsCompleted}</span><span className="muted">quests completed</span></div>
        <div className="profile-stat"><span className="stat-big">{fmtMinutes(s.stats.sessionMinutes)}</span><span className="muted">hours worked</span></div>
        <div className="profile-stat"><span className="stat-big">{s.journal.length}</span><span className="muted">journal entries</span></div>
        <div className="profile-stat"><span className="stat-big">{s.contacts.length}</span><span className="muted">contacts</span></div>
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head"><h2>Life balance</h2><span className="muted">8 attributes</span></div>
          <RadarChart />
        </section>
        <section className="card">
          <div className="card-head"><h2>Attribute XP</h2></div>
          <AttributeProgress />
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2 className="heading-icon"><Icon name="trophy" size={18} /> Achievements</h2>
          <Link to="/achievements" className="muted">{unlockedCount} / {totalAch} →</Link>
        </div>
        {recentAchievements.length === 0 ? (
          <Empty>None unlocked yet — they come fast at first.</Empty>
        ) : (
          <div className="ach-grid">
            {recentAchievements.map(({ def, at }) => (
              <div key={def.id} className={`ach-card tier-${def.tier} ach-unlocked`}>
                <div className="ach-tier">{TIER_LABEL[def.tier]}</div>
                <div className="ach-emoji"><Icon name="trophy" size={26} /></div>
                <div className="ach-name">{def.name}</div>
                <div className="ach-date">{new Date(at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>🔍 Insights</h2>
          <span className="muted">your own data, held up as a mirror</span>
        </div>
        {insights.length === 0 ? (
          <Empty>
            Not enough history yet. Insights are computed from real patterns — mood vs habits, stress vs spending,
            your strongest weekday — and they only speak when the data does. Give it a week or two of honest play.
          </Empty>
        ) : (
          <ul className="insight-list">
            {insights.map(i => (
              <li key={i.id} className="insight-row">
                <span className="insight-icon">{i.icon}</span>
                <span>{i.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>👘 Wardrobe</h2>
          <span className="muted">{s.ownedCosmetics.length} / {COSMETICS.length} collected — drops from daily chests</span>
        </div>
        {(['frame', 'title', 'banner'] as CosmeticSlot[]).map(slot => (
          <div key={slot} className="wardrobe-slot">
            <h3 className="wardrobe-slot-title">
              {slot === 'frame' ? 'Avatar frames' : slot === 'title' ? 'Titles' : 'Dashboard banners'}
            </h3>
            <div className="wardrobe-grid">
              {COSMETICS.filter(c => c.slot === slot).map(c => {
                const owned = s.ownedCosmetics.includes(c.id);
                const equipped = s.equippedCosmetics[slot] === c.id;
                return (
                  <div key={c.id} className={`wardrobe-card rarity-${c.rarity} ${owned ? '' : 'wardrobe-locked'}`}>
                    <div className="wardrobe-preview">
                      {slot === 'frame' ? (
                        <Avatar classId={character.classId} size={40} frameId={owned ? c.id : null} />
                      ) : slot === 'banner' ? (
                        <span className={`banner-swatch banner-${c.id}`} />
                      ) : (
                        <span className="title-preview">{owned ? c.name : '???'}</span>
                      )}
                    </div>
                    <div className="wardrobe-name">{owned ? c.name : '???'}</div>
                    <div className="wardrobe-rarity" style={{ color: COSMETIC_RARITY_META[c.rarity].color }}>
                      {COSMETIC_RARITY_META[c.rarity].label}
                    </div>
                    {owned ? (
                      equipped ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => s.equipCosmetic(slot, null)}>Unequip</button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => s.equipCosmetic(slot, c.id)}>Equip</button>
                      )
                    ) : (
                      <span className="muted wardrobe-hint">🎁 chest drop</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head"><h2 className="heading-icon"><Icon name="journal" size={18} /> Activity journal</h2><span className="muted">everything, in order</span></div>
        {shownDays.length === 0 ? (
          <Empty>Nothing logged yet. Every check-in, session, and entry will show up here.</Empty>
        ) : (
          <>
            <div className="activity-log">
              {shownDays.map(([day, entries]) => (
                <div key={day} className="activity-day">
                  <div className="activity-day-head">{fmtDayFull(day)}</div>
                  <ul className="list list-tight">
                    {entries.map(e => (
                      <li key={e.id} className="list-row">
                        <span>{e.icon}</span>
                        <span className="list-title">{e.title}</span>
                        {e.subtitle && <span className="muted">{e.subtitle}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {visibleDays < byDay.length && (
              <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setVisibleDays(v => v + DAYS_PER_PAGE)}>
                Show more days
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
