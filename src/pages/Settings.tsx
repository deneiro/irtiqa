import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { Modal } from '../components/ui';
import { WheelSurvey } from '../components/WheelSurvey';
import {
  ARCHETYPE_KEYS,
  ARCHETYPES,
  CLASSES,
  CLASS_RADICAL,
  RADICAL_CLASS,
  THEME_BASE_COLORS,
  THEMES,
} from '../game/constants';
import { CUSTOM_THEME_TOKENS, charLevel, isThemeUnlocked, rankFor } from '../game/engine';
import { CURRENCIES, fmtMoney } from '../game/money';
import type { AttributeKey, PersonalityArchetype } from '../game/types';
import { playSound } from '../lib/sound';
import { signOutUser, syncNow, useSync } from '../lib/sync';
import { SAVE_KEY, useGame } from '../store';

export function Settings() {
  const s = useGame();
  const character = s.character!;
  const cls = CLASSES.find(c => c.id === character.classId);
  const level = charLevel(character.xp);
  const rank = rankFor(level);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const raw = localStorage.getItem(SAVE_KEY) ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irtiqa-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const parsed = JSON.parse(text);
        const st = parsed?.state;
        // Shape check, not just syntax — importing a random JSON must not crash-loop the app
        if (
          !st || typeof st !== 'object' ||
          !('character' in st) || !Array.isArray(st.habits) ||
          !Array.isArray(st.journal) || !Array.isArray(st.quests)
        ) {
          throw new Error('bad shape');
        }
        localStorage.setItem(SAVE_KEY, text);
        location.reload();
      } catch {
        alert('That file is not a valid IrtiQa save.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">The meta-menu of your life.</p>
        </div>
      </div>

      <AccountCard />

      <section className="card">
        <div className="card-head"><h2>Character</h2></div>
        <p className="settings-char-line">
          {cls && <Icon name={cls.id} size={16} />} <strong>{character.name}</strong> the {cls?.name} · Level {level} ·{' '}
          <Icon name={rank.icon} size={15} /> {rank.name}
        </p>
        <p className="muted">
          Playing since {new Date(character.createdAt).toLocaleDateString()}.
          Want a new name or class? That's what the <Icon name="identity" size={13} />{' '}
          <Link to="/market">Identity Scroll</Link> is for — identity changes aren't free.
        </p>
      </section>

      <section className="card">
        <div className="card-head"><h2>Theme</h2></div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={s.adminUnlockAll}
            onChange={e => s.setAdminUnlockAll(e.target.checked)}
          />
          <span>
            <Icon name="unlock" size={14} /> <strong>Owner mode</strong> — unlock every theme so you
            can test them all. Turn it off to preview what a normal user sees: locked themes show
            their price.
          </span>
        </label>
        <div className="theme-row">
          {THEMES.map(t => {
            const unlocked = isThemeUnlocked(t, { adminUnlockAll: s.adminUnlockAll, ownedThemes: s.ownedThemes });
            const active = s.theme === t.id;
            return (
              <button
                key={t.id}
                className={`theme-pick theme-preview-${t.id} ${active ? 'theme-active' : ''}`}
                disabled={!unlocked}
                onClick={() => s.setTheme(t.id)}
                title={unlocked ? t.desc : `Locked — $${t.price?.toFixed(2)}`}
              >
                <span className="theme-pick-emoji"><Icon name={t.icon} size={26} /></span>
                <span>{t.name}</span>
                {active
                  ? <span className="status status-done heading-icon"><Icon name="check" size={12} /> active</span>
                  : !unlocked
                    ? <span className="status status-locked heading-icon"><Icon name="lock" size={12} /> ${t.price?.toFixed(2)}</span>
                    : null}
              </button>
            );
          })}
        </div>
        <p className="muted">Free while you're testing. Later, premium styles will cost a small one-time price — no payment is wired up yet. Browse them all in the <Link to="/market">Market</Link>.</p>

        <ThemeColorPicker />
      </section>

      <section className="card">
        <div className="card-head"><h2 className="heading-icon"><Icon name="sound" size={18} /> Sound</h2></div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={s.soundOn}
            onChange={e => {
              s.setSoundOn(e.target.checked);
              if (e.target.checked) playSound('reward'); // instant preview
            }}
          />
          <span>Game sounds — coin chimes, level-up fanfares, damage thuds. Synthesized on the fly, nothing to download.</span>
        </label>
      </section>

      <ProfileCard />

      <WheelCard />

      <ReminderCard />

      <TutorialCard />

      <CurrencyCard />

      <section className="card">
        <div className="card-head"><h2>Save data</h2></div>
        <p className="muted">Cloud sync covers you when signed in. Export is still handy for offline backups or moving a save by hand.</p>
        <div className="btn-pair">
          <button className="btn btn-primary heading-icon" onClick={exportSave}>
            <Icon name="download" size={14} /> Export save
          </button>
          <button className="btn btn-ghost heading-icon" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Import save
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={e => e.target.files?.[0] && importSave(e.target.files[0])}
          />
        </div>
      </section>

      <section className="card card-danger">
        <div className="card-head"><h2>Danger zone</h2></div>
        <p className="muted">Erase the character, all progress, all history — and if you're signed in, the wiped state syncs to the cloud too. This is the permadeath button.</p>
        <button
          className="btn btn-danger heading-icon"
          onClick={() => {
            if (confirm('Erase EVERYTHING? Character, streaks, gold, journal — all of it.') && confirm('Last chance. Really start over from nothing?')) {
              s.resetGame();
            }
          }}
        >
          {/* famBossHunter is the app's only skull glyph — IconName has no standalone `skull`. */}
          <Icon name="famBossHunter" size={15} /> Erase everything
        </button>
      </section>
    </div>
  );
}

