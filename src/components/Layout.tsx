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

type NavLeaf = { to: string; icon: IconName; label: string };
type NavGroup = { id: string; icon: IconName; label: string; children: NavLeaf[] };

/**
 * The four routes worth a permanent slot — sidebar top and mobile thumb row alike.
 * These are the surfaces you touch daily; everything else is reference material
 * you go looking for, which is what the groups below are for.
 */
const PRIMARY: NavLeaf[] = [
  { to: '/', icon: 'dashboard', label: 'Today' },
  { to: '/habits', icon: 'habits', label: 'Habits' },
  { to: '/quests', icon: 'quests', label: 'Quests' },
  { to: '/journal', icon: 'journal', label: 'Journal' },
];

/**
 * The remaining eight routes, folded into three named shelves. Thirteen flat rows
 * asked you to re-read the whole list every time; seven rows can be scanned at a
 * glance and the group label tells you which shelf to open. Nothing is removed —
 * every route below is still one click from collapsed.
 */
const GROUPS: NavGroup[] = [
  {
    id: 'life',
    icon: 'life',
    label: 'Life',
    children: [
      { to: '/attributes', icon: 'wheel', label: 'The Wheel' },
      { to: '/chronicle', icon: 'chronicle', label: 'Chronicle' },
      { to: '/achievements', icon: 'achievements', label: 'Achievements' },
    ],
  },
  {
    id: 'people',
    icon: 'people',
    label: 'People & Money',
    children: [
      { to: '/social', icon: 'social', label: 'Social' },
      { to: '/finances', icon: 'finances', label: 'Finances' },
    ],
  },
  {
    id: 'more',
    icon: 'more',
    label: 'More',
    children: [
      { to: '/calendar', icon: 'calendar', label: 'Calendar' },
      { to: '/market', icon: 'market', label: 'Market' },
      { to: '/settings', icon: 'settings', label: 'Settings' },
    ],
  },
];

/** Every route that lives inside a group — used to light up the mobile "More" tab. */
const GROUPED_PATHS = GROUPS.flatMap(g => g.children.map(c => c.to));

/** A route counts as "inside" its own detail pages too: /attributes/health is still The Wheel. */
function isUnder(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

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
  // The tinted bar already says "low" at a glance, so the explanation rides along as a
  // tooltip on the whole cluster rather than as a second glyph repeating the same signal.
  const hpNote =
    character.hp === 0
      ? 'Running on empty — nothing is locked and everything still pays full'
      : character.hp <= 25
        ? 'Low reserves — a few things slipped recently'
        : undefined;

  return (
    <div className="layout">
      {/* Purely decorative; only visible when the Neon theme is active (see styles.css) */}
      <div className="neon-scanline" aria-hidden="true" />
      <aside className="sidebar">
        <div className="logo"><img src="/logo-sigil.png" alt="" className="logo-mark" width={26} height={26} /> IrtiQa</div>
        <Link to="/profile" className="side-char" title="Open profile">
          {/* The sigil, not a flat class icon — the sidebar is the one place it's
              seen every session, so it's where its growth is most likely noticed. */}
          <span className="side-sigil"><Sigil size={42} /></span>
          <div className="side-char-text">
            <div className="side-char-name">
              {character.name}
              {title && <span className="char-title"> {title.name}</span>}
            </div>
            <div className="side-char-meta"><Icon name={rank.icon} size={13} /> {rank.name} · {cls?.name}</div>
          </div>
        </Link>
        <nav className="side-nav">
          {PRIMARY.map(leaf => (
            <NavLeafLink key={leaf.to} leaf={leaf} />
          ))}
          {GROUPS.map(group => (
            <NavGroupSection key={group.id} group={group} />
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
              <Icon name="flame" size={14} /> {momentum.streak}
            </span>
          )}
          <div className="stat stat-hp" title={hpNote}>
            <span className="stat-label"><Icon name="health" size={14} /> HP</span>
            <Bar value={character.hp} max={100} className={`bar-hp ${hpTone}`} label={`${character.hp}/100 HP`} />
            <span className="stat-num">{character.hp}/100</span>
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
 * One leaf row. Shared by the sidebar and the mobile sheet so they can never drift apart.
 *
 * Only "/" gets `end`: every other leaf wants its detail pages (/quests/:id,
 * /attributes/:key) to keep the parent row lit rather than blanking the nav.
 */
function NavLeafLink({ leaf }: { leaf: NavLeaf }) {
  return (
    <NavLink
      to={leaf.to}
      end={leaf.to === '/'}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="nav-emoji"><Icon name={leaf.icon} size={17} /></span> {leaf.label}
    </NavLink>
  );
}

/**
 * A collapsible shelf. Opens by itself when you're standing inside it, and never
 * closes on its own afterwards — a group that snapped shut on navigation would
 * punish exactly the person who is working through its contents.
 *
 * Open state is deliberately not persisted: it's cheap to reopen, and a remembered
 * half-open sidebar from three sessions ago is noise rather than help.
 */
function NavGroupSection({ group }: { group: NavGroup }) {
  const { pathname } = useLocation();
  const holdsCurrent = group.children.some(c => isUnder(pathname, c.to));
  const [open, setOpen] = useState(holdsCurrent);

  useEffect(() => {
    if (holdsCurrent) setOpen(true);
  }, [holdsCurrent]);

  const panelId = `nav-group-${group.id}`;
  return (
    <div className={`nav-group ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`nav-group-head ${holdsCurrent ? 'holds-current' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="nav-emoji"><Icon name={group.icon} size={17} /></span>
        <span className="nav-group-label">{group.label}</span>
        <Icon name="chevronDown" size={15} className="nav-group-chevron" />
      </button>
      {open && (
        <div className="nav-group-items" id={panelId}>
          {group.children.map(leaf => (
            <NavLeafLink key={leaf.to} leaf={leaf} />
          ))}
        </div>
      )}
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

  const moreActive =
    GROUPED_PATHS.some(to => isUnder(location.pathname, to)) || isUnder(location.pathname, '/profile');

  return (
    <>
      {moreOpen && (
        <>
          <div className="tabbar-sheet-overlay" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="tabbar-sheet" role="dialog" aria-label="More navigation">
            <div className="tabbar-sheet-grab" aria-hidden="true" />
            <nav>
              {/* Profile has no group of its own: on desktop it hangs off the character
                  card, which the sidebar hides here, so the sheet carries it instead. */}
              <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-emoji"><Icon name={classId ?? 'magician'} size={17} /></span> Profile
              </NavLink>
              {GROUPS.map(group => (
                <NavGroupSection key={group.id} group={group} />
              ))}
            </nav>
          </div>
        </>
      )}
      <nav className="tabbar" aria-label="Main">
        {PRIMARY.map(leaf => (
          <NavLink key={leaf.to} to={leaf.to} end={leaf.to === '/'} className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
            <span className="tabbar-icon"><Icon name={leaf.icon} size={21} /></span>
            {leaf.label}
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
