import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CLASSES, COSMETICS } from '../game/constants';
import { charLevelProgress, fmtMinutes, momentumMult, rankFor } from '../game/engine';
import { useGame } from '../store';
import { CelebrationLayer } from './CelebrationLayer';
import { Icon, type IconName } from './Icon';
import { Sigil } from './Sigil';
import { Bar } from './ui';
import { VFXLayer } from './VFXLayer';

const NAV: [string, IconName, string][] = [
  ['/', 'dashboard', 'Dashboard'],
  ['/habits', 'habits', 'Habits'],
  ['/quests', 'quests', 'Quests'],
  ['/journal', 'journal', 'Journal'],
  ['/chronicle', 'chronicle', 'Chronicle'],
  ['/attributes', 'wheel', 'The Wheel'],
  ['/calendar', 'calendar', 'Calendar'],
  ['/social', 'social', 'Social'],
  ['/finances', 'finances', 'Finances'],
  ['/market', 'market', 'Market'],
  ['/achievements', 'achievements', 'Achievements'],
  ['/settings', 'settings', 'Settings'],
];

/** The four routes worth a permanent thumb slot; everything else lives behind "More". */
const TAB_PRIMARY: [string, IconName, string][] = [
  ['/', 'dashboard', 'Today'],
  ['/habits', 'habits', 'Habits'],
  ['/quests', 'quests', 'Quests'],
  ['/journal', 'journal', 'Journal'],
];
const TAB_PRIMARY_PATHS = new Set(TAB_PRIMARY.map(([to]) => to));
const TAB_MORE = NAV.filter(([to]) => !TAB_PRIMARY_PATHS.has(to));

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
  // Color the HP bar by what's left, so a full bar doesn't read as an alarm
  const hpTone = character.hp <= 25 ? 'hp-crit' : character.hp <= 55 ? 'hp-warn' : '';

  return (
    <div className="layout">
      {/* Purely decorative; only visible when the Neon theme is active (see styles.css) */}
      <div className="neon-scanline" aria-hidden="true" />
      <aside className="sidebar">
        <div className="logo">⚔️ IrtiQa</div>
        <Link to="/profile" className="side-char" title="Open profile">
          {/* The sigil, not a flat class icon — the sidebar is the one place it's
              seen every session, so it's where its growth is most likely noticed. */}
          <span className="side-sigil"><Sigil size={42} /></span>
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
            <Bar value={character.hp} max={100} className={`bar-hp ${hpTone}`} label={`${character.hp}/100 HP`} />
            <span className="stat-num">{character.hp}/100</span>
            {character.hp === 0 ? (
              <span title="Running on empty — nothing is locked and everything still pays full">🌑</span>
            ) : character.hp <= 25 ? (
              <span title="Low reserves — a few things slipped recently">🌘</span>
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
      <TabBar />
      <SessionWidget />
      <CelebrationLayer />
      <VFXLayer />
    </div>
  );
}

/**
 * Mobile navigation. Fixed to the bottom so it's always under a thumb and never
 * scrolls away — the old layout turned the sidebar into a horizontal strip that
 * scrolled off with the page. Hidden on desktop by CSS; the sidebar takes over there.
 */
function TabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const classId = useGame(s => s.character?.classId);

  // Any route change closes the sheet, including taps on its own items
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Escape closes the sheet, matching every other dismissible surface in the app
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const moreActive = TAB_MORE.some(([to]) => location.pathname === to) || location.pathname === '/profile';

  return (
    <>
      {moreOpen && (
        <>
          <div className="tabbar-sheet-overlay" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="tabbar-sheet" role="dialog" aria-label="More navigation">
            <div className="tabbar-sheet-grab" aria-hidden="true" />
            <nav>
              {TAB_MORE.map(([to, iconName, label]) => (
                <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-emoji"><Icon name={iconName} size={17} /></span> {label}
                </NavLink>
              ))}
              <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-emoji"><Icon name={classId ?? 'magician'} size={17} /></span> Profile
              </NavLink>
            </nav>
          </div>
        </>
      )}
      <nav className="tabbar" aria-label="Main">
        {TAB_PRIMARY.map(([to, iconName, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
            <span className="tabbar-icon"><Icon name={iconName} size={21} /></span>
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          className={`tabbar-item ${moreActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
          aria-expanded={moreOpen}
          aria-label="More navigation"
        >
          <span className="tabbar-icon"><Icon name="grip" size={21} /></span>
          More
        </button>
      </nav>
    </>
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