/**
 * Which currency real money is written in.
 *
 * This is display only — the app stores plain numbers and never converts. Switching
 * from tenge to dollars re-renders the same 25000 as $25,000.00; it does not mean the
 * player suddenly has dollars. Said plainly on the card so nobody expects a rate.
 */
function CurrencyCard() {
  const currency = useGame(s => s.currency);
  const setCurrency = useGame(s => s.setCurrency);

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="banknote" size={18} /> Currency</h2></div>
      <p className="muted">
        The currency the <Link to="/finances">Finances</Link> page writes real amounts in — balances,
        debts, budgets. Gold is the game's own currency and never changes.
      </p>
      <label className="field" style={{ maxWidth: 320 }}>
        <span>Real money is shown in</span>
        <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.name} · {c.symbol} ({c.code})
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        Amounts already recorded keep their numbers — this changes how they're written, not what
        they're worth. A balance of 25000 reads as <strong>{fmtMoney(25000, currency)}</strong>.
      </p>
    </section>
  );
}

/**
 * Recolour the active theme live. Deliberately limited to accent/secondary/background
 * (CUSTOM_THEME_TOKENS) so text and surface tokens keep their contrast — this restyles
 * a theme's mood, it can't make it unreadable. Overrides persist per theme id, so
 * switching themes and back keeps each one's tweak.
 */
