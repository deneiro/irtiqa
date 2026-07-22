import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthPanel } from '../components/AuthPanel';
import { Icon } from '../components/Icon';
import { CLASSES, THEMES } from '../game/constants';
import { charLevel, rankFor } from '../game/engine';
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
          {cls && <Icon name={cls.id} size={16} />} <strong>{character.name}</strong> the {cls?.name} · Level {level} · {rank.emoji} {rank.name}
        </p>
        <p className="muted">
          Playing since {new Date(character.createdAt).toLocaleDateString()}.
          Want a new name or class? That's what the 🎴 <Link to="/market">Identity Scroll</Link> is for — identity changes aren't free.
        </p>
      </section>

      <section className="card">
        <div className="card-head"><h2>Theme</h2></div>
        <div className="theme-row">
          {THEMES.map(t => {
            const owned = s.ownedThemes.includes(t.id);
            const active = s.theme === t.id;
            return (
              <button
                key={t.id}
                className={`theme-pick theme-preview-${t.id} ${active ? 'theme-active' : ''}`}
                disabled={!owned}
                onClick={() => s.setTheme(t.id)}
                title={owned ? t.desc : 'Locked — buy it in the Market'}
              >
                <span className="theme-pick-emoji">{t.emoji}</span>
                <span>{t.name}</span>
                {active ? <span className="status status-done">✓ active</span> : !owned ? <span className="status status-locked">🔒 Market</span> : null}
              </button>
            );
          })}
        </div>
        <p className="muted">New themes are bought with Gold in the <Link to="/market">Market</Link>. More coming.</p>
      </section>

      <section className="card">
        <div className="card-head"><h2>🔊 Sound</h2></div>
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

      <ReminderCard />

      <section className="card">
        <div className="card-head"><h2>Save data</h2></div>
        <p className="muted">Cloud sync covers you when signed in. Export is still handy for offline backups or moving a save by hand.</p>
        <div className="btn-pair">
          <button className="btn btn-primary" onClick={exportSave}>⬇ Export save</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>⬆ Import save</button>
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
          className="btn btn-danger"
          onClick={() => {
            if (confirm('Erase EVERYTHING? Character, streaks, gold, journal — all of it.') && confirm('Last chance. Really start over from nothing?')) {
              s.resetGame();
            }
          }}
        >
          💀 Erase everything
        </button>
      </section>
    </div>
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
      <div className="card-head"><h2>⏰ Evening reminder</h2></div>
      {!supported ? (
        <p className="muted">This browser doesn't support notifications.</p>
      ) : (
        <>
          <label className="toggle-row">
            <input type="checkbox" checked={s.reminder.enabled} onChange={e => void enable(e.target.checked)} />
            <span>Remind me if habits or the Daily Contract are still open</span>
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
            <p className="muted">⚠️ Notifications are blocked for this site — allow them in your browser's site settings first.</p>
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
        <h2>☁️ Account &amp; cloud sync</h2>
        {sync.user && (
          <span className={`status ${sync.status === 'error' ? 'status-failed' : sync.status === 'synced' ? 'status-done' : ''}`}>
            {sync.status === 'syncing' ? '↻ syncing…' : sync.status === 'synced' ? '✓ synced' : sync.status === 'error' ? '✗ sync error' : sync.status}
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
            <button className="btn btn-primary" onClick={() => void syncNow()}>↻ Sync now</button>
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
