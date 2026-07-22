import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { CLASSES, COSMETICS } from '../game/constants';
import { charLevelProgress, fmtMinutes, momentumMult, rankFor } from '../game/engine';
import { useGame } from '../store';
import { Avatar } from './Avatar';
import { CelebrationLayer } from './CelebrationLayer';
import { Icon, type IconName } from './Icon';
import { Bar } from './ui';
import { VFXLayer } from './VFXLayer';

const NAV: [string, IconName, string][] = [
  ['/', 'dashboard', 'Dashboard'],
  ['/habits', 'habits', 'Habits'],
  ['/quests', 'quests', 'Quests'],
  ['/journal', 'journal', 'Journal'],
  ['/calendar', 'calendar', 'Calendar'],
  ['/social', 'social', 'Social'],
  ['/finances', 'finances', 'Finances'],
  ['/market', 'market', 'Market'],
  ['/achievements', 'achievements', 'Achievements'],
  ['/settings', 'settings', 'Settings'],
];

export function Layout() {
  const character = useGame(s => s.character);
  const momentum = useGame(s => s.momentum);
  const equipped = useGame(s => s.equippedCosmetics);
  if (!character) return null;

  const lp = charLevelProgress(character.xp);
  const rank = rankFor(lp.level);
  const cls = CLASSES.find(c => c.id === character.classId);
  const title = COSMETICS.find(c => c.id === equipped.title);
  const momentumPct = Math.round((momentumMult(momentum.streak) - 1) * 100);

  return (
    <div className="layout">
      {/* Purely decorative; only visible when the Neon theme is active (see styles.css) */}
      <div className="neon-scanline" aria-hidden="true" />
      <aside className="sidebar">
        <div className="logo">⚔️ IrtiQa</div>
        <Link to="/profile" className="side-char" title="Open profile">
          <Avatar classId={character.classId} size={38} frameId={equipped.frame} />
          <div className="side-char-text">
            <div className="side-char-name">
              {character.name}
              {title && <span className="char-title"> {title.name}</span>}
            </div>
            <div className="side-char-meta">{rank.emoji} {rank.name} · {cls?.name}</div>
          </div>
        </Link>
        <nav>
          {NAV.map(([to, iconName, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-emoji"><Icon name={iconName} size={17} /></span> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <div className="stat stat-level">
            <span className="stat-label">Lv {lp.level}</span>
            <Bar value={lp.into} max={lp.need} className="bar-xp" label={`${lp.into}/${lp.need} XP to level ${lp.level + 1}`} />
            <span className="stat-num">{lp.into}/{lp.need}</span>
          </div>
          {momentum.streak > 0 && (
            <span className="stat momentum-flame" title={`Perfect-day momentum: ${momentum.streak} day${momentum.streak > 1 ? 's' : ''} → +${momentumPct}% XP on everything`}>
              🔥 {momentum.streak}
            </span>
          )}
          <div className="stat stat-hp">
            <span className="stat-label"><Icon name="health" size={14} /> HP</span>
            <Bar value={character.hp} max={100} className="bar-hp" label={`${character.hp}/100 HP`} />
            <span className="stat-num">{character.hp}/100</span>
            {character.hp === 0 ? (
              <span title="Exhausted: XP gains halved, priority quests locked">💀</span>
            ) : character.hp <= 25 ? (
              <span title="Weakened: XP gains reduced by 25%">⚠️</span>
            ) : null}
          </div>
          <div className="stat stat-gold" title="Gold">
            <Icon name="gold" size={20} className="gold-coin" /> {character.gold}
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <SessionWidget />
      <CelebrationLayer />
      <VFXLayer />
    </div>
  );
}

function SessionWidget() {
  const activeSession = useGame(s => s.activeSession);
  const quests = useGame(s => s.quests);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!activeSession) return;
    const iv = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [activeSession]);

  if (!activeSession) return null;
  const quest = quests.find(q => q.id === activeSession.questId);
  if (!quest) return null;
  const secs = Math.floor((Date.now() - activeSession.startedAt) / 1000);
  const hh = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const ss = secs % 60;
  const p = (n: number) => String(n).padStart(2, '0');

  return (
    <Link to={`/quests/${quest.id}`} className="session-widget" title="Session running — click to open quest">
      <span className="session-pulse" />
      <span className="session-time">{hh > 0 ? `${hh}:` : ''}{p(mm)}:{p(ss)}</span>
      <span className="session-quest">{quest.title}</span>
    </Link>
  );
}

export function timeWidgetFmt(minutes: number) {
  return fmtMinutes(minutes);
}