function ThemeColorPicker() {
  const s = useGame();
  const activeTheme = THEMES.find(t => t.id === s.theme)!;
  const overrides = s.themeOverrides[s.theme] ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;
  const base = THEME_BASE_COLORS[s.theme];

  // Overrides win, otherwise the theme's authored default — never the DOM's computed
  // style, which can still reflect the previous theme for a render or two (see the
  // comment on THEME_BASE_COLORS for why).
  const currentValue = (token: string) =>
    overrides[token] || base?.[token as keyof typeof base] || '#000000';

  return (
    <div className="theme-color-picker">
      <div className="card-head" style={{ marginTop: 14 }}>
        <h3 className="heading-icon" style={{ fontSize: 'var(--fs-body)' }}>
          <Icon name="palette" size={16} /> Recolor "{activeTheme.name}"
        </h3>
        {hasOverrides && (
          <button className="btn btn-ghost btn-sm" onClick={() => s.resetThemeColors(s.theme)}>Reset to default</button>
        )}
      </div>
      <p className="muted">Tweak this theme's key colors live. Saved per theme — switch away and back and it's still yours.</p>
      <div className="theme-color-row">
        {CUSTOM_THEME_TOKENS.map(({ token, label }) => (
          <label key={token} className="theme-color-field">
            <input
              type="color"
              value={currentValue(token)}
              onChange={e => s.setThemeColor(s.theme, token, e.target.value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Replay the guided tour. Kept next to the Wheel Check because both are
 *  "run the first-session thing again" — neither destroys anything you earned. */
function TutorialCard() {
  const tutorialStep = useGame(s => s.tutorialStep);
  const replayTutorial = useGame(s => s.replayTutorial);
  const running = tutorialStep !== null && tutorialStep >= 0;

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="learn" size={18} /> Tutorial</h2>
      </div>
      <p className="muted">
        The guided first session — every screen, and every core action done once for real.
        Replaying it changes nothing you have earned; it only walks you through again.
        {tutorialStep === -1 && ' You skipped it last time.'}
      </p>
      <button className="btn btn-primary" disabled={running} onClick={replayTutorial}>
        {running ? 'Tour in progress' : 'Replay the tutorial'}
      </button>
    </section>
  );
}

/**
 * The Wheel of Life audit, retaken. A later check never re-seeds attributes (those are earned by
 * now) — it stores a fresh subjective snapshot so the arc of declared-vs-lived can be seen over time.
 */
function WheelCard() {
  const snapshots = useGame(s => s.wheelSnapshots);
  const recordWheelCheck = useGame(s => s.recordWheelCheck);
  const [open, setOpen] = useState(false);
  const last = snapshots[snapshots.length - 1];

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="wheel" size={18} /> Wheel of Life</h2></div>
      <p className="muted">
        A quick self-audit of your eight life sectors. The first one, at character creation, seeded
        your starting wheel. Retaking it now records a snapshot — it won't touch the levels you've
        earned, it just tracks how your own read of your life shifts over time.
      </p>
      {last
        ? <p className="muted">Last taken {new Date(last.date).toLocaleDateString()} · {snapshots.length} on record.</p>
        : <p className="muted">No audit on record yet — you started with a flat wheel.</p>}
      <button className="btn btn-primary heading-icon" onClick={() => setOpen(true)}>
        <Icon name="wheel" size={14} /> Retake the audit
      </button>

      {open && (
        <Modal title="Wheel Check" onClose={() => setOpen(false)} wide>
          <WheelSurvey
            initial={last?.scores}
            submitLabel="Save this Wheel Check"
            onSubmit={(scores: Record<AttributeKey, number>) => { recordWheelCheck(scores); setOpen(false); }}
          />
        </Modal>
      )}
    </section>
  );
}

function ReminderCard() {
  const s = useGame();
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  const enable = async (on: boolean) => {
    if (!on) return s.setReminder({ enabled: false });
    if (!supported) return;
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (perm === 'granted') s.setReminder({ enabled: true });
  };

  return (
    <section className="card">
      <div className="card-head"><h2 className="heading-icon"><Icon name="bell" size={18} /> Evening reminder</h2></div>
      {!supported ? (
        <p className="muted">This browser doesn't support notifications.</p>
      ) : (
        <>
          <label className="toggle-row">
            <input type="checkbox" checked={s.reminder.enabled} onChange={e => void enable(e.target.checked)} />
            <span>Remind me if habits or the Daily Three are still open</span>
          </label>
          {s.reminder.enabled && (
            <label className="field" style={{ maxWidth: 200 }}>
              <span>Remind at</span>
              <input
                className="input"
                type="time"
                value={s.reminder.time}
                onChange={e => e.target.value && s.setReminder({ time: e.target.value })}
              />
            </label>
          )}
          {permission === 'denied' && (
            <p className="muted">
              <Icon name="warning" size={14} /> Notifications are blocked for this site — allow them
              in your browser's site settings first.
            </p>
          )}
          <p className="muted">
            Honest limitation: the reminder fires while IrtiQa is open in a tab (even a background one).
            True push-while-closed needs the mobile app — it's on the roadmap.
          </p>
        </>
      )}
    </section>
  );
}

function AccountCard() {
  const sync = useSync();
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="subscription" size={18} /> Account &amp; cloud sync</h2>
        {sync.user && (
          <span className={`status heading-icon ${sync.status === 'error' ? 'status-failed' : sync.status === 'synced' ? 'status-done' : ''}`}>
            {sync.status === 'syncing' ? <><Icon name="subscription" size={12} /> syncing…</>
              : sync.status === 'synced' ? <><Icon name="check" size={12} /> synced</>
                : sync.status === 'error' ? <><Icon name="close" size={12} /> sync error</>
                  : sync.status}
          </span>
        )}
      </div>
      {sync.user ? (
        <>
          <p>Signed in as <strong>{sync.user.email}</strong></p>
          <p className="muted">
            {sync.status === 'error'
              ? `Sync error: ${sync.error}`
              : sync.lastSyncedAt
                ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}. Changes upload automatically a few seconds after you make them.`
                : 'Waiting for the first sync…'}
          </p>
          <div className="btn-pair">
            <button className="btn btn-primary heading-icon" onClick={() => void syncNow()}>
              <Icon name="subscription" size={13} /> Sync now
            </button>
            <button className="btn btn-ghost" onClick={() => void signOutUser()}>Sign out</button>
          </div>
          <p className="muted">Signing out keeps the local copy on this device. Sign in on another device to continue your journey there.</p>
        </>
      ) : (
        <>
          <p className="muted">
            Sign in to back your save up to the cloud and play across devices.
            Without an account, everything lives in this browser only — and browsers forget.
          </p>
          <AuthPanel />
        </>
      )}
    </section>
  );
}

/**
 * The radical profile — a readout of the class loadout, not a second question.
 *
 * The classes and the radicals were always the same seven drivers in two vocabularies
 * (see CLASS_RADICAL): onboarding asked for 1–3 classes, and this card asked, on its
 * own, for radicals. A player could answer the two inconsistently and end up with a
 * template library filtered against an identity they never meant to claim — and the
 * card's blank chips read as homework the app had left undone.
 *
 * Picking the loadout now sets the profile, so this card's job changed. It shows what
 * the loadout already decided and names the class each radical came from. It stays
 * editable for the two things the loadout can't express: an order the player disagrees
 * with, and a driver that is genuinely in play but wasn't worth a class slot.
 */
function ProfileCard() {
  const character = useGame(s => s.character!);
  const setProfile = useGame(s => s.setProfile);
  const profile = character.profile ?? [];
  const loadout = character.classes ?? [];
  const fromLoadout = loadout.map(id => CLASS_RADICAL[id]);
  // Same radicals in the same order = untouched. Only then is "reset" a no-op worth hiding.
  const edited =
    fromLoadout.length !== profile.length || fromLoadout.some((r, i) => r !== profile[i]);

  const classFor = (r: PersonalityArchetype) => CLASSES.find(c => c.id === RADICAL_CLASS[r]);

  const toggle = (r: PersonalityArchetype) => {
    setProfile(profile.includes(r) ? profile.filter(x => x !== r) : [...profile, r]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...profile];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setProfile(next);
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="heading-icon"><Icon name="brain" size={18} /> Your radicals</h2>
        <div className="btn-pair">
          {edited && loadout.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setProfile(fromLoadout)}>
              Reset to loadout
            </button>
          )}
          {profile.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setProfile([])}>Clear</button>
          )}
        </div>
      </div>
      <p className="muted">
        Your classes are your radicals — a Bard <em>is</em> the hysteroid driver, a Warden the
        epileptoid one. Choosing your loadout set this, so there's nothing to answer here. The
        order decides which habits and quests the{' '}
        <Link to="/attributes">sector pages</Link> put in front of you: a habit built on sustained
        willpower suits an epileptoid and quietly defeats someone without one. Reorder or correct
        it below if the fit is wrong. Changing the classes themselves is the{' '}
        <Link to="/market">Identity Scroll</Link>'s job.
      </p>

      {profile.length > 0 ? (
        <div className="profile-picker">
          {profile.map((r, i) => {
            const c = classFor(r);
            return (
              <div key={r} className="profile-rank">
                <span className="profile-rank-num">{i + 1}</span>
                {c && <Icon name={c.id} size={15} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: ARCHETYPES[r].color }}>{ARCHETYPES[r].label}</span>
                  <span className="muted">
                    {' · '}the {c?.name}
                    {fromLoadout.includes(r) ? '' : ', added here'}
                  </span>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${ARCHETYPES[r].label} up`}>
                  <Icon name="arrowUp" size={13} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === profile.length - 1} aria-label={`Move ${ARCHETYPES[r].label} down`}>
                  <Icon name="arrowDown" size={13} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">
          Cleared — every sector page shows its full library, unranked. Pick a radical below, or
          put your loadout's back with <em>Reset to loadout</em>.
        </p>
      )}

      <p className="muted" style={{ marginTop: 12 }}>All seven, in case one belongs and isn't here:</p>
      <div className="profile-order">
        {ARCHETYPE_KEYS.map(r => {
          const on = profile.includes(r);
          const c = classFor(r);
          return (
            <button
              key={r}
              className={`chip chip-icon ${on ? 'chip-on' : ''}`}
              onClick={() => toggle(r)}
              style={on ? { borderColor: ARCHETYPES[r].color, color: ARCHETYPES[r].color } : undefined}
              title={`${ARCHETYPES[r].label} — the ${c?.name} class`}
            >
              {c && <Icon name={c.id} size={13} />} {ARCHETYPES[r].label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
